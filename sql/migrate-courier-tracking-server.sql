-- Server: status tracking curier pe orders (fără USE)
ALTER TABLE orders
  ADD COLUMN courier_status VARCHAR(64) NULL AFTER awb_issued_at,
  ADD COLUMN courier_status_at TIMESTAMP NULL AFTER courier_status;
