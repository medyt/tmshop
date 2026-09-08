# Ghid de lansare — ShopTop (operat de TM SHOP SRL)

Magazinul are un frontend React (Vite) și un API PHP + MySQL. Acest ghid acoperă pașii necesari pentru a porni vânzările pe găzduire de tip Apache (cPanel / shared hosting), unde site-ul rulează pe `https://shop-top.ro`, iar API-ul la `https://shop-top.ro/shoptop-api/`.

> Notă plată/livrare: se acceptă **plata ramburs** sau **online cu cardul** (Netopia Payments). Livrarea se face prin curier **DPD**; AWB-ul se generează din admin prin API-ul DPD RO (etichetă PDF oficială).

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
    'mail_from' => 'ShopTop <contact@shop-top.ro>',
    'shop_email' => 'contact@shop-top.ro',
    'contact_email' => 'contact@shop-top.ro',
    'shipping_flat_rate' => 19.99,
    'shipping_free_over' => 99,
    'smtp' => [
        'host' => 'mail.shop-top.ro',
        'port' => 587,
        'secure' => 'tls',
        'user' => 'contact@shop-top.ro',
        'pass' => 'PAROLA_MAILBOX',
        'from_email' => 'contact@shop-top.ro',
        'from_name' => 'ShopTop',
    ],
];
```

`cors_origin` trebuie să fie exact originea frontend-ului (cu `https://`), pentru ca sesiunile (login/comenzi) să funcționeze.

**Email de la magazin (ex. `contact@shop-top.ro`):** pentru ca mesajele să nu pară trimise de un utilizator generic de hosting (`...@asuka...`), setează `mail_from` la `ShopTop <contact@shop-top.ro>` și completează `smtp` (host, user, pass, `from_email` = același cont). Fără SMTP, PHP `mail()` poate rescrie sau ignora expeditorul în funcție de politica serverului; verifică **SPF/DKIM** pentru `shop-top.ro` pe serverul care trimite efectiv.

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
7. `sql/migrate-order-shipping-address-server.sql` — adresă structurată + `dpd_parcel_id`
8. `sql/migrate-product-discount-server.sql` — discount
9. `sql/migrate-image-urls-server.sql` — normalizare imagini
10. `sql/migrate-courier-tracking-server.sql` — `courier_status`
11. `sql/migrate-return-received-server.sql` — flag colet reîntors la magazin
12. `sql/migrate-smartbill-storno-server.sql` — coloane storno factură (stoc la retur)
13. `sql/migrate-delivery-carrier-server.sql` — `delivery_carrier` (DPD / Fan Courier)

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
3. Urcă tot conținutul din `dist/` în rădăcina site-ului (acolo unde răspunde `https://shop-top.ro/`). Include **`.htaccess`** (Vite îl copiază din `public/` în `dist/`) — fără el, la **refresh** pe rute precum `/cos` sau `/produs/...` serverul poate răspunde cu **404** în loc să servească `index.html` (aplicația React). Fișierul asigură și redirect HTTPS, rutarea SPA și **SEO shell** (`seo-shell.php` pentru homepage + `/produs/...`).
4. Urcă folderul `server/api/` la `https://shop-top.ro/shoptop-api/` (împreună cu `config.php` creat la pasul 1). Local poți folosi `npm run api:sync` (copiază în XAMPP).
5. SEO: după upload, verifică în View Source (nu doar DevTools DOM) că pe `/` apare lista de produse în HTML și pe `/produs/slug` apar title/meta/descriere. Sitemap: `https://shop-top.ro/sitemap.xml`. Catalog Meta: `https://shop-top.ro/catalog.csv`.

**Upload poze produs (obligatoriu pentru gestiune):**
- Include `product_upload.php` în `shoptop-api/`.
- Asigură-te că există folderul `shoptop-api/uploads/products/` (cu `.htaccess` din repo).
- Permisiuni folder: **755** sau **775** (scriabil de PHP). În cPanel File Manager → Permissions.
- Nu e nevoie de restart Apache/PHP doar pentru aceste fișiere; după upload, hard-refresh (Ctrl+F5) pe admin.
- Test rapid: deschide DevTools → Network, încearcă o poză; dacă vezi 404 pe `product_upload.php`, fișierul lipsește pe server; dacă 500 despre „nescriabil”, repară permisiunile folderului.

---

## 6. Verificări post-deploy

