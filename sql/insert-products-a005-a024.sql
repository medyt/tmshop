USE shoptop;

-- Produse noi A005 - A024 (20 bucati), un singur import comun.
-- RuleazÄ in phpMyAdmin pe server, DUPA migrarea la purchase_price.
--
-- purchase_price = pret achizitie (din tabelul de receptie), sale_price = pretul din
-- pagina furnizorului, discount_percent => pretul taiat afisat in magazin.
-- Produsul apare in magazin doar daca stock_qty > 0 (stocurile sunt setate mai jos).
-- Daca un id exista deja, INSERT-ul acelui rand esueaza - sterge randul respectiv.

-- A005 - Boxa portabila fara fir cu microfon (difuzor karaoke) | Furnizor: wisebuy.ro (DPF1340)
INSERT INTO products (id, name, sku, mpn, purchase_price, sale_price, discount_percent, stock_qty, image_urls, description, notes) VALUES (
  'A005',
  'Boxa portabila fara fir cu microfon - Bluetooth, karaoke, lumini LED',
  'A005',
  '58-36',
  11.58, 69.00, 66, 200,
  '["https://admin.wisebuy.ro/uploads/prod_a/1983-24223.png","https://admin.wisebuy.ro/uploads/prod_b/1983-24224.png","https://admin.wisebuy.ro/uploads/prod_b/1983-24225.png","https://admin.wisebuy.ro/uploads/prod_b/1983-24226.png"]',
  'Difuzor portabil fara fir ideal pentru muzica, karaoke si petreceri oriunde te afli. Include doua microfoane fara fir, perfecte pentru serile de karaoke cu prietenii sau familia. Luminile LED multicolore creeaza o atmosfera vibranta la petreceri sau evenimente in aer liber. Conectivitate Bluetooth pentru redare directa de pe telefon, tableta sau alt dispozitiv compatibil. Baterie reincarcabila cu autonomie de ore intregi si dimensiuni compacte, usor de transportat.',
  'MPN: 58-36. Ambalare: 80/BAX. Sursa: wisebuy.ro (COD DPF1340). Pret achizitie: 11.58 RON.'
);

-- A006 - Aparat taietor cartofi Chopper cu lama inox ErgoPlus | Furnizor: magazin15.ro (ACP2015)
INSERT INTO products (id, name, sku, mpn, purchase_price, sale_price, discount_percent, stock_qty, image_urls, description, notes) VALUES (
  'A006',
  'Aparat taietor cartofi Chopper cu lama inox ErgoPlus - 2 site interschimbabile',
  'A006',
  'ACP2015',
  19.85, 64.00, 0, 180,
  '["https://www.magazin15.ro/wp-content/uploads/2022/09/93909-22251.jpg","https://www.magazin15.ro/wp-content/uploads/2022/09/93907-22251.jpg"]',
  'Aparat de feliat cartofi si legume care te ajuta sa obtii mult mai repede legume taiate uniform, reducand timpul petrecut in bucatarie. Toti cartofii vor avea dimensiuni perfecte, ca la restaurant, iar bucatile egale sunt ideale si pentru frigarui. Lama din otel inoxidabil rezistenta si ascutita, confectionata sa reziste la utilizare indelungata. Include 2 site de marimi diferite, pentru cartofi pai si legume mai subtiri sau mai groase. Se fixeaza stabil pe blatul din bucatarie sau pe masa in timpul lucrului. A se folosi cu atentie si a nu se lasa la indemana copiilor.',
  'Cod furnizor: ACP2015. Sursa: magazin15.ro. Pret achizitie: 19.85 RON.'
);

-- A007 - Razatoare multifunctionala cu 3 lame interschimbabile | Furnizor: topredus.ro (RMR1101)
INSERT INTO products (id, name, sku, mpn, purchase_price, sale_price, discount_percent, stock_qty, image_urls, description, notes) VALUES (
  'A007',
  'Razatoare multifunctionala cu 3 lame interschimbabile - baza cu ventuze',
  'A007',
  'RMR1101',
  14.89, 49.00, 74, 216,
  '["https://www.topredus.ro/media/catalog/product/1/0/105-2383.jpg","https://www.topredus.ro/media/catalog/product/1/0/105-5368.jpg","https://www.topredus.ro/media/catalog/product/1/0/105-5369.jpg","https://www.topredus.ro/media/catalog/product/1/0/105-5370.jpg","https://www.topredus.ro/media/catalog/product/1/0/105-5371.jpg","https://www.topredus.ro/media/catalog/product/1/0/105-5372.jpg"]',
  'Razatoare multifunctionala de bucatarie cu 3 lame interschimbabile pentru razuire fina, grosiera si feliere precisa. Baza cu ventuze pentru stabilitate perfecta pe orice suprafata si protectie completa care iti permite sa razui pana la ultima bucata fara risc de taiere. Design compact care economiseste spatiu si curatare rapida, compatibila cu masina de spalat vase. Mecanism manual simplu, fara consum electric. Dimensiuni: inaltime 23 cm, latime talpa 11,5 cm, maner 8 cm. Material: otel inoxidabil si plastic ABS. Perfecta pentru legume, fructe, nuci, migdale si branza.',
  'Cod furnizor: RMR1101. Sursa: topredus.ro. Pret achizitie: 14.89 RON.'
);

