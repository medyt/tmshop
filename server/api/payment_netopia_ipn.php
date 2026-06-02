<?php

declare(strict_types=1);

require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/netopia.php';
require_once __DIR__ . '/baselinker.php';

/**
 * IPN Netopia (server-to-server). Netopia trimite un POST JSON cu statusul platii.
 * Raspundem cu {errorCode:0} ca sa confirmam receptia.
 */

header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    http_response_code(405);
    echo json_encode(['errorCode' => 1, 'errorMessage' => 'Method not allowed']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode((string) $raw, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['errorCode' => 1, 'errorMessage' => 'Invalid payload']);
    exit;
}

$orderId = trim((string) ($data['order']['orderID'] ?? ''));
$paymentStatus = $data['payment']['status'] ?? null;
$ntpID = (string) ($data['payment']['ntpID'] ?? '');

if ($orderId === '') {
    http_response_code(400);
    echo json_encode(['errorCode' => 1, 'errorMessage' => 'Missing orderID']);
    exit;
}

// Coduri Netopia: 3 = paid, 5 = confirmed (incasat). Restul raman in asteptare.
$paidCodes = [3, 5];
$isPaid = in_array((int) $paymentStatus, $paidCodes, true);

try {
    $pdo = shoptop_pdo();
    $stmt = $pdo->prepare(
        'SELECT id, customer_name, customer_email, customer_phone, customer_address,
                customer_notes, total_amount, payment_status, baselinker_order_id
         FROM orders WHERE id = :id LIMIT 1'
    );
    $stmt->execute(['id' => $orderId]);
    $row = $stmt->fetch();
    if (!$row) {
        http_response_code(404);
        echo json_encode(['errorCode' => 1, 'errorMessage' => 'Order not found']);
        exit;
    }

    if ($isPaid && (string) ($row['payment_status'] ?? '') !== 'paid') {
        $update = $pdo->prepare(
            "UPDATE orders SET payment_status = 'paid', payment_ref = :ref WHERE id = :id"
        );
        $update->execute(['ref' => $ntpID, 'id' => $orderId]);

        // Construim payload-ul comenzii pentru BaseLinker.
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

        // Trimitem comanda platita in BaseLinker (daca nu a fost deja trimisa).
        if (shoptop_baselinker_enabled() && empty($row['baselinker_order_id'])) {
            $blOrderId = shoptop_baselinker_push_order($orderPayload);
            if ($blOrderId !== null) {
                $blUpdate = $pdo->prepare(
                    'UPDATE orders SET baselinker_order_id = :bl WHERE id = :id'
                );
                $blUpdate->execute(['bl' => $blOrderId, 'id' => $orderId]);
            }
        }
    }

    echo json_encode(['errorCode' => 0, 'errorMessage' => '']);
} catch (Throwable $e) {
    error_log('Netopia IPN ' . $orderId . ': ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['errorCode' => 1, 'errorMessage' => 'Server error']);
}
