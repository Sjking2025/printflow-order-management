ALTER TABLE payments ADD COLUMN transaction_id VARCHAR(100);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);