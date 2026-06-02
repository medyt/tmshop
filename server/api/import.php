<?php

declare(strict_types=1);

require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/baselinker.php';

shoptop_send_cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    shoptop_json_error('Foloseste POST cu un array JSON de produse.', 405);
}

shoptop_require_admin();

$body = shoptop_read_json_body();
if (!is_array($body)) {
    shoptop_json_error('Corpul cererii trebuie sa fie un array JSON.', 400);
}

$products = [];
foreach ($body as $item) {
    if (!is_array($item)) {
        shoptop_json_error('Fiecare element trebuie sa fie un obiect produs.', 400);
    }
    $products[] = shoptop_normalize_product($item);
}

$pdo = shoptop_pdo();
$pdo->beginTransaction();

try {
    $pdo->exec('DELETE FROM products');
    foreach ($products as $product) {
        shoptop_insert_product($pdo, $product);
    }
    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    if ($e instanceof PDOException && (int) $e->getCode() === 23000) {
        shoptop_json_error('Import respins: SKU duplicat in lista trimisa.', 409);
    }
    throw $e;
}

// Sincronizare in masa cu BaseLinker (best-effort, dupa commit).
if (shoptop_baselinker_enabled()) {
    foreach ($products as $product) {
        shoptop_baselinker_sync_product($pdo, $product);
    }
}

shoptop_json_response(['ok' => true, 'count' => count($products)]);