-- A008 - Set 1+1 rola pentru repararea peretilor | Furnizor: produsulzilei.ro (RRP0012)
INSERT INTO products (id, name, sku, mpn, purchase_price, sale_price, discount_percent, stock_qty, image_urls, description, notes) VALUES (
  'A008',
  'Set 1+1 rola pentru repararea peretilor - aplicare usoara, uscare rapida',
  'A008',
  'RRP0012',
  8.27, 89.00, 0, 324,
  '["https://www.produsulzilei.ro/media/catalog/product/r/o/rol_1.png","https://www.produsulzilei.ro/media/catalog/product/r/o/rol1_1.png","https://www.produsulzilei.ro/media/catalog/product/r/o/rol2_1.png","https://www.produsulzilei.ro/media/catalog/product/r/o/rol3_1.png","https://www.produsulzilei.ro/media/catalog/product/r/o/rol4_1.png"]',
  'Set complet pentru reconditionarea peretilor care iti permite sa repari rapid si eficient crapaturile, petele si imperfectiunile. Design multifunctional: rola inclusa asigura o aplicare uniforma fara unelte suplimentare. Formula cu uscare rapida ofera rezultate vizibile in 3-4 ore, iar materialele ecologice asigura un mediu sigur si fara mirosuri iritante. Indeparteaza eficient petele dificile si lasa peretii ca noi. Dimensiuni produs: aproximativ 21 x 11,5 x 7 cm, continut net 500 ml. Pachetul contine: tub de vopsea, rola cu pensula, pereche de manusi si smirghel (set 1+1).',
  'Cod furnizor: RRP0012. Sursa: produsulzilei.ro. Pret achizitie: 8.27 RON.'
);

-- A009 - Perie de par 5 in 1 cu aer cald 1000W | Furnizor: wisebuy.ro (PAR2297)
INSERT INTO products (id, name, sku, mpn, purchase_price, sale_price, discount_percent, stock_qty, image_urls, description, notes) VALUES (
  'A009',
  'Perie de par 5 in 1 multifunctionala, cu aer cald 1000W si accesorii',
  'A009',
  'P514957',
  28.93, 79.00, 59, 150,
  '["https://admin.wisebuy.ro/uploads/prod_a/888-13986.png","https://admin.wisebuy.ro/uploads/prod_b/888-13979.jpg","https://admin.wisebuy.ro/uploads/prod_b/888-13980.jpg","https://admin.wisebuy.ro/uploads/prod_b/888-13982.jpg","https://admin.wisebuy.ro/uploads/prod_b/888-13983.jpg","https://admin.wisebuy.ro/uploads/prod_b/888-13984.jpg","https://admin.wisebuy.ro/uploads/prod_b/888-13985.jpg","https://admin.wisebuy.ro/uploads/prod_b/888-16419.jpg"]',
  'Perie electrica multifunctionala 5 in 1 cu aer cald care usuca rapid, piaptana, netezeste si coafeaza parul cu ajutorul celor 5 accesorii de stilizare. Tehnologia de uscare si aranjare prin aer cald permite uscarea si aranjarea parului simultan, reducand timpul de coafare. Putere 1000 W, 3 trepte de temperatura (aprox. 63, 96 si 136 grade C), potrivita pentru indreptare, ondulare si volum. Se poate folosi acasa sau in salon si este usor de transportat in vacante. Culoare gri/roz, lungime cablu 2,5 m.',
  'Cod furnizor: P514957. Sursa: wisebuy.ro (COD PAR2297). Pret achizitie: 28.93 RON.'
);

