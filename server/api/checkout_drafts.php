<?php

declare(strict_types=1);

require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/mailer.php';

function shoptop_checkout_drafts_settings(): array
{
    $config = shoptop_config();
    $cfg = is_array($config['cart_reminder'] ?? null) ? $config['cart_reminder'] : [];
    $secret = trim((string) ($cfg['secret'] ?? ''));
    $hours = isset($cfg['delay_hours']) && is_numeric($cfg['delay_hours'])
        ? max(1, (int) $cfg['delay_hours'])
        : 2;

    return [
        'secret' => $secret,
        'delay_hours' => $hours,
    ];
}

function shoptop_checkout_drafts_ensure_table(PDO $pdo): void
{
    static $ready = false;
    if ($ready) {
        return;
    }
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS checkout_drafts (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            email VARCHAR(255) NOT NULL,
            phone VARCHAR(32) NULL,
            items_json JSON NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            reminded_at TIMESTAMP NULL DEFAULT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uq_checkout_drafts_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $ready = true;
}

function shoptop_checkout_draft_complete(string $email): void
{
    $normalized = mb_strtolower(trim($email), 'UTF-8');
    if ($normalized === '' || !filter_var($normalized, FILTER_VALIDATE_EMAIL)) {
        return;
    }
    try {
        $pdo = shoptop_pdo();
        shoptop_checkout_drafts_ensure_table($pdo);
        $stmt = $pdo->prepare('DELETE FROM checkout_drafts WHERE email = :email');
        $stmt->execute(['email' => $normalized]);
    } catch (Throwable $e) {
        error_log('Checkout draft complete failed: ' . $e->getMessage());
    }
}

function shoptop_checkout_drafts_run_cron(): void
{
    $settings = shoptop_checkout_drafts_settings();
    $provided = trim((string) ($_GET['secret'] ?? $_POST['secret'] ?? ''));
    if ($settings['secret'] === '' || !hash_equals($settings['secret'], $provided)) {
        shoptop_json_error('Acces interzis.', 403);
    }

    $pdo = shoptop_pdo();
    shoptop_checkout_drafts_ensure_table($pdo);
    $hours = $settings['delay_hours'];
    $sql = 'SELECT id, email, items_json, updated_at
         FROM checkout_drafts
         WHERE reminded_at IS NULL
           AND updated_at <= (NOW() - INTERVAL ' . $hours . ' HOUR)
         ORDER BY updated_at ASC
         LIMIT 40';
    $stmt = $pdo->query($sql);
    if ($stmt === false) {
        shoptop_json_response(['ok' => true, 'sent' => 0, 'skipped' => 0]);
    }
    $sent = 0;
    $skipped = 0;
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $email = mb_strtolower(trim((string) ($row['email'] ?? '')), 'UTF-8');
        $id = (int) ($row['id'] ?? 0);
        if ($email === '' || $id <= 0) {
            continue;
        }
        $updatedAt = (string) ($row['updated_at'] ?? '');
        $hasOrder = $pdo->prepare(
            'SELECT id FROM orders
             WHERE customer_email IS NOT NULL
               AND LOWER(customer_email) = :email
               AND created_at >= :since
             LIMIT 1'
        );
        $hasOrder->execute([
            'email' => $email,
            'since' => $updatedAt !== '' ? $updatedAt : '1970-01-01 00:00:00',
        ]);
        if ($hasOrder->fetch()) {
            $pdo->prepare('DELETE FROM checkout_drafts WHERE id = :id')->execute(['id' => $id]);
            $skipped++;
            continue;
        }
        $items = json_decode((string) ($row['items_json'] ?? '[]'), true);
        if (!is_array($items)) {
            $items = [];
        }
        $rendered = shoptop_render_cart_reminder_email([
            'email' => $email,
            'items' => $items,
        ]);
        try {
            shoptop_send_mail($email, $rendered['subject'], $rendered['html']);
            $mark = $pdo->prepare('UPDATE checkout_drafts SET reminded_at = NOW() WHERE id = :id');
            $mark->execute(['id' => $id]);
            $sent++;
        } catch (Throwable $e) {
            error_log('Cart reminder email failed: ' . $e->getMessage());
        }
    }

    shoptop_json_response(['ok' => true, 'sent' => $sent, 'skipped' => $skipped]);
}

$isDirectRequest = realpath((string) ($_SERVER['SCRIPT_FILENAME'] ?? '')) === realpath(__FILE__);
if (!$isDirectRequest) {
    return;
}

shoptop_send_cors();

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method === 'GET' && isset($_GET['cron'])) {
    shoptop_checkout_drafts_run_cron();
}

if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($method !== 'POST') {
    shoptop_json_error('Metoda HTTP nu este suportata.', 405);
}

$body = shoptop_read_json_body();
if (!is_array($body)) {
    shoptop_json_error('JSON invalid.', 400);
}

$email = mb_strtolower(trim((string) ($body['email'] ?? '')), 'UTF-8');
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    shoptop_json_error('Email invalid.', 400);
}

$phone = trim((string) ($body['phone'] ?? ''));
$itemsIn = is_array($body['items'] ?? null) ? $body['items'] : [];
$items = [];
foreach ($itemsIn as $item) {
    if (!is_array($item)) {
        continue;
    }
    $name = trim((string) ($item['name'] ?? ''));
    $url = trim((string) ($item['url'] ?? ''));
    $productId = trim((string) ($item['productId'] ?? ''));
    if ($name === '' && $productId === '') {
        continue;
    }
    $items[] = [
        'productId' => $productId,
        'name' => $name !== '' ? $name : $productId,
        'url' => $url,
    ];
    if (count($items) >= 12) {
        break;
    }
}
if ($items === []) {
    shoptop_json_error('Lista de produse este obligatorie.', 400);
}

$pdo = shoptop_pdo();
shoptop_checkout_drafts_ensure_table($pdo);
$stmt = $pdo->prepare(
    'INSERT INTO checkout_drafts (email, phone, items_json, reminded_at)
     VALUES (:email, :phone, :items_json, NULL)
     ON DUPLICATE KEY UPDATE
        phone = VALUES(phone),
        items_json = VALUES(items_json),
        reminded_at = NULL,
        updated_at = CURRENT_TIMESTAMP'
);
$stmt->execute([
    'email' => $email,
    'phone' => $phone !== '' ? $phone : null,
    'items_json' => json_encode($items, JSON_UNESCAPED_UNICODE),
]);

shoptop_json_response(['ok' => true]);
