USE shoptop;

ALTER TABLE orders
  ADD COLUMN awb_number VARCHAR(32) NULL AFTER total_amount,
  ADD COLUMN awb_issued_at TIMESTAMP NULL AFTER awb_number,
  ADD UNIQUE KEY uq_orders_awb_number (awb_number);
