USE vbpnetmf_shoptop;

-- Produs nou A002: Set 2 șanuri/calapoade reglabile pentru pantofi
-- Cod produs intern: A002 | Cod furnizor: CLPDO10
-- Sursa denumire/descriere/poze: furnizor zenino.ro (Shopify)
-- Run this in phpMyAdmin on server (dupa migrarea la purchase_price).
--
-- purchase_price = pret achizitie (10.75 RON), sale_price = pret din pagina
-- furnizorului (54.99 RON), discount_percent 50 => pret taiat ~109.99 RON.
-- ATENTIE: produsul apare in magazin doar cu stock_qty > 0. Seteaza stocul mai jos.

INSERT INTO products (
    id, name, sku,
    purchase_price,
    sale_price, discount_percent, stock_qty,
    image_urls, description, notes
) VALUES (
    'A002',
    'Set 2 șanuri/calapoade reglabile pentru pantofi — lărgire și alungire',
    'A002',
    10.75,
    54.99, 50, 0,
    '["https://cdn.shopify.com/s/files/1/0555/1800/3290/files/res_11b149f3820e12426acd744584515a4b.jpg?v=1764330493","https://cdn.shopify.com/s/files/1/0555/1800/3290/files/4_581531d4-0ad3-4ba6-aab5-d611253722bb.jpg?v=1775460819","https://cdn.shopify.com/s/files/1/0555/1800/3290/files/6_014e3cd8-137c-4506-956c-2384fb0bf915.jpg?v=1775460819","https://cdn.shopify.com/s/files/1/0555/1800/3290/files/14.jpg?v=1775460819","https://cdn.shopify.com/s/files/1/0555/1800/3290/files/1_2a9fe37a-f86a-4aff-b340-bcf3174212a7.jpg?v=1775460819","https://cdn.shopify.com/s/files/1/0555/1800/3290/files/12.jpg?v=1775460819","https://cdn.shopify.com/s/files/1/0555/1800/3290/files/7_923dde1b-563a-45f8-bf95-f967e61cd182.jpg?v=1775460819","https://cdn.shopify.com/s/files/1/0555/1800/3290/files/10.jpg?v=1775460819","https://cdn.shopify.com/s/files/1/0555/1800/3290/files/11.jpg?v=1775460819"]',
    'Simți că încălțămintea nouă este puțin strâmtă sau inconfortabilă? Cu setul de 2 șanuri/calapoade reglabile poți ajusta lungimea, înălțimea și lățimea pantofilor pentru confort maxim.
Ajustare personalizată: lățire, alungire sau ajustări specifice pe anumite zone.
Confort rapid: îmbunătățire vizibilă a confortului în circa 24 de ore.
Ușor de utilizat, cu instrucțiuni simple.
Mod de folosire: introdu șanurile în pantofi; rotește mânerul rotund negru pentru alungire și mânerul în formă de U pentru lărgire; folosește accesoriile rotunde mici pentru zone specifice și accesoriul rotund mare pentru ridicare; lasă să acționeze 24 de ore.
Setul (fără sac) include: 2 șanuri și accesorii rotunde din plastic, dimensiuni mici și mari.
Recomandat pentru încălțăminte cu toc mai mic de 4 cm.
Mărimi disponibile: 30-36, 35-42, 38-44, 40-47.',
    'Cod furnizor: CLPDO10. Sursă: zenino.ro. Preț achiziție: 10.75 RON.'
);