-- A010 - Cantar corporal digital inteligent cu Bluetooth | Furnizor: wisebuy.ro (CTR2706)
INSERT INTO products (id, name, sku, mpn, purchase_price, sale_price, discount_percent, stock_qty, image_urls, description, notes) VALUES (
  'A010',
  'Cantar corporal digital inteligent cu Bluetooth si aplicatie',
  'A010',
  'CTR2706',
  13.23, 69.00, 58, 260,
  '["https://admin.wisebuy.ro/uploads/prod_a/898-14100.png","https://admin.wisebuy.ro/uploads/prod_b/898-14097.png","https://admin.wisebuy.ro/uploads/prod_b/898-14098.png","https://admin.wisebuy.ro/uploads/prod_b/898-14099.png","https://admin.wisebuy.ro/uploads/prod_b/898-14102.jpeg","https://admin.wisebuy.ro/uploads/prod_b/898-14103.jpeg","https://admin.wisebuy.ro/uploads/prod_b/898-14104.jpeg","https://admin.wisebuy.ro/uploads/prod_b/898-14105.png","https://admin.wisebuy.ro/uploads/prod_b/898-14106.jpeg"]',
  'Cantar corporal digital inteligent care analizeaza structura corpului si stocheaza datele pe smartphone-ul tau Android sau iOS. Ofera o imagine reala a greutatii, procentului de grasime corporala si a apei din organism. Valori masurabile: greutate, grasime corporala, apa corporala, indice de masa corporala, masa musculara, grasime viscerala, masa osoasa, metabolism si altele. Conexiune wireless Bluetooth cu aplicatie dedicata, afisaj LCD/LED, talpi antiderapante, suprafata din sticla calita. Domeniu de masurare 0,2 - 180 kg. Dimensiuni: 2,3 x 26 x 26 cm. Baterii incluse.',
  'Cod furnizor: CTR2706. Sursa: wisebuy.ro. Pret achizitie: 13.23 RON.'
);

-- A011 - Set 2 x furtun transfer lichide cu pompa amorsare | Furnizor: wisebuy.ro (W9994)
INSERT INTO products (id, name, sku, mpn, purchase_price, sale_price, discount_percent, stock_qty, image_urls, description, notes) VALUES (
  'A011',
  'Set 2 x furtun transfer lichide/combustibil 2m, cu pompa manuala de amorsare',
  'A011',
  'FTL0002',
  6.62, 49.00, 51, 400,
  '["https://admin.wisebuy.ro/uploads/prod_a/1345-23479.png","https://admin.wisebuy.ro/uploads/prod_b/1345-23480.jpg","https://admin.wisebuy.ro/uploads/prod_b/SIFON.webp","https://admin.wisebuy.ro/uploads/prod_b/SIFON1.webp","https://admin.wisebuy.ro/uploads/prod_b/SIFON2.webp","https://admin.wisebuy.ro/uploads/prod_b/SIFON4.webp","https://admin.wisebuy.ro/uploads/prod_b/SIFON5.webp","https://admin.wisebuy.ro/uploads/prod_b/SIFON7.webp"]',
  'Pompa manuala pentru transferul lichidelor in conditii sigure si eficiente. Corp durabil din cauciuc si furtunuri PVC transparente, rezistente la ulei si temperaturi ridicate. Pompa de mana cu debit mare permite transferul rapid al lichidelor dintr-un recipient in altul, iar structura simpla o face usor de utilizat. Poate fi folosita pentru benzina, motorina, apa si alte lichide comune, precum si ca schimbator de apa pentru acvarii. Set de 2 bucati, furtun de 2 m. Nu este potrivita pentru lichide corozive.',
  'Cod furnizor: FTL0002. Sursa: wisebuy.ro (COD W9994). Pret achizitie: 6.62 RON.'
);

-- A012 - Perie rotativa cu aer cald 1000W | Furnizor: eMAG (POS2008)
INSERT INTO products (id, name, sku, mpn, purchase_price, sale_price, discount_percent, stock_qty, image_urls, description, notes) VALUES (
  'A012',
  'Perie rotativa cu aer cald 1000W - uscare si coafare, negru/roz',
  'A012',
  'POS2008',
  16.53, 39.93, 59, 210,
  '["https://s13emagst.akamaized.net/products/57616/57615380/images/res_9c5b7933ef8286869c3cababd3677f2f.jpg?width=720&height=720"]',
  'Perie rotativa care iti permite sa indrepti, sa piepteni sau sa ondulezi parul in timp ce il usuci in acelasi timp, economisind timp si bani la coafor. Combina puterea de incalzire de 1000 W a unui uscator de par cu o perie rotativa pentru coafare rapida. Are 3 trepte de temperatura si 3 trepte de viteza pentru rezultate personalizate. Culoare negru/roz.',
  'Cod furnizor: POS2008. Sursa: emag.ro. Pret achizitie: 16.53 RON.'
);

