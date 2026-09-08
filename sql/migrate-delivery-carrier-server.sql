ALTER TABLE orders
  ADD COLUMN delivery_carrier VARCHAR(32) NULL AFTER awb_issued_at;
