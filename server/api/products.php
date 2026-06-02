<?php

declare(strict_types=1);

require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/baselinker.php';

shoptop_send_cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$pdo = shoptop_pdo();

if ($method === 'GET') {
    $isAdmin = shoptop_is_admin_user();
    $stmt = $pdo->query(
        'SELECT id, name, slug, category, sku, ean, brand, google_category, mpn,
                supplier_price_a, supplier_price_b, cost_supplier,
                sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
         FROM products
         ORDER BY name ASC'
    );
    $products = [];
    foreach ($stmt->fetchAll() as $row) {
        $products[] = $isAdmin
            ? shoptop_row_to_product($row)
            : shoptop_row_to_shop_product($row);
    }
    shoptop_json_response($products);
}

if ($method === 'POST') {
    shoptop_require_admin();
    $body = shoptop_read_json_body();
    if (!is_array($body)) {
        shoptop_json_error('Corpul cererii trebuie sa fie un produs JSON.', 400);
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
