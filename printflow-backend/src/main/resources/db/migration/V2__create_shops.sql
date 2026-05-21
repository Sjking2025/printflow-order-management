CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    whatsapp VARCHAR(20),
    is_open BOOLEAN NOT NULL DEFAULT TRUE,
    closure_mode VARCHAR(50),
    closure_msg TEXT,
    closure_until TIMESTAMPTZ,
    lock_timer_mins INT NOT NULL DEFAULT 5,
    upi_id VARCHAR(100),
    qr_code_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shops_owner_id ON shops(owner_id);
