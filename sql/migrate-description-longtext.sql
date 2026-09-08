USE shoptop;

-- Migrare: mareste coloana `description` de la TEXT (max 64 KB) la LONGTEXT
-- (max 4 GB). Necesar pentru descrieri HTML cu imagini base64, care depasesc
-- usor limita de 64 KB si erau TAIATE ("cast doar la o bucata") la salvare.
-- Run this ONCE (baza locala).

ALTER TABLE products
  MODIFY COLUMN description LONGTEXT NULL;
