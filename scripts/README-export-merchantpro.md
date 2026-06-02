# Export produse ShopTop → Merchant Pro

## Ce face

Query-ul de mai jos selectează din tabelul `products` coloane ușor de mapat în **Catalog > Importă produse** din Merchant Pro ([ghid import](https://help.merchantpro.ro/article/736-importul-de-produse)).

| Coloană export | Folosire tipică în Merchant Pro |
|------------------|--------------------------------|
| `shoptop_id` | Ignoră sau păstrează ca referință internă |
| `sku` | Cod / SKU (dacă lipsea SKU, se folosește `id`) |
| `name` | Nume produs |
| `slug` | URL vechi / alias — mapezi la câmpul URL din MP dacă există |
| `category` | Nume categorie (creează categoriile în MP înainte sau mapezi la categorie existentă) |
| `description_plain` | Descriere (fără line breaks, pentru CSV sigur) |
| `price_ron` | Preț — **același număr ca în ShopTop**; verifică dacă în MP prețul e cu TVA inclus și aliniază |
| `discount_percent` | Procent discount afișat în ShopTop |
| `stock_qty` | Stoc |
| `image_url_primary` | Prima imagine din galerie (URL absolut dacă e salvat așa în DB) |
| `image_urls_json` | JSON cu toate imaginile — poți ignora la import dacă pui manual galeria din `image_url_primary` + upload în MP |
| `old_shop_url` | Pentru fișierul separat de **redirecturi 301** (vezi planul de migrare) |

## Cum obții CSV-ul

### Varianta A — phpMyAdmin

1. Deschide phpMyAdmin (XAMPP / hosting).
2. Selectează baza de date ShopTop (ex. `shoptop` sau `vbpnetmf_shoptop`).
3. Tab **SQL**, lipește query-ul din secțiunea **Query SQL complet** (la finalul acestui fișier).
4. Rulează; la rezultat: **Export** → format **CSV**, encoding **utf-8**.

### Varianta B — linia de comandă MySQL

Salvează query-ul SQL într-un fișier (ex. `export.sql`), apoi:

```bash
mysql -h HOST -u USER -p NUME_BAZA < export.sql > export.tsv
```

Deschide `export.tsv` în Excel / LibreOffice și salvează ca **CSV UTF-8** dacă Merchant Pro cere CSV.

(Verifică separatorul: phpMyAdmin folosește de obicei `;` sau `,` — Merchant Pro permite mapare.)

## După import

În Merchant Pro, la **Mapare coloane**, asociază câmpurile tale cu câmpurile din catalog (nume, preț, stoc, categorie, descriere, imagine principală etc.). Template-ul oficial îl descarci din overlayer-ul de import din panou.

## Imagini

- Dacă în DB ai URL-uri relative (ex. `/images/...`), **nu** vor merge după ce oprești ShopTop. Trebuie fie URL-uri absolute `https://shop-top.ro/...`, fie reîncărcare imagini în Merchant Pro după import.
- Dacă un produs **nu are** `slug` în DB dar pe site URL-ul e generat din nume (slugify), coloana `old_shop_url` poate să nu coincidă — verifică în browser sau în sitemap pentru redirecturi 301.
- Dacă ai `data:` URL-uri în JSON, Merchant Pro nu le poate descărca — înlocuiește manual cu fișiere încărcate în MP.

## JSON și MySQL

`JSON_EXTRACT` / `JSON_VALID` necesită MySQL **5.7.8+** (JSON type). Dacă primești erori, spune versiunea MySQL și adaptăm query-ul.

---

## Query SQL complet (copiază în phpMyAdmin)

```sql
-- Export ShopTop -> CSV pentru import Merchant Pro (Catalog > Importa produse).
-- Ruleaza in phpMyAdmin: selecteaza baza shoptop, tab SQL, apoi Export pe rezultat -> CSV, UTF-8.
--
-- Merchant Pro accepta orice coloane si le mapezi in UI (vezi help articol 736).
-- Preturile din ShopTop sunt valorile din coloana sale_price (RON); verifica in MP daca
-- campul tau de pret e cu TVA inclus sau nu si ajusteaza maparea.

SELECT
  p.id AS shoptop_id,
  COALESCE(NULLIF(TRIM(p.sku), ''), p.id) AS sku,
  p.name AS name,
  COALESCE(NULLIF(TRIM(p.slug), ''), p.id) AS slug,
  IFNULL(p.category, '') AS category,
  REPLACE(REPLACE(IFNULL(p.description, ''), '\r\n', ' '), '\n', ' ') AS description_plain,
  CAST(p.sale_price AS DECIMAL(12, 2)) AS price_ron,
  CAST(p.discount_percent AS DECIMAL(5, 2)) AS discount_percent,
  CAST(p.stock_qty AS UNSIGNED) AS stock_qty,
  IF(
    JSON_VALID(p.image_urls) AND JSON_LENGTH(p.image_urls) > 0,
    JSON_UNQUOTE(JSON_EXTRACT(p.image_urls, '$[0]')),
    ''
  ) AS image_url_primary,
  IFNULL(p.image_urls, '[]') AS image_urls_json,
  CONCAT('https://shop-top.ro/produs/', COALESCE(NULLIF(TRIM(p.slug), ''), p.id)) AS old_shop_url
FROM products p
ORDER BY p.name ASC;
```
