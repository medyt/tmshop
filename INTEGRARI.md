# Integrări marketing, comenzi și plăți — ghid de configurare și testare

Acest document explică tot ce trebuie configurat pentru noile integrări:
Meta Pixel, TikTok Pixel, feed-uri produse (Google/Meta/TikTok prin BaseLinker),
BaseLinker (produse + comenzi), Netopia (plată card), email-uri SMTP și sistemul de retururi.

> Brandul rămâne **ShopTop** (shop-top.ro), operat de **TM SHOP SRL**.

---

## 0. Pașii de deployment (ordine recomandată)

1. **Rulează SQL-ul** (o dată local, o dată pe server) — vezi secțiunea 1.
2. **Completează `server/api/config.php`** cu cheile reale — vezi secțiunea 2.
3. **Setează ID-urile pixel în `.env.production`** și rulează `npm run build` — secțiunea 3.
4. **Urcă prin FileZilla**: conținutul `dist/` (frontend) + fișierele PHP noi din `server/api/` — secțiunea 4.
5. **Configurează webhook-urile** (Netopia IPN, feed-uri BaseLinker) — secțiunile 6-8.
6. **Testează** după checklist — secțiunea 9.

---

## 1. Baza de date (un singur SQL, idempotent)

Rulează fișierul corespunzător (poate fi rulat de mai multe ori fără erori):

- Local: [`sql/migrate-platforma-noua.sql`](sql/migrate-platforma-noua.sql) — folosește baza `shoptop`.
- Server: [`sql/migrate-platforma-noua-server.sql`](sql/migrate-platforma-noua-server.sql) — selectează întâi baza de producție în phpMyAdmin.

Ce adaugă:
- Tabel `product_reviews` (moderare recenzii).
- Coloane pe `products`: `ean`, `brand`, `google_category`, `mpn`, `baselinker_product_id`.
- Coloane pe `orders`: `payment_method`, `payment_status`, `payment_ref`, `baselinker_order_id`.
- Tabel `return_requests` (cereri de retur).

> Nu rescrie tabele existente, doar adaugă ce lipsește. Sigur pe baze deja populate.

---

## 2. `server/api/config.php`

Pleacă de la [`server/api/config.example.php`](server/api/config.example.php). Chei noi:

```php
'smtp' => [
    'host' => 'smtp.exemplu.ro',
    'port' => 587,
    'secure' => 'tls',          // 'tls' (587), 'ssl' (465) sau '' (fără criptare)
    'user' => 'tmshop366@gmail.com',
    'pass' => 'PAROLA_SMTP',
    'from_email' => 'tmshop366@gmail.com',
    'from_name' => 'ShopTop',
],

'baselinker' => [
    'token' => 'TOKEN_API',
    'inventory_id' => '12345',
    'price_group_id' => '6789',
    'warehouse_id' => 'bl_1011',
    'order_status_id' => '',     // gol = statusul implicit
],

'netopia' => [
    'sandbox' => false,          // true doar pentru teste
    'api_key' => 'API_KEY_NETOPIA',
    'pos_signature' => 'SEMNATURA_POS',
    'redirect_url' => 'https://shop-top.ro/shoptop-api/payment_netopia_return.php',
    'notify_url' => 'https://shop-top.ro/shoptop-api/payment_netopia_ipn.php',
],

'shipping_free_over' => 99,     // 0 = fără livrare gratuită

'meta' => [
    'pixel_id' => '2120556288842775',
    'access_token' => '',        // Events Manager → Generate access token
    'test_event_code' => '',     // doar la test, apoi scoți
    'min_product_profit' => 25,  // exclude din catalog.csv SKU-urile slabe
],

'cart_reminder' => [
    'secret' => 'un-secret-lung',
    'delay_hours' => 2,
],

'sms' => [
    'token' => '',              // SMSO → Developers → API
    'sender' => '',             // ID expeditor (gol = primul din cont)
],
```

> Dacă o integrare are cheile goale, ea este pur și simplu dezactivată (fără erori).
> Email-urile revin automat la `mail()` dacă SMTP nu e completat.

---

## 3. ID-uri pixel (frontend) + build

În [`.env.production`](.env.production):

