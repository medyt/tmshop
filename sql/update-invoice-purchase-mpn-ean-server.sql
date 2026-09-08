USE vbpnetmf_shoptop;

-- Actualizare pret de achizitie + MPN/EAN pe baza facturii furnizorului (pag. 1/2, A001-A024)
-- Run this in phpMyAdmin on server
--
-- Reguli:
--   purchase_price = pret unitar de pe factura * 1.21 (TVA 21%), rotunjit la 2 zecimale
--   mpn = codul furnizor de pe factura
--   ean = id-ul nostru intern (A001, A002, ...)
--
-- Nota: factura este pag. 1 din 2 - contine doar A001-A024. Restul produselor
--       (daca exista pe pag. 2) trebuie adaugate separat cand avem imaginea.

UPDATE products SET mpn = 'SUP2294',    ean = 'A001', purchase_price = 3.00  WHERE id = 'A001';
UPDATE products SET mpn = 'CLPDO10',    ean = 'A002', purchase_price = 13.01 WHERE id = 'A002';
UPDATE products SET mpn = 'WSE8609',    ean = 'A003', purchase_price = 5.01  WHERE id = 'A003';
UPDATE products SET mpn = 'KRIV254-15', ean = 'A004', purchase_price = 18.02 WHERE id = 'A004';
UPDATE products SET mpn = '58-36',      ean = 'A005', purchase_price = 14.01 WHERE id = 'A005';
UPDATE products SET mpn = 'ACP2015',    ean = 'A006', purchase_price = 24.02 WHERE id = 'A006';
UPDATE products SET mpn = 'RMR1101',    ean = 'A007', purchase_price = 18.02 WHERE id = 'A007';
UPDATE products SET mpn = 'RRP0012',    ean = 'A008', purchase_price = 10.01 WHERE id = 'A008';
UPDATE products SET mpn = 'P514957',    ean = 'A009', purchase_price = 35.01 WHERE id = 'A009';
UPDATE products SET mpn = 'CTR2706',    ean = 'A010', purchase_price = 16.01 WHERE id = 'A010';
UPDATE products SET mpn = 'FTL0002',    ean = 'A011', purchase_price = 8.01  WHERE id = 'A011';
UPDATE products SET mpn = 'POS2008',    ean = 'A012', purchase_price = 20.00 WHERE id = 'A012';
UPDATE products SET mpn = 'ERR0001',    ean = 'A013', purchase_price = 5.01  WHERE id = 'A013';
UPDATE products SET mpn = 'WST1857',    ean = 'A014', purchase_price = 34.36 WHERE id = 'A014';
UPDATE products SET mpn = 'KRIV155-6',  ean = 'A015', purchase_price = 8.01  WHERE id = 'A015';
UPDATE products SET mpn = 'BSL101-44',  ean = 'A016', purchase_price = 14.01 WHERE id = 'A016';
UPDATE products SET mpn = 'OPR2168',    ean = 'A017', purchase_price = 28.01 WHERE id = 'A017';
UPDATE products SET mpn = 'RAS2778',    ean = 'A018', purchase_price = 18.00 WHERE id = 'A018';
UPDATE products SET mpn = 'MSW1963',    ean = 'A019', purchase_price = 17.00 WHERE id = 'A019';
UPDATE products SET mpn = 'ODB2957',    ean = 'A020', purchase_price = 20.00 WHERE id = 'A020';
UPDATE products SET mpn = 'MCS2129',    ean = 'A021', purchase_price = 20.00 WHERE id = 'A021';
UPDATE products SET mpn = 'BSL116-26',  ean = 'A022', purchase_price = 15.00 WHERE id = 'A022';
UPDATE products SET mpn = 'TBD1029',    ean = 'A023', purchase_price = 21.02 WHERE id = 'A023';
UPDATE products SET mpn = 'FAR1191',    ean = 'A024', purchase_price = 15.02 WHERE id = 'A024';

-- Verificare
SELECT id, sku, mpn, ean, purchase_price FROM products WHERE id BETWEEN 'A001' AND 'A024' ORDER BY id;
