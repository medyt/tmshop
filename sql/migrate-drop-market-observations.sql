USE shoptop;

-- Migrare locala: elimina definitiv coloana market_observations (fostele „surse
-- online” / „pret propus”). Run this ONCE in phpMyAdmin local.
--
-- ATENTIE: pasul de mai jos sterge coloana si toate datele din ea.

ALTER TABLE products
  DROP COLUMN market_observations;
