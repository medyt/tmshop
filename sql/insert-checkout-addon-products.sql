-- Produse addon checkout (SKU pe AWB / factură / BaseLinker).
-- S000 = Produs surpriză | D000 = Deschidere colet | A000 = Garanție extinsă 1 an | L000 = Livrare prioritară | T000 = Transport
-- Nu apar în catalogul public (filtrate în products.php); nu scad stoc la comandă.

USE shoptop;

INSERT INTO products (
  id, name, slug, category, sku,
  purchase_price, sale_price, discount_percent, stock_qty,
  image_urls, description, notes
) VALUES
(
  'S000',
  'Produs surpriza',
  'produs-surpriza',
  'Checkout addon',
  'S000',
  0.00, 15.00, 0.00, 9999,
  '[]',
  'Produs surpriza adaugat la checkout. Cod SKU S000 pe AWB/factura.',
  'Addon checkout — stoc virtual, nu se scade automat.'
),
(
  'D000',
  'Deschidere colet',
  'deschidere-colet',
  'Checkout addon',
  'D000',
  0.00, 4.99, 0.00, 9999,
  '[]',
  'Serviciu deschidere colet la livrare. Cod SKU D000 pe AWB/factura.',
  'Addon checkout — stoc virtual, nu se scade automat.'
),
(
  'A000',
  'Garantie extinsa 1 an',
  'garantie-extinsa-1-an',
  'Checkout addon',
  'A000',
  0.00, 19.99, 0.00, 9999,
  '[]',
  'Extinde garantia produsului cu inca 1 an. Cod SKU A000 pe AWB/factura.',
  'Addon checkout — stoc virtual, nu se scade automat.'
),
(
  'L000',
  'Livrare prioritata',
  'livrare-prioritata',
  'Checkout addon',
  'L000',
  0.00, 4.99, 0.00, 9999,
  '[]',
  'Livrare prioritara. Cod SKU L000 pe AWB/factura.',
  'Addon checkout — stoc virtual, nu se scade automat.'
),
(
  'T000',
  'Transport curier',
  'transport-curier',
  'Checkout addon',
  'T000',
  0.00, 19.99, 0.00, 9999,
  '[]',
  'Transport curier pe factura SmartBill. Cod SKU T000. Nu apare in catalog.',
  'Addon checkout — stoc virtual, nu se scade automat. Pretul real vine din shipping_flat_rate.'
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  slug = VALUES(slug),
  category = VALUES(category),
  sku = VALUES(sku),
  sale_price = VALUES(sale_price),
  discount_percent = VALUES(discount_percent),
  stock_qty = VALUES(stock_qty),
  description = VALUES(description),
  notes = VALUES(notes);
