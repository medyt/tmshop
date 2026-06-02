# Ghid de lansare — ShopTop (operat de TM SHOP SRL)

Magazinul are un frontend React (Vite) și un API PHP + MySQL. Acest ghid acoperă pașii necesari pentru a porni vânzările pe găzduire de tip Apache (cPanel / shared hosting), unde site-ul rulează pe `https://shop-top.ro`, iar API-ul la `https://shop-top.ro/shoptop-api/`.

> Notă plată/livrare: momentan se acceptă doar **plata la livrare (ramburs)**. Alegerea curierului (Fan Courier / DPD) este informativă, iar AWB-ul generat este unul **intern, printabil** (fără integrare cu API-ul curierilor).

---

## 0. Cerințe

- Node.js 20+ și npm (pentru build local)
- Acces la găzduire cu PHP 8.1+ și MySQL/MariaDB
- Acces la baza de date (phpMyAdmin sau linie de comandă)
- Funcția PHP `mail()` activă (sau un SMTP configurat de host)

---

## 1. Configurează API-ul PHP

1. Copiază `server/api/config.example.php` în `server/api/config.php`.
2. Completează datele reale (acest fișier este în `.gitignore` și NU trebuie urcat în git):

```php
return [
    'db' => [
        'host' => 'localhost',
        'name' => 'NUMELE_BAZEI',
        'user' => 'UTILIZATOR_MYSQL',
        'pass' => 'PAROLA_MYSQL',
        'charset' => 'utf8mb4',
    ],
    'cors_origin' => 'https://shop-top.ro',
    'site_url' => 'https://shop-top.ro',
    'mail_from' => 'ShopTop <tmshop366@gmail.com>',
    'shop_email' => 'tmshop366@gmail.com',
    'contact_email' => 'tmshop366@gmail.com',
    'shipping_flat_rate' => 25,
];
```

`cors_origin` trebuie să fie exact originea frontend-ului (cu `https://`), pentru ca sesiunile (login/comenzi) să funcționeze.

---

## 2. Creează și migrează baza de date

Fișierele cu sufixul `-server.sql` folosesc numele de bază de date de pe găzduire (`vbpnetmf_shoptop`). Local folosește variantele fără sufix (baza `shoptop`).

Rulează în această ordine (în phpMyAdmin: selectează baza → tab SQL → execută conținutul fiecărui fișier):

1. `sql/server-init.sql` — tabela `products`
2. `sql/orders-server.sql` — `orders`, `order_items`
3. `sql/users-server.sql` — `users` + contul admin de bootstrap
4. `sql/migrate-shop-top-plan-server.sql` — coloane plan + tabela `product_reviews`
5. `sql/migrate-order-stock-server.sql` — coloana `stock_applied`
6. `sql/migrate-orders-awb-server.sql` — coloane AWB
7. `sql/migrate-product-discount-server.sql` — discount
8. `sql/migrate-image-urls-server.sql` — normalizare imagini

(Pe mediul local rulează echivalentele fără `-server`, începând cu `sql/shoptop.sql`.)

---

## 3. Schimbă parola contului admin (OBLIGATORIU)

Contul de bootstrap (`admin@shop-top.ro`) are un hash de parolă public în repo. Înainte de lansare:

1. Generează un hash nou, de exemplu cu PHP:
   ```php
   echo password_hash('PAROLA_TA_NOUA', PASSWORD_DEFAULT);
   ```
2. Actualizează în baza de date:
   ```sql
   UPDATE users SET password_hash = 'HASH_NOU' WHERE email = 'admin@shop-top.ro';
   ```
   (Opțional, schimbă și emailul adminului.)

---

## 4. Populează produsele

Catalogul afișează doar produsele cu **preț de vânzare > 0** și **stoc > 0**. După deploy:

1. Autentifică-te în `/admin/conectare`.
2. Mergi la `/admin/gestiune` și adaugă/editează produse: nume, SKU, preț de vânzare, stoc, imagini (URL-uri), descriere.
3. Imaginile trebuie să fie URL-uri accesibile public (pe server sau CDN). URL-urile relative (`/images/...`) trebuie să existe fizic pe găzduire.

---

## 5. Build frontend și upload

1. Asigură-te că `.env.production` conține:
   ```
   VITE_API_URL=/shoptop-api
   ```
2. Build:
   ```
   npm install
   npm run build
   ```
3. Urcă tot conținutul din `dist/` în rădăcina site-ului (acolo unde răspunde `https://shop-top.ro/`). Include `.htaccess` (din `public/.htaccess`) — asigură redirect HTTPS și rutarea SPA.
4. Urcă folderul `server/api/` la `https://shop-top.ro/shoptop-api/` (împreună cu `config.php` creat la pasul 1). Local poți folosi `npm run api:sync` (copiază în XAMPP).

---

## 6. Verificări post-deploy

- [ ] `https://shop-top.ro/` se încarcă, iar catalogul afișează produsele introduse.
- [ ] `https://shop-top.ro/shoptop-api/products.php` întoarce JSON cu produse.
- [ ] `https://shop-top.ro/shoptop-api/sitemap.php` întoarce XML cu paginile + produsele (URL declarat în `public/robots.txt`).
- [ ] Login admin funcționează și `/admin/*` este accesibil doar adminului.
- [ ] O comandă de test ajunge în `/admin/comenzi`, iar AWB-ul se generează și se printează.
- [ ] Emailul de confirmare ajunge (verifică și folderul spam). Dacă `mail()` nu livrează, configurează SMTP la nivel de host.
- [ ] Recenziile trimise apar în `/admin/recenzii` și devin vizibile pe site doar după aprobare.
- [ ] Paginile legale (Termeni, Confidențialitate, Retur) afișează corect TM SHOP SRL.

---

## 7. De completat înainte de lansare (conținut)

- [ ] **Telefon de contact**: adaugă numărul real în `src/lib/siteLegal.ts` → `contactPhone` (ex. `+40 757 ...`). Când e gol, telefonul este ascuns automat peste tot.
- [ ] **Imagine de social sharing**: există un fallback `public/og-cover.svg`. Pentru compatibilitate maximă pe Facebook/WhatsApp, înlocuiește cu un PNG/JPG 1200x630 (`public/og-cover.png`) și actualizează calea în `src/lib/seo.ts` (`DEFAULT_OG_IMAGE_PATH`) și în `index.html`.
- [ ] Verifică datele firmei (CUI, Reg. Com., EUID) pe ANAF/ONRC.

---

## 8. Nu este inclus (extensii viitoare)

- Plată online (card) — momentan doar ramburs.
- Integrare reală cu API-urile curierilor (AWB rămâne intern/printabil).
- Google Analytics / GTM — dezactivat intenționat pentru a respecta Politica de cookie (vezi `src/lib/analytics.ts`).