-- A013 - Extensie rotativa 360 grade pentru robinet | Furnizor: topredus.ro (EXT2785)
INSERT INTO products (id, name, sku, mpn, purchase_price, sale_price, discount_percent, stock_qty, image_urls, description, notes) VALUES (
  'A013',
  'Extensie rotativa 360 grade pentru robinet - multiple moduri de curgere',
  'A013',
  'ERR0001',
  4.14, 29.00, 77, 400,
  '["https://www.topredus.ro/media/catalog/product/9/8/983-15085.png","https://www.topredus.ro/media/catalog/product/9/8/983-24049.png","https://www.topredus.ro/media/catalog/product/9/8/983-24050.jpg","https://www.topredus.ro/media/catalog/product/9/8/983-24051.jpg","https://www.topredus.ro/media/catalog/product/9/8/983-24052.jpg","https://www.topredus.ro/media/catalog/product/9/8/983-24053.jpg"]',
  'Extensie rotativa cu filtru aerator care transforma orice robinet intr-unul modern si eficient. Rotatie completa pentru acces usor la orice colt al chiuvetei si economie de apa prin tehnologia de aerare. Multiple moduri de curgere (jet tip dus si jet normal) si un mod de presiune conceput pentru a economisi apa. Jet uniform si placut, fara stropire. Instalare rapida, compatibila cu majoritatea robinetelor cu filet interior. Confectionata din plastic ABS. Continut pachet: extensie rotativa, reductie 2,3 cm si 3 garnituri de cauciuc. Dimensiuni: 9,6 x 4 x 5 cm.',
  'Cod furnizor: ERR0001. Sursa: topredus.ro (COD EXT2785). Pret achizitie: 4.14 RON.'
);

-- A014 - Storcator electric de citrice portabil USB 45W | Furnizor: wisebuy.ro (WST1857)
INSERT INTO products (id, name, sku, mpn, purchase_price, sale_price, discount_percent, stock_qty, image_urls, description, notes) VALUES (
  'A014',
  'Storcator electric de citrice portabil cu alimentare USB, 45W, turcoaz',
  'A014',
  'WST1857',
  28.40, 69.00, 66, 210,
  '["https://admin.wisebuy.ro/uploads/prod_a/1523-23792.png","https://admin.wisebuy.ro/uploads/prod_b/res_2536041fd1ca8e936323599d42df24a3.jpg","https://admin.wisebuy.ro/uploads/prod_b/res_53974956414cfba9711518e9944d48d6.jpg","https://admin.wisebuy.ro/uploads/prod_b/res_7030ce0139e89174a668107be72cea63.jpg"]',
  'Storcator de citrice ideal pentru iubitorii de sucuri naturale, pe care le prepari simplu si rapid acasa. Fructele cu diametrul sub 10 cm se taie in jumatate, iar cele mai mari in patru bucati. Se incarca cu orice dispozitiv compatibil USB. Conul de suc tine fructele pe loc si previne stoarcerea dezordonata. Poti stoarce lamai, lime, portocale, grapefruit, rodie, struguri si altele. Piese detasabile usor de spalat. Capacitate 500 ml, putere 45 W, material plastic ABS, dimensiuni 11 x 10,7 x 23,7 cm. Pachetul contine storcatorul si un cablu USB tip C.',
  'Cod furnizor: WST1857. Sursa: wisebuy.ro. Pret achizitie: 28.40 RON.'
);

