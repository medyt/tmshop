USE shoptop;

ALTER TABLE orders
  ADD COLUMN delivery_method VARCHAR(16) NOT NULL DEFAULT 'courier' AFTER delivery_carrier;
