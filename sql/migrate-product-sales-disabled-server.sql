-- Migrarea 19: „Oprește vânzarea” pe produs + stocul retururilor aflate încă pe drum.
-- Rulează pe baza vbpnetmf_shoptop (phpMyAdmin), O SINGURĂ DATĂ, înainte de a urca API-ul nou.

-- 1) Vânzare oprită manual din admin: produsul dispare din magazin, checkout-ul îl refuză,
--    feed-urile (Facebook, Google) îl trimit „out of stock” cu cantitate 0, BaseLinker primește stoc 0.
ALTER TABLE `products`
  ADD COLUMN `sales_disabled` TINYINT(1) NOT NULL DEFAULT 0 AFTER `stock_qty`;

-- 2) Retururi încă pe drum spre depozit (comanda e „returnată”, dar coletul nu a fost recepționat).
--    Până acum stocul lor era adăugat înapoi imediat. De acum revine abia la recepție,
--    așa că scădem acum ce fusese adăugat prea devreme și marcăm stocul ca „ținut”.
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
