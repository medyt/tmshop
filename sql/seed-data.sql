USE shoptop;

DELETE FROM products;

INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-sn8004s-elena',
  'Set blender de mână SONYMAX 4 în 1',
  'SN-8004S',
  75.00,
  0.00,
  'A',
  0.00,
  0.00,
  0,
  '["https://gave.ro/image/catalog/CATEGORII%20OK/Screenshot%202025-02-01%20at%2016.16.01.png","https://www.fivo.ro/wp-content/uploads/2024/05/res_1830b43129f1abf7a9aee7bce183d515_1080x1080.webp","https://www.fivo.ro/wp-content/uploads/2024/05/res_f3d2b608b3f4d94eb674bfa1488f19bd_1080x1080-1.webp"]',
  'Brand SONYMAX, model SN-8004S. Set 4 în 1: blender de mână, tel, tocător 500 ml, pahar / beaker 600 ml. Putere 1500 W. Motor cupru — mențiune pe ambalaj. Lame inox. Garanție 12 luni pe cutie. „German Technology” / fiabilitate — text promo pe ambalaj. Distribuitor: Elena.',
  '[{"price":159,"sourceUrl":"https://xsales.ro/detail/97da54fcf436b737a31dc871a09cba351fe5273b2aca9eda24c2f5103f34ea9a","observedAt":"2026-05-10","note":"XSales → Gave (model SN-8004S în descriere)"},{"price":159,"sourceUrl":"https://www.fivo.ro/magazin/casa-si-gradina/bucatarie/set-blender-de-mana-sonymax-4-in-1-1500w-cu-9-viteze-si-functie-turbo/","observedAt":"2026-05-10","note":"Fivo.ro"},{"price":84.99,"sourceUrl":"https://diyala.ro/produs/blender-electric-multifunctional-4-in-1-sonymax-sn-8004/","observedAt":"2026-05-10","note":"Diyala — titlu SN-8004 (posibil variantă); preț mai mic, verifică înainte de comparare"}]',
  'Preț Elena: 75 RON. Preț propus ≈ medie din 3 observații online (actualizare 2026-05-10). Imagini și linkuri din surse publice — verifică periodic dacă URL-urile mai sunt valide.'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-h2o-humidifier-elena',
  'Umidificator portabil H2O Humidifier (LED)',
  'H2O-HUM-RGB',
  12.00,
  0.00,
  'A',
  0.00,
  0.00,
  0,
  '["https://vivimall.ro/cdn/shop/files/umidificator-h2o-cu-difuzor-de-aroma-lumina-de-noapte-led-in-7-culori-zgomot-redus-14-7x7-2cm-350ml--main-686cc59597048_e11978f6-6f2c-4471-8910-81175bfac14b.jpg?crop=center&height=1200&v=1761632871&width=1200","https://ninefold.ro/wp-content/uploads/2025/01/Mini-umidificator-portabil3.jpg","https://gomagcdn.ro/domains2/bricofan.ro/files/product/large/umidificator-h2o-cu-difuzor-de-aroma-culori-random-822442.jpg"]',
  'Ambalaj cu text „H2O HUMIDIFIER”. Dispozitiv cilindric alb, lumină LED în partea superioară / inel luminos (efect RGB). Tip portabil — util birou, mașină sau călătorii (confirmă pe etichetă: capacitate, USB, etc.). Distribuție Elena.',
  '[{"price":49.35,"sourceUrl":"https://vivimall.ro/products/umidificator-h2o-cu-difuzor-de-aroma-culori-random","observedAt":"2026-05-10","note":"Vivimall — H2O, difuzor aromă, LED 7 culori, ~350 ml"},{"price":59.42,"sourceUrl":"https://www.bricofan.ro/umidificator-h2o-cu-difuzor-de-aroma-culori-random.html","observedAt":"2026-05-10","note":"Bricofan — același tip H2O aromă LED"},{"price":29,"sourceUrl":"https://ninefold.ro/product/mini-umidificator-portabil-rgb/","observedAt":"2026-05-10","note":"Ninefold — mini umidificator RGB portabil (referință similară, nu neapărat același SKU)"}]',
  'Preț Elena: 12 RON. Preț propus = medie din 3 observații online (2026-05-10). Imagini de la magazine RO — modele similare H2O / mini RGB; verifică corespondența cu ambalajul tău.'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-nasal-dilator-elena',
  'Sleep and Sport — dilatator nazal Starter Kit (15 zile)',
  'NASAL-SS-15D',
  9.00,
  0.00,
  'A',
  0.00,
  0.00,
  0,
  '["https://iaureduceri.ro/wp-content/uploads/2026/02/set-dilatator-nazal-pentru-15-zile-starter-kit-pentru-respiratie572251.webp","https://cdn.myshoptet.com/usr/www.earplugs.ro/user/shop/big/16595_dilatator-nazal-cu-magneti.jpg?68edf38d","https://cdn.myshoptet.com/usr/www.earplugs.ro/user/shop/big/16706_airmax-sport-dilatator-nazal-pentru-o-respiratie-nazala-mai-buna-marimea-s-m.jpg?683b3ce8"]',
  'Cutie albă „Sleep and Sport Nasal Dilator”, Starter Kit. Pe ambalaj: „15 DAYS OF BETTER BREATHING”, „ONCE DAILY”; beneficii (respirație mai bună vs. benzi nazale, confort noaptea). Fotografie model cu dilatator pe nas. Distribuție Elena.',
  '[{"price":39,"sourceUrl":"https://iaureduceri.ro/produs/set-dilatator-nazal-pentru-15-zile-starter-kit-pentru-respiratie-usoara-si-reducerea-sforaitului/","observedAt":"2026-05-10","note":"IaReduceri — set starter 15 zile, dilatator nazal"},{"price":39.21,"sourceUrl":"https://www.earplugs.ro/benzi-nazale/dilatator-nazal-cu-magneti/","observedAt":"2026-05-10","note":"Earplugs — dilatator nazal cu magneți (produs similar, aceeași categorie)"},{"price":72.02,"sourceUrl":"https://www.earplugs.ro/dilatatoare-nazale/airmax-sport-dilatator-nazal-pentru-o-respiratie-mai-buna-marimea-s-m/","observedAt":"2026-05-10","note":"Earplugs — Airmax Sport S+M (alt model dilatator sport; referință preț segment)"}]',
  'Preț Elena: 9 RON. Preț propus = medie din 3 observații online (2026-05-10). Imagini: IaReduceri + Earplugs; verifică periodic că URL-urile mai sunt valide.'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-solar-wall-led-elena',
  'Solar Powered LED Wall Light (20 LED)',
  'SOLAR-WALL-20LED',
  7.00,
  0.00,
  'A',
  0.00,
  0.00,
  0,
  '["https://www.uneltemarket.ro/media/catalog/product/cache/2/image/9df78eab33525d08d6e5fb8d27136e95/l/a/lampa-solara-de-perete-cu-senzor-de-miscare-cu-20-leduri_1_.jpg","https://7solar.ro/wp-content/uploads/2023/05/lampa-solara-de-perete-cu-senzor-miscare-20-led.jpg","https://c.cdnmp.net/688591588/p/m/4/lampa-cu-led-solara-si-senzor-de-miscare-20-x-led~6104.jpg"]',
  'Pe cutie: „SOLAR POWERED LED WALL LIGHT”. Senzor mișcare PIR și senzor lumină noapte (CDS). Ilustrare: corp negru pentru perete, panou solar pe fața înclinată, senzor circular, panou cu ~20 LED (grilă tip 4×5). Text pe dispozitiv: „Solar Sensor Wall light”. Distribuție Elena.',
  '[{"price":19.9,"sourceUrl":"https://www.uneltemarket.ro/tlv-lampa-solara-cu-senzor-de-miscare-20-led-uri.html","observedAt":"2026-05-10","note":"Uneltemarket — TLV, lampă solară perete, senzor mișcare, 20 LED"},{"price":20.18,"sourceUrl":"https://www.conceptmag.ro/cumpara/lampa-cu-led-solara-si-senzor-de-miscare-20-x-led-3414","observedAt":"2026-05-10","note":"Conceptmag — LED solar + senzor mișcare, 20× LED"},{"price":30,"sourceUrl":"https://7solar.ro/product/lampa-solara-de-perete-cu-senzor-miscare-20-led/","observedAt":"2026-05-10","note":"7solar — lampă solară de perete, senzor, 20 LED (model similar)"}]',
  'Preț Elena: 7 RON. Preț propus = medie din 3 observații online (2026-05-10). Imagini din listări RO; verifică periodic URL-urile și că prețurile din note mai corespund site-urilor.'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-instant-electric-water-faucet-elena',
  'Instant Electric Heating Water Faucet & Shower',
  'EWH-FAUCET-SHOWER',
  60.00,
  0.00,
  'A',
  0.00,
  0.00,
  0,
  '["/images/seed-instant-electric-water-faucet-shower.png","https://www.tvmarket.ro/media/catalog/product/cache/9/image/9df78eab33525d08d6e5fb8d27136e95/1/_/1_1_1197.jpg","https://www.topredus.ro/media/catalog/product/cache/1/small_image/200x200/9df78eab33525d08d6e5fb8d27136e95/8/9/893-14037.png"]',
  'Ambalaj multilingv (EN / PL / RU): încălzitor instant de apă — robinet electric pentru chiuvetă cu furtun și para de duș. Corp alb cu finisaje cromate; manetă unică; afișaj LED cu temperatură (ex. „49” pe cutie). Mesaje promo: fără boiler, fără încălzire centrală, apă caldă în câteva secunde. Distribuție Elena.',
  '[{"price":114,"sourceUrl":"https://www.topredus.ro/lichidare-de-stoc-robinet-electric-cu-incalzire-instantanee-dus-cu-afisaj-led-si-prindere-pe-perete.html","observedAt":"2026-05-10","note":"TopRedus — robinet instant + duș, LED, montaj perete (lichidare stoc; verifică SKU vs. ambalaj)"},{"price":129.9,"sourceUrl":"https://www.tvmarket.ro/robinet-electric-instant-apa-calda-cu-display-si-furtun-pentru-dus.html","observedAt":"2026-05-10","note":"TvMarket — instant apă caldă, display + furtun duș (model similar categoriei)"},{"price":154,"sourceUrl":"https://www.topredus.ro/robinet-electric-instant-din-inox-cu-display-si-rotire-360-grade-3000w.html","observedAt":"2026-05-10","note":"TopRedus — variantă inox 3000 W, display LED, rotire 360° (referință preț segment)"}]',
  'Preț Elena: 60 RON. Preț propus = medie din 3 observații online (2026-05-10). Prima imagine = fotografie ambalaj (fișier în folderul public al aplicației). Verifică periodic linkurile și prețurile pe site-uri.'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-key-pet-comb-elena',
  'Key Pet Comb — îndepărtare eficientă păr',
  'PET-COMB-KEY',
  8.00,
  0.00,
  'A',
  0.00,
  0.00,
  0,
  '["/images/seed-key-pet-comb.png","https://www.petsmania.ro/pictures/0/147/pieptene-furminator-rake-caini-si-pisici.jpg","https://www.megapet.ro/continut/produse/2853/420/furminator-perie-caine-si-pisica-pentru-descalcit-3542.jpg"]',
  'Ambalaj alb cu bandouri albastre; text „KEY PET COMB”, slogan „Craftsmanship details reflect quality”, „EFFICIENT HAIR REMOVAL”. Ilustrare: pieptenă/perie de îngrijire cu mâner albastru și cap circular cu două „urechi” de pisică. Distribuție Elena.',
  '[{"price":75,"sourceUrl":"https://www.petsmania.ro/product/pieptene-furminator-rake-caini-si-pisici/","observedAt":"2026-05-10","note":"PetsMania — pieptene Furminator Rake câini/pisici (referință categorie îndepărtare păr)"},{"price":121.76,"sourceUrl":"https://www.megapet.ro/furminator-perie-caine-si-pisica-pentru-descalcit-p2853/","observedAt":"2026-05-10","note":"MegaPet — Furminator perie descâlcire (brand Furminator; alt SKU)"},{"price":48,"sourceUrl":"https://www.superpet.ro/produs/perie-piepten-ingrijire-caini-si-pisici-autocuratare-negru-9-5x18-cm-purlov/","observedAt":"2026-05-10","note":"SuperPet — perie/pieptene autocurățare Purlov (produs similar îngrijire blană)"}]',
  'Preț Elena: 8 RON. Preț propus = medie din 3 observații online (2026-05-10). Prima imagine = fotografie ambalaj (fișier în folderul public). Observațiile sunt piepteni/perii din aceeași categorie — nu neapărat același model Key.'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-vintage-t9-clipper-basel',
  'Vintage T9 Professional Hair Clipper',
  'CLIPPER-VINTAGE-T9',
  0.00,
  15.00,
  'B',
  0.00,
  0.00,
  0,
  '["/images/seed-vintage-t9-hair-clipper.png","https://c.cdnmp.net/506690928/p/m/8/aparat-de-tuns-vintage-hw-t9-profesional-fara-fir-trimmer-cu-lama-t~7248.jpg","https://images.okr.ro/serve/product/7cab6d532e25bfe7b0962a6d0059070e-21742-940_492_10"]',
  'Ambalaj negru cu text alb/auriu „VINTAGE T9 PROFESSIONAL HAIR CLIPPER”. Ilustrație aparat de tuns stil vintage metalic (auriu). Model cordless tip T9 pentru păr și barbă (confirmă pe etichetă: lame, accesorii, încărcare). Furnizor achiziție: Basel.',
  '[{"price":35,"sourceUrl":"https://www.romanianmag.ro/cumpara/aparat-de-tuns-vintage-hw-t9-profesional-fara-fir-trimmer-cu-lama-t-2596","observedAt":"2026-05-10","note":"RomanianMag — Vintage HW-T9, trimmer profesional fără fir, lamă T"},{"price":29.99,"sourceUrl":"https://www.okazii.ro/aparat-de-tuns-vintage-t9-profesional-fara-fir-trimmer-pentru-par-si-barba-reincarcabil-a256678783","observedAt":"2026-05-10","note":"Okazii — Vintage T9 profesional reîncărcabil (preț tip licitație/listare; poate varia)"},{"price":25,"sourceUrl":"https://www.thegift.ro/cadouri-pentru-barbati-cadouri-diverse-c-21_99/masina-pentru-tuns-si-barbierit-2-in-1-vintage-t9-p-5528","observedAt":"2026-05-10","note":"TheGift — mașină tuns și bărbierit 2 în 1 Vintage T9"}]',
  'Preț Basel: 15 RON. Cost folosit = Basel (furnizor B). Preț propus = medie din 3 observații online (2026-05-10). Prima imagine = captură ambalaj (fișier în folderul public).'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-electric-grinder-basel',
  'Electric Grinder (râșniță cafea / condimente)',
  'GRINDER-ELECTRIC',
  0.00,
  20.00,
  'B',
  0.00,
  0.00,
  0,
  '["/images/seed-electric-grinder.png","https://www.topredus.ro/media/catalog/product/cache/1/small_image/200x200/9df78eab33525d08d6e5fb8d27136e95/9/7/976-14994.png","https://www.wisebuy.ro/uploads/prod_a/976-23799.png"]',
  'Ambalaj alb cu text „Electric Grinder”; ilustrație râșniță electrică mică din inox, capac transparent, buton roșu de pornire. Folosit pentru cafea măcinată, condimente etc. (confirmă pe etichetă: putere, capacitate). Furnizor achiziție: Basel.',
  '[{"price":44,"sourceUrl":"https://www.topredus.ro/rasnita-electrica-pentru-cafea-sau-condimente-din-otel-inoxidabil.html","observedAt":"2026-05-10","note":"TopRedus — râșniță electrică cafea/condimente, inox"},{"price":49,"sourceUrl":"https://www.wisebuy.ro/produse/rasnita-electrica-de-cafea-din-otel-inoxidabil-976","observedAt":"2026-05-10","note":"Wisebuy — râșniță electrică cafea din inox (model similar)"},{"price":27,"sourceUrl":"https://www.express21.ro/electrocasnice-pentru-bucatarie/r%C3%A2%C8%99ni%C8%9B%C4%83-electric%C4%83-cafea-150w-capacitate-50-100-g-lame-din-o%C8%9Bel-inoxidabil-alimentare-220v-pentru-cafea-%C8%99i-condimente-dimensiuni-17-10-cm.html","observedAt":"2026-05-10","note":"Express21 — râșniță 150 W, 50–100 g, inox (referință segment)"}]',
  'Preț Basel: 20 RON. Cost folosit = Basel (furnizor B). Preț propus = medie din 3 observații online (2026-05-10). Prima imagine = captură ambalaj (fișier în folderul public).'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-handheld-console-basel',
  'Consolă portabilă gaming (aspect tip Switch)',
  'CONSOLE-HANDHELD-SWSTYLE',
  0.00,
  105.00,
  'B',
  0.00,
  0.00,
  0,
  '["/images/seed-handheld-console-switch-style.png","https://s13emagst.akamaized.net/products/73815/73814701/images/res_c1cb7ef47aaf889bdfee36157d0322be.jpg?width=450&height=450&hash=8F9C1607CCCD557B673593D9B6194D72","https://i00.eu/img/716/1600x1600/8mmnf3ft/134566.jpg"]',
  'Ambalaj cu vizual consolă handheld: display central, grip-uri laterale în culori distincte (ex. albastru/roșu), aspect asemănător Nintendo Switch — poate fi model compatibil / clone / retro (nu presupune marcă Nintendo pe ambalaj; verifică eticheta). Furnizor achiziție: Basel.',
  '[{"price":362.99,"sourceUrl":"https://www.emag.ro/joc-portabil-stels-tehnologie-inteligenta-ecran-color-de-7-inchi-hdmi-10000-de-jocuri-negru-1163/pd/DPN18SYBM/","observedAt":"2026-05-10","note":"eMAG — STELS portabil 7″, HDMI, jocuri integrate (segment handheld retro/mod similar)"},{"price":396.93,"sourceUrl":"https://www.momanio.ro/hc800-consola-de-jocuri-portabila-premium-cu-display-hd-ips-de-7-negru","observedAt":"2026-05-10","note":"Momanio — HC800 retro 7″ IPS, HDMI, emulatoare (referință segment)"},{"price":380.38,"sourceUrl":"https://www.momanio.ro/sjgam-m27-consola-portabila-de-gaming-premium-cu-display-hd-ips-de-7-negru","observedAt":"2026-05-10","note":"Momanio — SJGAM M27, ecran 7″ IPS (referință segment preț)"}]',
  'Preț Basel: 105 RON. Cost = Basel (furnizor B). Observațiile sunt din categorii „consolă portabilă” cu ecran mare — nu neapărat același SKU ca în poză; verifică marca pe cutie.'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-action-cam-4k-basel',
  'Cameră sport 4K Ultra HD DV',
  'CAM-4K-SPORTS-UHD',
  0.00,
  65.00,
  'B',
  0.00,
  0.00,
  0,
  '["/images/seed-action-cam-4k-sports.png","https://gave.ro/image/cache/catalog/CATEGORII_OK/camera_sport_4k_ultrahd_30fps_wifi_16mp_si_accesorii-1024x1024.png","https://shopvio.ro/cdn/shop/files/unnamed_cdffb2b0-b8af-48d4-a8c4-19a5ef6a2de7.jpg?v=1709201309"]',
  'Pe cutie: „4K SPORTS Ultra HD DV” — cameră video de acțiune stil GoPro / DV (rezoluție 4K în promo pe ambalaj; confirmă fps, Wi‑Fi, kit accesorii și rezistență la apă pe etichetă). Furnizor achiziție: Basel.',
  '[{"price":129.99,"sourceUrl":"https://gave.ro/camera-sport-4k-ultrahd-30fps-wifi-16mp-si-accesorii","observedAt":"2026-05-10","note":"Gave — cameră sport 4K UltraHD 30fps WiFi 16MP + accesorii"},{"price":189,"sourceUrl":"https://shopvio.ro/products/camera-sport-4k-ultra-hd-wifi","observedAt":"2026-05-10","note":"Shopvio — cameră sport 4K Ultra HD WiFi H9 (segment similar)"},{"price":299.99,"sourceUrl":"https://www.emag.ro/camera-video-sport-cooau-4k-ultra-hd-20mp-camera-pentru-casca-unghi-larg-170-rezistenta-la-apa-40m-cu-telecomanda-wi-fi-baterii-2x1200mah-16-accesorii-camera-video-ski-negru-sp0883v2/pd/DNFDLSYBM/","observedAt":"2026-05-10","note":"eMAG — COOAU 4K Ultra HD 20MP, Wi‑Fi, kit accesorii (referință segment premium)"}]',
  'Preț Basel: 65 RON. Cost = Basel (furnizor B). Observațiile sunt din aceeași categorie (action cam 4K); nu garantează același brand ca pe ambalajul tău.'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-karaoke-speaker-2mic-basel',
  'Set karaoke — boxă portabilă + 2 microfoane',
  'KARAOKE-SET-2MIC',
  0.00,
  23.00,
  'B',
  0.00,
  0.00,
  0,
  '["/images/seed-karaoke-speaker-dual-mic.png","https://gomagcdn.ro/domains2/express21.ro/files/product/large/set-karaoke-cu-2-microfoane-si-boxa-portabila-roz-6w-iluminare-led-schimbare-voce-baterii-reincarcabile-engross-813509.jpg","https://impactmag.ro/wp-content/uploads/2025/04/set-boxa-karaoke-06.webp"]',
  'Ambalaj alb; imagine produs: boxă compactă portabilă cu mâner, contur luminos (LED/RGB pe marginea grilei), alături două microfoane mici (culoare deschisă). Tip set karaoke / petrecere — Bluetooth, USB sau SD în funcție de model (verifică pe cutie). Furnizor achiziție: Basel.',
  '[{"price":25.62,"sourceUrl":"https://www.express21.ro/boxe/set-karaoke-cu-2-microfoane-%C8%99i-box%C4%83-portabil%C4%83-roz-6w-iluminare-led-schimbare-voce-baterii-re%C3%AEnc%C4%83rcabile-engross.html","observedAt":"2026-05-10","note":"Express21 Engross — set karaoke 2 microfoane + boxă 6 W, LED (preț apropiat de intrare)"},{"price":55,"sourceUrl":"https://impactmag.ro/produs/set-boxa-karaoke-2-microfoane-wireless-bluetooth-5-0-portabil-acumulator-albastru-impact-vision/","observedAt":"2026-05-10","note":"Impact Vision — set boxă karaoke + 2 microfoane wireless, Bluetooth 5.0 (referință segment mijloc)"},{"price":110.19,"sourceUrl":"https://www.okazii.ro/set-2-microfoane-pentru-karaoke-cu-boxa-portabila-k12-a254839627","observedAt":"2026-05-10","note":"Okazii — set K12 cu 2 microfoane wireless + boxă (preț tip licitație; poate varia)"}]',
  'Preț Basel: 23 RON. Cost = Basel (furnizor B). Observațiile sunt din aceeași categorie (karaoke portabil + 2 microfoane); nu garantează același brand sau putere (W) ca pe ambalajul tău.'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-x18-video-game-basel',
  'X18 VIDEO GAME — consolă handheld',
  'CONSOLE-X18-VGAME',
  0.00,
  120.00,
  'B',
  0.00,
  0.00,
  0,
  '["/images/seed-x18-video-game-console.png","https://s13emagst.akamaized.net/products/32886/32885043/images/res_a535973368194afba5bd44aafb2503a1.jpg?width=450&height=450&hash=C20D4B9C97CA7644B095C982D458D939","https://www.medoshop.ro/wp-content/uploads/2023/03/Hb54c433abdc44741b462b718333651a7r.jpg_960x960.jpg.jpg"]',
  'Ambalaj cu bandă albastră „X18” și text „VIDEO GAME”. Vizual: consolă portabilă cu ecran central și grip-uri laterale întunecate (retro / emulator tip handheld). Verifică pe cutie: memorie, număr jocuri, ieșire TV. Furnizor achiziție: Basel.',
  '[{"price":310,"sourceUrl":"https://www.emag.ro/consola-portabila-gaming-x12-8-gb-3000-de-jocuri-instalate-mario-etc-negru-1688202708016/pd/D5V5V2MBM/","observedAt":"2026-05-10","note":"eMAG — consolă portabilă gaming X12, 8 GB, jocuri preinstalate (serie X apropiată ca segment)"},{"price":183,"sourceUrl":"https://www.medoshop.ro/produs/consola-jocuri-portabila-x7-display-4-3-inch-tv-out-10000-jocuri/","observedAt":"2026-05-10","note":"Medoshop — consolă portabilă X7, 4,3″, TV-Out (referință preț serie handheld retro)"},{"price":239,"sourceUrl":"https://www.okazii.ro/consola-jocuri-portabila-x12-display-5-1-inch-tv-out-albastru-cu-rosu-a233317451","observedAt":"2026-05-10","note":"Okazii — X12 5,1″ TV-Out (licitație/listare; preț variabil — nu există listare standard „X18” pe RO la căutare)"}]',
  'Preț Basel: 120 RON. Cost = Basel (furnizor B). Piața folosește des „X7/X12” pentru handheld-uri similare; observațiile nu echivalează neapărat modelul X18 din poză.'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-vacuum-sealer-basel',
  'Vacuum Sealer — aparat de vidat alimente',
  'SEALER-VACUUM-KITCH',
  0.00,
  27.00,
  'B',
  0.00,
  0.00,
  0,
  '["/images/seed-vacuum-sealer.png","https://www.tenq.ro/cdn/shop/files/aparat-vidat_600x.jpg?v=1730829320","https://www.econvenabil.ro/image/uploads/products/w_rx200x200/aparat-de-vidat-cu-pungi-incluse-etansare-automata-vacuum-sealer-90w-p43053-02.jpg"]',
  'Ambalaj cu text „Vacuum Sealer”; produs tip aparat de sigilat / vidat pentru pungi dedicate păstrării alimentelor (putere tipică ~90 W în categorie — verifică pe cutie). Furnizor achiziție: Basel.',
  '[{"price":39.99,"sourceUrl":"https://www.tenq.ro/collections/pret-maxim-50-lei/products/aparat-de-sigilat-si-vidat-vacuum-sealer-s-220v-90w","observedAt":"2026-05-10","note":"Tenq — Vacuum Sealer S 90 W, pungi incluse (promoție pe site; verifică varianta activă)"},{"price":65,"sourceUrl":"https://www.econvenabil.ro/aparat-de-vidat-cu-pungi-incluse-etansare-automata-vacuum-sealer-90w-p43053","observedAt":"2026-05-10","note":"eConvenabil — aparat vidat + pungi, etanșare automată, 90 W"},{"price":83.99,"sourceUrl":"https://proredus.ro/products/aparat-de-vidat-vacuum-sealer","observedAt":"2026-05-10","note":"ProRedus — aparat vacuum sealer (preț din listare; poate include reduceri)"}]',
  'Preț Basel: 27 RON. Cost = Basel (furnizor B). Observațiile sunt aparate „vacuum sealer” compacte 90 W din magazine RO — nu garantează același SKU ca ambalajul tău.'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-vegetable-slicer-basel',
  'Feliator / tocător legume (tip Nicer Dicer)',
  'SLICER-VEG-MULTI',
  0.00,
  25.00,
  'B',
  0.00,
  0.00,
  0,
  '["/images/seed-vegetable-slicer-chopper.png","https://www.market-romania.ro/media/catalog/product/cache/4/image/9df78eab33525d08d6e5fb8d27136e95/n/i/nicer-dicerquick5.jpeg","https://www.tvmarket.ro/media/catalog/product/cache/9/image/9df78eab33525d08d6e5fb8d27136e95/f/e/feliator-profesional-rapid-practic-5-in-1-nicer-dicer-500x500.jpg"]',
  'Ambalaj cu vizual legume feliate și dispozitiv cu lame/grilă — set tip „Nicer Dicer” / feliator multifuncțional pentru legume și fructe (felii, cuburi, sticks în funcție de accesorii; verifică pe cutie). Furnizor achiziție: Basel.',
  '[{"price":42.7,"sourceUrl":"https://www.magazinultuturor.ro/cumpara/tocator-manual-speedy-chopper-pentru-legume-nicer-dicer-3692","observedAt":"2026-05-10","note":"Magazinul Tuturor — tocător manual Speedy Chopper „Nicer Dicer” (preț promo pe site)"},{"price":49.9,"sourceUrl":"https://www.market-romania.ro/tocator-si-feliator-pentru-legume-sau-fructe-multifunctional-5-in-1-nicer-dicer-quick.html","observedAt":"2026-05-10","note":"Market Romania — Nicer Dicer Quick 5 în 1, tocător și feliator multifuncțional"},{"price":100.9,"sourceUrl":"https://www.market-romania.ro/razatoare-multifunctionala-nicer-dicer-fusion-14643.html","observedAt":"2026-05-10","note":"Market Romania — Nicer Dicer FUSION, răzătoare multifuncțională (segment mai sus)"}]',
  'Preț Basel: 25 RON. Cost = Basel (furnizor B). Observațiile sunt din gama Nicer Dicer / feliatoare similare — nu garantează același număr de accesorii sau marcă exactă ca pe ambalajul tău.'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-ultrasonic-aroma-humidifier-basel',
  'Ultrasonic Aroma Humidifier (lemn / LED)',
  'HUMID-ULTRASONIC-AROMA',
  0.00,
  12.00,
  'B',
  0.00,
  0.00,
  0,
  '["/images/seed-ultrasonic-aroma-humidifier.png","https://www.topredus.ro/media/catalog/product/cache/1/small_image/200x200/9df78eab33525d08d6e5fb8d27136e95/1/1/1126-24455.jpg","https://gave.ro/image/catalog/CATEGORII%20OK/Screenshot%202024-05-22%20at%2016.31.12.png"]',
  'Ambalaj cu text „Ultrasonic Aroma Humidifier”; vizual dispozitiv rotund, finisaj tip lemn, bandă lumină (LED verde în poză) în zona mediană — umidificator ultrasonic cu funcție de difuzare aromă (uleiuri esențiale în funcție de model; verifică capacitate ml și butoane pe cutie). Distinct de umidificatorul cilindric H2O din seed. Furnizor achiziție: Basel.',
  '[{"price":36,"sourceUrl":"https://www.topredus.ro/umidificator-ultrasonic-si-difuzor-de-arome.html","observedAt":"2026-05-10","note":"TopRedus — umidificator ultrasonic + difuzor arome, LED 7 culori, ~300 ml (segment similar)"},{"price":95,"sourceUrl":"https://xsales.ro/detail/97da54fcf436b737a31dc871a09cba356798ca5630c480fdfbeec67fd6b8be36","observedAt":"2026-05-10","note":"XSales → Gave — Andowl Q-T59 300 ml, lemn deschis (model din aceeași categorie)"},{"price":90,"sourceUrl":"https://www.okazii.ro/umidificator-ultrasonic-si-difuzor-de-arome-2-modele-300ml-a224412262","observedAt":"2026-05-10","note":"Okazii — umidificator ultrasonic + difuzor arome 300 ml (preț tip licitație; poate varia)"}]',
  'Preț Basel: 12 RON. Cost = Basel (furnizor B). SKU separat de „H2O-HUM-RGB” (alt tip de umidificator în catalog). Observațiile sunt din piața RO pentru difuzoare/umidificatoare ultrasonice cu design lemn.'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-spiral-potato-slicer-basel',
  'Spiral Potato Slicer — feliator cartofi spirală',
  'SLICER-SPIRAL-POTATO',
  0.00,
  25.00,
  'B',
  0.00,
  0.00,
  0,
  '["/images/seed-spiral-potato-slicer.png","https://www.onprice.ro/media/catalog/product/cache/12/image/9df78eab33525d08d6e5fb8d27136e95/1/6/1606-large_default.jpg","https://www.market-romania.ro/media/catalog/product/cache/4/image/9df78eab33525d08d6e5fb8d27136e95/7/_/7_1_126.jpg"]',
  'Ambalaj cu text „Spiral Potato Slicer”; dispozitiv manual (culoare tipic roșie în vizual) pentru tăiat cartofi în formă spirală / chips spiral — uneori ventuză/bază pentru stabilitate și bețișoare incluse (verifică pe cutie). Nu este feliatorul multifuncțional Nicer Dicer (SKU „SLICER-VEG-MULTI”). Furnizor achiziție: Basel.',
  '[{"price":89.9,"sourceUrl":"https://www.onprice.ro/dispozitiv-pentru-taiat-cartofi-in-spirala-spiral-potato-slicer.html","observedAt":"2026-05-10","note":"OnPrice — Spiral Potato Slicer (promoție pe site)"},{"price":118.9,"sourceUrl":"https://www.market-romania.ro/dispozitiv-pentru-taiat-cartofi-in-spirala-spiral-potato-slicer-13383.html","observedAt":"2026-05-10","note":"Market Romania — același tip produs „Spiral Potato Slicer”"},{"price":50,"sourceUrl":"https://www.tenq.ro/products/dispozitiv-pentru-taiat-cartofi-in-spirala-spiral-potato-slicer","observedAt":"2026-05-10","note":"Tenq — dispozitiv spirală cartofi (preț din listare; verifică varianta activă)"}]',
  'Preț Basel: 25 RON. Cost = Basel (furnizor B). SKU separat de „SLICER-VEG-MULTI” (alt produs / alt preț Basel în catalog).'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-jortan-jt8161-elena',
  'Cameră inteligentă JORTAN JT-8161',
  'JT-8161',
  45.00,
  0.00,
  'A',
  0.00,
  0.00,
  0,
  '["/images/seed-jortan-jt-8161.png"]',
  'Marcă JORTAN, model JT-8161 — cameră inteligentă de securitate (vizual tip dome PTZ cu antene externe), IP66 (interior și exterior). Pe ambalaj: „TOTALMENTE COLORIDO”, „CAMERA INTELIGENTE”; utilizare INTERIOR / AR LIVRE (exterior). Distribuție Elena.',
  '[{"price":85,"sourceUrl":"https://www.jortan.ro/products/camera-de-supraveghere-jortan-jt-8161-1080p-wifi-ip66-wireless-nightvision-infrarosu-card-64gb","observedAt":"2026-05-10","note":"Jortan.ro — listare oficială brand; din rezultate Google Shopping ~85 RON, livrare „fără costuri” (verifică în coș)"},{"price":79,"sourceUrl":"https://onlinegreentime.com/products/pachet-1-4-camere-de-supraveghere-jortan-jt-8161","observedAt":"2026-05-10","note":"Onlinegreentime — pachet 1–4 camere JT-8161; din Shopping ~79 RON + ~14,99 RON transport (verifică total)"},{"price":57.85,"sourceUrl":"https://www.google.com/search?q=JORTAN+JT-8161&tbm=shop","observedAt":"2026-05-10","note":"Bazarul Online — din rezultate sponsorizate Google pentru JT-8161 ~57,85 RON + transport (~25 RON); poate exista comandă minimă — verifică listarea activă"}]',
  'Preț Elena: 45 RON. Cost folosit = Elena (furnizor A). Preț propus ≈ medie din 3 prețuri pentru același model JT-8161 (~74 RON): Jortan.ro, Onlinegreentime, Bazarul în Google Shopping (q=JORTAN+JT-8161). Transportul nu e inclus în medie — compară total în coș. Actualizare 2026-05-10.'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-helferhoff-cherry-olive-corer-elena',
  'Scos sâmburi cireșe & măsline HelferHoff',
  'HELFERHOFF-CHERRY-OLIVE',
  14.00,
  0.00,
  'A',
  0.00,
  0.00,
  0,
  '["/images/seed-helferhoff-cherry-olive-corer.png"]',
  'Marcă HelferHoff — „Cherry and Olive Corer” / Cookware and Accessories. Pe cutie: dispozitiv plastic (vizual alb cu mecanism tip piston roșu) pentru îndepărtat sâmburi la cireșe sau măsline; mențiune „2 Colour Option”. Text rusă pe ambalaj: „МАШИНКА ДЛЯ УДАЛЕНИЯ КОСТОЧЕК”. Distribuție Elena.',
  '[{"price":36.79,"sourceUrl":"https://www.freshful.ro/p/100177610-leifheit-aparat-de-scos-samburi-cirese","observedAt":"2026-05-10","note":"Freshful — Leifheit aparat scos sâmburi cireșe (stock poate varia; preț din listare)"},{"price":39.91,"sourceUrl":"https://www.emag.ro/aparat-de-scos-samburi-edar-dispozitiv-potrivit-pentru-cirese-visine-masline-mecanism-prindere-de-masa-alb-rosu-asmb01e/pd/D4QFZBYBM/","observedAt":"2026-05-10","note":"eMAG — EDAR ASMB01E, prindere masă, cireșe/vișine/măsline (model apropiat ca UX)"},{"price":33.88,"sourceUrl":"https://www.emag.ro/aparat-de-scos-samburi-cirese-visine-masline-plastic-er40657/pd/DK2SLWMBM/","observedAt":"2026-05-10","note":"eMAG — Vanora plastic, cireșe/vișine/măsline (segment entry)"}]',
  'Preț Elena: 14 RON. Cost folosit = Elena (furnizor A). Preț propus ≈ medie din 3 observații online (~37 RON); nu există listări „HelferHoff” în RO în căutările folosite — compară cu dispozitive similare de pe Freshful/eMAG (actualizare 2026-05-10).'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-ice-bucket-bt-speaker-led-elena',
  'Găleată gheață LED + boxă Bluetooth',
  'ICE-BUCKET-BT-LED',
  30.00,
  0.00,
  'A',
  0.00,
  0.00,
  0,
  '["/images/seed-ice-bucket-bt-speaker-led.png"]',
  'Găleată pentru gheață (vizual aspect translucid/alb) cu difuzor Bluetooth și efecte lumină LED — pe cutie: „7 color light effects”, mențiuni tip „Up to 4 hours” / „5 HOURS” pentru redare muzică; încărcare USB; boxă și găleată detașabile pentru curățare. Dimensiuni tipice pe ambalaj: ~24,7 × 23,5 × 28,7 cm (lățime × adâncime × înălțime). Putere indicată ~5 W pe badge albastru. Marcaj CE pe etichetă. Distribuție Elena.',
  '[{"price":99.99,"sourceUrl":"https://www.tenq.ro/products/frapiera-cu-led-si-boxa-reincarcabila","observedAt":"2026-05-10","note":"Tenq — frapieră ~7 L, LED + boxă wireless reîncărcabilă (preț promo din listare)"},{"price":79.99,"sourceUrl":"https://promagg.ro/products/frapiera-gheata-5l-cu-iluminare-led-si-boxa-wireless","observedAt":"2026-05-10","note":"Promagg — frapieră 5 L LED + boxă Bluetooth (stoc/preț pot varia)"},{"price":90,"sourceUrl":"https://www.emag.ro/frapiera-de-gheata-cu-led-si-difuzor-7l-frapiera7/pd/DGJN003BM/","observedAt":"2026-05-10","note":"eMAG — frapieră gheață cu LED și difuzor 7 L (listare OEM/similar)"}]',
  'Preț Elena: 30 RON. Cost folosit = Elena (furnizor A). Preț propus ≈ medie din 3 observații online (~90 RON); produse din aceeași categorie (frapieră LED + Bluetooth 5–7 L), nu același SKU ca ambalajul tău (actualizare 2026-05-10).'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-xtreeme4-speaker-elena',
  'Boxă portabilă Bluetooth XTREEME4 (Bass Boost / LED)',
  'XTREEME4',
  60.00,
  0.00,
  'A',
  0.00,
  0.00,
  0,
  '["/images/seed-xtreeme4-speaker.png"]',
  'Pe ambalaj: denumire „XTREEME4”, mesaj „POWERFUL BASS BOOST”; ilustrație boxă cilindrică cu zonă luminată LED (gradient tip albastru-roșu), siluete petrecere/concert în colțuri; mâner transport pe partea superioară (cutie roșu/alb). Produs tip OEM / inspirație design party speaker — nu este JBL; verifică pe etichetă putere (W), Bluetooth și certificări. Distribuție Elena.',
  '[{"price":192.99,"sourceUrl":"https://www.emag.ro/boxa-portabila-bluetooth-5-0-hoco-pulsating-iluminare-rgb-tws-rosu-hc8-emagmpref-41406/pd/DCT4LCMBM/","observedAt":"2026-05-10","note":"eMAG — Hoco HC8, Bluetooth 5.0, iluminare RGB, TWS, ~10 W (referință LED + portabil)"},{"price":119.79,"sourceUrl":"https://www.emag.ro/boxa-portabila-charge-3-negru-20w-usb-waterproof-bluetooth-nv110/pd/DXG4XWBBM/","observedAt":"2026-05-10","note":"eMAG — Charge 3+ style NV110, 20 W, waterproof (segment boxă cilindrică OEM populară)"},{"price":69.9,"sourceUrl":"https://www.emag.ro/boxa-portabila-wireless-dytimeem-bluetooth-5-0-autonomie-30-ore-rezistenta-la-apa-ipx5-culoare-camuflaj-e311g/pd/DJ40N03BM/","observedAt":"2026-05-10","note":"eMAG — Dytimeem E311G, Bluetooth 5.0, IPX5 (preț din listare; poate varia)"}]',
  'Preț Elena: 60 RON. Cost folosit = Elena (furnizor A). Preț propus ≈ medie din 3 observații online (~128 RON); nu există listări „XTREEME4” pe magazinele verificate — compară cu boxe Bluetooth cu LED/RGB și bas promovat pe eMAG (actualizare 2026-05-10).'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-shower-turbo-water-saving-elena',
  'Para duș turbo — economisire apă + filtru',
  'SHOWER-TURBO-WATER-SAVE',
  8.00,
  0.00,
  'A',
  0.00,
  0.00,
  0,
  '["/images/seed-shower-turbo-water-saving-filter.png"]',
  'Ambalaj cu text „TURBOCHARGED WATER SAVING SHOWER”; vizual para de mână finisaj crom, față rotundă cu multe duze, mâner cilindric cu buton circular (on/off sau control jet); mențiune „Built-in filter”; schemă tehnică în partea inferioară a cutiei. Tip produs OEM pentru presiune/economie apă — verifică pe etichetă material (ABS/inox), filet 1/2” și filtru inclus. Distribuție Elena.',
  '[{"price":29.03,"sourceUrl":"https://www.emag.ro/para-dus-cu-vitamina-c-filtru-ionic-si-granule-minerale-3-nivele-de-filtrare-a-apei-functii-anti-calcar-usor-de-instalat-ss-05/pd/DZTF33YBM/","observedAt":"2026-05-10","note":"eMAG — para cu filtru ionic / granule, anti-calcar (segment „filtru în para”)"},{"price":36.36,"sourceUrl":"https://www.emag.ro/para-de-dus-idrobric-relax-abs-cromat-3-niveluri-de-filtrare-a-apei-1-functie-anti-calcar-80-mm-difuzor-inox-ss304-cu-micro-duze-care-cresc-presiunea-jetului-de-apa-si-asigura-economia-de-apa-conexiun/pd/DRKZ0TMBM/","observedAt":"2026-05-10","note":"eMAG — Idrobric Relax: micro-duze, presiune/economie apă, filtrare apă (similar marketing turbo)"},{"price":49.61,"sourceUrl":"https://www.emag.ro/para-cap-de-dus-topaquar-hydromist-3-moduri-jet-buton-on-off-filtrare-economisire-apa-jet-uniform-crestere-presiune-gri-cap-dus-argintiu/pd/D4F79D3BM/","observedAt":"2026-05-10","note":"eMAG — Topaqua HydroMist: filtrare, economisire apă, creștere presiune (preț promo din listare)"}]',
  'Preț Elena: 8 RON. Cost folosit = Elena (furnizor A). Preț propus ≈ medie din 3 observații online (~38 RON); nu am găsit marca exactă de pe cutie — compară cu paras de duș cu filtru / „water saving” / presiune pe eMAG (actualizare 2026-05-10).'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-digital-breath-alcohol-tester-elena',
  'Etilotest digital portabil (Digital Breath Alcohol Tester)',
  'ETILOTEST-DIGITAL-BREATH',
  20.00,
  0.00,
  'A',
  0.00,
  0.00,
  0,
  '["/images/seed-digital-breath-alcohol-tester.png"]',
  'Ambalaj cu text „DIGITAL BREATH ALCOHOL TESTER”; imagine: dispozitiv negru tip picătură, mustiuc transparent, breloc; display ilustrat cu valori (ex. 0,3 g/l, 0,03% BAC). Mesaj pe cutie tip „…ive Safely” (drive safely). Alimentare tip baterii (verifică pe etichetă), senzor de suflare — model OEM; precizia legală pentru șoferi se verifică doar la aparate certificate. Distribuție Elena.',
  '[{"price":29.65,"sourceUrl":"https://www.emag.ro/alcool-tester-digital-cu-display-lcd-etilotest-digital-5-mustiucuri-incluse-plastic-5435345/pd/DGJ430BBM/","observedAt":"2026-05-10","note":"eMAG — etilotest digital LCD, 5 mustiucuri (segment entry; preț din listare)"},{"price":49.92,"sourceUrl":"https://www.emag.ro/etilotest-digital-hggzeg-alcool-tester-digital-display-led-color-functie-de-memorare-calibrare-automata-recunoastere-suflat-fals-acuratete-0-01-bac-analiza-rapida-incarcator-auto-adaptor-20w-acumulato/pd/D8V2MSYBM/","observedAt":"2026-05-10","note":"eMAG — Hggzeg, display LED, funcții memorie / calibrare (preț din listare)"},{"price":68.89,"sourceUrl":"https://www.emag.ro/aparat-tester-alcool-de-buzunar-siks-afisaj-lcd-avertizare-sonora-analiza-rapida-etilotest-negru-atcp02/pd/D1RWLVMBM/","observedAt":"2026-05-10","note":"eMAG — SIKS de buzunar, LCD, avertizare sonoră (apropiat de form factor compact; stoc poate varia)"}]',
  'Preț Elena: 20 RON. Cost folosit = Elena (furnizor A). Preț propus ≈ medie din 3 observații eMAG (~49 RON) — etiloteste digitale similare; nu același brand ca pe cutia ta. Listări doar ca referință piață (actualizare 2026-05-10).'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-solar-flame-led-light-elena',
  'Solar Flame LED Light — lampă solară tip tortă (efect flacără)',
  'SOLAR-FLAME-LED-TORCH',
  13.00,
  0.00,
  'A',
  0.00,
  0.00,
  0,
  '["/images/seed-solar-flame-led-light.png"]',
  'Pe ambalaj: „Solar Flame LED Light”; mențiune „Light sensor activated”. Produs tip tortă decorative pentru sol: corp închis cu ornament perforat în zona „becului”, panou solar în partea superioară, țăruș pentru grădină/alei. Lumina imită flacără caldă (leduri secvențiate). Funcționare tipică zi/noapte — încărcare solară ziua, aprindere la amurg (confirmă pe etichetă: IP, înălțime, mAh). Distribuție Elena.',
  '[{"price":60,"sourceUrl":"https://red-mag.ro/lampi-solare-gradina/26033-lampa-solara-led-tip-torta-cu-efect-flacara.html","observedAt":"2026-05-10","note":"Red-mag — 1 buc., tortă LED ~60 cm, IP65, efect flacără (preț din listare)"},{"price":82.49,"sourceUrl":"https://www.emag.ro/set-8x-lampi-solare-retoo-gardenpro-torta-led-efect-flacara-iluminare-ecologica-infigere-in-sol-ip65-pandela-policristalina-baterie-ni-mh-300mah-autonomie-10-12h-inaltime-41cm-diametru-7-5cm-material-/pd/DWHSQ1YBM/","observedAt":"2026-05-10","note":"eMAG — set 8× RETOO GardenPro, tortă LED efect flacără ~41 cm (preț total pachet; ~10,31 RON/buc)"},{"price":98.99,"sourceUrl":"https://www.emag.ro/set-de-6-lampi-solare-pentru-exterior-echo-soulr-rezistente-la-intemperii-autonomie-10-ore-design-cu-flacara-0728633132300/pd/D5R1BFYBM/","observedAt":"2026-05-10","note":"eMAG — set 6× Echo Soul®, design flacără, autonomie ~10 h (preț total pachet; ~16,5 RON/buc)"}]',
  'Preț Elena: 13 RON. Observația 1 = listare 1 bucată (~60 RON). Observațiile 2–3 sunt pachete eMAG — împărțiți la numărul de bucăți pentru comparare cu intrarea ta. Medie simplă a celor 3 prețuri afișate ~80 RON (nu echivalează o singură bucată); pentru 1 buc. folosește ca reper listarea Red-mag sau preț/buc din seturi (actualizare 2026-05-10).'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-htc1-thermo-hygrometer-elena',
  'Termometru & higrometru digital HTC-1 (ceas, LCD)',
  'HTC-1-THERMO-HYGRO',
  11.00,
  0.00,
  'A',
  0.00,
  0.00,
  0,
  '["/images/seed-htc1-digital-thermometer-hygrometer.png"]',
  'Model HTC-1 pe carcasă: stație tip „weather desk” — afișaj LCD mare cu ramă neagră, corp alb. Funcții tipice: temperatură (°C/°F), umiditate relativă (%), ceas (AM/PM), uneori alarmă / MIN–MAX (confirmă pe manual). Alimentare tip baterie AA sau AAA (verifică blister). Butoane tip segmente pentru mod / reglaj / memorie. Ambalaj blister cu pictograme apă / termometru. Distribuție Elena.',
  '[{"price":20.33,"sourceUrl":"https://www.emag.ro/termometru-higrometru-digital-de-camera-display-lcd-mare-afisare-simultana-ora-temperatura-umiditate-montaj-pe-perete-masa-htc-1/pd/D7Q31VMBM/","observedAt":"2026-05-10","note":"eMAG — termo-higrometru cameră HTC-1, LCD, oră + temp. + umiditate (preț din listare)"},{"price":19.04,"sourceUrl":"https://www.emag.ro/termometru-si-higrometru-de-camera-statie-meteo-temperatura-umiditate-ceas-alarma-valori-minime-maxime-htc-1-htc-1aa/pd/D0YPW1MBM/","observedAt":"2026-05-10","note":"eMAG — statie meteo HTC-1, ceas, alarmă, min/max (preț din listare)"},{"price":23.58,"sourceUrl":"https://www.emag.ro/termometru-cu-afisarea-temperaturii-si-a-umiditatii-htc-1-functie-alarma-6513/pd/DCKWX3BBM/","observedAt":"2026-05-10","note":"eMAG — HTC-1, temperatură + umiditate, funcție alarmă (preț din listare)"}]',
  'Preț Elena: 11 RON. Cost folosit = Elena (furnizor A). Preț propus ≈ medie din 3 observații eMAG pentru HTC-1 (~21 RON); vânzători diferiți, același model OEM frecvent (actualizare 2026-05-10).'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-kj12-wireless-headset-elena',
  'KJ12 — cască Bluetooth wireless (mono, rotire 180°, LED)',
  'KJ12-BT-HEADSET',
  15.00,
  0.00,
  'A',
  0.00,
  0.00,
  0,
  '["/images/seed-kj12-wireless-headset.png"]',
  'Pe ambalaj: model KJ12, „Wireless In-ear Rotatable Headphones”; accent „180° Rotation” (potrivire ureche stânga/dreapta). Promo: Hi-Fi Music, HD Voice / microfon handsfree, Long standby. Vizual: cască neagră cu hooks peste ureche, boom tip microfon subțire; corp lateral cu afișaj digital LED (în poză tip nivel baterie „100”). Ambalaj alb cu logo Wireless în chenar albastru. OEM — compatibilitate și codecuri conform manual. Distribuție Elena.',
  '[{"price":25,"sourceUrl":"https://www.emag.ro/casca-bluetooth-mrg-ms109-handsfree-dupa-ureche-negru-0717/pd/DXTZXJMBM/","observedAt":"2026-05-10","note":"eMAG — cască Bluetooth mono MRG MS109, handsfree după ureche (segment entry)"},{"price":89,"sourceUrl":"https://www.emag.ro/casca-wireless-yyk530-bluetooth-5-1-edr-compatibila-ios-android-audio-hd-convorbire-12-ore-standby-180-ore-cutie-de-incarcare-afisaj-led-negru-hr-8/pd/DZFHSZMBM/","observedAt":"2026-05-10","note":"eMAG — YYK530: afișaj LED autonomie, standby 180 h, handsfree (foarte apropiat ca mesaje de pe cutie)"},{"price":113.74,"sourceUrl":"https://www.emag.ro/casca-bluetooth-5-3-matcso-by-csm-4u-productsr-single-ear-handsfree-wireless-business-compatibila-ios-android-eliminare-zgomot-control-volum-usb-c-sunet-clar-cutie-de-incarcare-afisaj-led-negru-342005/pd/D7HC29YBM/","observedAt":"2026-05-10","note":"eMAG — Matcso single ear, rotație ureche 180°, cutie + LED, Bluetooth 5.3 (preț din listare)"}]',
  'Preț Elena: 15 RON. Nu există listări „KJ12” pe magazinele verificate — observațiile sunt căști Bluetooth mono / business cu hook și (unde e cazul) LED și rotire ureche. Medie din 3 prețuri eMAG ≈ 76 RON (actualizare 2026-05-10); primul punct e reper entry ~25 RON.'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-vehicle-blackbox-dvr-elena',
  'Vehicle Blackbox DVR — cameră auto Full HD 1080p (2,4" TFT)',
  'DVR-BLACKBOX-FHD1080',
  35.00,
  0.00,
  'A',
  0.00,
  0.00,
  0,
  '["/images/seed-vehicle-blackbox-dvr.png"]',
  'Pe ambalaj: „Vehicle Blackbox DVR” / HD DVR 1920×1080, badge Full HD 1080. Ecran TFT 2,4″ pentru previzualizare și meniu. Pictograme tip file locking (protecție clipuri) și motion detection. Vizual: carcasă neagră tip dashcam cu lentilă proeminentă, montare ventuză pe parbriz (confirmă în pachet: cablu brichetă, card microSD uneori separat). Înregistrare tip buclă + senzor șoc tipic categoriei (G-sensor — verifică manual). OEM fără marcă unică pe piață. Distribuție Elena.',
  '[{"price":219.23,"sourceUrl":"https://www.emag.ro/camera-auto-de-bord-louluna-si-card-de-memorie-32-gb-wifi-aplicatie-android-ios-full-hd-1080p-unghi-inregistrare-170-ecran-lcd-g-sensor-vedere-nocturna-senzor-de-miscare-negru-at22/pd/DT7JJKYBM/","observedAt":"2026-05-10","note":"eMAG — Louluna Full HD 1080p, LCD, G-sensor, senzor mișcare, vedere nocturnă (preț din listare)"},{"price":325.37,"sourceUrl":"https://www.emag.ro/camera-auto-dvr-navitel-ecran-2-fhd-30fps-unghi-de-140-grade-g-sensor-auto-inregistrare-evenimente-r200/pd/DBR2CJBBM/","observedAt":"2026-05-10","note":"eMAG — Navitel R200, FHD 30 fps, ecran 2″, 140°, G-sensor, înregistrare evenimente (preț din listare)"},{"price":352.36,"sourceUrl":"https://www.emag.ro/camera-auto-smart-70mai-dash-cam-lite-fov-130-1080p-wdr-g-sensor-sony-imx307-wi-fi-midrive-d08/pd/D26S6WBBM/","observedAt":"2026-05-10","note":"eMAG — 70mai Dash Cam Lite, 1080p, ecran LCD 2″, Wi‑Fi, G-sensor, WDR (preț din listare)"}]',
  'Preț Elena: 35 RON. Nu există listări „Vehicle Blackbox DVR” pe eMAG — observațiile sunt camere DVR Full HD cu ecran ~2–2,4″ și funcții apropiate (mișcare / protecție fișiere / G-sensor). Medie din 3 prețuri listare ~299 RON (snapshot JSON „price.current” pe paginile eMAG, 2026-05-10).'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-cosmetic-brush-storage-bucket-elena',
  'Organizator cosmetic rotativ 360° — bucket pensule (LD-1005-1)',
  'LD-1005-1-COSMETIC-BUCKET',
  15.00,
  0.00,
  'A',
  0.00,
  0.00,
  0,
  '["/images/seed-cosmetic-brush-storage-bucket.png"]',
  'Cutie cu text tip „360° rotary cosmetic brush storage bucket”; model LD-1005-1 pe ambalaj. Recipient cilindric alb cu separator interioare („partition”) pentru pensule, rujuri, creioane — bază care permite rotirea completă pentru acces rapid. Ilustrare cu și fără capac transparent bombat anti-praf. Util birou machiaj / baie pentru spațiu compact. Distribuție Elena.',
  '[{"price":61.01,"sourceUrl":"https://www.emag.ro/organizator-machiaj-rotativ-360-temu-5-compartimente-design-elegant-om1269/pd/DMPZ8WYBM/","observedAt":"2026-05-10","note":"eMAG — organizator machiaj rotativ 360°, 5 compartimente (preț din listare)"},{"price":73.4,"sourceUrl":"https://www.emag.ro/suport-rotativ-pentru-pensule-de-machiaj-unloshe-model-cu-romburi-elegant-capac-transparent-compartiment-cu-trei-niveluri-rotativ-in-interior-si-exterior-27x12-3x12-3cm-transparent-urbannestliving153/pd/DK1M783BM/","observedAt":"2026-05-10","note":"eMAG — suport rotativ pensule, niveluri multiple, capac transparent (preț din listare)"},{"price":119.89,"sourceUrl":"https://www.emag.ro/organizator-pensule-machiaj-alb-25x12cm-capacitate-mare-gw57942/pd/DZLPWWYBM/","observedAt":"2026-05-10","note":"eMAG — organizator pensule alb 25×12 cm, capacitate mare (referință segment organizatoare masă)"}]',
  'Preț Elena: 15 RON. Nu există listări „LD-1005-1” pe eMAG — observațiile sunt organizatoare rotative / pentru pensule din aceeași categorie. Medie din 3 prețuri listare ~85 RON (snapshot JSON „price.current”, 2026-05-10).'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-g63-smart-light-sound-machine-elena',
  'G63 Smart Light Sound Machine (lumină RGB + ceas + sunet)',
  'G63-SMART-LIGHT-SOUND',
  20.00,
  0.00,
  'A',
  0.00,
  0.00,
  0,
  '["/images/seed-g63-smart-light-sound-machine.png"]',
  'Pe ambalaj: „G63”, „Smart Light Sound Machine”. Vizual: carcasă albă în formă de G cu bandă LED RGB multicoloră pe interiorul curbei; zonă centrală cu afișaj tip ceas (ex. 22:38 în poză) și patru butoane circulare pentru control. Combinație tipică lampă de veghe / ambient cu alarmă sau sunete de fundal (white noise / natură — confirmă pe manual). Alimentare probabil USB sau adaptor (verifică eticheta). OEM fără marcă unică pe piața RO. Distribuție Elena.',
  '[{"price":296,"sourceUrl":"https://www.emag.ro/ceas-desteptator-electronic-72-desi-18-tipuri-de-lumini-rgb-cu-intesitate-reglabila-radio-fm-doua-alarme-si-functia-snooze-simuleaza-rasaritul-si-apusul-soarelui-cu-7-sunete-naturale-control-prin-buto/pd/DL3YZDYBM/","observedAt":"2026-05-10","note":"eMAG — ceas LED + lumini RGB, sunete naturale, simulare răsărit/apus, radio FM (segment wake-up light)"},{"price":229.8,"sourceUrl":"https://www.emag.ro/ceas-desteptator-cu-lumina-naturala-longziming-simuleaza-rasaritul-si-apusul-9-tonuri-naturale-12-moduri-de-culoare-20-niveluri-de-luminozitate-cb-240910-1226/pd/DN087LYBM/","observedAt":"2026-05-10","note":"eMAG — ceas cu lumină naturală, tonuri naturale, moduri culoare (segment similar)"},{"price":134.31,"sourceUrl":"https://www.emag.ro/dispozitiv-sunete-hd-si-zgomot-alb-cu-lumini-de-ambientale-desteptator-cu-expresii-pentru-copii-proiectinno-ct-a1-design-modern-redare-muzica-bluetooth-card-sd-cronometru-standby-4-ore-alb-a032/pd/DH58P1YBM/","observedAt":"2026-05-10","note":"eMAG — zgomot alb + lumini ambientale, Bluetooth, desteptator (segment sunet + lumină)"}]',
  'Preț Elena: 20 RON. Nu există listări „G63” pe eMAG — observațiile sunt ceasuri / lampă cu RGB și sunete naturale sau white noise din aceeași categorie. Medie din 3 prețuri listare ~220 RON (snapshot JSON „price.current”, 2026-05-10).'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-mini-doorbell-elena',
  'Mini Doorbell — sonerie video wireless (exterior + receptor)',
  'MINI-DOORBELL-WIFI-KIT',
  35.00,
  0.00,
  'A',
  0.00,
  0.00,
  0,
  '["/images/seed-mini-doorbell.png"]',
  'Ambalaj cu titlu „MINI DOORBELL”; schițe line-art: modul pentru ușă cu lentilă cameră și buton cu pictogramă clopoțel; variantă cu grile difuzor; unitate interioară ovală tip clopoțel cu grilă mare (sunet apel). Produs OEM WiFi / RF în funcție de model — verifică pe etichetă: rezoluție, alimentare, Tuya sau aplicație proprie, card SD. Distribuție Elena.',
  '[{"price":209.94,"sourceUrl":"https://www.emag.ro/sonerie-fara-fir-wireless-cu-monitor-bedeer-sonerie-video-pentru-exterior-clopotel-wireless-ecran-4-3-wifi-captura-imagine-la-imagine-hd-autonomie-mare-apasarea-soneriei-11-2x9x2-cm-negru-6hg3970hhhhh/pd/DBLJPG3BM/","observedAt":"2026-05-10","note":"eMAG — Bedee sonerie video wireless + monitor interior 4,3″, WiFi, HD (segment kit compact)"},{"price":429.99,"sourceUrl":"https://www.emag.ro/sonerie-inteligenta-cu-camera-video-xiaomi-smart-doorbell-3-wi-fi-rezolutie-2k-acumulator-5200mah-incarcare-usb-c-79db-bhr5416gl/pd/DQMH4LMBM/","observedAt":"2026-05-10","note":"eMAG — Xiaomi Smart Doorbell 3, Wi‑Fi, 2K, acumulator (segment premium cunoscut)"},{"price":1099,"sourceUrl":"https://www.emag.ro/videointerfon-google-nest-doorbell-cu-baterii-193575008530/pd/DPWSZSMBM/","observedAt":"2026-05-10","note":"eMAG — Google Nest Doorbell cu baterii, Wi‑Fi (referință preț segment premium)"}]',
  'Preț Elena: 35 RON. Nu există listări „Mini Doorbell” generice pe eMAG — observațiile sunt sonerii video WiFi din aceeași categorie (exterior + sunet interior). Medie din 3 prețuri listare ~580 RON (snapshot JSON „price.current”, 2026-05-10).'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-22pcs-veggie-slicer-elena',
  '22 PCS Veggie Slicer — feliator / tocător legume & fructe',
  'SLICER-VEGGIE-22PCS',
  35.00,
  0.00,
  'A',
  0.00,
  0.00,
  0,
  '["/images/seed-22pcs-veggie-slicer.png"]',
  'Ambalaj cu text „22 PCS VEGGIE SLICER”, subtitlu tip „Multifunction Veggie & Fruit Chopper”; mențiuni marketing „CORE 6 ADVANTAGES” (material, design, operare simplă, viteză, timp, funcții). Vizual: bază/container întunecat cu presă sau levier verde și set de lame/inserții pentru felii, julienne, rază etc. (număr exact de piese confirmă manual). Distinct de setul Basel „SLICER-VEG-MULTI” din catalog (alt SKU / alt ambalaj). Distribuție Elena.',
  '[{"price":80,"sourceUrl":"https://www.emag.ro/razatoare-multifuctionala-22-piese-cuprine-in-set-lame-din-otel-inoxidabil-feliere-radere-taietor-gri-verde-pr159/pd/DTF72M3BM/","observedAt":"2026-05-10","note":"eMAG — răzătoare multifuncțională 22 piese, lame inox, gri-verde (potrivire foarte bună cu „22 PCS”)"},{"price":41.29,"sourceUrl":"https://www.emag.ro/feliator-de-legume-13-in-1-tenor-multifunctional-8-taieturi-accesorii-pentru-tocat-maruntit-feliat-julienne-separator-de-oua-lame-de-inox-28-x-13-cm-verde-teno752/pd/DM4570YBM/","observedAt":"2026-05-10","note":"eMAG — feliator legume 13 în 1 Teno, verde, lame inox (segment multifunction chopper)"},{"price":33.28,"sourceUrl":"https://www.emag.ro/set-feliator-legume-multifunctional-16-in-1-abs-otel-inoxidabil-den-scq/pd/DJP2YXYBM/","observedAt":"2026-05-10","note":"eMAG — set feliator 16 în 1 ABS + inox (referință entry în aceeași categorie)"}]',
  'Preț Elena: 35 RON. SKU separat de „SLICER-VEG-MULTI” (tocător Nicer Dicer / Basel din seed). Medie din 3 observații eMAG ~52 RON (snapshot JSON „price.current”, 2026-05-10).'
);
INSERT INTO products (
  id, name, sku, supplier_price_a, supplier_price_b, cost_supplier,
  sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
) VALUES (
  'seed-galaxy-nightlight-projector-elena',
  'Galaxy Nightlight Projector — lampă veghe proiector stele/galaxie',
  'GALAXY-NIGHTLIGHT-PROJECTOR',
  45.00,
  0.00,
  'A',
  0.00,
  0.00,
  0,
  '["/images/seed-galaxy-nightlight-projector.png"]',
  'Ambalaj cu titlu „GALAXY NIGHTLIGHT PROJECTOR”; bullet-uri tip „Customizable galaxy”, „Sleep mode”, „Built-in speaker”. Ilustrare: proiector în formă de ou fisurat (aspect dino / coajă), bază mică, strălucire roșie din crăpături; telecomandă compactă pentru culori/moduri. Tip OEM pentru dormitor/copii — rotație, temporizator și redare audio Bluetooth sau jack în funcție de model (verifică manual). Distribuție Elena.',
  '[{"price":33.88,"sourceUrl":"https://www.emag.ro/proiector-de-stele-astronaut-copii-si-adulti-led-telecomanda-reglare-360o-alb-22-baby-projectors/pd/D83ZWTYBM/","observedAt":"2026-05-10","note":"eMAG — proiector stele astronaut LED, telecomandă, reglare 360° (segment entry)"},{"price":39.93,"sourceUrl":"https://www.emag.ro/proiector-de-stele-techoner-starry-miracle-rgb-multiple-efecte-3-moduri-luminare-telecomanda-negru-led-starry/pd/DX1X503BM/","observedAt":"2026-05-10","note":"eMAG — Starry Miracle RGB, 3 moduri lumină, telecomandă (segment similar)"},{"price":44.77,"sourceUrl":"https://www.emag.ro/proiector-laser-astronaut-cu-joc-de-lumini-nebula-si-stele-led-1033/pd/D4SH0WMBM/","observedAt":"2026-05-10","note":"eMAG — proiector laser astronaut, nebulă + stele, LED (preț din listare)"}]',
  'Preț Elena: 45 RON. Nu există listări „Galaxy Nightlight Projector” pe eMAG — observațiile sunt proiectoare stele/galaxie cu telecomandă din aceeași categorie. Medie din 3 prețuri listare ~40 RON (snapshot JSON „price.current”, 2026-05-10).'
);
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

