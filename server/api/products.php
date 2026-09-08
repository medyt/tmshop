<?php

declare(strict_types=1);

require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/baselinker.php';
require_once __DIR__ . '/smartbill.php';

shoptop_send_cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$pdo = shoptop_pdo();

// Coloanele returnate după POST/PUT (slug-ul final vine din DB, nu din request).
$detailFieldsForSave = 'id, name, slug, category, sku, ean, brand, google_category, mpn,
               purchase_price, sale_price, discount_percent, stock_qty, image_urls, description, notes';
if (shoptop_products_has_bundle_offers($pdo)) {
    $detailFieldsForSave .= ', bundle_offers';
}

function shoptop_column_exists(PDO $pdo, string $table, string $column): bool
{
    $stmt = $pdo->prepare(
        'SELECT 1
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = :table_name
           AND COLUMN_NAME = :column_name
         LIMIT 1'
    );
    $stmt->execute([
        'table_name' => $table,
        'column_name' => $column,
    ]);
    return (bool) $stmt->fetchColumn();
}

if ($method === 'GET') {
    // Raspunsul difera in functie de autentificare (admin vede preturile de
    // furnizor, publicul nu) si e sensibil, deci nu trebuie cache-uit si
    // trebuie sa varieze dupa cookie-ul de sesiune.
    header('Cache-Control: no-store, no-cache, must-revalidate, private');
    header('Pragma: no-cache');
    header('Vary: Origin, Cookie');

    $isAdmin = shoptop_is_admin_user();
    $productId = isset($_GET['id']) && is_string($_GET['id']) ? trim($_GET['id']) : '';
    $wantFull = isset($_GET['full'])
        && ($_GET['full'] === '1' || strtolower((string) $_GET['full']) === 'true');
    $wantAddons = isset($_GET['addons'])
        && ($_GET['addons'] === '1' || strtolower((string) $_GET['addons']) === 'true');

    // Admin: vânzări per produs în ultimele 7 / 30 / 90 zile (comenzi distincte + bucăți).
    // Exclude comenzile anulate, returnate și draft-urile card neplătite.
    $wantSales = isset($_GET['sales'])
        && ($_GET['sales'] === '1' || strtolower((string) $_GET['sales']) === 'true');
    if ($wantSales) {
        shoptop_require_admin();
        $where = ["o.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)", "o.status NOT IN ('cancelled', 'returned')"];
        if (shoptop_column_exists($pdo, 'orders', 'payment_method')
            && shoptop_column_exists($pdo, 'orders', 'payment_status')) {
            $where[] = "(o.payment_method <> 'card' OR o.payment_status = 'paid'"
                . " OR o.status NOT IN ('new', 'confirmed')"
                . " OR (o.awb_number IS NOT NULL AND o.awb_number <> ''))";
        }
        if (shoptop_column_exists($pdo, 'orders', 'return_received')) {
            $where[] = 'o.return_received = 0';
        }
        $sql = 'SELECT oi.product_id,
                COUNT(DISTINCT CASE WHEN o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN o.id END) AS o7,
                COUNT(DISTINCT CASE WHEN o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN o.id END) AS o30,
                COUNT(DISTINCT o.id) AS o90,
                SUM(CASE WHEN o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN oi.quantity ELSE 0 END) AS u7,
                SUM(CASE WHEN o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN oi.quantity ELSE 0 END) AS u30,
                SUM(oi.quantity) AS u90
             FROM order_items oi
             INNER JOIN orders o ON o.id = oi.order_id
             WHERE ' . implode(' AND ', $where) . '
             GROUP BY oi.product_id';
        $out = [];
        foreach ($pdo->query($sql)->fetchAll() as $row) {
            $out[(string) $row['product_id']] = [
                'd7' => ['orders' => (int) $row['o7'], 'units' => (int) $row['u7']],
                'd30' => ['orders' => (int) $row['o30'], 'units' => (int) $row['u30']],
                'd90' => ['orders' => (int) $row['o90'], 'units' => (int) $row['u90']],
            ];
        }
        shoptop_json_response($out === [] ? new stdClass() : $out);
    }

    // Catalog public pentru prețurile addon-urilor de checkout (din DB).
    if ($wantAddons) {
        $out = [];
        foreach (shoptop_checkout_addons_catalog($pdo) as $addonId => $addon) {
            $out[] = [
                'id' => $addonId,
                'sku' => (string) $addon['product_sku'],
                'title' => (string) $addon['product_name'],
                'priceRon' => (float) $addon['price'],
            ];
        }
        shoptop_json_response($out);
    }

    // Lista catalogului NU include description/notes (HTML mare → MB pe wire).
    // Detaliul (?id=) sau admin (?full=1) le includ.
    $listFields = 'id, name, slug, category, sku, ean, brand, google_category, mpn,
               purchase_price,
               sale_price, discount_percent, stock_qty, image_urls';
    $detailFields = $listFields . ', description, notes';
    if (shoptop_column_exists($pdo, 'products', 'bundle_offers')) {
        $listFields .= ', bundle_offers';
        $detailFields .= ', bundle_offers';
    }

    if ($productId !== '') {
        $stmt = $pdo->prepare('SELECT ' . $detailFields . ' FROM products WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $productId]);
        $row = $stmt->fetch();
        // URL-urile publice folosesc slug-ul — permitem lookup și după slug.
        if (!$row) {
            $stmt = $pdo->prepare('SELECT ' . $detailFields . ' FROM products WHERE slug = :slug LIMIT 1');
            $stmt->execute(['slug' => $productId]);
            $row = $stmt->fetch();
        }
        // Adresă veche (produs redenumit): întoarcem produsul cu slug-ul curent,
        // iar pagina redirecționează către adresa canonică.
        if (!$row) {
            $previousOwner = shoptop_product_id_for_previous_slug($pdo, $productId);
            if ($previousOwner !== null) {
                $stmt = $pdo->prepare('SELECT ' . $detailFields . ' FROM products WHERE id = :id LIMIT 1');
                $stmt->execute(['id' => $previousOwner]);
                $row = $stmt->fetch();
            }
        }
        if (!$row) {
            shoptop_json_error('Produsul nu a fost gasit.', 404);
        }
        if (!$isAdmin && shoptop_is_virtual_product_row($row)) {
            shoptop_json_error('Produsul nu a fost gasit.', 404);
        }
        if ($isAdmin) {
            $product = shoptop_row_to_product($row);
            $product['previousSlugs'] = shoptop_product_previous_slugs($pdo, (string) $row['id']);
            shoptop_json_response($product);
        }
        shoptop_json_response(shoptop_row_to_shop_product($row));
    }

    $includeHeavyText = $wantFull && $isAdmin;
    $fields = $includeHeavyText ? $detailFields : $listFields;
    $stmt = $pdo->query('SELECT ' . $fields . ' FROM products ORDER BY name ASC');
    $products = [];
    foreach ($stmt->fetchAll() as $row) {
        // Addon-urile / transport (S000/D000/T000/…) nu apar în catalogul public.
        if (!$isAdmin && shoptop_is_virtual_product_row($row)) {
            continue;
        }
        $product = $isAdmin
            ? shoptop_row_to_product($row)
            : shoptop_row_to_shop_product($row);
        // Catalog public: o singură imagine (galeria completă vine pe ?id= / slug).
        if (!$isAdmin && isset($product['imageUrls']) && is_array($product['imageUrls'])) {
            $product['imageUrls'] = array_slice($product['imageUrls'], 0, 1);
        }
        $products[] = $product;
    }
    shoptop_json_response($products);
}

if ($method === 'POST') {
    shoptop_require_admin();
    $body = shoptop_read_json_body();
    if (!is_array($body)) {
        shoptop_json_error('Corpul cererii trebuie sa fie un produs JSON.', 400);
    }

    if (trim((string) ($body['action'] ?? '')) === 'syncSmartbillStock') {
        try {
            shoptop_json_response(shoptop_smartbill_sync_local_stock($pdo));
        } catch (Throwable $e) {
            shoptop_json_error($e->getMessage(), 400);
        }
    }

    $product = shoptop_normalize_product($body);
    try {
        shoptop_insert_product($pdo, $product);
    } catch (PDOException $e) {
        if ((int) $e->getCode() === 23000) {
            shoptop_json_error('Produsul exista deja sau SKU-ul este duplicat.', 409);
        }
        throw $e;
    }

    shoptop_baselinker_sync_product($pdo, $product);
    $stmt = $pdo->prepare('SELECT ' . $detailFieldsForSave . ' FROM products WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $product['id']]);
    $row = $stmt->fetch() ?: $product;
    $out = shoptop_row_to_product($row);
    $out['previousSlugs'] = [];
    shoptop_json_response($out, 201);
}

if ($method === 'PUT') {
    shoptop_require_admin();
    $body = shoptop_read_json_body();
    if (!is_array($body)) {
        shoptop_json_error('Corpul cererii trebuie sa fie un produs JSON.', 400);
    }

    $product = shoptop_normalize_product($body);
    $updated = shoptop_update_product($pdo, $product);
    if ($updated === 0) {
        shoptop_json_error('Produsul nu a fost gasit.', 404);
    }

    shoptop_baselinker_sync_product($pdo, $product);
    // Slug-ul final (păstrat/unicizat) e citit din DB; includem și adresele vechi.
    $stmt = $pdo->prepare('SELECT ' . $detailFieldsForSave . ' FROM products WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $product['id']]);
    $row = $stmt->fetch() ?: $product;
    $out = shoptop_row_to_product($row);
    $out['previousSlugs'] = shoptop_product_previous_slugs($pdo, (string) $product['id']);
    shoptop_json_response($out);
}

if ($method === 'DELETE') {
    shoptop_require_admin();
    $id = $_GET['id'] ?? '';
    if (!is_string($id) || trim($id) === '') {
        shoptop_json_error('Parametrul id este obligatoriu.', 400);
    }

    $stmt = $pdo->prepare('DELETE FROM products WHERE id = :id');
    $stmt->execute(['id' => trim($id)]);
    if ($stmt->rowCount() === 0) {
        shoptop_json_error('Produsul nu a fost gasit.', 404);
    }

    shoptop_json_response(['ok' => true]);
}

shoptop_json_error('Metoda HTTP nu este suportata.', 405);