-- A015 - Set 1+1 lampa UV anti-tantari silentioasa | Furnizor: doarredus.ro (KRIV155-6)
INSERT INTO products (id, name, sku, mpn, purchase_price, sale_price, discount_percent, stock_qty, image_urls, description, notes) VALUES (
  'A015',
  'Set 1+1 lampa UV anti-tantari, silentioasa, alimentare USB',
  'A015',
  'KRIV155-6',
  6.62, 89.00, 44, 74,
  '["https://cdn.shopify.com/s/files/1/0785/1917/3445/products/3254-7593.jpg","https://cdn.shopify.com/s/files/1/0785/1917/3445/products/3254-7594.jpg","https://cdn.shopify.com/s/files/1/0785/1917/3445/products/3254-7595.jpg","https://cdn.shopify.com/s/files/1/0785/1917/3445/files/61CTpTlYwWL._AC_SL1500.jpg"]',
  'Aparat anti-insecte care functioneaza pe baza de inalta tensiune, inofensiva pentru oameni dar mortala pentru insecte. Insectele zburatoare sunt atrase de lumina ultravioleta UV si eliminate prin electrocutare rapida. Bucura-te de seri linistite fara sa mai fii deranjat de intepaturi. Dimensiuni compacte, poate fi utilizat suspendat (are curea din silicon) sau asezat pe o suprafata plana. Alimentare continua USB. Specificatii: tensiune 5 V, curent 1 A, putere 5 W, lungime cablu 80 cm, lumina violet. Pachetul contine 2 lampi UV si 2 cabluri de alimentare.',
  'Cod furnizor: KRIV155-6. Ambalare: 100/BAX. Sursa: doarredus.ro. Pret achizitie: 6.62 RON.'
);

-- A016 - Plita rotunda coreeana pentru gratar 36cm | Furnizor: diversmag.ro (BSL101-44)
INSERT INTO products (id, name, sku, mpn, purchase_price, sale_price, discount_percent, stock_qty, image_urls, description, notes) VALUES (
  'A016',
  'Plita rotunda coreeana pentru gratar 36 cm - antiaderenta, compatibila inductie',
  'A016',
  'BSL101-44',
  11.58, 59.00, 41, 420,
  '["https://diversmag.ro/wp-content/uploads/2024/09/plita-rotunda-coreeana-pentru-gratar-bbqpan-32cm-226508.jpg","https://diversmag.ro/wp-content/uploads/2024/09/plita-rotunda-coreeana-pentru-gratar-bbqpan-32cm-873040.jpg","https://diversmag.ro/wp-content/uploads/2024/09/eddf84054673761f8ca632d57e7dd223b4d297a8_original.jpeg","https://diversmag.ro/wp-content/uploads/2024/09/poza-tig-7.webp"]',
  'Plita rotunda coreeana pentru gratar, ideala pentru un gatit autentic in stil coreean.\nGatit autentic coreean: experimenteaza aromele bogate ale bucatariei traditionale coreene cu o plita de inalta calitate.\nDistributie superioara a caldurii: incalzire uniforma, pentru mese perfect gatite de fiecare data.\nDurabila si usor de curatat: realizata din materiale durabile, rezistenta la zgarieturi si simplu de intretinut.\nVersatila pentru orice bucatarie: de la gratar de carne si legume pana la delicioase preparate stir-fry.\nDetalii tehnice: material fier, dimensiune 36 cm, forma circulara, suprafata antiaderenta, portabila si compatibila cu plita cu inductie.',
  'Cod furnizor: BSL101-44. Ambalare: 40/BAX. Sursa: diversmag.ro. Pret achizitie: 11.58 RON.'
);

-- A017 - Ondulator de par cu 3 tuburi 24mm | Furnizor: topredus.ro (OPR2168)
INSERT INTO products (id, name, sku, mpn, purchase_price, sale_price, discount_percent, stock_qty, image_urls, description, notes) VALUES (
  'A017',
  'Ondulator de par cu 3 tuburi 24 mm - control temperatura, acoperire ceramica',
  'A017',
  'OPR2168',
  23.15, 64.00, 59, 120,
  '["https://www.topredus.ro/media/catalog/product/3/8/387-21130.png","https://www.topredus.ro/media/catalog/product/3/8/387-21131.png","https://www.topredus.ro/media/catalog/product/3/8/387-21132.jpg","https://www.topredus.ro/media/catalog/product/3/8/387-21133.png","https://www.topredus.ro/media/catalog/product/3/8/387-21134.jpg","https://www.topredus.ro/media/catalog/product/3/8/387-21135.jpg","https://www.topredus.ro/media/catalog/product/3/8/387-21136.jpg"]',
  'Ondulator triplu de par de 24 mm, aparat de coafat rapid si durabil. Designul unic cu 3 tevi ofera o distributie de neegalat a caldurii, iar aranjarea se face rapid, printr-o singura trecere. Tehnologie de control al temperaturii cu 2 moduri (180 grade C si 210 grade C) pentru utilizare in siguranta. Dispozitiv cu incalzire rapida, optim in aproximativ 30 de secunde. Acoperire ceramica, tensiune 110-240 V, putere 70-130 W, cablu rotativ 360 grade, diametru 24 mm. Se poate folosi pe par uscat. Continut pachet: 1 ondulator de par.',
  'Cod furnizor: OPR2168. Sursa: topredus.ro. Pret achizitie: 23.15 RON.'
);

