USE shoptop;

-- Doar produsele noi (mop + piscină). Nu șterge și nu actualizează rândurile existente.
-- Dacă id-ul există deja, INSERT-ul eșuează — omite rândul sau ajustează manual.

INSERT INTO products (
  id, name, sku, purchase_price,
  sale_price, discount_percent, stock_qty, image_urls, description, notes
) VALUES (
  'seed-magic-mop-360-basel',
  'Set mop magic rotativ 360° — cuvă inox, coadă telescopică, 4 rezerve microfibră',
  'MOP-MAGIC-360-INOX',
  45.00,
  0.00,
  0.00,
  0,
  '["/images/seed-magic-mop-360-rotativ.png","https://s13emagst.akamaized.net/products/75276/75275839/images/res_4cb1107b27c79bb03d15daa9eab5405d.jpg?width=720&height=720&hash=5A43FC8C928A9CF325DE90FDF135A801"]',
  'Set complet curățenie: găleată cu compartimente spălare/stoarcere, cuvă centrifugă din inox, mop cu rotație 360°, coadă telescopică reglabilă, 4 rezerve din microfibră lavabile și perie pentru rosturi/covoare (conform ambalajului). Potrivit pentru gresie, parchet, laminat și alte suprafețe interioare. Furnizor achiziție: Basel.',
  'Preț achiziție Basel: 45 RON. Prima imagine = fotografie produs (fișier în folderul public).'
);

INSERT INTO products (
  id, name, sku, purchase_price,
  sale_price, discount_percent, stock_qty, image_urls, description, notes
) VALUES (
  'seed-inflatable-pool-family-basel',
  'Piscină gonflabilă 200×120×40 cm — 2 inele, familie',
  'POOL-GONFL-200X120-BASEL',
  55.00,
  0.00,
  0.00,
  0,
  '["/images/seed-inflatable-pool-200x120-family.png"]',
  'Piscină gonflabilă dreptunghiulară pentru grădină sau curte: 200×120×40 cm (≈2 m × 1,2 m × 40 cm), 2 inele gonflabile albastru/alb, margini moi, material PVC rezistent. Ușor de umflat, golit și depozitat; potrivită pentru copii și adulți în aer liber (supraveghere adultă). Furnizor achiziție: Basel.',
  'Preț achiziție Basel: 55 RON. Prima imagine = grafică produs (fișier în folderul public).'
);
