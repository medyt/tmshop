USE vbpnetmf_shoptop;

-- Migrare: inlocuieste modelul cu doi furnizori (Elena/Basel) cu un singur
-- pret de achizitie. Run this ONCE in phpMyAdmin on server.
--
-- ATENTIE: pasul 3 sterge definitiv coloanele supplier_price_a, supplier_price_b
-- si cost_supplier. Fa un backup (export) inainte daca vrei sa poti reveni.

-- 1) Adauga noua coloana de pret achizitie.
ALTER TABLE products
  ADD COLUMN purchase_price DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER sku;

-- 2) Copiaza valoarea folosita anterior drept cost in purchase_price.
UPDATE products SET purchase_price = CASE
  WHEN cost_supplier = 'A' THEN supplier_price_a
  WHEN cost_supplier = 'B' THEN supplier_price_b
  WHEN supplier_price_a > 0 AND supplier_price_b > 0 THEN LEAST(supplier_price_a, supplier_price_b)
  WHEN supplier_price_a > 0 THEN supplier_price_a
  ELSE supplier_price_b
END;

-- 3) Sterge coloanele vechi (DISTRUCTIV).
ALTER TABLE products
  DROP COLUMN supplier_price_a,
  DROP COLUMN supplier_price_b,
  DROP COLUMN cost_supplier;