-- A018 - Rasnita electrica pentru cafea si condimente | Furnizor: topredus.ro (RAS2778)
INSERT INTO products (id, name, sku, mpn, purchase_price, sale_price, discount_percent, stock_qty, image_urls, description, notes) VALUES (
  'A018',
  'Rasnita electrica din otel inoxidabil - cafea si condimente, 150W',
  'A018',
  'RAS2778',
  14.88, 44.00, 65, 216,
  '["https://www.topredus.ro/media/catalog/product/9/7/976-14994.png","https://www.topredus.ro/media/catalog/product/9/7/976-14995.png","https://www.topredus.ro/media/catalog/product/9/7/976-14996.png","https://www.topredus.ro/media/catalog/product/9/7/976-14997.png","https://www.topredus.ro/media/catalog/product/9/7/976-14998.jpg","https://www.topredus.ro/media/catalog/product/9/7/976-14999.jpg","https://www.topredus.ro/media/catalog/product/9/7/976-15000.png"]',
  'Rasnita electrica utila in orice bucatarie, care macina nu doar cafeaua, ci si alte ingrediente precum nuci, zahar, scortisoara, piper sau alte condimente. Motor puternic de 150 W cu viteza suficienta pentru a rasni intr-un timp foarte scurt. Butonul pornit/oprit este pozitionat pentru a fi actionat cu usurinta. Capacul din plastic transparent ofera vizibilitate permanenta in cuva, iar bolul si lamele sunt din otel inoxidabil. Capacitate intre 50 si 100 g, alimentare la priza 220 V, dimensiuni 17 x 10 cm.',
  'Cod furnizor: RAS2778. Sursa: topredus.ro. Pret achizitie: 14.88 RON.'
);

-- A019 - Mixer de mana 260W, 7 viteze | Furnizor: wisebuy.ro (MDM1014)
INSERT INTO products (id, name, sku, mpn, purchase_price, sale_price, discount_percent, stock_qty, image_urls, description, notes) VALUES (
  'A019',
  'Mixer de mana 260W, 7 viteze, alb - cu 4 palete',
  'A019',
  'MSW1963',
  14.05, 49.00, 51, 216,
  '["https://admin.wisebuy.ro/uploads/prod_a/1656-23604.jpg","https://admin.wisebuy.ro/uploads/prod_b/1656-22088.jpeg","https://admin.wisebuy.ro/uploads/prod_b/1656-22089.jpeg","https://admin.wisebuy.ro/uploads/prod_b/1656-22090.jpg"]',
  'Mixer de mana cu 7 trepte de viteza care iti permit sa amesteci ingredientele omogen, fara efort. Forma ergonomica il face usor de tinut in timpul functionarii, iar cele 4 palete speciale sunt usor de schimbat. Ideal pentru prepararea prajiturilor sau a aluatului, inlocuind cu usurinta telul clasic din bucatarie. Specificatii: material ABS si otel inoxidabil, tensiune 220 V, 50 Hz, compact si puternic.',
  'Cod furnizor: MSW1963. Sursa: wisebuy.ro (COD MDM1014). Pret achizitie: 14.05 RON.'
);

-- A020 - Irigator oral pentru dus bucal, rezervor 200ml | Furnizor: wisebuy.ro (ODB2957)
INSERT INTO products (id, name, sku, mpn, purchase_price, sale_price, discount_percent, stock_qty, image_urls, description, notes) VALUES (
  'A020',
  'Irigator oral pentru dus bucal, rezervor 200 ml, 3 moduri',
  'A020',
  'ODB2957',
  16.53, 55.00, 72, 180,
  '["https://admin.wisebuy.ro/uploads/prod_a/850-12977.jpg","https://admin.wisebuy.ro/uploads/prod_b/850-12948.png","https://admin.wisebuy.ro/uploads/prod_b/850-12954.jpg","https://admin.wisebuy.ro/uploads/prod_b/850-12971.png","https://admin.wisebuy.ro/uploads/prod_b/850-12974.png","https://admin.wisebuy.ro/uploads/prod_b/850-12976.png","https://admin.wisebuy.ro/uploads/prod_b/850-12981.png"]',
  'Irigator bucal pentru curatarea in profunzime a spatiului interdentar, acolo unde periajul clasic si ata dentara nu ajung. Curatarea intregii danturi dureaza doar 30 de secunde: umpli rezervorul cu apa simpla sau in combinatie cu apa de gura, directionezi si apesi. Ajuta la prevenirea cariilor dintre dinti. Are 3 moduri de lucru: sensibil, puternic si pulsatii ritmice pentru masarea gingiilor. Maner ergonomic, design care previne scurgerea apei. Baterie litiu-ion cu autonomie de pana la 4 saptamani. Rezervor 200 ml. Pachet: irigator, 1 capat de curatare, cablu USB si manual.',
  'Cod furnizor: ODB2957. Sursa: wisebuy.ro. Pret achizitie: 16.53 RON.'
);

