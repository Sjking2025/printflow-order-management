# PrintFlow — Razorpay Hybrid Payment Integration
## Production Architecture + Implementation Guide

**Version:** 1.0  
**Stack:** Java 21 · Spring Boot 3.2.5 · PostgreSQL 17 · Flyway · React 18 + TypeScript  
**Gateway:** Razorpay (Primary) · Manual UPI (Preserved)  
**Architecture:** Enterprise-grade · Hybrid Payments

---

## Table of Contents

1. [Executive Overview](#1-executive-overview)
2. [Existing Architecture Analysis](#2-existing-architecture-analysis)
3. [Payment Architecture Design](#3-payment-architecture-design)
4. [Hybrid Payment Strategy](#4-hybrid-payment-strategy)
5. [Database Design + Flyway V15](#5-database-design--flyway-v15)
6. [Entity / Data Model Changes](#6-entity--data-model-changes)
7. [Backend Implementation — Spring Boot](#7-backend-implementation--spring-boot)
8. [Security + JWT + Webhook Verification](#8-security--jwt--webhook-verification)
9. [Razorpay Service Layer](#9-razorpay-service-layer)
10. [API Contracts](#10-api-contracts)
11. [Frontend React Integration](#11-frontend-react-integration)
12. [State Management Changes](#12-state-management-changes)
13. [Queue Workflow Integration](#13-queue-workflow-integration)
14. [Notification Integration](#14-notification-integration)
15. [Error Handling Strategy](#15-error-handling-strategy)
16. [Logging + Monitoring](#16-logging--monitoring)
17. [Testing Strategy](#17-testing-strategy)
18. [Deployment Strategy](#18-deployment-strategy)
19. [Production Hardening](#19-production-hardening)
20. [Step-by-Step Implementation Order](#20-step-by-step-implementation-order)
21. [File Manifest](#21-file-manifest)

---

## 1. Executive Overview

### What PrintFlow Is Today

PrintFlow is a production-grade digital order management platform for Indian Xerox/print shops. It replaces the traditional "WhatsApp + cash" workflow with a structured, real-time digital pipeline. Customers upload documents, configure print settings, and track orders in real time. Shop owners manage a priority queue, communicate via built-in clarification threads, and manually verify UPI payment proofs.

**Current tech stack confirmed from codebase:**
- Backend: Java 21 + Spring Boot 3.2.5 (monolith REST API)
- Database: PostgreSQL 17 + Flyway (currently at V14 migrations)
- Auth: Firebase Google OAuth → HMAC-SHA256 JWT bridge
- Notifications: Gmail SMTP + Twilio WhatsApp/SMS + In-App
- File storage: Cloudinary (client-side signed uploads)
- Frontend: React 18 + Vite + TypeScript + TanStack Query + Zustand + Tailwind/MD3

### What This Document Delivers

This document is the complete production blueprint for adding Razorpay automated gateway payments to PrintFlow, while preserving the existing Manual UPI proof workflow unchanged.

**Business problem solved:**
1. Manual UPI requires the shop owner to verify every payment — creates a bottleneck
2. Razorpay automates verification via webhooks — order auto-accepted on successful payment
3. Hybrid model: customers choose their preferred method

**Engineering outcomes:**
- Zero breaking changes to the existing Manual UPI flow
- Razorpay orders auto-confirm without owner action
- Cryptographically secure webhook verification (HMAC-SHA256)
- Idempotency protection against duplicate webhooks
- Full audit trail for all payment events
- Resume-worthy enterprise architecture pattern

---

## 2. Existing Architecture Analysis

### 2.1 Current Module Map

```
com.printflow/
├── auth/           Firebase→JWT bridge. AuthService, JwtService, JwtAuthFilter, RefreshToken
├── orders/         Core domain FSM. OrderService, OrderStatusTransitions, PriceCalculationService
├── payments/       Manual UPI proof. PaymentService (single file, 70 lines)
├── notifications/  Async multi-channel. NotificationService (Email + WhatsApp + SMS + In-App)
├── clarifications/ Owner↔Customer threaded messaging per order
├── queue/          Owner priority queue + dashboard stats
├── shops/          Shop config, pricing, open/close state
├── uploads/        Cloudinary signed URL generation
├── users/          Firebase UID → internal User sync
└── common/         SecurityConfig, GlobalExceptionHandler, CORS, shared DTOs
```

### 2.2 Current Payment Flow (Manual UPI Only)

```
Customer                    Backend                     Owner
   │                           │                           │
   │  POST /payments/{id}/proof│                           │
   ├──────────────────────────►│                           │
   │  {proofUrl, method,       │  Payment.status=PROOF_UPLOADED
   │   amount, transactionId}  │  Order.paymentStatus=PROOF_UPLOADED
   │                           │                           │
   │                           │── notify owner ──────────►│
   │                           │                           │ (manual review)
   │                           │  PATCH /payments/{id}/verify
   │                           │◄──────────────────────────│
   │                           │  {status: "VERIFIED"}     │
   │                           │                           │
   │                           │  Payment.status=VERIFIED  │
   │                           │  Order.paymentStatus=VERIFIED
   │◄──── owner manually accepts order ────────────────────│
```

**Gaps and pain points identified:**
- `Payment.status` is a raw `String` — no enum, no compile-time safety
- `Order.paymentStatus` is a raw `String` — same problem
- No `gateway` field — impossible to distinguish Manual UPI vs Razorpay payments at DB level
- No `gateway_order_id` — Razorpay's order ID cannot be stored
- No `gateway_payment_id` — Razorpay's payment ID cannot be stored
- No `gateway_signature` — Razorpay's HMAC signature cannot be stored
- No `paid_at` timestamp — when did payment actually succeed?
- No `idempotency_key` — duplicate webhook protection missing
- `PaymentRepository` has only `findByOrderId()` — no gateway lookups possible
- `PaymentService.verifyPayment()` is owner-only — no automated webhook path exists
- `SecurityConfig` has no public webhook endpoint declared

### 2.3 Current DB Schema (Payments Table — V6 + V13)

```sql
payments (
  id              UUID PK
  order_id        UUID FK → orders(id)
  amount          NUMERIC(10,2)
  method          VARCHAR(30)        -- 'UPI', 'CASH', etc.
  status          VARCHAR(20)        -- raw string: PENDING, PROOF_UPLOADED, VERIFIED
  proof_url       TEXT
  transaction_id  VARCHAR(100)       -- V13 added
  razorpay_id     VARCHAR(255)       -- added but never used in service
  razorpay_sig    TEXT               -- added but never used in service
  verified_at     TIMESTAMPTZ
  verified_by     UUID FK → users(id)
  notes           TEXT
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ
)
```

Note: `razorpay_id` and `razorpay_sig` columns already exist in the DB from V6 but the service layer never populates them. V15 will add the missing gateway fields.

### 2.4 Current Order Status FSM

```
PENDING → ACCEPTED → IN_PROGRESS → COMPLETED
                   ↘ WAITING_CLARIFICATION → ACCEPTED
                   ↘ DELAYED → IN_PROGRESS
                   ↘ CANCELLED (from any non-terminal state)
```

**Payment status values** (currently raw strings in Order entity):
`PENDING` → `PROOF_UPLOADED` → `VERIFIED`

After Razorpay integration, payment statuses will become:
`PENDING` → `PROOF_UPLOADED` → `VERIFIED` (manual UPI path, unchanged)  
`PENDING` → `GATEWAY_INITIATED` → `PAID` → auto-triggers `ACCEPTED` (Razorpay path)  
`PENDING` → `GATEWAY_INITIATED` → `FAILED` (Razorpay failure path)

### 2.5 Current Frontend Payment Surface

```
src/
├── services/payments.service.ts     — submitPaymentProof(), verifyPayment()
├── components/payment/
│   └── PaymentProofUpload.tsx       — file upload component only (Cloudinary)
├── pages/customer/
│   └── OrderDetailPage.tsx          — shows payment status, no gateway button yet
└── types/order.types.ts             — payment sub-type: {id, amount, method, status, proofUrl, transactionId}
```

---

## 3. Payment Architecture Design

### 3.1 Target Architecture

```
Customer (React SPA)
        │
        │  1. POST /payments/{orderId}/gateway-order  [JWT]
        │     ← {gatewayOrderId, amount, currency, keyId}
        │
        │  2. Open Razorpay Checkout (client-side SDK)
        │     ← customer pays on Razorpay modal
        │
        │  3. POST /payments/verify  [JWT]
        │     {razorpayOrderId, razorpayPaymentId, razorpaySignature}
        │     ← {verified: true, orderId}
        │
        ▼
Spring Boot API
        │
        ├── PaymentController          → JWT-protected endpoints
        ├── RazorpayWebhookController  → Public endpoint, HMAC-verified
        ├── PaymentService             → Orchestration, status transitions
        ├── RazorpayService            → Gateway abstraction
        └── NotificationService        → Async notifications on payment events
        │
        ▼
Razorpay API ←→ Razorpay Webhooks (async, HMAC-verified)
        │
        ▼
PostgreSQL (payments + orders tables)
```

### 3.2 Payment Sequence — Razorpay Gateway Path

```
Customer              Spring Boot             Razorpay
   │                       │                      │
   │ POST gateway-order    │                      │
   ├──────────────────────►│                      │
   │                       │ POST /v1/orders       │
   │                       ├─────────────────────►│
   │                       │← {id: order_xxx}     │
   │                       │                      │
   │                       │ Payment.status=GATEWAY_INITIATED
   │                       │ Payment.gatewayOrderId=order_xxx
   │                       │                      │
   │◄─ {gatewayOrderId,    │                      │
   │    amount, keyId} ────│                      │
   │                       │                      │
   │ [Open Razorpay modal] │                      │
   ├────────────────────────────────────────────► │
   │                       │                      │ customer pays
   │◄──────────────────────────────────────────── │
   │ {razorpayOrderId,     │                      │
   │  razorpayPaymentId,   │                      │
   │  razorpaySignature}   │                      │
   │                       │                      │
   │ POST /payments/verify │                      │
   ├──────────────────────►│                      │
   │                       │ verify HMAC signature │
   │                       │ Payment.status=PAID  │
   │                       │ Order.paymentStatus=PAID
   │                       │ Order.status=ACCEPTED │
   │                       │ notify owner + customer
   │◄─ {verified: true} ───│                      │
   │                       │                      │
   │                   (async)                     │
   │                       │◄── webhook event ────│
   │                       │    payment.captured  │
   │                       │ idempotency check    │
   │                       │ (already PAID, skip) │
```

### 3.3 Payment Sequence — Manual UPI Path (Unchanged)

```
Customer              Spring Boot                Owner
   │                       │                       │
   │ [upload screenshot    │                       │
   │  to Cloudinary]       │                       │
   │                       │                       │
   │ POST /proof           │                       │
   ├──────────────────────►│                       │
   │                       │ Payment.status=PROOF_UPLOADED
   │                       │ Order.paymentStatus=PROOF_UPLOADED
   │                       │── notify owner ──────►│
   │◄─ {paymentId, status}─│                       │
   │                       │                       │
   │                       │ PATCH /verify         │
   │                       │◄──────────────────────│
   │                       │ Payment.status=VERIFIED
   │                       │ Order.paymentStatus=VERIFIED
   │                       │── owner manually accepts order via /status
```

---

## 4. Hybrid Payment Strategy

### 4.1 Payment Method Selection

PrintFlow will offer two payment methods at order creation time:

| Method | Flow | Auto-Accept? | Owner Action Needed? |
|--------|------|--------------|----------------------|
| Manual UPI | Screenshot upload → Owner review | No | Yes — manual verify + accept |
| Razorpay Gateway | Checkout modal → Webhook | Yes | No — auto-accepted on payment |

### 4.2 Payment Method Enum

```java
// com.printflow.payments.enums.PaymentGateway
public enum PaymentGateway {
    MANUAL_UPI,   // Existing flow — screenshot proof
    RAZORPAY      // New — gateway payment
}
```

### 4.3 Payment Status Enum (Replaces Raw Strings)

```java
// com.printflow.payments.enums.PaymentStatus
public enum PaymentStatus {
    PENDING,              // Initial state — no payment action yet
    PROOF_UPLOADED,       // Manual UPI: screenshot uploaded, awaiting owner review
    VERIFIED,             // Manual UPI: owner approved
    REJECTED,             // Manual UPI: owner rejected
    GATEWAY_INITIATED,    // Razorpay: gateway order created, checkout opened
    PAID,                 // Razorpay: payment captured and signature verified
    FAILED,               // Razorpay: payment failed or signature mismatch
    REFUNDED              // Future: refund processed
}
```

### 4.4 State Transition Rules

```
Manual UPI path:
  PENDING → PROOF_UPLOADED → VERIFIED (owner approves)
  PENDING → PROOF_UPLOADED → REJECTED (owner rejects)

Razorpay path:
  PENDING → GATEWAY_INITIATED → PAID (signature verified + webhook confirmed)
  PENDING → GATEWAY_INITIATED → FAILED (payment declined or signature mismatch)
  PAID    → REFUNDED (future)
```

### 4.5 Order Auto-Accept Logic

When Razorpay payment succeeds:

```
PaymentStatus → PAID
Order.paymentStatus → PAID
Order.status:
  IF current = PENDING → transition to ACCEPTED (auto)
  ELSE → log warning, skip transition (idempotency)
Notify: customer (payment confirmed + order accepted)
Notify: owner (new order auto-accepted via gateway)
```

---

## 5. Database Design + Flyway V15

### 5.1 Why V15 (Not V14)

The existing codebase already has V14 (`V14__add_copy_modify_fields.sql`). The next migration must be V15.

### 5.2 Full Migration — V15__add_gateway_payment_support.sql

```sql
-- ============================================================
-- V15__add_gateway_payment_support.sql
-- Adds Razorpay gateway support to payments + orders tables
-- Backward compatible — all new columns are nullable or have defaults
-- Zero downtime friendly — only ADD COLUMN operations
-- ============================================================

-- ── 1. Payment Gateway Enum ──────────────────────────────────
-- Represents which payment method was used
-- MANUAL_UPI = existing screenshot flow (preserved)
-- RAZORPAY   = new gateway flow (added)
DO $$ BEGIN
    CREATE TYPE payment_gateway AS ENUM ('MANUAL_UPI', 'RAZORPAY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. Payment Status Enum ───────────────────────────────────
-- Replaces raw VARCHAR(20) status — enforces valid transitions at DB level
DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM (
        'PENDING',
        'PROOF_UPLOADED',
        'VERIFIED',
        'REJECTED',
        'GATEWAY_INITIATED',
        'PAID',
        'FAILED',
        'REFUNDED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. Add gateway columns to payments table ─────────────────

-- Which payment method: MANUAL_UPI or RAZORPAY
-- Nullable: older records don't have this set
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS gateway payment_gateway;

-- Razorpay's order ID (order_xxxxxxxxxxxxxxxxxx)
-- Created by us via Razorpay API before checkout opens
-- Used to link webhook events back to our payment record
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS gateway_order_id VARCHAR(100);

-- Razorpay's payment ID (pay_xxxxxxxxxxxxxxxxxx)
-- Returned by Razorpay after successful payment
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS gateway_payment_id VARCHAR(100);

-- HMAC-SHA256 signature from Razorpay
-- We verify this before marking payment as PAID
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS gateway_signature TEXT;

-- Exact timestamp when payment was captured
-- Different from created_at (order creation) and updated_at (last modified)
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Idempotency key to prevent duplicate webhook processing
-- Format: gateway_order_id + ":" + event_type
-- Unique constraint prevents double-processing
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(200);

-- Webhook event payload (raw JSON, for audit trail and debugging)
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS webhook_payload TEXT;

-- ── 4. Migrate existing status VARCHAR to use consistent values ──
-- Existing records have status as VARCHAR(20) with values like
-- 'PENDING', 'PROOF_UPLOADED', 'VERIFIED' — these are already valid
-- enum values, so we just set gateway for existing records
UPDATE payments
    SET gateway = 'MANUAL_UPI'
    WHERE gateway IS NULL
      AND (proof_url IS NOT NULL OR status IN ('PROOF_UPLOADED', 'VERIFIED'));

-- ── 5. Add payment_method column to orders table ─────────────
-- Tracks which payment method the customer chose at order level
-- Useful for owner dashboard filtering and reporting
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS payment_method payment_gateway;

-- ── 6. Indexes ───────────────────────────────────────────────

-- Fast lookup by Razorpay gateway order ID (used in webhook handling)
CREATE INDEX IF NOT EXISTS idx_payments_gateway_order_id
    ON payments(gateway_order_id)
    WHERE gateway_order_id IS NOT NULL;

-- Unique index: one payment per Razorpay payment ID
-- Prevents duplicate payment records for same Razorpay transaction
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_gateway_payment_id_unique
    ON payments(gateway_payment_id)
    WHERE gateway_payment_id IS NOT NULL;

-- Unique idempotency key — core duplicate webhook prevention
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency_key_unique
    ON payments(idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- Fast lookup of paid orders by shop (for dashboard stats)
CREATE INDEX IF NOT EXISTS idx_orders_payment_method
    ON orders(payment_method)
    WHERE payment_method IS NOT NULL;

-- ── 7. Comments for documentation ─────────────────────────────
COMMENT ON COLUMN payments.gateway IS
    'Payment gateway used: MANUAL_UPI (existing) or RAZORPAY (new)';
COMMENT ON COLUMN payments.gateway_order_id IS
    'Razorpay order ID (order_xxx). Created before checkout opens.';
COMMENT ON COLUMN payments.gateway_payment_id IS
    'Razorpay payment ID (pay_xxx). Set after successful payment.';
COMMENT ON COLUMN payments.gateway_signature IS
    'HMAC-SHA256 signature. Verified before marking PAID.';
COMMENT ON COLUMN payments.paid_at IS
    'Exact timestamp of payment capture. Null for unpaid/pending.';
COMMENT ON COLUMN payments.idempotency_key IS
    'Unique key per webhook event. Prevents double-processing.';
```

### 5.3 Migration Strategy

- All new columns are `NULLABLE` or have `DEFAULT` — no data loss on existing rows
- Enum types created with `IF NOT EXISTS` guard — safe to re-run
- `UPDATE payments SET gateway = 'MANUAL_UPI'` backfills historical records
- Zero downtime: only `ADD COLUMN` operations, no table rewrites

---

## 6. Entity / Data Model Changes

### 6.1 New Enums

**File:** `src/main/java/com/printflow/payments/enums/PaymentGateway.java`

```java
package com.printflow.payments.enums;

public enum PaymentGateway {
    MANUAL_UPI,
    RAZORPAY
}
```

**File:** `src/main/java/com/printflow/payments/enums/PaymentStatus.java`

```java
package com.printflow.payments.enums;

public enum PaymentStatus {
    PENDING,
    PROOF_UPLOADED,
    VERIFIED,
    REJECTED,
    GATEWAY_INITIATED,
    PAID,
    FAILED,
    REFUNDED
}
```

### 6.2 Updated Payment Entity

**File:** `src/main/java/com/printflow/payments/entity/Payment.java`

```java
package com.printflow.payments.entity;

import com.printflow.payments.enums.PaymentGateway;
import com.printflow.payments.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    // ── Gateway type ─────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(name = "gateway", length = 20)
    private PaymentGateway gateway;

    // ── Payment status (enum replaces raw String) ────────────
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    // ── Manual UPI fields (existing) ─────────────────────────
    @Column(name = "proof_url", columnDefinition = "TEXT")
    private String proofUrl;

    @Column(name = "transaction_id", length = 100)
    private String transactionId;

    // ── Razorpay gateway fields (new) ────────────────────────
    @Column(name = "gateway_order_id", length = 100)
    private String gatewayOrderId;      // Razorpay order_xxx

    @Column(name = "gateway_payment_id", length = 100)
    private String gatewayPaymentId;    // Razorpay pay_xxx

    @Column(name = "gateway_signature", columnDefinition = "TEXT")
    private String gatewaySignature;    // HMAC-SHA256 from Razorpay

    @Column(name = "paid_at")
    private OffsetDateTime paidAt;      // When payment was captured

    @Column(name = "idempotency_key", length = 200)
    private String idempotencyKey;      // Duplicate webhook prevention

    @Column(name = "webhook_payload", columnDefinition = "TEXT")
    private String webhookPayload;      // Raw JSON for audit trail

    // ── Verification (manual UPI) ────────────────────────────
    @Column(name = "verified_at")
    private OffsetDateTime verifiedAt;

    @Column(name = "verified_by")
    private UUID verifiedBy;

    @Column(columnDefinition = "TEXT")
    private String notes;

    // ── Legacy field (kept for backward compat) ──────────────
    @Column(name = "razorpay_id", length = 255)
    private String razorpayId;          // Use gatewayPaymentId instead

    @Column(name = "razorpay_sig", columnDefinition = "TEXT")
    private String razorpaySig;         // Use gatewaySignature instead

    // ── Audit timestamps ─────────────────────────────────────
    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    // ── Convenience methods ───────────────────────────────────
    public boolean isPaid() {
        return PaymentStatus.PAID.equals(this.status)
            || PaymentStatus.VERIFIED.equals(this.status);
    }

    public boolean isGatewayPayment() {
        return PaymentGateway.RAZORPAY.equals(this.gateway);
    }
}
```

### 6.3 Updated Order Entity (paymentStatus field change)

**File:** `src/main/java/com/printflow/orders/entity/Order.java` — modify `paymentStatus` field only:

```java
// In Order.java — CHANGE these two fields:

// BEFORE (raw String):
@Column(name = "payment_status", nullable = false, length = 20)
@Builder.Default
private String paymentStatus = "PENDING";

// AFTER (typed enum reference via String column):
@Column(name = "payment_status", nullable = false, length = 30)
@Builder.Default
private String paymentStatus = "PENDING";

// ADD: payment method tracking
@Column(name = "payment_method", length = 20)
private String paymentMethod;  // "MANUAL_UPI" or "RAZORPAY"
```

Note: `paymentStatus` remains a String to avoid a DB migration for existing data. It is controlled entirely through `PaymentStatus.name()` from service code.

---

## 7. Backend Implementation — Spring Boot

### 7.1 New Folder Structure

```
src/main/java/com/printflow/
│
├── payments/                          ← EXISTING MODULE (extended)
│   ├── config/
│   │   └── RazorpayConfig.java        ← NEW: Razorpay client bean
│   ├── controller/
│   │   ├── PaymentController.java     ← MODIFIED: add gateway endpoints
│   │   └── RazorpayWebhookController.java  ← NEW: webhook handler
│   ├── dto/
│   │   ├── SubmitProofRequest.java    ← EXISTING (unchanged)
│   │   ├── VerifyPaymentRequest.java  ← EXISTING (unchanged)
│   │   ├── CreateGatewayOrderRequest.java  ← NEW
│   │   ├── GatewayOrderResponse.java  ← NEW
│   │   ├── VerifyGatewayPaymentRequest.java  ← NEW
│   │   └── PaymentResponse.java       ← NEW
│   ├── entity/
│   │   └── Payment.java               ← MODIFIED (V6.2 above)
│   ├── enums/
│   │   ├── PaymentGateway.java        ← NEW
│   │   └── PaymentStatus.java         ← NEW
│   ├── exception/
│   │   ├── PaymentAlreadyCompletedException.java  ← NEW
│   │   ├── InvalidPaymentSignatureException.java  ← NEW
│   │   └── GatewayOrderCreationException.java     ← NEW
│   ├── repository/
│   │   └── PaymentRepository.java     ← MODIFIED: add gateway queries
│   └── service/
│       ├── PaymentService.java        ← MODIFIED: add gateway methods
│       └── RazorpayService.java       ← NEW: gateway abstraction
│
└── common/
    └── config/
        └── SecurityConfig.java        ← MODIFIED: add webhook public path
```

### 7.2 RazorpayConfig.java

**File:** `src/main/java/com/printflow/payments/config/RazorpayConfig.java`

**Purpose:** Creates the `RazorpayClient` Spring bean. Centralizes credential injection. Keeps Razorpay SDK init out of service code.

```java
package com.printflow.payments.config;

import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RazorpayConfig {

    @Value("${razorpay.key-id}")
    private String keyId;

    @Value("${razorpay.key-secret}")
    private String keySecret;

    @Value("${razorpay.webhook-secret}")
    private String webhookSecret;

    @Bean
    public RazorpayClient razorpayClient() throws RazorpayException {
        return new RazorpayClient(keyId, keySecret);
    }

    // Expose for RazorpayService
    public String getKeyId() { return keyId; }
    public String getKeySecret() { return keySecret; }
    public String getWebhookSecret() { return webhookSecret; }
}
```

**application.yml additions:**

```yaml
razorpay:
  key-id: ${RAZORPAY_KEY_ID}
  key-secret: ${RAZORPAY_KEY_SECRET}
  webhook-secret: ${RAZORPAY_WEBHOOK_SECRET}
  currency: INR
```

### 7.3 Updated PaymentRepository.java

**File:** `src/main/java/com/printflow/payments/repository/PaymentRepository.java`

```java
package com.printflow.payments.repository;

import com.printflow.payments.entity.Payment;
import com.printflow.payments.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    // Existing — preserved
    Optional<Payment> findByOrderId(UUID orderId);

    // New — find by Razorpay's gateway order ID (used in webhook)
    Optional<Payment> findByGatewayOrderId(String gatewayOrderId);

    // New — find by Razorpay's payment ID (deduplication)
    Optional<Payment> findByGatewayPaymentId(String gatewayPaymentId);

    // New — idempotency check: has this webhook event been processed?
    boolean existsByIdempotencyKey(String idempotencyKey);

    // New — check if an order's payment is already in a terminal paid state
    @Query("SELECT COUNT(p) > 0 FROM Payment p " +
           "WHERE p.orderId = :orderId " +
           "AND p.status IN ('PAID', 'VERIFIED')")
    boolean existsPaidPaymentForOrder(@Param("orderId") UUID orderId);
}
```

### 7.4 New DTOs

**File:** `src/main/java/com/printflow/payments/dto/CreateGatewayOrderRequest.java`

```java
package com.printflow.payments.dto;

// Request body is empty — orderId comes from path variable
// This record exists for extensibility (future: add payment notes)
public record CreateGatewayOrderRequest() {}
```

**File:** `src/main/java/com/printflow/payments/dto/GatewayOrderResponse.java`

```java
package com.printflow.payments.dto;

import java.math.BigDecimal;

/**
 * Response to POST /payments/{orderId}/gateway-order
 * Frontend passes these to Razorpay checkout SDK
 */
public record GatewayOrderResponse(
    String gatewayOrderId,     // Razorpay order_xxx — passed to checkout
    BigDecimal amount,          // Amount in INR (not paise — frontend converts)
    String currency,            // "INR"
    String keyId,               // Razorpay public key (rzp_live_xxx or rzp_test_xxx)
    String orderNumber,         // PrintFlow order number (shown in Razorpay UI)
    String paymentId            // Our internal Payment UUID
) {}
```

**File:** `src/main/java/com/printflow/payments/dto/VerifyGatewayPaymentRequest.java`

```java
package com.printflow.payments.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request body for POST /payments/verify
 * Contains the three values Razorpay returns after payment
 */
public record VerifyGatewayPaymentRequest(
    @NotBlank(message = "razorpayOrderId is required")
    String razorpayOrderId,

    @NotBlank(message = "razorpayPaymentId is required")
    String razorpayPaymentId,

    @NotBlank(message = "razorpaySignature is required")
    String razorpaySignature
) {}
```

**File:** `src/main/java/com/printflow/payments/dto/PaymentResponse.java`

```java
package com.printflow.payments.dto;

import com.printflow.payments.enums.PaymentGateway;
import com.printflow.payments.enums.PaymentStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PaymentResponse(
    UUID id,
    UUID orderId,
    BigDecimal amount,
    PaymentGateway gateway,
    PaymentStatus status,
    String proofUrl,
    String transactionId,
    String gatewayOrderId,
    String gatewayPaymentId,
    OffsetDateTime paidAt,
    OffsetDateTime verifiedAt,
    OffsetDateTime createdAt
) {}
```

### 7.5 New Payment Exceptions

**File:** `src/main/java/com/printflow/payments/exception/PaymentAlreadyCompletedException.java`

```java
package com.printflow.payments.exception;

public class PaymentAlreadyCompletedException extends RuntimeException {
    public PaymentAlreadyCompletedException(String orderId) {
        super("Payment already completed for order: " + orderId);
    }
}
```

**File:** `src/main/java/com/printflow/payments/exception/InvalidPaymentSignatureException.java`

```java
package com.printflow.payments.exception;

public class InvalidPaymentSignatureException extends RuntimeException {
    public InvalidPaymentSignatureException() {
        super("Razorpay payment signature verification failed");
    }
}
```

**File:** `src/main/java/com/printflow/payments/exception/GatewayOrderCreationException.java`

```java
package com.printflow.payments.exception;

public class GatewayOrderCreationException extends RuntimeException {
    public GatewayOrderCreationException(String message, Throwable cause) {
        super(message, cause);
    }
}
```

Register in **GlobalExceptionHandler.java**:

```java
// Add to GlobalExceptionHandler.java

@ExceptionHandler(PaymentAlreadyCompletedException.class)
public ResponseEntity<ErrorResponse> handlePaymentAlreadyCompleted(
        PaymentAlreadyCompletedException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(new ErrorResponse("PAYMENT_ALREADY_COMPLETED", ex.getMessage()));
}

@ExceptionHandler(InvalidPaymentSignatureException.class)
public ResponseEntity<ErrorResponse> handleInvalidSignature(
        InvalidPaymentSignatureException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(new ErrorResponse("INVALID_PAYMENT_SIGNATURE", ex.getMessage()));
}

@ExceptionHandler(GatewayOrderCreationException.class)
public ResponseEntity<ErrorResponse> handleGatewayError(
        GatewayOrderCreationException ex) {
    return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
        .body(new ErrorResponse("GATEWAY_ERROR", "Payment gateway unavailable. Please try again."));
}
```

---

## 8. Security + JWT + Webhook Verification

### 8.1 Updated SecurityConfig.java

**File:** `src/main/java/com/printflow/common/config/SecurityConfig.java`

The webhook endpoint must be **public** (no JWT) because Razorpay cannot send a JWT. It is secured instead by HMAC-SHA256 signature verification in the controller.

```java
package com.printflow.common.config;

import com.printflow.auth.filter.JwtAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> {})
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // ── Public endpoints ──────────────────────────
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/api/v1/shops/public").permitAll()
                .requestMatchers("/api/v1/shops/*/public").permitAll()
                .requestMatchers("/actuator/health").permitAll()

                // ── Razorpay webhook: public but HMAC-verified ──
                // IMPORTANT: Razorpay cannot send JWT tokens.
                // Security is enforced via X-Razorpay-Signature header
                // verification in RazorpayWebhookController.
                .requestMatchers("/api/v1/payments/webhook/razorpay").permitAll()

                // ── Owner-only endpoints ───────────────────────
                .requestMatchers("/api/v1/owner/**").hasRole("OWNER")

                // ── All other endpoints require authentication ─
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
```

### 8.2 Webhook Signature Verification

Razorpay signs every webhook payload with HMAC-SHA256 using your webhook secret. The signature is sent in the `X-Razorpay-Signature` header.

**Verification algorithm:**

```
HMAC-SHA256(webhookSecret, rawRequestBody) == X-Razorpay-Signature
```

**Critical:** Read the raw request body as bytes **before** any JSON parsing. Once parsed, you cannot recompute the signature.

This is handled in `RazorpayWebhookController` via `@RequestBody String rawBody`:

```java
// In RazorpayWebhookController.java — signature verification method
private void verifyWebhookSignature(String rawBody, String receivedSignature) {
    try {
        String computedSignature = Utils.getHash(rawBody, webhookSecret);
        if (!computedSignature.equals(receivedSignature)) {
            log.warn("Webhook signature mismatch. Rejecting event.");
            throw new InvalidPaymentSignatureException();
        }
    } catch (InvalidPaymentSignatureException e) {
        throw e;
    } catch (Exception e) {
        log.error("Webhook signature computation failed", e);
        throw new InvalidPaymentSignatureException();
    }
}
```

Razorpay's Java SDK provides `Utils.getHash()` for this computation.

### 8.3 Replay Attack Prevention

Same webhook event replayed multiple times must be idempotent. Strategy:

```
idempotency_key = gateway_order_id + ":" + event_type
                = "order_xxxxxxxxxx:payment.captured"

Before processing:
  IF existsByIdempotencyKey(key) → return 200 OK (already processed)
  ELSE → process event, save idempotency_key to DB
```

### 8.4 JWT Flow for Gateway Endpoints

The `createGatewayOrder` and `verifyPayment` endpoints require a valid JWT. The `@AuthenticationPrincipal UserPrincipal` is injected automatically by the existing `JwtAuthFilter`.

The existing `UserPrincipal` record already provides:

```java
// UserPrincipal.java (existing)
public record UserPrincipal(UUID id, String email, String role, UUID shopId) {}
```

Customer identity is verified by checking that `order.customerId == principal.id()` before any payment operation.

---

## 9. Razorpay Service Layer

### 9.1 RazorpayService.java

**File:** `src/main/java/com/printflow/payments/service/RazorpayService.java`

**Purpose:** Gateway abstraction. All Razorpay SDK calls are in this class. If you ever switch gateways, only this class changes.

**Responsibilities:**
- Create Razorpay order via SDK
- Verify payment signatures (client-side verification)
- Process webhook events with idempotency
- Update Payment + Order status transactionally
- Trigger notifications

**Dependencies:** `RazorpayClient`, `RazorpayConfig`, `PaymentRepository`, `OrderRepository`, `NotificationService`

```java
package com.printflow.payments.service;

import com.printflow.notifications.service.NotificationService;
import com.printflow.orders.entity.Order;
import com.printflow.orders.enums.OrderStatus;
import com.printflow.orders.repository.OrderRepository;
import com.printflow.payments.config.RazorpayConfig;
import com.printflow.payments.dto.GatewayOrderResponse;
import com.printflow.payments.dto.VerifyGatewayPaymentRequest;
import com.printflow.payments.entity.Payment;
import com.printflow.payments.enums.PaymentGateway;
import com.printflow.payments.enums.PaymentStatus;
import com.printflow.payments.exception.GatewayOrderCreationException;
import com.printflow.payments.exception.InvalidPaymentSignatureException;
import com.printflow.payments.exception.PaymentAlreadyCompletedException;
import com.printflow.payments.repository.PaymentRepository;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import jakarta.persistence.EntityNotFoundException;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class RazorpayService {

    private static final Logger log = LoggerFactory.getLogger(RazorpayService.class);
    private static final String CURRENCY = "INR";

    private final RazorpayClient razorpayClient;
    private final RazorpayConfig razorpayConfig;
    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final NotificationService notificationService;

    public RazorpayService(RazorpayClient razorpayClient,
                           RazorpayConfig razorpayConfig,
                           PaymentRepository paymentRepository,
                           OrderRepository orderRepository,
                           NotificationService notificationService) {
        this.razorpayClient = razorpayClient;
        this.razorpayConfig = razorpayConfig;
        this.paymentRepository = paymentRepository;
        this.orderRepository = orderRepository;
        this.notificationService = notificationService;
    }

    /**
     * Creates a Razorpay order for the given PrintFlow order.
     *
     * Flow:
     * 1. Validate order exists + belongs to customer
     * 2. Guard: reject if already paid
     * 3. Create Razorpay order via API
     * 4. Persist Payment record with GATEWAY_INITIATED status
     * 5. Return gateway order details for frontend checkout
     *
     * @param orderId    PrintFlow order UUID
     * @param customerId Authenticated customer UUID (from JWT)
     * @return GatewayOrderResponse containing Razorpay order ID + amount + key
     */
    @Transactional
    public GatewayOrderResponse createGatewayOrder(UUID orderId, UUID customerId) {
        // 1. Load and validate order
        Order order = orderRepository.findByIdAndCustomerId(orderId, customerId)
            .orElseThrow(() -> new EntityNotFoundException("Order not found or access denied"));

        // 2. Guard: cannot pay for an already-paid or cancelled order
        if (paymentRepository.existsPaidPaymentForOrder(orderId)) {
            throw new PaymentAlreadyCompletedException(orderId.toString());
        }
        if ("CANCELLED".equals(order.getStatus())) {
            throw new IllegalStateException("Cannot pay for a cancelled order");
        }

        // 3. Create Razorpay order
        // Amount must be in paise (1 INR = 100 paise)
        long amountInPaise = order.getTotalAmount()
            .multiply(BigDecimal.valueOf(100))
            .longValueExact();

        JSONObject orderRequest = new JSONObject();
        orderRequest.put("amount", amountInPaise);
        orderRequest.put("currency", CURRENCY);
        orderRequest.put("receipt", order.getOrderNumber());  // Shows in Razorpay dashboard
        orderRequest.put("notes", new JSONObject()
            .put("printflow_order_id", orderId.toString())
            .put("order_number", order.getOrderNumber()));

        com.razorpay.Order razorpayOrder;
        try {
            razorpayOrder = razorpayClient.orders.create(orderRequest);
            log.info("Razorpay order created: {} for PrintFlow order: {}",
                razorpayOrder.get("id"), order.getOrderNumber());
        } catch (RazorpayException e) {
            log.error("Razorpay order creation failed for order {}: {}",
                order.getOrderNumber(), e.getMessage());
            throw new GatewayOrderCreationException(
                "Failed to create gateway order: " + e.getMessage(), e);
        }

        // 4. Persist Payment record
        String razorpayOrderId = razorpayOrder.get("id");

        Payment payment = paymentRepository.findByOrderId(orderId)
            .orElseGet(() -> Payment.builder()
                .orderId(orderId)
                .amount(order.getTotalAmount())
                .build());

        payment.setGateway(PaymentGateway.RAZORPAY);
        payment.setStatus(PaymentStatus.GATEWAY_INITIATED);
        payment.setGatewayOrderId(razorpayOrderId);

        // Update order payment method
        order.setPaymentMethod("RAZORPAY");
        order.setPaymentStatus(PaymentStatus.GATEWAY_INITIATED.name());
        orderRepository.save(order);
        paymentRepository.save(payment);

        // 5. Return checkout details
        return new GatewayOrderResponse(
            razorpayOrderId,
            order.getTotalAmount(),
            CURRENCY,
            razorpayConfig.getKeyId(),
            order.getOrderNumber(),
            payment.getId().toString()
        );
    }

    /**
     * Verifies payment after customer completes checkout.
     *
     * Razorpay returns three values to the frontend after payment:
     * - razorpayOrderId  (same as what we created)
     * - razorpayPaymentId (new — the actual payment ID)
     * - razorpaySignature (HMAC of orderId + "|" + paymentId)
     *
     * We verify the signature, then mark the order as PAID + ACCEPTED.
     *
     * @param request    Razorpay's three post-payment values
     * @param customerId Authenticated customer UUID
     * @return Updated Payment record
     */
    @Transactional
    public Payment verifyPayment(VerifyGatewayPaymentRequest request, UUID customerId) {
        // 1. Find payment by gateway order ID
        Payment payment = paymentRepository.findByGatewayOrderId(request.razorpayOrderId())
            .orElseThrow(() -> new EntityNotFoundException(
                "Payment not found for gateway order: " + request.razorpayOrderId()));

        // 2. Verify customer owns this payment (via order ownership)
        Order order = orderRepository.findByIdAndCustomerId(payment.getOrderId(), customerId)
            .orElseThrow(() -> new EntityNotFoundException("Order access denied"));

        // 3. Idempotency: already verified?
        if (PaymentStatus.PAID.equals(payment.getStatus())) {
            log.info("Payment already verified for order: {}", order.getOrderNumber());
            return payment;
        }

        // 4. Verify HMAC-SHA256 signature
        // Razorpay signs: razorpayOrderId + "|" + razorpayPaymentId
        verifyPaymentSignature(
            request.razorpayOrderId(),
            request.razorpayPaymentId(),
            request.razorpaySignature()
        );

        // 5. Update payment record
        payment.setStatus(PaymentStatus.PAID);
        payment.setGatewayPaymentId(request.razorpayPaymentId());
        payment.setGatewaySignature(request.razorpaySignature());
        payment.setPaidAt(OffsetDateTime.now());
        paymentRepository.save(payment);

        // 6. Auto-accept the order
        autoAcceptOrderOnPayment(order);

        log.info("Payment verified and order auto-accepted: {} (payment: {})",
            order.getOrderNumber(), request.razorpayPaymentId());

        return payment;
    }

    /**
     * Processes incoming Razorpay webhook events.
     *
     * Supported events:
     * - payment.captured → mark PAID, auto-accept order
     * - payment.failed   → mark FAILED
     *
     * Idempotency: each event is processed at most once via idempotency_key.
     *
     * @param eventType  Razorpay event type (e.g., "payment.captured")
     * @param payload    Parsed webhook payload JSON
     */
    @Transactional
    public void processWebhookEvent(String eventType, JSONObject payload) {
        JSONObject paymentEntity = payload
            .getJSONObject("payload")
            .getJSONObject("payment")
            .getJSONObject("entity");

        String razorpayOrderId = paymentEntity.getString("order_id");
        String razorpayPaymentId = paymentEntity.getString("id");

        // Build idempotency key: order_id + event_type
        String idempotencyKey = razorpayOrderId + ":" + eventType;

        // Idempotency check: if already processed, return immediately
        if (paymentRepository.existsByIdempotencyKey(idempotencyKey)) {
            log.info("Duplicate webhook event, skipping: {}", idempotencyKey);
            return;
        }

        // Find payment by gateway order ID
        Payment payment = paymentRepository.findByGatewayOrderId(razorpayOrderId)
            .orElse(null);

        if (payment == null) {
            log.warn("Webhook received for unknown gateway order: {}", razorpayOrderId);
            return;
        }

        switch (eventType) {
            case "payment.captured" -> handlePaymentCaptured(payment, razorpayPaymentId,
                                                              idempotencyKey, payload);
            case "payment.failed"   -> handlePaymentFailed(payment, idempotencyKey);
            default -> log.debug("Unhandled webhook event type: {}", eventType);
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void handlePaymentCaptured(Payment payment, String razorpayPaymentId,
                                       String idempotencyKey, JSONObject fullPayload) {
        // If already PAID (from client-side verify), just save idempotency key
        if (PaymentStatus.PAID.equals(payment.getStatus())) {
            payment.setIdempotencyKey(idempotencyKey);
            paymentRepository.save(payment);
            log.info("Webhook: payment already marked PAID, idempotency key saved: {}", idempotencyKey);
            return;
        }

        payment.setStatus(PaymentStatus.PAID);
        payment.setGatewayPaymentId(razorpayPaymentId);
        payment.setPaidAt(OffsetDateTime.now());
        payment.setIdempotencyKey(idempotencyKey);
        payment.setWebhookPayload(fullPayload.toString());
        paymentRepository.save(payment);

        Order order = orderRepository.findById(payment.getOrderId()).orElse(null);
        if (order != null) {
            autoAcceptOrderOnPayment(order);
        }

        log.info("Webhook: payment captured and order auto-accepted for gateway order: {}",
            payment.getGatewayOrderId());
    }

    private void handlePaymentFailed(Payment payment, String idempotencyKey) {
        payment.setStatus(PaymentStatus.FAILED);
        payment.setIdempotencyKey(idempotencyKey);
        paymentRepository.save(payment);

        Order order = orderRepository.findById(payment.getOrderId()).orElse(null);
        if (order != null) {
            order.setPaymentStatus(PaymentStatus.FAILED.name());
            orderRepository.save(order);
        }

        log.info("Webhook: payment failed for gateway order: {}",
            payment.getGatewayOrderId());
    }

    private void autoAcceptOrderOnPayment(Order order) {
        // Update payment status
        order.setPaymentStatus(PaymentStatus.PAID.name());

        // Auto-accept only if currently PENDING
        if ("PENDING".equals(order.getStatus())) {
            order.setStatus(OrderStatus.ACCEPTED.name());
            orderRepository.save(order);

            // Trigger async notifications
            notificationService.notifyOrderStatusChange(order, OrderStatus.ACCEPTED);
            notificationService.notifyGatewayPaymentSuccessToOwner(order);
        } else {
            orderRepository.save(order);
            log.warn("Auto-accept skipped — order {} is in status: {}",
                order.getOrderNumber(), order.getStatus());
        }
    }

    private void verifyPaymentSignature(String razorpayOrderId,
                                         String razorpayPaymentId,
                                         String receivedSignature) {
        try {
            // Razorpay signature = HMAC-SHA256(secret, orderId + "|" + paymentId)
            String data = razorpayOrderId + "|" + razorpayPaymentId;
            String expectedSignature = Utils.getHash(data, razorpayConfig.getKeySecret());

            if (!expectedSignature.equals(receivedSignature)) {
                log.warn("Payment signature mismatch for order: {}", razorpayOrderId);
                throw new InvalidPaymentSignatureException();
            }
        } catch (InvalidPaymentSignatureException e) {
            throw e;
        } catch (Exception e) {
            log.error("Signature verification error for order {}: {}",
                razorpayOrderId, e.getMessage());
            throw new InvalidPaymentSignatureException();
        }
    }
}
```

### 9.2 Updated PaymentService.java

The existing `PaymentService` handles Manual UPI. Add a thin delegation layer for gateway operations:

**File:** `src/main/java/com/printflow/payments/service/PaymentService.java` — add these methods:

```java
// Add to existing PaymentService.java

private final RazorpayService razorpayService;

// Update constructor to inject RazorpayService

public GatewayOrderResponse createGatewayOrder(UUID orderId, UUID customerId) {
    return razorpayService.createGatewayOrder(orderId, customerId);
}

public Payment verifyGatewayPayment(VerifyGatewayPaymentRequest request, UUID customerId) {
    return razorpayService.verifyPayment(request, customerId);
}
```

---

## 10. API Contracts

### 10.1 Updated PaymentController.java

**File:** `src/main/java/com/printflow/payments/controller/PaymentController.java`

```java
package com.printflow.payments.controller;

import com.printflow.common.dto.ApiResponse;
import com.printflow.common.security.UserPrincipal;
import com.printflow.payments.dto.*;
import com.printflow.payments.entity.Payment;
import com.printflow.payments.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    // ── Existing: Manual UPI proof submission ─────────────────
    // PRESERVED UNCHANGED
    @PostMapping("/{orderId}/proof")
    public ResponseEntity<ApiResponse<Map<String, Object>>> submitProof(
            @PathVariable UUID orderId,
            @Valid @RequestBody SubmitProofRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        Payment payment = paymentService.submitProof(orderId, request, principal.id());
        Map<String, Object> data = Map.of(
            "paymentId", payment.getId(),
            "status", payment.getStatus()
        );
        return ResponseEntity.ok(ApiResponse.success(data,
            "Payment proof submitted. Owner will verify and accept your order."));
    }

    // ── Existing: Owner verification ──────────────────────────
    // PRESERVED UNCHANGED
    @PatchMapping("/{paymentId}/verify")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verifyPayment(
            @PathVariable UUID paymentId,
            @Valid @RequestBody VerifyPaymentRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        Payment payment = paymentService.verifyPayment(paymentId, request, principal.id());
        Map<String, Object> data = new HashMap<>();
        data.put("paymentId", payment.getId());
        data.put("status", payment.getStatus());
        data.put("verifiedAt", payment.getVerifiedAt());
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    // ── NEW: Create Razorpay gateway order ────────────────────
    /**
     * POST /api/v1/payments/{orderId}/gateway-order
     * Auth: JWT (ROLE_CUSTOMER)
     *
     * Creates a Razorpay order and returns checkout details.
     * The frontend passes these to Razorpay's checkout SDK.
     *
     * Validations:
     * - Order must exist and belong to authenticated customer
     * - Order must not already be paid
     * - Order must not be cancelled
     *
     * Responses:
     * 200 → {gatewayOrderId, amount, currency, keyId, orderNumber, paymentId}
     * 404 → Order not found
     * 409 → Payment already completed
     * 502 → Razorpay gateway unavailable
     */
    @PostMapping("/{orderId}/gateway-order")
    public ResponseEntity<ApiResponse<GatewayOrderResponse>> createGatewayOrder(
            @PathVariable UUID orderId,
            @AuthenticationPrincipal UserPrincipal principal) {
        GatewayOrderResponse response =
            paymentService.createGatewayOrder(orderId, principal.id());
        return ResponseEntity.ok(ApiResponse.success(response,
            "Gateway order created. Proceed to checkout."));
    }

    // ── NEW: Verify Razorpay payment (client-side) ────────────
    /**
     * POST /api/v1/payments/verify
     * Auth: JWT (ROLE_CUSTOMER)
     *
     * Called by frontend after Razorpay checkout completes.
     * Verifies HMAC signature and auto-accepts the order.
     *
     * Validations:
     * - razorpayOrderId, razorpayPaymentId, razorpaySignature all required
     * - HMAC-SHA256 signature must match
     * - Authenticated customer must own the order
     *
     * Responses:
     * 200 → {verified: true, orderId, status: "PAID"}
     * 400 → Invalid signature
     * 404 → Payment/order not found
     */
    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verifyGatewayPayment(
            @Valid @RequestBody VerifyGatewayPaymentRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        Payment payment = paymentService.verifyGatewayPayment(request, principal.id());
        Map<String, Object> data = Map.of(
            "verified", true,
            "paymentId", payment.getId(),
            "orderId", payment.getOrderId(),
            "status", payment.getStatus().name()
        );
        return ResponseEntity.ok(ApiResponse.success(data,
            "Payment verified. Your order has been accepted!"));
    }
}
```

### 10.2 RazorpayWebhookController.java

**File:** `src/main/java/com/printflow/payments/controller/RazorpayWebhookController.java`

```java
package com.printflow.payments.controller;

import com.printflow.payments.exception.InvalidPaymentSignatureException;
import com.printflow.payments.service.RazorpayService;
import com.razorpay.Utils;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Public webhook endpoint for Razorpay events.
 *
 * Security: NOT JWT-protected. Secured via HMAC-SHA256 signature
 * verification on every request (X-Razorpay-Signature header).
 *
 * Supported events:
 *   payment.captured → auto-accept order
 *   payment.failed   → mark payment failed
 *
 * Idempotency: duplicate events are safely ignored via idempotency_key.
 *
 * IMPORTANT: Always return 200 OK to Razorpay, even for errors.
 * Returning 4xx/5xx causes Razorpay to retry the webhook.
 */
@RestController
@RequestMapping("/api/v1/payments/webhook")
public class RazorpayWebhookController {

    private static final Logger log = LoggerFactory.getLogger(RazorpayWebhookController.class);

    private final RazorpayService razorpayService;

    @Value("${razorpay.webhook-secret}")
    private String webhookSecret;

    public RazorpayWebhookController(RazorpayService razorpayService) {
        this.razorpayService = razorpayService;
    }

    @PostMapping("/razorpay")
    public ResponseEntity<String> handleWebhook(
            @RequestBody String rawBody,
            @RequestHeader("X-Razorpay-Signature") String signature) {

        log.debug("Webhook received. Signature: {}", signature);

        // 1. Verify signature FIRST — reject forged requests
        try {
            verifySignature(rawBody, signature);
        } catch (InvalidPaymentSignatureException e) {
            log.warn("Webhook signature verification failed. Rejecting.");
            // Return 200 to prevent Razorpay retries on invalid signatures
            // (Retrying won't fix a signature mismatch)
            return ResponseEntity.ok("signature_mismatch");
        }

        // 2. Parse payload
        JSONObject payload;
        try {
            payload = new JSONObject(rawBody);
        } catch (Exception e) {
            log.error("Invalid webhook payload JSON: {}", e.getMessage());
            return ResponseEntity.ok("invalid_payload");
        }

        // 3. Extract event type
        String eventType = payload.optString("event", "unknown");
        log.info("Processing webhook event: {}", eventType);

        // 4. Process event — catch all exceptions to always return 200
        try {
            razorpayService.processWebhookEvent(eventType, payload);
        } catch (Exception e) {
            // Log but don't re-throw — Razorpay retries on non-200 responses
            log.error("Error processing webhook event {}: {}", eventType, e.getMessage(), e);
        }

        return ResponseEntity.ok("received");
    }

    private void verifySignature(String body, String receivedSignature) {
        try {
            String computedSignature = Utils.getHash(body, webhookSecret);
            if (!computedSignature.equals(receivedSignature)) {
                throw new InvalidPaymentSignatureException();
            }
        } catch (InvalidPaymentSignatureException e) {
            throw e;
        } catch (Exception e) {
            log.error("Signature hash computation error: {}", e.getMessage());
            throw new InvalidPaymentSignatureException();
        }
    }
}
```

### 10.3 Full API Reference

| Method | Endpoint | Auth | Role | Purpose |
|--------|----------|------|------|---------|
| POST | `/api/v1/payments/{orderId}/proof` | JWT | CUSTOMER | Manual UPI proof upload |
| PATCH | `/api/v1/payments/{paymentId}/verify` | JWT | OWNER | Manual UPI owner verify |
| POST | `/api/v1/payments/{orderId}/gateway-order` | JWT | CUSTOMER | Create Razorpay order |
| POST | `/api/v1/payments/verify` | JWT | CUSTOMER | Verify Razorpay payment |
| POST | `/api/v1/payments/webhook/razorpay` | None (HMAC) | — | Razorpay webhook receiver |

**Request/Response schemas:**

```
POST /payments/{orderId}/gateway-order
Request: (empty body)
Response 200:
{
  "success": true,
  "message": "Gateway order created. Proceed to checkout.",
  "data": {
    "gatewayOrderId": "order_xxxxxxxxxxxxxxxxxx",
    "amount": 250.00,
    "currency": "INR",
    "keyId": "rzp_live_xxxxxxxxxx",
    "orderNumber": "PF-20260101-001",
    "paymentId": "uuid-of-our-payment-record"
  }
}
Response 404: {"error": {"code": "NOT_FOUND", "message": "Order not found or access denied"}}
Response 409: {"error": {"code": "PAYMENT_ALREADY_COMPLETED", "message": "..."}}
Response 502: {"error": {"code": "GATEWAY_ERROR", "message": "Payment gateway unavailable..."}}

POST /payments/verify
Request:
{
  "razorpayOrderId": "order_xxxxxxxxxxxxxxxxxx",
  "razorpayPaymentId": "pay_xxxxxxxxxxxxxxxxxx",
  "razorpaySignature": "abc123..."
}
Response 200:
{
  "success": true,
  "message": "Payment verified. Your order has been accepted!",
  "data": {
    "verified": true,
    "paymentId": "uuid",
    "orderId": "uuid",
    "status": "PAID"
  }
}
Response 400: {"error": {"code": "INVALID_PAYMENT_SIGNATURE", "message": "..."}}
```

---

## 11. Frontend React Integration

### 11.1 New File Structure

```
src/
├── services/
│   └── payments.service.ts        ← MODIFIED: add gateway functions
├── hooks/
│   ├── useOrders.ts               ← EXISTING (unchanged)
│   ├── useGatewayPayment.ts       ← NEW: Razorpay checkout hook
│   └── usePaymentMethod.ts        ← NEW: payment method selection state
├── components/
│   └── payment/
│       ├── PaymentProofUpload.tsx  ← EXISTING (unchanged)
│       ├── PaymentMethodSelector.tsx  ← NEW
│       └── RazorpayCheckoutButton.tsx ← NEW
├── pages/customer/
│   ├── NewOrderPage.tsx            ← MODIFIED: add payment method selection
│   └── OrderDetailPage.tsx         ← MODIFIED: add gateway payment section
└── types/
    └── order.types.ts              ← MODIFIED: add gateway payment fields
```

### 11.2 Updated payments.service.ts

**File:** `src/services/payments.service.ts`

```typescript
import api from './api'

// ── Existing functions — PRESERVED UNCHANGED ─────────────────

export const submitPaymentProof = async (
  orderId: string,
  proofUrl: string,
  method: string,
  amount: number,
  transactionId?: string,
  notes?: string
) => {
  const { data } = await api.post(`/payments/${orderId}/proof`, {
    proofUrl,
    method,
    amount,
    transactionId,
    notes,
  })
  return data.data
}

export const verifyPayment = async (
  paymentId: string,
  status: string,
  notes?: string
) => {
  const { data } = await api.patch(`/payments/${paymentId}/verify`, {
    status,
    notes,
  })
  return data.data
}

// ── New functions — Razorpay gateway ─────────────────────────

export interface GatewayOrderResponse {
  gatewayOrderId: string
  amount: number
  currency: string
  keyId: string
  orderNumber: string
  paymentId: string
}

export interface VerifyGatewayPaymentRequest {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}

export interface VerifyGatewayPaymentResponse {
  verified: boolean
  paymentId: string
  orderId: string
  status: string
}

/**
 * Creates a Razorpay gateway order for the given order.
 * Returns the checkout details needed to open Razorpay modal.
 */
export const createGatewayOrder = async (
  orderId: string
): Promise<GatewayOrderResponse> => {
  const { data } = await api.post(`/payments/${orderId}/gateway-order`)
  return data.data
}

/**
 * Verifies Razorpay payment after checkout completes.
 * Sends the three values Razorpay returns to the frontend.
 */
export const verifyGatewayPayment = async (
  request: VerifyGatewayPaymentRequest
): Promise<VerifyGatewayPaymentResponse> => {
  const { data } = await api.post('/payments/verify', request)
  return data.data
}
```

### 11.3 Updated order.types.ts

```typescript
// src/types/order.types.ts — add gateway fields to payment sub-type

export interface OrderDocument {
  id?: string
  fileName: string
  fileUrl: string
  fileSizeKb?: number
  pageCount: number
  copies: number
  printType: 'BW' | 'COLOR'
  sideType: 'SINGLE' | 'DOUBLE'
  paperSize: 'A4' | 'A3' | 'LETTER' | 'LEGAL'
  binding: 'NONE' | 'SPIRAL' | 'STAPLE'
  lamination: 'NONE' | 'SINGLE_SIDE' | 'BOTH_SIDES'
  notes?: string
  subtotal?: number
  copiesModifiedAt?: string
}

// ── Updated payment type (add gateway fields) ─────────────────
export type PaymentMethod = 'MANUAL_UPI' | 'RAZORPAY'

export type PaymentStatus =
  | 'PENDING'
  | 'PROOF_UPLOADED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'GATEWAY_INITIATED'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'

export interface OrderPayment {
  id: string
  amount: number
  gateway?: PaymentMethod       // NEW
  status: PaymentStatus         // was 'string'
  proofUrl?: string
  transactionId?: string
  gatewayOrderId?: string       // NEW: Razorpay order_xxx
  gatewayPaymentId?: string     // NEW: Razorpay pay_xxx
  paidAt?: string               // NEW: when payment captured
  verifiedAt?: string
}

export interface Order {
  id: string
  orderNumber: string
  status: string
  urgency: string
  expectedDelivery?: string
  description?: string
  totalAmount: number
  paymentStatus: PaymentStatus  // was 'string'
  paymentMethod?: PaymentMethod // NEW
  lockExpiresAt?: string
  copyModifyExpiresAt?: string
  processingStartedAt?: string
  customer?: { id: string; name: string; phone?: string }
  documents: OrderDocument[]
  payment?: OrderPayment        // Updated type
  statusHistory?: {
    fromStatus: string
    toStatus: string
    changedAt: string
  }[]
  clarifications?: {
    id: string
    senderRole: string
    message: string
    isRead: boolean
    createdAt: string
  }[]
  createdAt: string
}

export interface OrderSummary {
  id: string
  orderNumber: string
  status: string
  urgency: string
  documentCount: number
  totalAmount: number
  paymentStatus: PaymentStatus
  paymentMethod?: PaymentMethod
  expectedDelivery: string
  createdAt: string
  customerId?: string
  customerName?: string
}
```

### 11.4 Razorpay SDK Setup

Add to `index.html`:

```html
<!-- In public/index.html or index.html, inside <head> -->
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

Add TypeScript declaration — **File:** `src/types/razorpay.d.ts`:

```typescript
// Global Razorpay type declaration
interface RazorpayOptions {
  key: string
  amount: number           // In paise
  currency: string
  name: string
  description: string
  order_id: string
  handler: (response: RazorpayPaymentResponse) => void
  prefill?: {
    name?: string
    email?: string
    contact?: string
  }
  notes?: Record<string, string>
  theme?: { color?: string }
  modal?: {
    ondismiss?: () => void
    escape?: boolean
  }
}

interface RazorpayPaymentResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

interface RazorpayInstance {
  open(): void
  close(): void
  on(event: string, callback: (response: unknown) => void): void
}

declare class Razorpay {
  constructor(options: RazorpayOptions)
  open(): void
}

interface Window {
  Razorpay: typeof Razorpay
}
```

### 11.5 useGatewayPayment.ts Hook

**File:** `src/hooks/useGatewayPayment.ts`

```typescript
import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createGatewayOrder,
  verifyGatewayPayment,
  GatewayOrderResponse,
  VerifyGatewayPaymentResponse,
} from '../services/payments.service'

export type GatewayPaymentState =
  | 'idle'
  | 'creating_order'
  | 'checkout_open'
  | 'verifying'
  | 'success'
  | 'failed'

interface UseGatewayPaymentOptions {
  orderId: string
  orderNumber: string
  amount: number
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  onSuccess?: (response: VerifyGatewayPaymentResponse) => void
  onFailure?: (error: string) => void
}

export function useGatewayPayment({
  orderId,
  orderNumber,
  amount,
  customerName,
  customerEmail,
  customerPhone,
  onSuccess,
  onFailure,
}: UseGatewayPaymentOptions) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<GatewayPaymentState>('idle')
  const [error, setError] = useState<string | null>(null)

  const createOrderMutation = useMutation({
    mutationFn: () => createGatewayOrder(orderId),
  })

  const verifyMutation = useMutation({
    mutationFn: verifyGatewayPayment,
    onSuccess: (data) => {
      setState('success')
      // Invalidate order queries so UI shows updated status
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      onSuccess?.(data)
    },
    onError: (err: any) => {
      setState('failed')
      const message = err.response?.data?.error?.message || 'Payment verification failed'
      setError(message)
      onFailure?.(message)
    },
  })

  const initiatePayment = useCallback(async () => {
    if (state !== 'idle') return
    setError(null)
    setState('creating_order')

    let gatewayData: GatewayOrderResponse
    try {
      gatewayData = await createOrderMutation.mutateAsync()
    } catch (err: any) {
      setState('failed')
      const message = err.response?.data?.error?.message || 'Failed to create payment order'
      setError(message)
      onFailure?.(message)
      return
    }

    setState('checkout_open')

    // Open Razorpay checkout modal
    const rzp = new window.Razorpay({
      key: gatewayData.keyId,
      amount: Math.round(gatewayData.amount * 100), // Convert INR to paise
      currency: gatewayData.currency,
      name: 'PrintFlow',
      description: `Order ${orderNumber}`,
      order_id: gatewayData.gatewayOrderId,
      prefill: {
        name: customerName,
        email: customerEmail,
        contact: customerPhone,
      },
      notes: {
        order_number: orderNumber,
      },
      theme: {
        color: '#1565C0', // Brand blue (matches PrintFlow MD3 theme)
      },
      handler: async (response) => {
        // Payment successful — verify with backend
        setState('verifying')
        verifyMutation.mutate({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        })
      },
      modal: {
        ondismiss: () => {
          // Customer closed the checkout without paying
          if (state === 'checkout_open') {
            setState('idle')
          }
        },
        escape: true,
      },
    })

    rzp.open()
  }, [state, orderId, orderNumber, amount, customerName, customerEmail, customerPhone])

  const reset = useCallback(() => {
    setState('idle')
    setError(null)
  }, [])

  return {
    initiatePayment,
    state,
    error,
    isLoading: state === 'creating_order' || state === 'verifying',
    isSuccess: state === 'success',
    isFailed: state === 'failed',
    reset,
  }
}
```

### 11.6 PaymentMethodSelector.tsx

**File:** `src/components/payment/PaymentMethodSelector.tsx`

```tsx
import { PaymentMethod } from '../../types/order.types'

interface PaymentMethodSelectorProps {
  selected: PaymentMethod | null
  onChange: (method: PaymentMethod) => void
  disabled?: boolean
}

export default function PaymentMethodSelector({
  selected,
  onChange,
  disabled = false,
}: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-stack-sm">
      <h3 className="font-label-lg text-label-lg text-on-surface-variant uppercase">
        Payment Method
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter">

        {/* Razorpay — online payment */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('RAZORPAY')}
          className={`p-stack-md rounded-2xl border-2 text-left transition-all ${
            selected === 'RAZORPAY'
              ? 'border-primary bg-primary-container'
              : 'border-outline-variant bg-surface-container hover:border-primary/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="flex items-center gap-stack-sm mb-stack-xs">
            <span className="material-symbols-outlined text-primary">
              credit_card
            </span>
            <span className="font-label-lg text-label-lg text-on-surface">
              Pay Online
            </span>
            {selected === 'RAZORPAY' && (
              <span className="material-symbols-outlined text-primary ml-auto">
                check_circle
              </span>
            )}
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            UPI, cards, net banking via Razorpay. Auto-confirmed instantly.
          </p>
        </button>

        {/* Manual UPI — screenshot proof */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('MANUAL_UPI')}
          className={`p-stack-md rounded-2xl border-2 text-left transition-all ${
            selected === 'MANUAL_UPI'
              ? 'border-primary bg-primary-container'
              : 'border-outline-variant bg-surface-container hover:border-primary/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="flex items-center gap-stack-sm mb-stack-xs">
            <span className="material-symbols-outlined text-primary">
              qr_code_scanner
            </span>
            <span className="font-label-lg text-label-lg text-on-surface">
              UPI / Screenshot
            </span>
            {selected === 'MANUAL_UPI' && (
              <span className="material-symbols-outlined text-primary ml-auto">
                check_circle
              </span>
            )}
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Pay via UPI and upload screenshot. Owner reviews and confirms.
          </p>
        </button>

      </div>
    </div>
  )
}
```

### 11.7 RazorpayCheckoutButton.tsx

**File:** `src/components/payment/RazorpayCheckoutButton.tsx`

```tsx
import { useGatewayPayment, GatewayPaymentState } from '../../hooks/useGatewayPayment'
import { formatCurrency } from '../../utils/formatCurrency'
import Spinner from '../ui/Spinner'

interface RazorpayCheckoutButtonProps {
  orderId: string
  orderNumber: string
  amount: number
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  onSuccess?: () => void
  onFailure?: (error: string) => void
}

const stateLabels: Record<GatewayPaymentState, string> = {
  idle: 'Pay Now',
  creating_order: 'Preparing checkout...',
  checkout_open: 'Complete in Razorpay...',
  verifying: 'Verifying payment...',
  success: 'Payment Successful!',
  failed: 'Payment Failed — Retry',
}

export default function RazorpayCheckoutButton({
  orderId,
  orderNumber,
  amount,
  customerName,
  customerEmail,
  customerPhone,
  onSuccess,
  onFailure,
}: RazorpayCheckoutButtonProps) {
  const { initiatePayment, state, error, isLoading, reset } =
    useGatewayPayment({
      orderId,
      orderNumber,
      amount,
      customerName,
      customerEmail,
      customerPhone,
      onSuccess,
      onFailure,
    })

  const isDisabled = isLoading || state === 'success' || state === 'checkout_open'

  return (
    <div className="space-y-stack-sm">
      <button
        type="button"
        onClick={state === 'failed' ? reset : initiatePayment}
        disabled={isDisabled}
        className={`w-full py-stack-md px-stack-lg rounded-2xl font-label-lg text-label-lg
          flex items-center justify-center gap-stack-sm transition-all
          ${state === 'success'
            ? 'bg-tertiary text-on-tertiary cursor-default'
            : state === 'failed'
            ? 'bg-error text-on-error hover:bg-error/90'
            : 'bg-primary text-on-primary hover:bg-primary/90'
          }
          ${isDisabled && state !== 'failed' ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        {isLoading && <Spinner size="sm" className="text-on-primary" />}
        {state === 'success' && (
          <span className="material-symbols-outlined">check_circle</span>
        )}
        {stateLabels[state]}
        {state === 'idle' && (
          <span className="font-body-sm text-body-sm opacity-80">
            {formatCurrency(amount)}
          </span>
        )}
      </button>

      {error && state === 'failed' && (
        <p className="font-body-sm text-body-sm text-error text-center">
          {error}. Tap above to retry.
        </p>
      )}

      {state === 'checkout_open' && (
        <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
          Complete your payment in the Razorpay window.
        </p>
      )}
    </div>
  )
}
```

### 11.8 OrderDetailPage.tsx — Payment Section Update

Add the following payment section to the existing `OrderDetailPage.tsx`, replacing the bare payment display:

```tsx
// Add imports
import PaymentMethodSelector from '../../components/payment/PaymentMethodSelector'
import RazorpayCheckoutButton from '../../components/payment/RazorpayCheckoutButton'
import PaymentProofUpload from '../../components/payment/PaymentProofUpload'
import { submitPaymentProof } from '../../services/payments.service'
import { PaymentMethod } from '../../types/order.types'

// Add state
const [selectedPaymentMethod, setSelectedPaymentMethod] =
  useState<PaymentMethod | null>(null)
const [proofUrl, setProofUrl] = useState('')
const [transactionId, setTransactionId] = useState('')

// Helper: show payment section?
const showPaymentSection =
  order.paymentStatus === 'PENDING' || order.paymentStatus === 'GATEWAY_INITIATED'

// Payment section JSX (add inside the return, after documents section):
{showPaymentSection && (
  <Card>
    <h2 className="font-headline-md text-headline-md text-primary mb-stack-lg">
      Payment
    </h2>

    <div className="mb-stack-lg">
      <p className="font-body-md text-body-md text-on-surface-variant mb-stack-sm">
        Total amount: <span className="font-label-lg text-on-surface">
          {formatCurrency(order.totalAmount)}
        </span>
      </p>
    </div>

    {!selectedPaymentMethod && (
      <PaymentMethodSelector
        selected={selectedPaymentMethod}
        onChange={setSelectedPaymentMethod}
      />
    )}

    {selectedPaymentMethod === 'RAZORPAY' && (
      <div className="space-y-stack-md">
        <div className="flex items-center gap-stack-sm">
          <button
            type="button"
            onClick={() => setSelectedPaymentMethod(null)}
            className="text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
          </button>
          <span className="font-label-md text-label-md text-on-surface-variant">
            Online Payment
          </span>
        </div>
        <RazorpayCheckoutButton
          orderId={order.id}
          orderNumber={order.orderNumber}
          amount={order.totalAmount}
          customerName={order.customer?.name}
          onSuccess={() => refetch()}
          onFailure={(err) => console.error('Payment failed:', err)}
        />
      </div>
    )}

    {selectedPaymentMethod === 'MANUAL_UPI' && (
      <div className="space-y-stack-md">
        <div className="flex items-center gap-stack-sm">
          <button
            type="button"
            onClick={() => setSelectedPaymentMethod(null)}
            className="text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
          </button>
          <span className="font-label-md text-label-md text-on-surface-variant">
            UPI / Screenshot
          </span>
        </div>
        <PaymentProofUpload onUploadComplete={setProofUrl} />
        {proofUrl && (
          <div className="space-y-stack-sm">
            <input
              type="text"
              placeholder="UTR / Transaction ID (optional)"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              className="w-full p-stack-sm border border-outline-variant rounded-xl
                font-body-md text-body-md focus:border-primary outline-none"
            />
            <button
              type="button"
              onClick={async () => {
                await submitPaymentProof(
                  order.id, proofUrl, 'UPI',
                  order.totalAmount, transactionId
                )
                refetch()
              }}
              className="w-full py-stack-md bg-primary text-on-primary
                rounded-2xl font-label-lg text-label-lg"
            >
              Submit Proof
            </button>
          </div>
        )}
      </div>
    )}
  </Card>
)}

{/* Show payment status for already-processed payments */}
{(order.paymentStatus === 'PAID' || order.paymentStatus === 'VERIFIED') && (
  <Card>
    <div className="flex items-center gap-stack-sm">
      <span className="material-symbols-outlined text-tertiary">check_circle</span>
      <div>
        <p className="font-label-lg text-label-lg text-on-surface">
          Payment Confirmed
        </p>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          {order.payment?.paidAt
            ? `Paid on ${formatDate(order.payment.paidAt)}`
            : order.payment?.verifiedAt
            ? `Verified on ${formatDate(order.payment.verifiedAt)}`
            : 'Payment complete'}
        </p>
      </div>
    </div>
  </Card>
)}
```

---

## 12. State Management Changes

### 12.1 No Zustand Store Changes Required

The existing `auth.store.ts` and `shop.store.ts` do not need changes. Payment state is ephemeral and belongs in component-level state or TanStack Query cache.

### 12.2 TanStack Query Invalidation

After any payment event, invalidate relevant queries to force a re-fetch:

```typescript
// In useGatewayPayment.ts — already included
queryClient.invalidateQueries({ queryKey: ['order', orderId] })
queryClient.invalidateQueries({ queryKey: ['orders'] })
```

The existing `useOrderDetail` and `useOrders` hooks in `useOrders.ts` will automatically re-fetch with updated payment status.

### 12.3 Query Keys Convention

```typescript
// Existing query keys (from useOrders.ts)
['order', orderId]    → single order detail
['orders']            → order list

// No new query keys needed — payment state is embedded in order response
```

---

## 13. Queue Workflow Integration

### 13.1 Impact on QueueService

The owner queue shows `PENDING`, `ACCEPTED`, `IN_PROGRESS`, `DELAYED`, `WAITING_CLARIFICATION` orders. When Razorpay auto-accepts an order (PENDING → ACCEPTED), it will appear in the queue without owner action.

No changes to `QueueService.java` are needed. The existing `getPriorityQueue()` query fetches by status and will naturally include gateway-accepted orders.

### 13.2 Dashboard Stats

`getDashboardStats()` counts `PENDING` and `ACCEPTED` orders. Gateway payments reduce `pendingOrders` (auto-accepted immediately) and increase revenue. No changes needed.

### 13.3 Owner Notification for Auto-Accepted Orders

Add a new notification method to `NotificationService`:

```java
// Add to NotificationService.java

public void notifyGatewayPaymentSuccessToOwner(Order order) {
    try {
        Shop shop = shopRepository.findById(order.getShopId())
            .orElseThrow(() -> new EntityNotFoundException("Shop not found"));
        User owner = userRepository.findById(shop.getOwnerId())
            .orElseThrow(() -> new EntityNotFoundException("Owner not found"));

        String subject = String.format(
            "Auto-accepted: Order %s — Payment received via Razorpay",
            order.getOrderNumber());

        String body = String.format("""
            A new order has been automatically accepted after successful payment.

            Order: %s
            Amount: ₹%s
            Payment: Razorpay (online)

            No action required — the order is now in your queue.

            — PrintFlow""",
            order.getOrderNumber(),
            order.getTotalAmount());

        if (owner.getEmail() != null) {
            emailService.send(owner.getEmail(), subject, body);
            saveNotification(owner.getId(), order.getId(),
                "GATEWAY_PAYMENT_RECEIVED", "EMAIL", subject, body);
        }

        saveNotification(owner.getId(), order.getId(),
            "GATEWAY_PAYMENT_RECEIVED", "IN_APP", subject, body);

    } catch (Exception e) {
        log.error("Failed to notify owner of gateway payment: {}", e.getMessage());
    }
}
```

---

## 14. Notification Integration

### 14.1 Payment Event Notifications Matrix

| Event | Who notified | Channels | Trigger |
|-------|-------------|----------|---------|
| Gateway order created | Nobody | — | Client-side (silent) |
| Payment PAID (verify endpoint) | Customer + Owner | Email + In-App + WhatsApp | `RazorpayService.autoAcceptOrderOnPayment()` |
| Payment PAID (webhook) | Customer + Owner | Email + In-App | `RazorpayService.handlePaymentCaptured()` |
| Payment FAILED | Customer | Email + In-App | `RazorpayService.handlePaymentFailed()` |
| Manual UPI PROOF_UPLOADED | Owner | Email + In-App | `PaymentService.submitProof()` (existing) |
| Manual UPI VERIFIED | Customer | Email + In-App | `PaymentService.verifyPayment()` (existing) |

### 14.2 Customer Payment Success Message

```java
// Add to NotificationService.notifyOrderStatusChange() — ACCEPTED case
// Already sends "Order Accepted" notification
// This covers the Razorpay auto-accept notification path
```

The existing `ACCEPTED` template already covers payment success from the customer's perspective:
> "Your order {orderNumber} has been accepted"

For Razorpay payments, add payment confirmation context in the notification body:

```java
// In NotificationService.java — add new method
@Async("notificationExecutor")
public void notifyCustomerPaymentSuccess(Order order, String gatewayPaymentId) {
    try {
        User customer = userRepository.findById(order.getCustomerId()).orElseThrow();
        Shop shop = shopRepository.findById(order.getShopId()).orElseThrow();

        String subject = String.format("Payment confirmed — Order %s accepted", order.getOrderNumber());
        String body = String.format("""
            Hi %s,

            Your payment has been received and your order is now confirmed!

            Order: %s
            Amount: ₹%s
            Payment ID: %s
            Shop: %s

            We'll notify you when your order starts printing.

            — PrintFlow""",
            customer.getName(), order.getOrderNumber(),
            order.getTotalAmount(), gatewayPaymentId, shop.getName());

        if (customer.getEmail() != null) {
            emailService.send(customer.getEmail(), subject, body);
            saveNotification(customer.getId(), order.getId(),
                "PAYMENT_SUCCESS", "EMAIL", subject, body);
        }
        saveNotification(customer.getId(), order.getId(),
            "PAYMENT_SUCCESS", "IN_APP", subject, body);

    } catch (Exception e) {
        log.error("Failed to send payment success notification: {}", e.getMessage());
    }
}
```

---

## 15. Error Handling Strategy

### 15.1 Error Categories

| Error | HTTP Status | Code | Recovery |
|-------|-------------|------|----------|
| Order not found / access denied | 404 | NOT_FOUND | Show error state |
| Payment already completed | 409 | PAYMENT_ALREADY_COMPLETED | Redirect to order detail |
| Invalid Razorpay signature | 400 | INVALID_PAYMENT_SIGNATURE | Show retry option |
| Razorpay API unavailable | 502 | GATEWAY_ERROR | Show retry with delay |
| Webhook signature mismatch | 200* | — | Log + silently ignore |
| Duplicate webhook | 200* | — | Idempotency key skip |

*Webhooks always return 200 to prevent Razorpay retries.

### 15.2 Frontend Error Handling

The `useGatewayPayment` hook handles all error states:

```typescript
// Error states and UI feedback
'creating_order' → show spinner "Preparing checkout..."
'checkout_open'  → Razorpay modal open, no backend error possible
'verifying'      → show spinner "Verifying payment..."
'failed'         → show error message + retry button
'success'        → show success state + invalidate queries
```

User-facing error messages (avoid technical jargon):

```typescript
const USER_ERRORS: Record<string, string> = {
  INVALID_PAYMENT_SIGNATURE: 'Payment verification failed. Please contact support.',
  GATEWAY_ERROR: 'Payment service is temporarily unavailable. Please try again in a moment.',
  PAYMENT_ALREADY_COMPLETED: 'This order has already been paid.',
  NOT_FOUND: 'Order not found. Please refresh and try again.',
}
```

### 15.3 Razorpay Checkout Dismiss

When the customer closes the Razorpay modal without paying:

```typescript
modal: {
  ondismiss: () => {
    if (state === 'checkout_open') {
      setState('idle')  // Reset to allow retry
    }
  }
}
```

This is already handled in `useGatewayPayment.ts`.

---

## 16. Logging + Monitoring

### 16.1 Structured Logging — RazorpayService

Key log events with appropriate levels:

```java
// INFO level — normal flow
log.info("Razorpay order created: {} for PrintFlow order: {}", razorpayOrderId, orderNumber);
log.info("Payment verified and order auto-accepted: {} (payment: {})", orderNumber, paymentId);
log.info("Webhook: payment captured and order auto-accepted for gateway order: {}", gatewayOrderId);
log.info("Webhook: payment already marked PAID, idempotency key saved: {}", key);
log.info("Duplicate webhook event, skipping: {}", idempotencyKey);

// WARN level — unexpected but handled
log.warn("Payment signature mismatch for order: {}", razorpayOrderId);
log.warn("Webhook signature verification failed. Rejecting.");
log.warn("Webhook received for unknown gateway order: {}", gatewayOrderId);
log.warn("Auto-accept skipped — order {} is in status: {}", orderNumber, status);

// ERROR level — failures
log.error("Razorpay order creation failed for order {}: {}", orderNumber, message);
log.error("Error processing webhook event {}: {}", eventType, message, exception);
log.error("Signature hash computation error: {}", message);
```

### 16.2 Payment Audit Trail

Every payment state change is persisted to the `payments` table:
- `status` column tracks all transitions
- `webhook_payload` stores raw Razorpay JSON (full audit trail)
- `idempotency_key` logs which webhook events were received
- `paid_at` records exact payment timestamp
- `gateway_payment_id` links to Razorpay's own records

### 16.3 Monitoring Checklist

| Metric | What to watch |
|--------|---------------|
| `/api/v1/payments/webhook/razorpay` latency | Should be under 500ms |
| Payment.status = GATEWAY_INITIATED but not PAID after 30min | Possible abandoned checkout |
| InvalidPaymentSignatureException rate | Any spike = potential attack |
| GatewayOrderCreationException rate | Razorpay API health |
| Idempotency key duplicates per day | Normal (Razorpay retries), watch for spikes |

---

## 17. Testing Strategy

### 17.1 Unit Tests — RazorpayService

**File:** `src/test/java/com/printflow/payments/RazorpayServiceTest.java`

```java
@ExtendWith(MockitoExtension.class)
class RazorpayServiceTest {

    @Mock RazorpayClient razorpayClient;
    @Mock RazorpayConfig razorpayConfig;
    @Mock PaymentRepository paymentRepository;
    @Mock OrderRepository orderRepository;
    @Mock NotificationService notificationService;

    @InjectMocks RazorpayService razorpayService;

    @Test
    void createGatewayOrder_success() {
        // Given
        UUID orderId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        Order order = buildTestOrder(orderId, customerId, "PENDING");
        when(orderRepository.findByIdAndCustomerId(orderId, customerId))
            .thenReturn(Optional.of(order));
        when(paymentRepository.existsPaidPaymentForOrder(orderId)).thenReturn(false);
        // Mock Razorpay SDK call...

        // When
        GatewayOrderResponse result = razorpayService.createGatewayOrder(orderId, customerId);

        // Then
        assertNotNull(result.gatewayOrderId());
        assertEquals(order.getTotalAmount(), result.amount());
    }

    @Test
    void createGatewayOrder_alreadyPaid_throws() {
        // Given
        UUID orderId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        when(orderRepository.findByIdAndCustomerId(any(), any()))
            .thenReturn(Optional.of(buildTestOrder(orderId, customerId, "PENDING")));
        when(paymentRepository.existsPaidPaymentForOrder(orderId)).thenReturn(true);

        // Then
        assertThrows(PaymentAlreadyCompletedException.class,
            () -> razorpayService.createGatewayOrder(orderId, customerId));
    }

    @Test
    void verifyPayment_invalidSignature_throws() {
        // Given a payment with gateway order ID
        Payment payment = buildGatewayPayment("order_test123");
        when(paymentRepository.findByGatewayOrderId("order_test123"))
            .thenReturn(Optional.of(payment));
        when(orderRepository.findByIdAndCustomerId(any(), any()))
            .thenReturn(Optional.of(buildTestOrder(payment.getOrderId(), UUID.randomUUID(), "PENDING")));
        when(razorpayConfig.getKeySecret()).thenReturn("test_secret");

        VerifyGatewayPaymentRequest request = new VerifyGatewayPaymentRequest(
            "order_test123", "pay_test456", "invalid_signature");

        // Then
        assertThrows(InvalidPaymentSignatureException.class,
            () -> razorpayService.verifyPayment(request, UUID.randomUUID()));
    }

    @Test
    void processWebhookEvent_duplicateEvent_skipped() {
        // Given idempotency key already exists
        String idempotencyKey = "order_test123:payment.captured";
        when(paymentRepository.existsByIdempotencyKey(idempotencyKey)).thenReturn(true);

        JSONObject payload = buildWebhookPayload("order_test123", "pay_test456");

        // When
        razorpayService.processWebhookEvent("payment.captured", payload);

        // Then — no payment updates should happen
        verify(paymentRepository, never()).save(any());
    }
}
```

### 17.2 MockMvc Integration Tests

**File:** `src/test/java/com/printflow/payments/PaymentControllerTest.java`

```java
@SpringBootTest
@AutoConfigureMockMvc
class PaymentControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean RazorpayService razorpayService;

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void createGatewayOrder_returns200() throws Exception {
        GatewayOrderResponse mockResponse = new GatewayOrderResponse(
            "order_test123", BigDecimal.valueOf(250), "INR",
            "rzp_test_xxx", "PF-001", UUID.randomUUID().toString());

        when(razorpayService.createGatewayOrder(any(), any())).thenReturn(mockResponse);

        mockMvc.perform(post("/api/v1/payments/{orderId}/gateway-order",
                UUID.randomUUID())
            .header("Authorization", "Bearer test-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.gatewayOrderId").value("order_test123"))
            .andExpect(jsonPath("$.data.currency").value("INR"));
    }

    @Test
    void webhookEndpoint_noAuth_returns200() throws Exception {
        // Webhook must be accessible without JWT
        mockMvc.perform(post("/api/v1/payments/webhook/razorpay")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"event\":\"payment.captured\"}")
            .header("X-Razorpay-Signature", "test_signature"))
            .andExpect(status().isOk());
    }
}
```

### 17.3 Webhook Testing with Razorpay CLI

```bash
# Install Razorpay CLI
# Trigger test events locally
razorpay webhook trigger payment.captured \
  --webhook-url http://localhost:8080/api/v1/payments/webhook/razorpay
```

### 17.4 Manual QA Checklist

```
Gateway Payment Flow:
□ Customer creates order
□ Customer selects "Pay Online"
□ POST /gateway-order returns gatewayOrderId
□ Razorpay modal opens
□ Customer completes payment (use Razorpay test card: 4111 1111 1111 1111)
□ POST /verify succeeds
□ Order status changes to ACCEPTED
□ Customer sees "Payment Confirmed" UI
□ Owner receives email notification
□ Owner sees order in queue

Failure Flow:
□ Customer selects "Pay Online"
□ Customer closes Razorpay modal without paying
□ UI resets to payment selector (not stuck in loading)
□ Customer can retry payment

Manual UPI Flow (must still work):
□ Customer selects "UPI / Screenshot"
□ Customer uploads screenshot
□ POST /proof succeeds
□ Owner sees proof_uploaded notification
□ Owner verifies via dashboard
□ Order moves to ACCEPTED

Idempotency:
□ Trigger same webhook event twice
□ Second event is silently ignored (check logs)
□ Payment status unchanged (still PAID, not duplicated)

Security:
□ POST /gateway-order without JWT returns 401
□ POST /verify without JWT returns 401
□ POST /webhook with wrong signature returns 200 (silent reject, check logs)
□ Customer cannot pay for another customer's order
```

---

## 18. Deployment Strategy

### 18.1 Environment Variables

Add to production environment (Neon/Railway/Render):

```bash
# Razorpay credentials
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# For test environment:
# RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxxxx
# RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

### 18.2 pom.xml — Add Razorpay Dependency

```xml
<!-- Add to pom.xml dependencies -->
<dependency>
    <groupId>com.razorpay</groupId>
    <artifactId>razorpay-java</artifactId>
    <version>1.4.4</version>
</dependency>
```

### 18.3 Razorpay Dashboard Setup

1. Log in to dashboard.razorpay.com
2. Go to Settings → Webhooks → Add New Webhook
3. URL: `https://your-domain.com/api/v1/payments/webhook/razorpay`
4. Secret: generate a strong random string → set as `RAZORPAY_WEBHOOK_SECRET`
5. Events to subscribe:
   - `payment.captured`
   - `payment.failed`
6. Active: Yes

### 18.4 Flyway Migration Order

```
Current state: V14 exists
Next migration: V15__add_gateway_payment_support.sql
File location: src/main/resources/db/migration/V15__add_gateway_payment_support.sql
```

Flyway runs automatically on application startup. The migration is backward compatible — all new columns are nullable.

### 18.5 Deployment Checklist

```
Pre-deployment:
□ V15 migration SQL reviewed and tested on staging
□ RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET set in env
□ Razorpay webhook URL configured in dashboard
□ Razorpay test mode verified working end-to-end
□ pom.xml razorpay dependency added and build successful
□ Razorpay checkout.js script added to index.html
□ razorpay.d.ts type declarations in place

Deployment:
□ Deploy backend (Flyway V15 runs automatically)
□ Verify /actuator/health returns UP
□ Deploy frontend

Post-deployment:
□ Trigger a test payment in production (small amount, use live keys)
□ Verify webhook received and processed (check logs)
□ Verify order auto-accepted after payment
□ Verify email notification sent to both customer and owner
□ Verify Manual UPI flow still works (no regression)
```

---

## 19. Production Hardening

### 19.1 Idempotency (Already Covered)

- `idempotency_key` column with UNIQUE constraint
- `existsByIdempotencyKey()` check before every webhook processing
- Client-side `verifyPayment` is also idempotent (re-checking PAID status)

### 19.2 Timeout Handling

Add connection timeout configuration for Razorpay:

```java
// In RazorpayConfig.java — add after RazorpayClient creation
razorpayClient.setTimeout(10000); // 10 second timeout
```

If Razorpay API times out during `createGatewayOrder`, the `GatewayOrderCreationException` is thrown and the frontend shows a user-friendly error. The order is not affected.

### 19.3 Abandoned Payments

Payments stuck in `GATEWAY_INITIATED` status (customer opened checkout but never completed) can be identified with:

```sql
SELECT * FROM payments
WHERE status = 'GATEWAY_INITIATED'
  AND created_at < NOW() - INTERVAL '1 hour';
```

These can be reset to `PENDING` via a scheduled job (future enhancement). For now, the customer can simply click "Pay Online" again — a new gateway order will be created.

### 19.4 CORS Configuration

The existing `CorsConfig.java` allows the frontend origin. The webhook endpoint is called by Razorpay's servers directly, not from a browser — no CORS configuration needed for webhooks.

### 19.5 Rate Limiting (Future)

For production hardening, consider adding rate limiting on the webhook endpoint using Spring's `RateLimiter` or a filter. Razorpay sends at most a few events per payment. Spike protection can use a simple counter per IP.

### 19.6 Secret Rotation Plan

Razorpay webhook secrets can be rotated:
1. Generate new webhook secret in Razorpay dashboard
2. Update `RAZORPAY_WEBHOOK_SECRET` env var
3. Redeploy (zero downtime — old webhooks may fail for ~1 minute during transition)
4. For zero-downtime rotation: accept both old and new signatures during transition period (future enhancement)

---

## 20. Step-by-Step Implementation Order

Follow this exact sequence to avoid breaking changes and compilation errors.

```
PHASE 1 — Database (No code yet)
─────────────────────────────────
Step 1.  Create V15__add_gateway_payment_support.sql
Step 2.  Test migration on local PostgreSQL
Step 3.  Verify no existing data is affected

PHASE 2 — Backend Enums (no dependencies)
──────────────────────────────────────────
Step 4.  Create PaymentGateway.java enum
Step 5.  Create PaymentStatus.java enum

PHASE 3 — Entity + Repository
───────────────────────────────
Step 6.  Update Payment.java entity (add gateway fields)
Step 7.  Update Order.java entity (add paymentMethod field)
Step 8.  Update PaymentRepository.java (add gateway queries)
Step 9.  Run tests — OrderStatusTransitionsTest, PriceCalculationServiceTest must still pass

PHASE 4 — DTOs + Exceptions
─────────────────────────────
Step 10. Create CreateGatewayOrderRequest.java
Step 11. Create GatewayOrderResponse.java
Step 12. Create VerifyGatewayPaymentRequest.java
Step 13. Create PaymentResponse.java
Step 14. Create PaymentAlreadyCompletedException.java
Step 15. Create InvalidPaymentSignatureException.java
Step 16. Create GatewayOrderCreationException.java
Step 17. Register exceptions in GlobalExceptionHandler.java

PHASE 5 — Config + Dependencies
─────────────────────────────────
Step 18. Add razorpay-java to pom.xml
Step 19. Run: mvn dependency:resolve
Step 20. Create RazorpayConfig.java
Step 21. Add razorpay.* properties to application.yml

PHASE 6 — Service Layer
─────────────────────────
Step 22. Create RazorpayService.java (full implementation)
Step 23. Update PaymentService.java (add delegation methods)
Step 24. Add notifyGatewayPaymentSuccessToOwner() to NotificationService.java
Step 25. Add notifyCustomerPaymentSuccess() to NotificationService.java

PHASE 7 — Controller Layer
───────────────────────────
Step 26. Update PaymentController.java (add two new endpoints)
Step 27. Create RazorpayWebhookController.java
Step 28. Update SecurityConfig.java (add webhook public path)

PHASE 8 — Backend Tests
─────────────────────────
Step 29. Create RazorpayServiceTest.java
Step 30. Create PaymentControllerTest.java
Step 31. Run all tests: mvn test

PHASE 9 — Frontend Types + Service
────────────────────────────────────
Step 32. Update order.types.ts (add gateway payment fields)
Step 33. Create src/types/razorpay.d.ts
Step 34. Update payments.service.ts (add gateway functions)
Step 35. Add Razorpay checkout.js to index.html

PHASE 10 — Frontend Components
────────────────────────────────
Step 36. Create PaymentMethodSelector.tsx
Step 37. Create RazorpayCheckoutButton.tsx
Step 38. Create useGatewayPayment.ts hook
Step 39. Update OrderDetailPage.tsx (add payment section)

PHASE 11 — Integration Testing
────────────────────────────────
Step 40. Test full Razorpay payment flow (test keys)
Step 41. Test Manual UPI flow regression
Step 42. Test webhook with Razorpay CLI
Step 43. Test duplicate webhook idempotency
Step 44. Run complete QA checklist (Section 17.4)

PHASE 12 — Deployment
───────────────────────
Step 45. Set Razorpay env vars in production
Step 46. Configure Razorpay webhook in dashboard
Step 47. Deploy backend (V15 Flyway migration runs)
Step 48. Deploy frontend
Step 49. Smoke test production payment with live keys
```

---

## 21. File Manifest

### New Files

| File | Type | Purpose |
|------|------|---------|
| `db/migration/V15__add_gateway_payment_support.sql` | SQL | Adds gateway columns to payments + orders |
| `payments/enums/PaymentGateway.java` | Enum | MANUAL_UPI / RAZORPAY |
| `payments/enums/PaymentStatus.java` | Enum | Full payment status state machine |
| `payments/config/RazorpayConfig.java` | Config | Razorpay SDK bean + credentials |
| `payments/dto/GatewayOrderResponse.java` | DTO | POST /gateway-order response |
| `payments/dto/CreateGatewayOrderRequest.java` | DTO | POST /gateway-order request (empty) |
| `payments/dto/VerifyGatewayPaymentRequest.java` | DTO | POST /verify request |
| `payments/dto/PaymentResponse.java` | DTO | Generic payment response |
| `payments/exception/PaymentAlreadyCompletedException.java` | Exception | 409 guard |
| `payments/exception/InvalidPaymentSignatureException.java` | Exception | 400 signature failure |
| `payments/exception/GatewayOrderCreationException.java` | Exception | 502 gateway failure |
| `payments/service/RazorpayService.java` | Service | Gateway abstraction layer |
| `payments/controller/RazorpayWebhookController.java` | Controller | Webhook receiver |
| `src/types/razorpay.d.ts` | TypeScript | Razorpay SDK type declarations |
| `src/hooks/useGatewayPayment.ts` | React Hook | Razorpay checkout state machine |
| `src/components/payment/PaymentMethodSelector.tsx` | Component | Method selection UI |
| `src/components/payment/RazorpayCheckoutButton.tsx` | Component | Checkout trigger button |

### Modified Files

| File | Changes |
|------|---------|
| `payments/entity/Payment.java` | Add gateway, PaymentStatus enum, gateway fields |
| `payments/repository/PaymentRepository.java` | Add gateway lookup queries |
| `payments/service/PaymentService.java` | Add createGatewayOrder + verifyGatewayPayment delegation |
| `payments/controller/PaymentController.java` | Add /gateway-order + /verify endpoints |
| `orders/entity/Order.java` | Add paymentMethod field |
| `common/config/SecurityConfig.java` | Add webhook public path |
| `notifications/service/NotificationService.java` | Add gateway payment notification methods |
| `src/services/payments.service.ts` | Add createGatewayOrder + verifyGatewayPayment |
| `src/types/order.types.ts` | Add gateway payment type fields |
| `src/pages/customer/OrderDetailPage.tsx` | Add payment method + gateway checkout section |
| `index.html` | Add Razorpay checkout.js script |
| `pom.xml` | Add razorpay-java dependency |
| `application.yml` | Add razorpay.* config properties |

### Unchanged Files (Verified No Changes Needed)

| File | Reason |
|------|--------|
| `auth/` (all files) | Auth pipeline unchanged |
| `orders/service/OrderService.java` | Order creation unchanged |
| `orders/service/OrderStatusTransitions.java` | Status FSM unchanged |
| `payments/dto/SubmitProofRequest.java` | Manual UPI DTO unchanged |
| `payments/dto/VerifyPaymentRequest.java` | Manual UPI verify DTO unchanged |
| `queue/service/QueueService.java` | Queue queries work with new status |
| `components/payment/PaymentProofUpload.tsx` | Manual UPI component unchanged |
| `store/auth.store.ts` | No payment state in auth store |
| `store/shop.store.ts` | No payment state in shop store |
| `hooks/useOrders.ts` | Existing queries still work |
| `services/orders.service.ts` | No payment changes needed here |

---

*Document generated from live codebase analysis of PrintFlow commit 18d5449 (ui-redesign branch).*  
*Stack: Java 21 · Spring Boot 3.2.5 · PostgreSQL 17 · Flyway V14→V15 · React 18 + TypeScript*  
*Gateway: Razorpay (Primary) · Manual UPI (Preserved)*
