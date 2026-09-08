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
        if (!$row) {
            shoptop_json_error('Produsul nu a fost gasit.', 404);
        }
        if (!$isAdmin && shoptop_is_virtual_product_row($row)) {
            shoptop_json_error('Produsul nu a fost gasit.', 404);
        }
        shoptop_json_response(
            $isAdmin ? shoptop_row_to_product($row) : shoptop_row_to_shop_product($row)
        );
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
    shoptop_json_response(shoptop_row_to_product($product), 201);
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
    shoptop_json_response(shoptop_row_to_product($product));
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
