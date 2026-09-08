<?php

declare(strict_types=1);

/**
 * SMS tranzacțional (confirmare comandă) prin SMSO.
 * https://api-docs.smso.ro/ — token gol = dezactivat.
 */

function shoptop_sms_settings(): array
{
    $config = shoptop_config();
    $sms = is_array($config['sms'] ?? null) ? $config['sms'] : [];
    $token = trim((string) ($sms['token'] ?? $sms['api_key'] ?? ''));
    $sender = trim((string) ($sms['sender'] ?? ''));

    return [
        'token' => $token,
        'sender' => $sender,
        'enabled' => $token !== '',
    ];
}

function shoptop_sms_to_e164(string $phone): string
{
    $digits = preg_replace('/\D+/', '', $phone) ?? '';
    if (str_starts_with($digits, '40') && strlen($digits) >= 11) {
        return '+' . $digits;
    }
    if (str_starts_with($digits, '0') && strlen($digits) === 10) {
        return '+40' . substr($digits, 1);
    }

    return $digits !== '' ? '+' . ltrim($digits, '+') : '';
}

function shoptop_sms_first_sender_id(string $token): string
{
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }
    $cached = '';
    $ch = curl_init('https://app.smso.ro/api/v1/senders');
    if ($ch === false) {
        return '';
    }
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['X-Authorization: ' . $token],
        CURLOPT_TIMEOUT => 8,
        CURLOPT_CONNECTTIMEOUT => 4,
    ]);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($raw === false || $status >= 400) {
        return '';
    }
    $decoded = json_decode((string) $raw, true);
    $list = [];
    if (isset($decoded['data']) && is_array($decoded['data'])) {
        $list = $decoded['data'];
    } elseif (is_array($decoded)) {
        $list = $decoded;
    }
    foreach ($list as $row) {
        if (!is_array($row)) {
            continue;
        }
        $id = $row['id'] ?? $row['sender_id'] ?? null;
        if ($id !== null && $id !== '') {
            $cached = (string) $id;
            break;
        }
    }

    return $cached;
}

function shoptop_render_order_confirmation_sms(array $order): string
{
    $id = trim((string) ($order['id'] ?? ''));
    $total = number_format((float) ($order['totalAmount'] ?? 0), 2, '.', '');
    $method = (string) ($order['paymentMethod'] ?? 'cod');
    $pay = $method === 'card' ? 'plata cu cardul confirmata' : 'plata ramburs la livrare';

    return 'ShopTop: comanda ' . $id . ' a fost inregistrata. Total ' . $total
        . ' RON, ' . $pay . '. Pregatim livrarea. Multumim!';
}

function shoptop_send_sms(string $phone, string $body): bool
{
    $settings = shoptop_sms_settings();
    if (!$settings['enabled']) {
        return false;
    }
    $to = shoptop_sms_to_e164($phone);
    $text = trim($body);
    if ($to === '' || $text === '') {
        return false;
    }
    $sender = $settings['sender'] !== ''
        ? $settings['sender']
        : shoptop_sms_first_sender_id($settings['token']);
    if ($sender === '') {
        error_log('SMS SMSO: lipseste sender ID (config sms.sender sau lista senders).');
        return false;
    }

    $ch = curl_init('https://app.smso.ro/api/v1/send');
    if ($ch === false) {
        return false;
    }
    $post = http_build_query([
        'to' => $to,
        'sender' => $sender,
        'body' => $text,
        'type' => 'transactional',
        'remove_special_chars' => 1,
    ]);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['X-Authorization: ' . $settings['token']],
        CURLOPT_POSTFIELDS => $post,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_CONNECTTIMEOUT => 4,
    ]);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($raw === false || $status >= 400) {
        error_log('SMS SMSO failed: HTTP ' . $status . ' ' . $err . ' ' . (string) $raw);
        return false;
    }

    return true;
}

function shoptop_send_order_confirmation_sms(array $order): void
{
    $phone = trim((string) ($order['customerPhone'] ?? $order['customer_phone'] ?? ''));
    if ($phone === '') {
        return;
    }
    try {
        shoptop_send_sms($phone, shoptop_render_order_confirmation_sms($order));
    } catch (Throwable $e) {
        error_log('Order confirmation SMS failed: ' . $e->getMessage());
    }
}