-- A021 - Aparat inteligent de masaj cervical SIKS | Furnizor: altex.ro (cod 64EF6216D1917)
INSERT INTO products (id, name, sku, mpn, purchase_price, sale_price, discount_percent, stock_qty, image_urls, description, notes) VALUES (
  'A021',
  'Aparat inteligent de masaj cervical SIKS - 4 moduri, 15 niveluri, 2 capete, alb/gri',
  'A021',
  'MCS2129',
  16.53, 109.00, 0, 240,
  '["https://i.pepita.hu/images/product/21341038/aparat-inteligent-de-masaj-cervical-siks-r-4-moduri-de-masaj-15-niveluri-doua-capete-albgri_145358501_1200x630.jpg","https://i.pepita.hu/images/product/21341038/aparat-inteligent-de-masaj-cervical-siks-r-4-moduri-de-masaj-15-niveluri-doua-capete-albgri_145358502_1200x630.jpg","https://i.pepita.hu/images/product/21341038/aparat-inteligent-de-masaj-cervical-siks-r-4-moduri-de-masaj-15-niveluri-doua-capete-albgri_145358503_1200x630.jpg","https://i.pepita.hu/images/product/21341038/aparat-inteligent-de-masaj-cervical-siks-r-4-moduri-de-masaj-15-niveluri-doua-capete-albgri_145358504_1200x630.jpg"]',
  'Aparat inteligent de masaj cervical care ajuta la ameliorarea durerilor de gat, imbunatatirea calitatii somnului si a circulatiei sangelui. Design ergonomic in forma de U, care se muleaza perfect pe gat pentru un masaj eficient si confortabil. Are 4 moduri de masaj si 15 niveluri de intensitate, plus doua capete de masaj pentru o experienta personalizata. Masaj fara fir, usor si portabil, ideal pentru acasa, birou sau calatorii. Alimentare USB. Pachetul include: aparatul de masaj cervical, cablu de incarcare si manual de utilizare.',
  'Cod furnizor: MCS2129. Sursa: altex.ro (cod 64EF6216D1917). Poze: pepita.com (acelasi produs). Pret achizitie: 16.53 RON.'
);

-- A022 - Alcooltest digital cu 4 capete de rezerva | Furnizor: topredus.ro (ALC1068)
INSERT INTO products (id, name, sku, mpn, purchase_price, sale_price, discount_percent, stock_qty, image_urls, description, notes) VALUES (
  'A022',
  'Alcooltest digital cu 4 capete de rezerva - rezultate precise si imediate',
  'A022',
  'BSL116-26',
  12.40, 49.00, 56, 200,
  '["https://www.topredus.ro/media/catalog/product/7/3/73-4439.jpg","https://www.topredus.ro/media/catalog/product/7/3/73-4441.jpg","https://www.topredus.ro/media/catalog/product/7/3/73-4442.jpg","https://www.topredus.ro/media/catalog/product/7/3/73-4443.jpg","https://www.topredus.ro/media/catalog/product/7/3/73-4445.jpg","https://www.topredus.ro/media/catalog/product/7/3/73-4446.jpg"]',
  'Alcooltest digital de inalta precizie, ideal pentru a conduce in siguranta si a fi mereu in control. Ofera rezultate precise in aproximativ 10 secunde, printr-o singura suflare. Senzor incorporat care reactioneaza doar la alcool, eliminand erorile cauzate de alte substante. Include 4 capete de rezerva pentru utilizare igienica pe termen lung si semnal sonor la finalizarea testarii. Daca nivelul depaseste pragul, pe ecran apare mesajul CAUTION. Dimensiuni: 10 x 5 cm. Functioneaza cu 2 baterii AAA (neincluse). Prevazut cu breloc pentru chei auto.',
  'Cod furnizor: BSL116-26. Ambalare: 100/BAX. Sursa: topredus.ro (COD ALC1068). Pret achizitie: 12.40 RON.'
);

