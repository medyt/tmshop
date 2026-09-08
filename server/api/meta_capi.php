<?php

declare(strict_types=1);

/**
 * Meta Conversions API — Purchase server-side (dedup cu pixelul browser).
 * event_id = purchase_{orderId}, identic cu frontend.
 */

function shoptop_meta_capi_settings(): array
{
    $config = shoptop_config();
    $meta = is_array($config['meta'] ?? null) ? $config['meta'] : [];
    $pixelId = trim((string) ($meta['pixel_id'] ?? ''));
    $token = trim((string) ($meta['access_token'] ?? ''));
    $testCode = trim((string) ($meta['test_event_code'] ?? ''));

    return [
        'pixel_id' => $pixelId,
        'access_token' => $token,
        'test_event_code' => $testCode,
        'enabled' => $pixelId !== '' && $token !== '',
    ];
}

function shoptop_meta_capi_hash(string $value): string
{
    return hash('sha256', $value);
}

function shoptop_meta_capi_normalize_email(string $email): string
{
    return mb_strtolower(trim($email), 'UTF-8');
}

function shoptop_meta_capi_normalize_phone(string $phone): string
{
    $digits = preg_replace('/\D+/', '', $phone) ?? '';
    if ($digits === '') {
        return '';
    }
    if (str_starts_with($digits, '40') && strlen($digits) >= 11) {
        return $digits;
    }
    if (str_starts_with($digits, '0') && strlen($digits) === 10) {
        return '40' . substr($digits, 1);
    }

    return $digits;
}

function shoptop_meta_capi_client_ip(): string
{
    $forwarded = trim((string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''));
    if ($forwarded !== '') {
        $first = trim(explode(',', $forwarded)[0]);
        if (filter_var($first, FILTER_VALIDATE_IP)) {
            return $first;
        }
    }
    $ip = trim((string) ($_SERVER['REMOTE_ADDR'] ?? ''));

    return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '';
}

/**
 * @param array<string, mixed>|null $metaFromBody
 * @return array{fbp:string,fbc:string,eventSourceUrl:string,clientIp:string,userAgent:string}
 */
function shoptop_meta_capi_context_from_request(?array $metaFromBody): array
{
    $meta = is_array($metaFromBody) ? $metaFromBody : [];
    $site = rtrim((string) (shoptop_config()['site_url'] ?? 'https://shop-top.ro'), '/');
    $sourceUrl = trim((string) ($meta['eventSourceUrl'] ?? ''));
    if ($sourceUrl === '' || !preg_match('#^https://#i', $sourceUrl)) {
        $sourceUrl = $site . '/checkout';
    }

    return [
        'fbp' => trim((string) ($meta['fbp'] ?? '')),
        'fbc' => trim((string) ($meta['fbc'] ?? '')),
        'eventSourceUrl' => $sourceUrl,
        'clientIp' => shoptop_meta_capi_client_ip(),
        'userAgent' => trim((string) ($_SERVER['HTTP_USER_AGENT'] ?? '')),
    ];
}

