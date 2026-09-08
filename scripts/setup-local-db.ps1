param(
  # Cale catre mysql.exe (implicit: Laragon). Pentru XAMPP: C:\xampp\mysql\bin\mysql.exe
  [string]$MysqlExe = "C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe",
  [string]$User = "root",
  [string]$Password = "",
  # Sare peste produsele de test (A002..A024, addon-uri checkout).
  [switch]$NoSeed
)

<#
  Creeaza baza de date locala `shoptop` de la zero, ruland fisierele SQL din repo
  in ordinea corecta. shoptop.sql / orders.sql contin deja coloanele adaugate de
  unele migrari vechi (purchase_price, discount_percent, awb, stock_applied...),
  asa ca acele migrari sunt sarite pentru a evita "Duplicate column".

  Ruleaza o singura data pe o baza goala. Daca baza exista deja, scriptul se
  opreste (sterge-o manual din HeidiSQL daca vrei sa o refaci).

  Fisierul este intentionat fara diacritice: PowerShell 5.1 citeste .ps1 fara BOM ca ANSI.
#>

$ErrorActionPreference = "Stop"
$sqlDir = Resolve-Path (Join-Path $PSScriptRoot "..\sql")

if (!(Test-Path $MysqlExe)) {
  throw "Nu gasesc mysql.exe la $MysqlExe. Da -MysqlExe cu calea corecta."
}

$auth = @("-u$User")
if ($Password -ne "") { $auth += "-p$Password" }

function Invoke-Sql([string]$query) {
  $out = & $MysqlExe @auth -N -e $query 2>&1
  if ($LASTEXITCODE -ne 0) { throw "MySQL: $out" }
  return $out
}

function Invoke-SqlFile([string]$file) {
  $path = Join-Path $sqlDir $file
  Write-Host "  -> $file"
  $out = Get-Content $path -Raw -Encoding UTF8 | & $MysqlExe @auth --default-character-set=utf8mb4 2>&1
  if ($LASTEXITCODE -ne 0) { throw "Eroare in $file : $out" }
}

# Verifica conexiunea.
try { Invoke-Sql "SELECT 1" | Out-Null } catch {
  throw "Nu ma pot conecta la MySQL. Porneste Laragon (Start All) si reincearca. Detalii: $_"
}

$exists = Invoke-Sql "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='shoptop'"
if ($exists) {
  throw "Baza 'shoptop' exista deja. Sterge-o (DROP DATABASE shoptop) daca vrei sa o refaci de la zero."
}

Write-Host "Schema de baza:"
Invoke-SqlFile "shoptop.sql"     # products (are deja purchase_price, discount_percent, bundle_offers)
Invoke-SqlFile "orders.sql"      # orders + order_items (are deja access_token, status, stock_applied, awb)
Invoke-SqlFile "users.sql"       # users + admin@shop-top.ro

Write-Host "Coloane products (slug, category) din migrate-shop-top-plan.sql:"
Invoke-Sql "USE shoptop; ALTER TABLE products ADD COLUMN slug VARCHAR(160) NULL AFTER name, ADD COLUMN category VARCHAR(120) NULL AFTER slug, ADD UNIQUE KEY uq_products_slug (slug);" | Out-Null

Write-Host "Migrari orders (ordinea conteaza din cauza AFTER):"
Invoke-SqlFile "migrate-order-shipping-address.sql"
Invoke-SqlFile "migrate-dpd-site-id.sql"
Invoke-SqlFile "migrate-smartbill-invoices.sql"
Invoke-SqlFile "migrate-smartbill-storno.sql"
Invoke-SqlFile "migrate-delivery-carrier.sql"
Invoke-SqlFile "migrate-courier-tracking.sql"
Invoke-SqlFile "migrate-return-received.sql"
Invoke-SqlFile "migrate-courier-cost.sql"

Write-Host "Migrari idempotente / tabele noi:"
Invoke-SqlFile "migrate-platforma-noua.sql"   # product_reviews, ean/brand/mpn, payment_*, return_requests
Invoke-SqlFile "migrate-checkout-drafts.sql"
Invoke-SqlFile "migrate-meta-capi.sql"
Invoke-SqlFile "migrate-monthly-expenses.sql" # include deja coloana salaries
Invoke-SqlFile "migrate-monthly-expense-lines.sql"

if (-not $NoSeed) {
  Write-Host "Produse de test:"
  Invoke-SqlFile "insert-checkout-addon-products.sql"
  Invoke-SqlFile "insert-product-a002.sql"
  Invoke-SqlFile "insert-product-a003.sql"
  Invoke-SqlFile "insert-product-a004.sql"
  Invoke-SqlFile "insert-products-a005-a024.sql"
  Invoke-SqlFile "insert-products-mop-pool.sql"
}

$count = Invoke-Sql "SELECT COUNT(*) FROM shoptop.products"
Write-Host ""
Write-Host "Gata. Produse in shoptop.products: $count"
Write-Host "Admin: admin@shop-top.ro (schimba parola in DB, vezi DEPLOY.md sectiunea 3)."
