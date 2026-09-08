USE vbpnetmf_shoptop;

-- Migrare: elimina definitiv coloana market_observations (fostele „surse online” /
-- „pret propus”). Run this ONCE in phpMyAdmin pe server.
--
-- ATENTIE: pasul de mai jos sterge coloana si toate datele din ea. Fa un backup
-- (export) inainte daca vrei sa poti reveni.

ALTER TABLE products
  DROP COLUMN market_observations;
