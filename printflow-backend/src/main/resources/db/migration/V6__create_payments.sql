CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    amount NUMERIC(10,2) NOT NULL,
    method VARCHAR(30),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    proof_url TEXT,
    razorpay_id VARCHAR(255),
    razorpay_sig TEXT,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
