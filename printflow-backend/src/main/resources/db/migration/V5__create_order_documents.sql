CREATE TABLE order_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    file_name VARCHAR(500) NOT NULL,
    file_url TEXT NOT NULL,
    file_size_kb INT,
    page_count INT,
    copies INT NOT NULL DEFAULT 1,
    print_type VARCHAR(10) NOT NULL DEFAULT 'BW',
    side_type VARCHAR(10) NOT NULL DEFAULT 'SINGLE',
    paper_size VARCHAR(10) NOT NULL DEFAULT 'A4',
    binding VARCHAR(20) NOT NULL DEFAULT 'NONE',
    lamination VARCHAR(20) NOT NULL DEFAULT 'NONE',
    notes TEXT,
    unit_price NUMERIC(10,2),
    subtotal NUMERIC(10,2),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_documents_order_id ON order_documents(order_id);
