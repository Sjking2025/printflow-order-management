CREATE TABLE price_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL UNIQUE REFERENCES shops(id),
    bw_per_page_a4 NUMERIC(10,2) NOT NULL DEFAULT 0.50,
    color_per_page_a4 NUMERIC(10,2) NOT NULL DEFAULT 5.00,
    a3_multiplier NUMERIC(5,2) NOT NULL DEFAULT 2.00,
    double_side_discount NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    spiral_binding_flat NUMERIC(10,2) NOT NULL DEFAULT 30.00,
    staple_flat NUMERIC(10,2) NOT NULL DEFAULT 5.00,
    lamination_per_page NUMERIC(10,2) NOT NULL DEFAULT 10.00,
    urgency_high_fee NUMERIC(10,2) NOT NULL DEFAULT 20.00,
    urgency_critical_fee NUMERIC(10,2) NOT NULL DEFAULT 50.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
