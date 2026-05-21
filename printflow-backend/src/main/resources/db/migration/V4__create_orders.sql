CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id),
    customer_id UUID NOT NULL REFERENCES users(id),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    urgency VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    expected_delivery TIMESTAMPTZ,
    description TEXT,
    total_amount NUMERIC(10,2),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    delay_reason TEXT,
    delay_until TIMESTAMPTZ,
    lock_expires_at TIMESTAMPTZ,
    processing_started_at TIMESTAMPTZ,
    cancelled_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_shop_id ON orders(shop_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_urgency ON orders(urgency);
CREATE INDEX idx_orders_expected_delivery ON orders(expected_delivery);
CREATE INDEX idx_orders_created_at ON orders(created_at);
