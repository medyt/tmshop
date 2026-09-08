USE vbpnetmf_shoptop;

-- Produs nou A001: Set 4 suporturi anti-zgomot pentru masina de spalat
-- Sursa denumire/descriere/poze: furnizor wisebuy.ro (produs 539)
-- Run this in phpMyAdmin on server (dupa migrarea la purchase_price)
--
-- purchase_price = pret achizitie (2.48 RON), sale_price = pret din pagina
-- furnizorului (35.00 RON). Produsul apare in magazin (stock_qty > 0 SI sale_price > 0).

INSERT INTO products (
    id, name, sku,
    purchase_price,
    sale_price, discount_percent, stock_qty,
    image_urls, description
) VALUES (
    'A001',
    'Set de 4 piese suport anti-zgomot și antiderapante pentru mașina de spălat',
    'A001',
    2.48,
    35.00, 0, 480,
    '["https://admin.wisebuy.ro/uploads/prod_a/539-7784.png","https://admin.wisebuy.ro/uploads/prod_b/539-8071.jpg","https://admin.wisebuy.ro/uploads/prod_b/539-8072.png","https://admin.wisebuy.ro/uploads/prod_b/539-8073.png","https://admin.wisebuy.ro/uploads/prod_b/539-8074.jpg","https://admin.wisebuy.ro/uploads/prod_b/539-8075.jpg","https://admin.wisebuy.ro/uploads/prod_b/539-8077.jpg","https://admin.wisebuy.ro/uploads/prod_b/539-8078.jpg","https://admin.wisebuy.ro/uploads/prod_b/539-8079.jpg"]',
    'Împiedică trepidațiile mașinii de spălat, material antiderapant, fonoabsorbant. Eliminați răspândirea sunetelor deranjante și protejați-vă mașina și podeaua!
Set de 4 piese.
Previn răspândirea sunetelor deranjante.
Previn transmiterea a până la 94,7% din vibrații.
Previn acumularea de umiditate sub mașină.
Previn deteriorarea aparatelor și a podelei.
Instalare facilă.
Mărime universală.
Lățime partea de sus: 6,5 cm.
Lățime partea de jos: 8,5 cm.
Grosime: 4 cm.'
);
