ALTER TABLE shops ADD COLUMN copy_modify_window_mins INT NOT NULL DEFAULT 5;

ALTER TABLE orders ADD COLUMN copy_modify_expires_at TIMESTAMPTZ;

ALTER TABLE order_documents ADD COLUMN copies_modified_at TIMESTAMPTZ;
