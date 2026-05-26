-- ============================================================
-- V16__fix_enum_column_types.sql
-- Changes Postgres ENUM columns to VARCHAR to match Hibernate
-- @Enumerated(EnumType.STRING) mapping (stores as plain text)
-- ============================================================

-- Fix orders.payment_method: payment_gateway ENUM -> VARCHAR(20)
ALTER TABLE orders
    ALTER COLUMN payment_method TYPE VARCHAR(20)
    USING payment_method::text;

-- Fix payments.gateway: payment_gateway ENUM -> VARCHAR(20)
ALTER TABLE payments
    ALTER COLUMN gateway TYPE VARCHAR(20)
    USING gateway::text;
