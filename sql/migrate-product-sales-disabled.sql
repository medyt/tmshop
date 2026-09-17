-- Varianta locală (baza `shoptop`) a lui migrate-product-sales-disabled-server.sql.
USE `shoptop`;

ALTER TABLE `products`
  ADD COLUMN `sales_disabled` TINYINT(1) NOT NULL DEFAULT 0 AFTER `stock_qty`;

UPDATE `products` p
JOIN (
  SELECT oi.product_id, SUM(oi.quantity) AS qty
  FROM `order_items` oi
  JOIN `orders` o ON o.id = oi.order_id
  WHERE o.status = 'returned' AND o.return_received = 0 AND o.stock_applied = 0
  GROUP BY oi.product_id
) r ON r.product_id = p.id
SET p.stock_qty = GREATEST(0, CAST(p.stock_qty AS SIGNED) - r.qty);

UPDATE `orders`
SET stock_applied = 1
WHERE status = 'returned' AND return_received = 0 AND stock_applied = 0;
