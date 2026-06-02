USE vbpnetmf_shoptop;

-- Doar produsele noi (mop + piscină). Nu șterge și nu actualizează rândurile existente.
-- Dacă id-ul există deja, INSERT-ul eșuează — omite rândul sau ajustează manual.

INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-magic-mop-360-basel',
  'Set mop magic rotativ 360° — cuvă inox, coadă telescopică, 4 rezerve microfibră',
  'MOP-MAGIC-360-INOX',
  0.00,
  45.00,
  'B',
  0.00,
  0.00,
  0,
  '["/images/seed-magic-mop-360-rotativ.png","https://s13emagst.akamaized.net/products/75276/75275839/images/res_4cb1107b27c79bb03d15daa9eab5405d.jpg?width=720&height=720&hash=5A43FC8C928A9CF325DE90FDF135A801"]',
  'Set complet curățenie: găleată cu compartimente spălare/stoarcere, cuvă centrifugă din inox, mop cu rotație 360°, coadă telescopică reglabilă, 4 rezerve din microfibră lavabile și perie pentru rosturi/covoare (conform ambalajului). Potrivit pentru gresie, parchet, laminat și alte suprafețe interioare. Furnizor achiziție: Basel.',
  '[{"price":79.99,"sourceUrl":"https://ca-acasa.ro/products/set-mop-magic-rotativ-360-grade-cu-talpa-%C8%99i-cuva-din-inox-4-rezerve-diferite-perie-rosturi-rezerve-incluse","observedAt":"2026-05-12","note":"Ca-Acasa — titlu „Set mop magic rotativ 360 grade”, cuvă inox, 4 rezerve + perie rosturi"},{"price":109,"sourceUrl":"https://7solar.ro/product/set-mop-magic-rotativ-360-grade-cu-talpa-si-cuva-din-inox-4-rezerve-diferite-perie-rosturi-rezerve-incluse/","observedAt":"2026-05-12","note":"7Solar — același titlu OEM (SOL-4456), listare 109 lei (redus din 158 lei)"},{"price":85.99,"sourceUrl":"https://vivendo.ro/ro/products/set-mop-rotativ-8-litri-cuva-din-inox-4-rezerve-diferite-perie-rosturi","observedAt":"2026-05-12","note":"Vivendo — set mop rotativ 8 L, cuvă inox, 4 rezerve + perie rosturi (listare comparabilă)"},{"price":134.93,"sourceUrl":"https://www.emag.ro/set-mop-rotativ-zana-casei-cuva-din-inox-4-rezerve-diferite-perie-rosturi-covoare-incluse-mop112/pd/D6ZQF4YBM/","observedAt":"2026-05-12","note":"eMAG — Zana Casei MOP112, set rotativ inox 4 rezerve + perie (segment marketplace)"}]',
  'Preț Basel: 45 RON. Cost folosit = Basel (furnizor B). Medie din primele 3 observații online ~92 RON (2026-05-12); eMAG Zana Casei ~135 RON ca reper marketplace. Prima imagine = fotografie produs (fișier în folderul public).'
);

INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-inflatable-pool-family-basel',
  'Piscină gonflabilă 200×120×40 cm — 2 inele, familie',
  'POOL-GONFL-200X120-BASEL',
  0.00,
  55.00,
  'B',
  0.00,
  0.00,
  0,
  '["/images/seed-inflatable-pool-200x120-family.png"]',
  'Piscină gonflabilă dreptunghiulară pentru grădină sau curte: 200×120×40 cm (≈2 m × 1,2 m × 40 cm), 2 inele gonflabile albastru/alb, margini moi, material PVC rezistent. Ușor de umflat, golit și depozitat; potrivită pentru copii și adulți în aer liber (supraveghere adultă). Furnizor achiziție: Basel.',
  '[{"price":132,"sourceUrl":"https://gave.ro/index.php?product_id=23878&route=product%2Fproduct","observedAt":"2026-05-12","note":"Gave — piscină dreptunghiulară 200×150×50 cm, PVC, familie (dimensiune apropiată)"},{"price":139,"sourceUrl":"https://www.asmarket.ro/cumpara/piscina-gonflabila-201-x-150-x-51-cm-2-inele-pompa-cadou-2203","observedAt":"2026-05-12","note":"ASMarket — 201×150×51 cm, 2 inele, vinil 0,28 mm, pompă umflare cadou"},{"price":149.99,"sourceUrl":"https://piscinacopii.ro/produs/piscina-gonflabila-bestway-200-x-146-x-48-cm/","observedAt":"2026-05-12","note":"PiscinaCopii.ro → Noriel — Bestway 200×146×48 cm, 2 inele, robinet scurgere"},{"price":199.99,"sourceUrl":"https://supermagic.ro/products/piscina-exterior-gonflabila-xxl-2m-copii","observedAt":"2026-05-12","note":"SuperMagic — piscină exterior 201×150×51 cm, capacitate ~400 L (listare comparabilă)"}]',
  'Preț Basel: 55 RON. Cost folosit = Basel (furnizor B). Medie din primele 3 observații online ~140 RON (2026-05-12); SuperMagic ~200 RON ca reper listare promo. Prima imagine = grafică produs (fișier în folderul public).'
);
