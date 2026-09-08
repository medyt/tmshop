USE shoptop;

ALTER TABLE orders
  ADD COLUMN return_received TINYINT(1) NOT NULL DEFAULT 0 AFTER courier_status_at;

UPDATE orders
SET return_received = 1
WHERE status = 'returned'
  AND return_received = 0
  AND (
    courier_status LIKE '%eturnat la expeditor%'
    OR courier_status LIKE '%eturnat expeditorului%'
  );
