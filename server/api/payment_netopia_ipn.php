<?php

declare(strict_types=1);

require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/netopia.php';
require_once __DIR__ . '/baselinker.php';
require_once __DIR__ . '/smartbill.php';
require_once __DIR__ . '/meta_capi.php';

/**
 * IPN Netopia clasic (POST env_key + data, criptat).
 * Răspuns: XML <crc>...</crc>
 */

$errorType = 0;
$errorCode = 0;
$errorMessage = '';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    shoptop_netopia_ipn_xml_response(1, 'Method not allowed', 2);
}

$envKey = (string) ($_POST['env_key'] ?? '');
$encData = (string) ($_POST['data'] ?? '');
$cipher = (string) ($_POST['cipher'] ?? 'aes-256-cbc');
$iv = isset($_POST['iv']) ? (string) $_POST['iv'] : null;

if ($envKey === '' || $encData === '') {
    shoptop_netopia_ipn_xml_response(1, 'Invalid POST parameters', 2);
}

$settings = shoptop_netopia_settings();
if ($settings['private_key'] === '' || !is_readable($settings['private_key'])) {
    shoptop_netopia_ipn_xml_response(1, 'Private key missing', 1);
}

try {
    $xml = shoptop_netopia_decrypt($envKey, $encData, $settings['private_key'], $cipher, $iv);
    $parsed = shoptop_netopia_parse_ipn_xml($xml);
    $orderId = $parsed['orderId'];
    if ($orderId === '') {
        throw new RuntimeException('Missing order id in IPN');
    }

    $pdo = shoptop_pdo();
    $stmt = $pdo->prepare(
        'SELECT id, customer_name, customer_email, customer_phone, customer_address,
                customer_notes, total_amount, payment_status, baselinker_order_id
         FROM orders WHERE id = :id LIMIT 1'
    );
    $stmt->execute(['id' => $orderId]);
    $row = $stmt->fetch();
    if (!$row) {
        throw new RuntimeException('Order not found');
    }

    // confirmed = bani capturați; paid = preautorizare (urmează confirmed).
    $markPaid = $parsed['errorCode'] === 0 && $parsed['action'] === 'confirmed';

    if ($markPaid && (string) ($row['payment_status'] ?? '') !== 'paid') {
        $update = $pdo->prepare(
            "UPDATE orders SET payment_status = 'paid', payment_method = 'card', payment_ref = :ref WHERE id = :id"
        );
        $update->execute([
            'ref' => $parsed['rrn'] !== '' ? $parsed['rrn'] : $parsed['action'],
            'id' => $orderId,
        ]);

        $itemsStmt = $pdo->prepare(
            'SELECT product_name, product_sku, unit_price, quantity, line_total
             FROM order_items WHERE order_id = :id ORDER BY id ASC'
        );
        $itemsStmt->execute(['id' => $orderId]);
        $items = [];
        foreach ($itemsStmt->fetchAll() as $it) {
            $items[] = [
                'productName' => (string) $it['product_name'],
                'productSku' => (string) ($it['product_sku'] ?? ''),
                'unitPrice' => (float) $it['unit_price'],
                'quantity' => (int) $it['quantity'],
                'lineTotal' => (float) $it['line_total'],
            ];
        }

        $orderPayload = [
            'id' => (string) $row['id'],
            'customerName' => (string) $row['customer_name'],
            'customerEmail' => (string) ($row['customer_email'] ?? ''),
            'customerPhone' => (string) $row['customer_phone'],
            'customerAddress' => (string) $row['customer_address'],
            'customerNotes' => (string) ($row['customer_notes'] ?? ''),
            'totalAmount' => (float) $row['total_amount'],
            'paymentMethod' => 'card',
            'paymentStatus' => 'paid',
            'items' => $items,
        ];

        if (shoptop_baselinker_enabled() && empty($row['baselinker_order_id'])) {
            $blOrderId = shoptop_baselinker_push_order($orderPayload);
            if ($blOrderId !== null) {
                $blUpdate = $pdo->prepare(
                    'UPDATE orders SET baselinker_order_id = :bl WHERE id = :id'
                );
                $blUpdate->execute(['bl' => $blOrderId, 'id' => $orderId]);
            }
        }

        $tokenStmt = $pdo->prepare('SELECT access_token FROM orders WHERE id = :id LIMIT 1');
        $tokenStmt->execute(['id' => $orderId]);
        $tokenRow = $tokenStmt->fetch();
        if ($tokenRow && !empty($tokenRow['access_token'])) {
            $orderPayload['accessToken'] = (string) $tokenRow['access_token'];
        }
        shoptop_send_order_confirmation($orderPayload);
        $capiContext = shoptop_meta_capi_load_attribution($pdo, $orderId);
        shoptop_meta_capi_send_purchase($orderPayload, $capiContext);
    } elseif ((string) ($row['payment_status'] ?? '') !== 'paid') {
        $action = strtolower($parsed['action']);
        $failed = in_array($action, ['canceled', 'cancelled'], true)
            || (
                $parsed['errorCode'] !== 0
                && !in_array($action, ['confirmed', 'paid', 'paid_pending', 'confirmed_pending'], true)
            );
        if ($failed) {
            shoptop_discard_unpaid_card_order($pdo, $orderId);
        }
    }

    $errorMessage = $parsed['errorMessage'] !== '' ? $parsed['errorMessage'] : 'OK';
    shoptop_netopia_ipn_xml_response(0, $errorMessage);
} catch (Throwable $e) {
    error_log('Netopia IPN: ' . $e->getMessage());
    shoptop_netopia_ipn_xml_response(1, $e->getMessage(), 1);
}
