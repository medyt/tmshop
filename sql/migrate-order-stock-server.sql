USE vbpnetmf_shoptop;

ALTER TABLE orders
  ADD COLUMN stock_applied TINYINT(1) NOT NULL DEFAULT 0 AFTER status;

UPDATE orders
SET stock_applied = 1
WHERE status <> 'cancelled';
