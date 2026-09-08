USE vbpnetmf_shoptop;

-- Produs nou A004: Răzătoare / feliator fructe și legume 12 piese, cu mâner de protecție
-- Cod produs intern: A004 | Cod furnizor: KRIV254-15 | Ambalare: 24 buc/bax
-- Sursa denumire/descriere/poze: furnizor wisebuy.ro (produs 448)
-- Run this in phpMyAdmin on server (dupa migrarea la purchase_price).
--
-- purchase_price = 14.89 RON, sale_price = 59.00 RON (pret pagina furnizorului),
-- discount_percent 63 => pret taiat ~159 RON. Apare in magazin (stock_qty 216 > 0).

INSERT INTO products (
    id, name, sku,
    purchase_price,
    sale_price, discount_percent, stock_qty,
    image_urls, description, notes
) VALUES (
    'A004',
    'Răzătoare / feliator fructe și legume 12 piese, cu mâner de protecție',
    'A004',
    14.89,
    59.00, 63, 216,
    '["https://admin.wisebuy.ro/uploads/prod_a/448-2584.jpg","https://admin.wisebuy.ro/uploads/prod_b/448-2592.jpg","https://admin.wisebuy.ro/uploads/prod_b/448-2595.jpg","https://admin.wisebuy.ro/uploads/prod_b/448-2596.jpg","https://admin.wisebuy.ro/uploads/prod_b/448-19190.png","https://admin.wisebuy.ro/uploads/prod_b/448-19191.png"]',
    'Răzătoare multifuncțională pentru fructe și legume, 12 piese, cu mâner de protecție. Ideală pentru tăiere fină și precisă (julienne), tocare, mărunțire și răzuire.
7 cutite din inox + accesorii interschimbabile.
Recipient cu bază antialunecare și protecție pentru mână incluse.
Cadou: coș de scurgere — speli legumele și fructele direct după tăiere.
Capac cu închidere ermetică — se poate folosi și pentru depozitare în frigider.
Perfectă pentru ceapă, usturoi, salate și diverse legume și fructe.
Plastic ABS / polipropilenă fără BPA, potrivit pentru mașina de spălat vase; lame din oțel inoxidabil.
Include: lamă (14×14 mm și 7×7 mm), lamă cu grătar pentru ghimbir, lamă de ras (4 mm și 3 mm), lamă pentru felii de 2 mm, lamă waffle, coș de scurgere și mâner de protecție.
Dimensiuni cutie: 31,5 cm lungime × 8 cm înălțime. Greutate: ~1,4 kg.
Atenție: nu îndepărtați alimentele cu mâna; folosiți o furculiță dacă se blochează între lame.',
    'Cod furnizor: KRIV254-15. Ambalare: 24 buc/bax. Sursă: wisebuy.ro (COD RVS2208). Preț achiziție: 14.89 RON.'
);
