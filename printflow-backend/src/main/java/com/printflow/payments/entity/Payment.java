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
    // Replaces the old 'method' string field — identifies MANUAL_UPI vs RAZORPAY
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

    // ── Legacy fields (kept for backward compat — DB columns remain) ──────
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

    /**
     * Returns true if this payment has been successfully completed,
     * regardless of whether it was Manual UPI (VERIFIED) or Razorpay (PAID).
     */
    public boolean isPaid() {
        return PaymentStatus.PAID.equals(this.status)
            || PaymentStatus.VERIFIED.equals(this.status);
    }

    /**
     * Returns true if this payment was made via Razorpay gateway.
     */
    public boolean isGatewayPayment() {
        return PaymentGateway.RAZORPAY.equals(this.gateway);
    }
}
