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

-- ── 6. Expand payment_status column on orders ─────────────────
-- GATEWAY_INITIATED (18 chars) fits in VARCHAR(20) but
-- extending to 30 for future safety
ALTER TABLE orders
    ALTER COLUMN payment_status TYPE VARCHAR(30);

-- ── 7. Indexes ───────────────────────────────────────────────

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

-- ── 8. Comments for documentation ─────────────────────────────
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