- [ ] `https://shop-top.ro/` se încarcă, iar catalogul afișează produsele introduse.
- [ ] View Source pe `/` și `/produs/...` arată conținut/produs în HTML (header `X-ShopTop-SEO`).
- [ ] `https://shop-top.ro/sitemap.xml` listează homepage + produse.
- [ ] `https://shop-top.ro/shoptop-api/products.php` întoarce JSON cu produse.
- [ ] Login admin funcționează și `/admin/*` este accesibil doar adminului.
- [ ] Poți adăuga o poză la un produs (apare `product_upload.php` 200 în Network; fișierul apare în `uploads/products/`).
- [ ] O comandă de test ajunge în `/admin/comenzi`, iar AWB DPD se generează (necesită credențiale în `config.php`) și se deschide PDF-ul etichetei.
- [ ] Emailul de confirmare ajunge (verifică spam). Pentru From/Return-Path cu `contact@shop-top.ro`, preferă **SMTP** în `config.php`; dacă `mail()` nu livrează sau expeditorul rămâne suspect, configurează SMTP la host.
- [ ] La **înregistrare cont client**, se trimite email de confirmare către utilizator (și o notificare la `shop_email` din `config.php`, dacă e diferită de emailul clientului). Folosește același SMTP ca la comenzi (`config.php` → `smtp`).
- [ ] Recenziile trimise apar în `/admin/recenzii` și devin vizibile pe site doar după aprobare.
- [ ] Paginile legale (Termeni, Confidențialitate, Retur) afișează corect TM SHOP SRL.

---

## 7. De completat înainte de lansare (conținut)

- [ ] **Telefon de contact**: adaugă numărul real în `src/lib/siteLegal.ts` → `contactPhone` (ex. `+40 757 ...`). Când e gol, telefonul este ascuns automat peste tot.
- [ ] **Imagine de social sharing**: există un fallback `public/og-cover.svg`. Pentru compatibilitate maximă pe Facebook/WhatsApp, înlocuiește cu un PNG/JPG 1200x630 (`public/og-cover.png`) și actualizează calea în `src/lib/seo.ts` (`DEFAULT_OG_IMAGE_PATH`) și în `index.html`.
- [ ] Verifică datele firmei (CUI, Reg. Com., EUID) pe ANAF/ONRC.

---

## 8. Configurare Netopia Payments (plata cu cardul)

Contul din **Setări tehnice** (Semnătură + Cheie publică/privată) folosește
**fluxul clasic cu certificate** — **nu există API Key** pentru acest tip de cont.

1. **Certificate**: descarcă din Netopia Admin → Setări tehnice și pune-le în `server/api/keys/`:
   - `netopia-live.cer` — cheia publică
   - `netopia-live.key` — cheia privată

   Directorul `keys/` este protejat cu `.htaccess` și ignorat de git.

2. **Configurare în `config.php`**:
   ```php
   'netopia' => [
       'sandbox' => false,  // certificatele live NU merg pe sandbox
       'pos_signature' => 'XXXX-XXXX-XXXX-XXXX-XXXX',  // Semnătura din Setări tehnice
       'public_cert' => __DIR__ . '/keys/netopia-live.cer',
       'private_key' => __DIR__ . '/keys/netopia-live.key',
       'redirect_url' => 'https://shop-top.ro/shoptop-api/payment_netopia_return.php',
       'notify_url' => 'https://shop-top.ro/shoptop-api/payment_netopia_ipn.php',
   ],
   ```

3. **În Netopia Admin** (sau lasă URL-urile din request):
   - **IPN / Confirm**: `https://shop-top.ro/shoptop-api/payment_netopia_ipn.php`
   - **Return**: `https://shop-top.ro/shoptop-api/payment_netopia_return.php`

4. Apasă **„Solicită aprobarea”** dacă magazinul nu e încă activat pentru plăți live.

5. La checkout, plata cu cardul te redirecționează pe `secure.mobilpay.ro`.

---

## 9. Configurare DPD (generare AWB)

1. Cere cont API (test sau live) la [support@dpd.ro](mailto:support@dpd.ro) — vezi [documentația](https://api.dpd.ro/api/docs/).
2. Rulează migrarea `sql/migrate-order-shipping-address-server.sql` (sau varianta locală fără `-server`).
3. În `config.php`:

```php
'dpd' => [
    'enabled' => true,
    'username' => 'USER_API',
    'password' => 'PAROLA_API',
    'client_system_id' => null, // opțional, dacă ți-l dă DPD
    'service_id' => 2505,       // din contract (RO domestic tipic 2505)
    'default_weight_kg' => 1.0,
    'paper_size' => 'A6',       // A4 | A6
    'sender_phone' => '',       // opțional; expeditorul e contul DPD
],
```

4. Urcă și `server/api/dpd.php` împreună cu `orders.php` actualizat.
5. Din `/admin/comenzi` → **Generează AWB DPD** sau din `/admin/awb` în masă. Eticheta se deschide ca PDF oficial DPD.
   - **Ramburs:** COD pe totalul comenzii; **card / plătit:** fără COD.
   - **Observații AWB:** conținut tip `x1 A001, x1 D000, x1 S000`; dacă există **Deschidere colet (D000)** + ramburs, se activează și OBPD (open before payment).

---

## 10. Nu este inclus (extensii viitoare)

- Tracking detaliat / anulare AWB / livrare la oficiu-locker DPD din checkout.
- Integrare Fan Courier (SelfAWB): taburi curier pe Comenzi/AWB; config `fan` în `config.php`.
- Google Tag Manager (container separat) — GA4 e integrat direct via gtag, cu consimțământ cookie (vezi `src/lib/analytics.ts`).