function shoptop_meta_capi_ensure_table(PDO $pdo): void
{
    static $ready = false;
    if ($ready) {
        return;
    }
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS order_meta_attribution (
            order_id VARCHAR(64) NOT NULL,
            fbp VARCHAR(128) NULL,
            fbc VARCHAR(255) NULL,
            event_source_url VARCHAR(512) NULL,
            user_agent VARCHAR(512) NULL,
            client_ip VARCHAR(64) NULL,
            PRIMARY KEY (order_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $ready = true;
}

/**
 * @param array{fbp:string,fbc:string,eventSourceUrl:string,clientIp:string,userAgent:string} $context
 */
function shoptop_meta_capi_store_attribution(PDO $pdo, string $orderId, array $context): void
{
    if ($orderId === '') {
        return;
    }
    try {
        shoptop_meta_capi_ensure_table($pdo);
        $stmt = $pdo->prepare(
            'INSERT INTO order_meta_attribution (
                order_id, fbp, fbc, event_source_url, user_agent, client_ip
            ) VALUES (
                :order_id, :fbp, :fbc, :event_source_url, :user_agent, :client_ip
            ) ON DUPLICATE KEY UPDATE
                fbp = VALUES(fbp),
                fbc = VALUES(fbc),
                event_source_url = VALUES(event_source_url),
                user_agent = VALUES(user_agent),
                client_ip = VALUES(client_ip)'
        );
        $stmt->execute([
            'order_id' => $orderId,
            'fbp' => $context['fbp'] !== '' ? $context['fbp'] : null,
            'fbc' => $context['fbc'] !== '' ? $context['fbc'] : null,
            'event_source_url' => $context['eventSourceUrl'] !== '' ? $context['eventSourceUrl'] : null,
            'user_agent' => $context['userAgent'] !== '' ? substr($context['userAgent'], 0, 512) : null,
            'client_ip' => $context['clientIp'] !== '' ? $context['clientIp'] : null,
        ]);
    } catch (Throwable $e) {
        error_log('Meta CAPI store attribution failed: ' . $e->getMessage());
    }
}

/**
 * @return array{fbp:string,fbc:string,eventSourceUrl:string,clientIp:string,userAgent:string}
 */
function shoptop_meta_capi_load_attribution(PDO $pdo, string $orderId): array
{
    $empty = [
        'fbp' => '',
        'fbc' => '',
        'eventSourceUrl' => '',
        'clientIp' => '',
        'userAgent' => '',
    ];
    if ($orderId === '') {
        return $empty;
    }
    try {
        shoptop_meta_capi_ensure_table($pdo);
        $stmt = $pdo->prepare(
            'SELECT fbp, fbc, event_source_url, user_agent, client_ip
             FROM order_meta_attribution WHERE order_id = :id LIMIT 1'
        );
        $stmt->execute(['id' => $orderId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return $empty;
        }

        return [
            'fbp' => trim((string) ($row['fbp'] ?? '')),
            'fbc' => trim((string) ($row['fbc'] ?? '')),
            'eventSourceUrl' => trim((string) ($row['event_source_url'] ?? '')),
            'clientIp' => trim((string) ($row['client_ip'] ?? '')),
            'userAgent' => trim((string) ($row['user_agent'] ?? '')),
        ];
    } catch (Throwable $e) {
        error_log('Meta CAPI load attribution failed: ' . $e->getMessage());
        return $empty;
    }
}

/**
 * @param array<string, mixed> $order  Payload camelCase (shoptop_fetch_order / IPN)
 * @param array{fbp?:string,fbc?:string,eventSourceUrl?:string,clientIp?:string,userAgent?:string} $context
 */
function shoptop_meta_capi_send_purchase(array $order, array $context = []): void
{
    $settings = shoptop_meta_capi_settings();
    if (!$settings['enabled']) {
        return;
    }

    $orderId = trim((string) ($order['id'] ?? ''));
    if ($orderId === '') {
        return;
    }

    $value = round((float) ($order['totalAmount'] ?? 0), 2);
    if ($value <= 0) {
        return;
    }

    $contents = [];
    $contentIds = [];
    $numItems = 0;
    $items = is_array($order['items'] ?? null) ? $order['items'] : [];
    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }
        $productId = trim((string) ($item['productId'] ?? $item['product_id'] ?? ''));
        $sku = trim((string) ($item['productSku'] ?? $item['product_sku'] ?? ''));
        if (function_exists('shoptop_is_virtual_product_id')
            && (shoptop_is_virtual_product_id($productId) || ($sku !== '' && shoptop_is_virtual_product_id($sku)))) {
            continue;
        }
        if ($sku === '') {
            continue;
        }
        $qty = max(1, (int) ($item['quantity'] ?? 1));
        $unit = (float) ($item['unitPrice'] ?? $item['unit_price'] ?? 0);
        $contents[] = [
            'id' => $sku,
            'quantity' => $qty,
            'item_price' => round($unit, 2),
        ];
        if (!in_array($sku, $contentIds, true)) {
            $contentIds[] = $sku;
        }
        $numItems += $qty;
    }

    $userData = [];
    $email = shoptop_meta_capi_normalize_email((string) ($order['customerEmail'] ?? $order['customer_email'] ?? ''));
    if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $userData['em'] = [shoptop_meta_capi_hash($email)];
    }
    $phone = shoptop_meta_capi_normalize_phone((string) ($order['customerPhone'] ?? $order['customer_phone'] ?? ''));
    if ($phone !== '') {
        $userData['ph'] = [shoptop_meta_capi_hash($phone)];
    }
    $ip = trim((string) ($context['clientIp'] ?? ''));
    if ($ip !== '') {
        $userData['client_ip_address'] = $ip;
    }
    $ua = trim((string) ($context['userAgent'] ?? ''));
    if ($ua !== '') {
        $userData['client_user_agent'] = $ua;
    }
    $fbp = trim((string) ($context['fbp'] ?? ''));
    if ($fbp !== '') {
        $userData['fbp'] = $fbp;
    }
    $fbc = trim((string) ($context['fbc'] ?? ''));
    if ($fbc !== '') {
        $userData['fbc'] = $fbc;
    }

    $custom = [
        'currency' => 'RON',
        'value' => $value,
        'content_type' => 'product',
        'order_id' => $orderId,
    ];
    if ($contentIds !== []) {
        $custom['content_ids'] = $contentIds;
        $custom['contents'] = $contents;
        $custom['num_items'] = $numItems;
    }

    $event = [
        'event_name' => 'Purchase',
        'event_time' => time(),
        'event_id' => 'purchase_' . $orderId,
        'action_source' => 'website',
        'user_data' => $userData,
        'custom_data' => $custom,
    ];
    $sourceUrl = trim((string) ($context['eventSourceUrl'] ?? ''));
    if ($sourceUrl !== '') {
        $event['event_source_url'] = $sourceUrl;
    }

    $payload = ['data' => [$event]];
    if ($settings['test_event_code'] !== '') {
        $payload['test_event_code'] = $settings['test_event_code'];
    }

    $url = 'https://graph.facebook.com/v21.0/' . rawurlencode($settings['pixel_id'])
        . '/events?access_token=' . rawurlencode($settings['access_token']);

    $ch = curl_init($url);
    if ($ch === false) {
        error_log('Meta CAPI: curl_init failed');
        return;
    }
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_CONNECTTIMEOUT => 4,
    ]);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($raw === false || $status >= 400) {
        error_log('Meta CAPI Purchase failed: HTTP ' . $status . ' ' . $err . ' ' . (string) $raw);
    }
}
