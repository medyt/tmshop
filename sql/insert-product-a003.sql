USE shoptop;

-- Produs nou A003: Set 2 x Kit instant pentru reparat pereții (varianta LOCALA)
-- Cod produs intern: A003 | MPN (cod producator): WSE8609
-- Sursa denumire/descriere/poze: furnizor wisebuy.ro (produs 1496)
--
-- purchase_price = 4.14 RON, sale_price = 59.00 RON (pret pagina furnizorului),
-- discount_percent 70 => pret taiat ~198 RON. Apare in magazin (stock_qty 450 > 0).

INSERT INTO products (
    id, name, sku, mpn,
    purchase_price,
    sale_price, discount_percent, stock_qty,
    image_urls, description
) VALUES (
    'A003',
    'Set 2 x Kit instant pentru reparat pereții — cremă albă reparatoare',
    'A003',
    'WSE8609',
    4.14,
    59.00, 70, 450,
    '["https://admin.wisebuy.ro/uploads/prod_a/1496-22515.png","https://admin.wisebuy.ro/uploads/prod_b/KIT2.webp","https://admin.wisebuy.ro/uploads/prod_b/KIT.jpg","https://admin.wisebuy.ro/uploads/prod_b/KIT1.webp","https://admin.wisebuy.ro/uploads/prod_b/1496-22516.webp"]',
    'Kit instant pentru reparat pereții, cremă albă reparatoare. Repară rapid fisuri, urme de cuie, pete sau var căzut/crăpat, fără ajutor profesional.
Ușor de folosit, rapid și convenabil.
Potrivit pentru o varietate de proiecte casnice și reparații mici.
Odată aplicat, creează un plasture cu uscare rapidă care poate susține un cui sau un șurub.
Aplicat corect, reparația devine practic invizibilă, cu rezultate profesionale.
Acoperă fisuri și urme lăsate de mobilier mutat sau de cuie în pereți.
Gramaj: 200 g per set. Set de 2 bucăți.'
);
