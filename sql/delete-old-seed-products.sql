USE shoptop;

-- Sterge produsele demo vechi (cele importate din seed), dar PASTREAZA mop + piscina
-- (adaugate manual) si A001. Run this ONCE in phpMyAdmin local.
--
-- ATENTIE: DELETE este DISTRUCTIV. Fa un export/backup inainte.

DELETE FROM products
WHERE id LIKE 'seed-%'
  AND id NOT IN (
    'seed-magic-mop-360-basel',
    'seed-inflatable-pool-family-basel'
  );

-- ALTERNATIVA 1 — sterge TOATE produsele cu prefix seed- (inclusiv mop + piscina);
-- ramane doar A001:
--   DELETE FROM products WHERE id LIKE 'seed-%';

-- ALTERNATIVA 2 — sterge toate produsele nefinalizate (sale_price = 0):
--   DELETE FROM products WHERE sale_price = 0;
