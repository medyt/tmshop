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
    shoptop_json_error('Plata cu cardul nu este configurata.', 503);
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
$stmt = $pdo->prepare(
    'SELECT id, access_token, user_id, customer_name, customer_email, customer_phone,
            customer_address, total_amount, payment_status
     FROM orders WHERE id = :id LIMIT 1'
);
$stmt->execute(['id' => $orderId]);
$row = $stmt->fetch();
if (!$row) {
    shoptop_json_error('Comanda nu a fost gasita.', 404);
}

// Acces: token de comanda, proprietar autentificat sau admin.
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

// Marcam metoda de plata ca "card".
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

$paymentUrl = shoptop_netopia_start_payment($order);
if ($paymentUrl === null) {
    shoptop_json_error('Nu am putut initia plata cu cardul. Incearca din nou.', 502);
}

shoptop_json_response(['paymentUrl' => $paymentUrl]);
