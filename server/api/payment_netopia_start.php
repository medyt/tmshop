<?php

declare(strict_types=1);

require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/netopia.php';

shoptop_send_cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    shoptop_json_error('Foloseste POST.', 405);
}

if (!shoptop_netopia_enabled()) {
    shoptop_json_error(
        'Plata cu cardul nu este configurata. Verifica semnatura POS si certificatele Netopia (.cer / .key) in config.php.',
        503
    );
}

$body = shoptop_read_json_body();
if (!is_array($body)) {
    shoptop_json_error('Corp invalid.', 400);
}

$orderId = trim((string) ($body['orderId'] ?? ''));
$token = trim((string) ($body['token'] ?? ''));
if ($orderId === '') {
    shoptop_json_error('orderId este obligatoriu.', 400);
}

$pdo = shoptop_pdo();
$hasBilling = false;
try {
    $colCheck = $pdo->query(
        "SELECT COUNT(*) AS c FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'billing_type'"
    );
    $hasBilling = $colCheck && ((int) ($colCheck->fetch()['c'] ?? 0)) > 0;
} catch (Throwable $e) {
    $hasBilling = false;
}

$select = 'id, access_token, user_id, customer_name, customer_email, customer_phone,
            customer_address, total_amount, payment_status';
if ($hasBilling) {
    $select .= ', billing_type, company_name, company_cui';
}
$stmt = $pdo->prepare(
    'SELECT ' . $select . ' FROM orders WHERE id = :id LIMIT 1'
);
$stmt->execute(['id' => $orderId]);
$row = $stmt->fetch();
if (!$row) {
    shoptop_json_error('Comanda nu a fost gasita.', 404);
}

$user = shoptop_current_user();
$isAdmin = $user !== null && ($user['role'] ?? '') === 'admin';
$tokenOk = $token !== '' && !empty($row['access_token'])
    && hash_equals((string) $row['access_token'], $token);
$ownerOk = $user !== null && !empty($row['user_id'])
    && hash_equals((string) $row['user_id'], (string) $user['id']);
if (!$isAdmin && !$tokenOk && !$ownerOk) {
    shoptop_json_error('Acces interzis la aceasta comanda.', 403);
}

if ((string) ($row['payment_status'] ?? '') === 'paid') {
    shoptop_json_error('Comanda este deja platita.', 409);
}

$update = $pdo->prepare("UPDATE orders SET payment_method = 'card' WHERE id = :id");
$update->execute(['id' => $orderId]);

$order = [
    'id' => (string) $row['id'],
    'customerName' => (string) $row['customer_name'],
    'customerEmail' => (string) ($row['customer_email'] ?? ''),
    'customerPhone' => (string) $row['customer_phone'],
    'customerAddress' => (string) $row['customer_address'],
    'totalAmount' => (float) $row['total_amount'],
];
if ($hasBilling) {
    $order['billingType'] = (string) ($row['billing_type'] ?? 'person');
    if (!empty($row['company_name'])) {
        $order['companyName'] = (string) $row['company_name'];
    }
    if (!empty($row['company_cui'])) {
        $order['companyCui'] = (string) $row['company_cui'];
    }
}

$paymentResult = shoptop_netopia_start_payment_result($order);
if ($paymentResult['url'] === null || empty($paymentResult['fields'])) {
    shoptop_discard_unpaid_card_order($pdo, $orderId);
    $detail = trim((string) ($paymentResult['error'] ?? ''));
    shoptop_json_error(
        $detail !== ''
            ? ('Nu am putut initia plata cu cardul: ' . $detail)
            : 'Nu am putut initia plata cu cardul. Incearca din nou.',
        502
    );
}

shoptop_json_response([
    'paymentUrl' => $paymentResult['url'],
    'method' => $paymentResult['method'] ?? 'POST',
    'fields' => $paymentResult['fields'],
]);