```
VITE_API_URL=/shoptop-api
VITE_META_PIXEL_ID=2120556288842775
VITE_TIKTOK_PIXEL_ID=ABCDEFGHIJ
VITE_GA_MEASUREMENT_ID=G-15PV24R6TN
```

Apoi rulează local:

```
npm run build
```

Pixelii **TikTok și GA4** se încarcă doar dacă vizitatorul apasă „Accept toate”.
**Meta Pixel** e în `index.html` la build (fără consimțământ) ca Facebook să poată atribui achizițiile.

---

## 4. Fișiere de urcat prin FileZilla

Frontend (în rădăcina site-ului, peste fișierele vechi):
- tot conținutul folderului `dist/`.

API (în folderul `shoptop-api/` de pe server) — fișiere PHP noi/modificate:
- `mailer.php` (nou)
- `baselinker.php` (nou)
- `netopia.php` (nou)
- `payment_netopia_start.php` (nou)
- `payment_netopia_ipn.php` (nou)
- `payment_netopia_return.php` (nou)
- `returns.php` (nou)
- `checkout_drafts.php` (nou — reminder coș)
- `meta_capi.php` (nou — Conversions API)
- `sms.php` (nou — confirmare comandă SMS)
- `lib.php` (modificat)
- `orders.php` (modificat)
- `products.php` (modificat)
- `import.php` (modificat)
- `payment_netopia_ipn.php` (modificat)
- `mailer.php` (modificat)

> NU suprascrie `server/api/config.php` de pe server cu `config.example.php`.
> Editează direct `config.php` de pe server cu valorile reale.

---

## 5. Meta Pixel, TikTok Pixel, Google Analytics 4 și Conversions API

1. Creează pixelul / proprietatea în Meta Events Manager / TikTok Events Manager / Google Analytics și ia ID-ul.
2. Pune ID-urile în `.env.production` (`VITE_META_PIXEL_ID`, `VITE_TIKTOK_PIXEL_ID`, `VITE_GA_MEASUREMENT_ID`), rebuild, urcă `dist/`.
3. **Conversions API:** în Events Manager → Data Sources → pixel → Settings → Generate access token. Copiază tokenul în `config.php` → `meta.access_token` (nu în git). `event_id` Purchase e `purchase_{orderId}` (dedup browser + server).
4. Verifică cu **Meta Pixel Helper** / Test events (poți pune `test_event_code` temporar) / **TikTok Pixel Helper** / GA4 **Realtime**.
5. Feed catalog: `https://shop-top.ro/catalog.csv`. SKU-urile cu marjă (vânzare − achiziție) sub `meta.min_product_profit` (implicit 25 RON) **nu** mai apar în feed. SKU-urile rămase nu se schimbă.
6. Reminder coș: cron cPanel la 15 min → `https://shop-top.ro/shoptop-api/checkout_drafts.php?cron=1&secret=SECRETUL_TAU`.

Evenimente:
- `PageView` / `page_view` la fiecare pagină. **Meta** rulează și fără „Accept toate”; TikTok/GA4 doar după consimțământ marketing.
- `ViewContent` / `view_item` la pagina de produs.
- `AddToCart` / `add_to_cart` la adăugarea în coș.
- `InitiateCheckout` / `begin_checkout` la checkout și la deschiderea comenzii rapide (`content_ids` = SKU).
- `Purchase` / `CompletePayment` / `purchase` la ramburs (browser + CAPI) sau la IPN card (CAPI; browser pe pagina de succes dacă IPN a marcat `paid`).

---

## 6. BaseLinker (produse + comenzi)

### Configurare
- `token`: My account > API.
- `inventory_id`: Inventories > catalogul folosit (ID-ul lui).
- `price_group_id`: Inventories > Price groups.
- `warehouse_id`: depozitul catalogului, în format `bl_<id>`.
- `order_status_id`: opțional, statusul la care intră comenzile noi.

### Cum funcționează
- La **creare/editare produs** în admin (sau import în masă), produsul se trimite în
  catalogul BaseLinker (`addInventoryProduct`). ID-ul BaseLinker se salvează în
  `products.baselinker_product_id` pentru actualizări ulterioare (preț, stoc, text, imagini, EAN).