-- A023 - Set 3 tavi tort antiaderente cu margine detasabila | Furnizor: dealshop.ro (deal-1564)
INSERT INTO products (id, name, sku, mpn, purchase_price, sale_price, discount_percent, stock_qty, image_urls, description, notes) VALUES (
  'A023',
  'Set 3 tavi tort antiaderente teflonate - rotunda, inima, patrata, margine detasabila',
  'A023',
  'TBD1029',
  17.37, 69.00, 30, 96,
  '["https://cdn.shopify.com/s/files/1/0690/8061/3152/files/set-3-tavi-tort-antiaderente-teflonate-rotunda-inima-patrata-cu-margine-detasabila.jpg","https://cdn.shopify.com/s/files/1/0690/8061/3152/files/set-3-tavi-tort-antiaderente-teflonate-rotunda-inima-patrata-cu-margine-detasabila-1.jpg","https://cdn.shopify.com/s/files/1/0690/8061/3152/files/set-3-tavi-tort-antiaderente-teflonate-rotunda-inima-patrata-cu-margine-detasabila-2.jpg","https://cdn.shopify.com/s/files/1/0690/8061/3152/files/set-3-tavi-tort-antiaderente-teflonate-rotunda-inima-patrata-cu-margine-detasabila-3.jpg","https://cdn.shopify.com/s/files/1/0690/8061/3152/files/set-3-tavi-tort-antiaderente-teflonate-rotunda-inima-patrata-cu-margine-detasabila-4.jpg","https://cdn.shopify.com/s/files/1/0690/8061/3152/files/set-3-tavi-tort-antiaderente-teflonate-rotunda-inima-patrata-cu-margine-detasabila-10.jpg"]',
  'Set de 3 tavi teflonate pentru copt, cu baze detasabile, in 3 forme si diametre diferite. Suprafata antiaderenta si baza gofrata permit scoaterea cu usurinta a prajiturii, iar peretele exterior are clapeta ca sa poata fi desfacut, pastrand forma tortului. Se pot spala in masina de spalat vase. Cadou ideal pentru cei care adora dulciurile, potrivit pentru desert de familie sau torturi pentru evenimente. Dimensiuni tavi: inima 20 x 6,8 cm, rotund 22 x 6,8 cm, patrata 24 x 24 x 6,8 cm.',
  'Cod furnizor: TBD1029. Sursa: dealshop.ro (cod deal-1564). Pret achizitie: 17.37 RON.'
);

-- A024 - Filtru de apa pentru robinet | Furnizor: wisebuy.ro (FAR1191)
INSERT INTO products (id, name, sku, mpn, purchase_price, sale_price, discount_percent, stock_qty, image_urls, description, notes) VALUES (
  'A024',
  'Filtru de apa pentru robinet - purifica si elimina clorul',
  'A024',
  'FAR1191',
  12.41, 54.00, 58, 240,
  '["https://admin.wisebuy.ro/uploads/prod_a/185-3686.jpg","https://admin.wisebuy.ro/uploads/prod_b/185-5789.jpg","https://admin.wisebuy.ro/uploads/prod_b/185-5790.jpg","https://admin.wisebuy.ro/uploads/prod_b/185-5791.jpg","https://admin.wisebuy.ro/uploads/prod_b/185-5792.jpg","https://admin.wisebuy.ro/uploads/prod_b/185-5793.jpg","https://admin.wisebuy.ro/uploads/prod_b/185-5794.jpg","https://admin.wisebuy.ro/uploads/prod_b/185-5795.jpg"]',
  'Filtru pentru robinet care purifica apa de impuritati si elimina clorul. Se monteaza simplu, direct pe baterie, si are buton pentru folosirea apei prin filtru sau fara el, in functie de preferinte. Filtrul contine carbune activ care indeparteaza clorul, arsenul, pesticidele si retine rugina, sedimente, praf si mal. Se potriveste pe toate bateriile de robinet si permite folosirea alternativa a apei de la robinet sau filtrate. Fiecare filtru este garantat pentru minim 90 de zile / 1.000 litri. Debit maxim 2 l/minut. Dimensiuni carcasa: 5,5 x 10 cm.',
  'Cod furnizor: FAR1191. Sursa: wisebuy.ro. Pret achizitie: 12.41 RON.'
);