- La **comandă cu ramburs**, comanda se trimite imediat în BaseLinker (`addOrder`).
- La **comandă cu cardul**, comanda se trimite în BaseLinker **după** confirmarea plății (IPN Netopia).
- `orders.baselinker_order_id` păstrează ID-ul comenzii din BaseLinker.

> Toate apelurile sunt „best-effort”: dacă BaseLinker e indisponibil, comanda/produsul
> se salvează oricum local, iar eroarea apare în log-ul serverului.

---

## 7. Feed-uri Google / Meta / TikTok (prin BaseLinker) — checklist

Recomandare: generează feed-urile **din BaseLinker** (Inventories > Product feeds /
Connections), nu din magazin. Astfel ai un singur loc de administrat.

Pași:
1. Asigură-te că produsele sunt sincronizate în catalogul BaseLinker (secțiunea 6).
2. În BaseLinker creează feed-uri separate:
   - **Google Shopping** (Google Merchant Center).
   - **Meta / Facebook Catalog**.
   - **TikTok Catalog**.
3. Conectează feed-urile la conturile respective:
   - Google Merchant Center → adaugă URL-ul feed-ului.
   - Meta Commerce Manager → Catalog → Data sources → Scheduled feed.
   - TikTok Catalog Manager → adaugă feed.

### Checklist acoperire atribute (per produs)
Pentru ca feed-urile să fie aprobate, completează în admin:

- [ ] **Nume** clar și descriptiv.
- [ ] **Imagini** (cel puțin una, URL https).
- [ ] **Preț** de vânzare > 0.
- [ ] **Stoc** corect.
- [ ] **EAN** (cod de bare) — sau **Brand + MPN** dacă nu există EAN.
- [ ] **Brand** (recomandat pentru toate feed-urile).
- [ ] **Categorie Google** (pentru feed-ul Google).
- [ ] **Descriere**.

> Câmpurile EAN / Brand / Categorie Google / MPN se completează în formularul de produs,
> secțiunea „Atribute feed (Google / Meta / TikTok)”.

---

## 8. Netopia (plată cu cardul)

1. În contul Netopia ia **API key** și **POS signature**; pune-le în `config.php`.
2. Setează în panoul Netopia URL-ul de notificare (IPN):
   `https://shop-top.ro/shoptop-api/payment_netopia_ipn.php`
   și URL-ul de retur:
   `https://shop-top.ro/shoptop-api/payment_netopia_return.php`
3. Folosește `sandbox => false` + certificatele live (`netopia-live.cer` / `.key`).

Flux:
- La checkout clientul alege „Card online (Netopia)”.
- Comanda se creează cu `payment_status = pending`, apoi clientul e redirecționat la Netopia.
- După plată, Netopia trimite IPN → comanda devine `paid` și se trimite în BaseLinker.
- Clientul e adus înapoi la pagina comenzii.

> Confirmarea reală vine din IPN (server-to-server), nu din redirectul clientului.

---

## 9. Checklist de testare după deployment

Frontend:
- [ ] Site-ul se încarcă, navigarea pe mobil (meniu hamburger) funcționează.
- [ ] Banner cookie: „Doar esențiale” NU încarcă pixelii; „Accept toate” îi încarcă.
- [ ] Pixel Helper (Meta/TikTok) / GA4 Realtime vede evenimentele PageView/ViewContent/AddToCart.

Comenzi:
- [ ] Comandă cu ramburs → email de confirmare primit → comanda apare în BaseLinker.
- [ ] Comandă cu cardul (live) → redirect pe `secure.mobilpay.ro` → plată reală → IPN → `paid`.
- [ ] IPN: comanda devine „plătită” și ajunge în BaseLinker.
- [ ] Schimbarea statusului din admin (confirmată/expediată) trimite email clientului.
- [ ] Emiterea AWB trimite email „expediată”.

Produse / feed-uri:
- [ ] Editarea unui produs în admin → modificarea apare în catalogul BaseLinker.
- [ ] Feed-urile Google/Meta/TikTok se generează și nu au erori critice de atribute.

Retururi:
- [ ] Formularul `/cerere-retur` trimite cererea → apare în Admin > Retururi.
- [ ] Schimbarea statusului cererii funcționează.
