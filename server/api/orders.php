<?php

declare(strict_types=1);

require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/baselinker.php';

/** Linie virtuală opțională la checkout; nu există în `products`, nu se scade stoc. */
const SHOPTOP_GIFT_ADDON_PRODUCT_ID = 'shoptop-gift-addon';
const SHOPTOP_GIFT_ADDON_PRICE = 15.0;

shoptop_send_cors();

/**
 * Trimite comanda in BaseLinker si salveaza order_id-ul intors (best-effort).
 */
function shoptop_push_order_to_baselinker(PDO $pdo, array $order): void
{
    if (!shoptop_baselinker_enabled() || !empty($order['baselinkerOrderId'])) {
        return;
    }
    $blOrderId = shoptop_baselinker_push_order($order);
    if ($blOrderId !== null) {
        $stmt = $pdo->prepare(
            'UPDATE orders SET baselinker_order_id = :bl WHERE id = :id'
        );
        $stmt->execute(['bl' => $blOrderId, 'id' => (string) $order['id']]);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function shoptop_order_access_token(): string
{
    return bin2hex(random_bytes(16));
}

function shoptop_order_id(): string
{
    return 'ord-' . bin2hex(random_bytes(8));
}

function shoptop_order_status_label(string $status): string
{
    return match ($status) {
        'confirmed' => 'confirmed',
        'processing' => 'processing',
        'shipped' => 'shipped',
        'delivered' => 'delivered',
        'cancelled' => 'cancelled',
        default => 'new',
    };
}

function shoptop_parse_delivery_carrier(?string $notes): ?string
{
    if ($notes === null || trim($notes) === '') {
        return null;
    }

    $firstLine = trim(strtok($notes, "\n"));
    if ($firstLine === 'Curier ales: Fan Courier') {
        return 'fan-courier';
    }
    if ($firstLine === 'Curier ales: DPD') {
        return 'dpd';
    }

    return null;
}

function shoptop_order_row_to_response(array $order, array $items, bool $includeAccessToken = false): array
{
    $payload = [
        'id' => (string) $order['id'],
        'customerName' => (string) $order['customer_name'],
        'customerPhone' => (string) $order['customer_phone'],
        'customerAddress' => (string) $order['customer_address'],
        'totalAmount' => (float) $order['total_amount'],
        'status' => shoptop_order_status_label((string) ($order['status'] ?? 'new')),
        'paymentMethod' => (string) ($order['payment_method'] ?? 'cod'),
        'paymentStatus' => (string) ($order['payment_status'] ?? 'pending'),
        'createdAt' => (string) $order['created_at'],
        'items' => [],
    ];

    if (!empty($order['baselinker_order_id'])) {
        $payload['baselinkerOrderId'] = (string) $order['baselinker_order_id'];
    }

    if (!empty($order['customer_email'])) {
        $payload['customerEmail'] = (string) $order['customer_email'];
    }
    if (!empty($order['customer_notes'])) {
        $payload['customerNotes'] = (string) $order['customer_notes'];
    }
    $deliveryCarrier = shoptop_parse_delivery_carrier(
        isset($order['customer_notes']) ? (string) $order['customer_notes'] : null
    );
    if ($deliveryCarrier !== null) {
        $payload['deliveryCarrier'] = $deliveryCarrier;
    }
    if (!empty($order['awb_number'])) {
        $payload['awbNumber'] = (string) $order['awb_number'];
    }
    if (!empty($order['awb_issued_at'])) {
        $payload['awbIssuedAt'] = (string) $order['awb_issued_at'];
    }
    if ($includeAccessToken && !empty($order['access_token'])) {
        $payload['accessToken'] = (string) $order['access_token'];
    }

    foreach ($items as $item) {
        $entry = [
            'productId' => (string) $item['product_id'],
            'productName' => (string) $item['product_name'],
            'unitPrice' => (float) $item['unit_price'],
            'quantity' => (int) $item['quantity'],
            'lineTotal' => (float) $item['line_total'],
        ];
        if (!empty($item['product_sku'])) {
            $entry['productSku'] = (string) $item['product_sku'];
        }
        $payload['items'][] = $entry;
    }

    return $payload;
}

function shoptop_fetch_order(PDO $pdo, string $orderId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT id, access_token, user_id, customer_name, customer_email, customer_phone, customer_address,
                customer_notes, total_amount, status, payment_method, payment_status, payment_ref, baselinker_order_id, awb_number, awb_issued_at, created_at
         FROM orders
         WHERE id = :id
         LIMIT 1'
    );
    $stmt->execute(['id' => $orderId]);
    $order = $stmt->fetch();
    if (!$order) {
        return null;
    }

    $itemsStmt = $pdo->prepare(
        'SELECT product_id, product_name, product_sku, unit_price, quantity, line_total
         FROM order_items
         WHERE order_id = :order_id
         ORDER BY id ASC'
    );
    $itemsStmt->execute(['order_id' => $orderId]);
    $items = $itemsStmt->fetchAll();

    return shoptop_order_row_to_response($order, $items);
}

function shoptop_can_view_order(array $order, ?array $user, ?string $accessToken): bool
{
    if ($user !== null && ($user['role'] ?? '') === 'admin') {
        return true;
    }

    if ($accessToken !== null && $accessToken !== '' && !empty($order['access_token'])) {
        return hash_equals((string) $order['access_token'], $accessToken);
    }

    if ($user !== null && ($user['role'] ?? '') === 'customer' && !empty($order['user_id'])) {
        return hash_equals((string) $order['user_id'], (string) $user['id']);
    }

    return false;
}

function shoptop_next_awb_number(PDO $pdo): string
{
    $prefix = 'AWB-' . gmdate('Ymd') . '-';
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM orders WHERE awb_number LIKE :prefix'
    );
    $stmt->execute(['prefix' => $prefix . '%']);
    $count = (int) $stmt->fetchColumn();

    return $prefix . str_pad((string) ($count + 1), 4, '0', STR_PAD_LEFT);
}

function shoptop_issue_awb(PDO $pdo, string $orderId): array
{
    $pdo->beginTransaction();

    try {
        $stmt = $pdo->prepare(
            'SELECT id, access_token, user_id, customer_name, customer_email, customer_phone, customer_address,
                    customer_notes, total_amount, status, payment_method, payment_status, payment_ref, baselinker_order_id, awb_number, awb_issued_at, created_at
             FROM orders
             WHERE id = :id
             LIMIT 1
             FOR UPDATE'
        );
        $stmt->execute(['id' => $orderId]);
        $order = $stmt->fetch();
        if (!$order) {
            $pdo->rollBack();
            shoptop_json_error('Comanda nu a fost gasita.', 404);
        }

        $newlyIssued = false;
        if (empty($order['awb_number'])) {
            $awbNumber = shoptop_next_awb_number($pdo);
            $updateStmt = $pdo->prepare(
                'UPDATE orders
                 SET awb_number = :awb_number,
                     awb_issued_at = CURRENT_TIMESTAMP,
                     status = CASE WHEN status = :delivered THEN status ELSE :shipped END
                 WHERE id = :id'
            );
            $updateStmt->execute([
                'awb_number' => $awbNumber,
                'delivered' => 'delivered',
                'shipped' => 'shipped',
                'id' => $orderId,
            ]);
            $newlyIssued = (string) ($order['status'] ?? 'new') !== 'delivered';
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    $order = shoptop_fetch_order($pdo, $orderId);
    if ($order === null) {
        shoptop_json_error('Comanda nu a putut fi citita dupa emiterea AWB.', 500);
    }

    if ($newlyIssued) {
        shoptop_send_order_status_email($order, 'shipped');
    }

    return $order;
}

function shoptop_order_apply_stock(PDO $pdo, string $orderId): void
{
    $itemsStmt = $pdo->prepare(
        'SELECT product_id, quantity
         FROM order_items
         WHERE order_id = :order_id
         ORDER BY id ASC'
    );
    $itemsStmt->execute(['order_id' => $orderId]);
    $items = $itemsStmt->fetchAll();

    foreach ($items as $item) {
        $productStmt = $pdo->prepare(
            'SELECT id, name, stock_qty
             FROM products
             WHERE id = :id
             FOR UPDATE'
        );
        $productStmt->execute(['id' => $item['product_id']]);
        $product = $productStmt->fetch();
        if (!$product) {
            if ($item['product_id'] === SHOPTOP_GIFT_ADDON_PRODUCT_ID) {
                continue;
            }
            shoptop_json_error('Un produs din comanda nu mai exista.', 409);
        }

        $stockQty = (int) $product['stock_qty'];
        $quantity = (int) $item['quantity'];
        if ($stockQty < $quantity) {
            shoptop_json_error(
                'Stoc insuficient pentru ' . (string) $product['name'] . '.',
                409
            );
        }

        $updateStmt = $pdo->prepare(
            'UPDATE products SET stock_qty = :stock_qty WHERE id = :id'
        );
        $updateStmt->execute([
            'stock_qty' => $stockQty - $quantity,
            'id' => $product['id'],
        ]);
    }
}

function shoptop_order_restore_stock(PDO $pdo, string $orderId): void
{
    $itemsStmt = $pdo->prepare(
        'SELECT product_id, quantity
         FROM order_items
         WHERE order_id = :order_id
         ORDER BY id ASC'
    );
    $itemsStmt->execute(['order_id' => $orderId]);
    $items = $itemsStmt->fetchAll();

    foreach ($items as $item) {
        $productStmt = $pdo->prepare(
            'SELECT id, stock_qty
             FROM products
             WHERE id = :id
             FOR UPDATE'
        );
        $productStmt->execute(['id' => $item['product_id']]);
        $product = $productStmt->fetch();
        if (!$product) {
            if ($item['product_id'] === SHOPTOP_GIFT_ADDON_PRODUCT_ID) {
                continue;
            }
            shoptop_json_error('Un produs din comanda nu mai exista.', 409);
        }

        $stockQty = (int) $product['stock_qty'];
        $quantity = (int) $item['quantity'];
        $updateStmt = $pdo->prepare(
            'UPDATE products SET stock_qty = :stock_qty WHERE id = :id'
        );
        $updateStmt->execute([
            'stock_qty' => $stockQty + $quantity,
            'id' => $product['id'],
        ]);
    }
}

function shoptop_update_order_status(PDO $pdo, string $orderId, string $status): array
{
    $allowed = ['new', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!in_array($status, $allowed, true)) {
        shoptop_json_error('Status invalid.', 400);
    }

    $pdo->beginTransaction();

    try {
        $stmt = $pdo->prepare(
            'SELECT id, status, stock_applied
             FROM orders
             WHERE id = :id
             LIMIT 1
             FOR UPDATE'
        );
        $stmt->execute(['id' => $orderId]);
        $order = $stmt->fetch();
        if (!$order) {
            $pdo->rollBack();
            shoptop_json_error('Comanda nu a fost gasita.', 404);
        }

        $currentStatus = (string) ($order['status'] ?? 'new');
        $stockApplied = (int) ($order['stock_applied'] ?? 0) === 1;

        if ($status !== $currentStatus) {
            if ($status === 'confirmed' && !$stockApplied) {
                shoptop_order_apply_stock($pdo, $orderId);
                $stockApplied = true;
            } elseif ($status === 'cancelled' && $stockApplied) {
                shoptop_order_restore_stock($pdo, $orderId);
                $stockApplied = false;
            } elseif ($status === 'new' && $stockApplied) {
                shoptop_order_restore_stock($pdo, $orderId);
                $stockApplied = false;
            }
        }

        $updateStmt = $pdo->prepare(
            'UPDATE orders
             SET status = :status, stock_applied = :stock_applied
             WHERE id = :id'
        );
        $updateStmt->execute([
            'status' => $status,
            'stock_applied' => $stockApplied ? 1 : 0,
            'id' => $orderId,
        ]);

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    $order = shoptop_fetch_order($pdo, $orderId);
    if ($order === null) {
        shoptop_json_error('Comanda nu a putut fi citita.', 500);
    }

    if ($status !== $currentStatus) {
        shoptop_send_order_status_email($order, $status);
    }

    return $order;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$pdo = shoptop_pdo();

if ($method === 'GET') {
    $orderId = $_GET['id'] ?? '';
    $accessToken = $_GET['token'] ?? '';
    $mine = $_GET['mine'] ?? '';
    $currentUser = shoptop_current_user();

    if (is_string($mine) && trim($mine) === '1') {
        if ($currentUser === null) {
            shoptop_json_error('Autentificare necesara.', 401);
        }

        $email = shoptop_normalize_email((string) ($currentUser['email'] ?? ''));
        $ordersStmt = $pdo->prepare(
            'SELECT id, access_token, user_id, customer_name, customer_email, customer_phone, customer_address,
                    customer_notes, total_amount, status, payment_method, payment_status, payment_ref, baselinker_order_id, awb_number, awb_issued_at, created_at
             FROM orders
             WHERE user_id = :user_id
                OR (
                    customer_email IS NOT NULL
                    AND customer_email <> ""
                    AND LOWER(customer_email) = LOWER(:email)
                )
             ORDER BY created_at DESC
             LIMIT 100'
        );
        $ordersStmt->execute([
            'user_id' => $currentUser['id'],
            'email' => $email,
        ]);
        $orders = $ordersStmt->fetchAll();
        $response = [];
        foreach ($orders as $order) {
            $itemsStmt = $pdo->prepare(
                'SELECT product_id, product_name, product_sku, unit_price, quantity, line_total
                 FROM order_items
                 WHERE order_id = :order_id
                 ORDER BY id ASC'
            );
            $itemsStmt->execute(['order_id' => $order['id']]);
            $response[] = shoptop_order_row_to_response($order, $itemsStmt->fetchAll());
        }
        shoptop_json_response($response);
    }

    if (is_string($orderId) && trim($orderId) !== '') {
        $stmt = $pdo->prepare(
            'SELECT id, access_token, user_id, customer_name, customer_email, customer_phone, customer_address,
                    customer_notes, total_amount, status, payment_method, payment_status, payment_ref, baselinker_order_id, awb_number, awb_issued_at, created_at
             FROM orders
             WHERE id = :id
             LIMIT 1'
        );
        $stmt->execute(['id' => trim($orderId)]);
        $orderRow = $stmt->fetch();
        if (!$orderRow) {
            shoptop_json_error('Comanda nu a fost gasita.', 404);
        }

        $token = is_string($accessToken) ? trim($accessToken) : '';
        if (!shoptop_can_view_order($orderRow, $currentUser, $token)) {
            shoptop_json_error('Acces interzis la aceasta comanda.', 403);
        }

        $itemsStmt = $pdo->prepare(
            'SELECT product_id, product_name, product_sku, unit_price, quantity, line_total
             FROM order_items
             WHERE order_id = :order_id
             ORDER BY id ASC'
        );
        $itemsStmt->execute(['order_id' => $orderRow['id']]);
        shoptop_json_response(shoptop_order_row_to_response($orderRow, $itemsStmt->fetchAll()));
    }

    shoptop_require_admin();

    $ordersStmt = $pdo->query(
        'SELECT id, access_token, user_id, customer_name, customer_email, customer_phone, customer_address,
                customer_notes, total_amount, status, payment_method, payment_status, payment_ref, baselinker_order_id, awb_number, awb_issued_at, created_at
         FROM orders
         ORDER BY created_at DESC
         LIMIT 100'
    );
    $orders = $ordersStmt->fetchAll();
    $response = [];
    foreach ($orders as $order) {
        $itemsStmt = $pdo->prepare(
            'SELECT product_id, product_name, product_sku, unit_price, quantity, line_total
             FROM order_items
             WHERE order_id = :order_id
             ORDER BY id ASC'
        );
        $itemsStmt->execute(['order_id' => $order['id']]);
        $response[] = shoptop_order_row_to_response($order, $itemsStmt->fetchAll());
    }
    shoptop_json_response($response);
}

if ($method === 'POST') {
    try {
    $body = shoptop_read_json_body();
    if (!is_array($body)) {
        shoptop_json_error('Corpul cererii trebuie sa fie un obiect JSON.', 400);
    }

    $action = $body['action'] ?? '';
    if (is_string($action) && trim($action) === 'issueAwb') {
        shoptop_require_admin();
        $orderId = trim((string) ($body['orderId'] ?? ''));
        if ($orderId === '') {
            shoptop_json_error('Campul orderId este obligatoriu.', 400);
        }
        shoptop_json_response(shoptop_issue_awb($pdo, $orderId));
    }

    if (is_string($action) && trim($action) === 'updateStatus') {
        shoptop_require_admin();
        $orderId = trim((string) ($body['orderId'] ?? ''));
        $status = trim((string) ($body['status'] ?? ''));
        if ($orderId === '' || $status === '') {
            shoptop_json_error('Campurile orderId si status sunt obligatorii.', 400);
        }
        shoptop_json_response(shoptop_update_order_status($pdo, $orderId, $status));
    }

    $customer = $body['customer'] ?? null;
    $items = $body['items'] ?? null;
    if (!is_array($customer) || !is_array($items) || $items === []) {
        shoptop_json_error('Clientul si lista de produse sunt obligatorii.', 400);
    }

    $customerName = trim((string) ($customer['name'] ?? ''));
    $customerPhone = trim((string) ($customer['phone'] ?? ''));
    $customerAddress = trim((string) ($customer['address'] ?? ''));
    $customerEmail = trim((string) ($customer['email'] ?? ''));
    $customerNotes = trim((string) ($customer['notes'] ?? ''));
    $deliveryCarrier = trim((string) ($body['deliveryCarrier'] ?? ''));

    if (!in_array($deliveryCarrier, ['fan-courier', 'dpd'], true)) {
        shoptop_json_error('Alege curierul pentru livrare.', 400);
    }

    $paymentMethod = trim((string) ($body['paymentMethod'] ?? 'cod'));
    if (!in_array($paymentMethod, ['cod', 'card'], true)) {
        $paymentMethod = 'cod';
    }

    $carrierLabel = $deliveryCarrier === 'dpd' ? 'DPD' : 'Fan Courier';
    $customerNotes = 'Curier ales: ' . $carrierLabel
        . ($customerNotes !== '' ? "\n\n" . $customerNotes : '');

    if ($customerName === '' || $customerPhone === '' || $customerAddress === '') {
        shoptop_json_error('Numele, telefonul si adresa sunt obligatorii.', 400);
    }

    $currentUser = shoptop_current_user();
    $userId = null;
    if ($currentUser !== null) {
        $userId = (string) $currentUser['id'];
    }

    $normalizedItems = [];
    foreach ($items as $item) {
        if (!is_array($item)) {
            shoptop_json_error('Fiecare produs din comanda trebuie sa fie un obiect.', 400);
        }
        $productId = trim((string) ($item['productId'] ?? ''));
        $quantity = is_numeric($item['quantity'] ?? null)
            ? (int) floor((float) $item['quantity'])
            : 0;
        if ($productId === '' || $quantity <= 0) {
            shoptop_json_error('Produsul si cantitatea trebuie sa fie valide.', 400);
        }
        $normalizedItems[] = [
            'product_id' => $productId,
            'quantity' => $quantity,
        ];
    }

    $pdo->beginTransaction();

    try {
        $preparedItems = [];
        $totalAmount = 0.0;

        foreach ($normalizedItems as $item) {
            $productStmt = $pdo->prepare(
                'SELECT id, name, sku, sale_price, stock_qty
                 FROM products
                 WHERE id = :id
                 FOR UPDATE'
            );
            $productStmt->execute(['id' => $item['product_id']]);
            $product = $productStmt->fetch();
            if (!$product) {
                $pdo->rollBack();
                shoptop_json_error('Un produs din cos nu mai exista.', 409);
            }

            $salePrice = (float) $product['sale_price'];
            $stockQty = (int) $product['stock_qty'];
            if ($salePrice <= 0 || $stockQty < $item['quantity']) {
                $pdo->rollBack();
                shoptop_json_error(
                    'Stoc sau pret indisponibil pentru ' . (string) $product['name'] . '.',
                    409
                );
            }

            $lineTotal = round($salePrice * $item['quantity'], 2);
            $totalAmount += $lineTotal;
            $preparedItems[] = [
                'product_id' => (string) $product['id'],
                'product_name' => (string) $product['name'],
                'product_sku' => !empty($product['sku']) ? (string) $product['sku'] : null,
                'unit_price' => $salePrice,
                'quantity' => $item['quantity'],
                'line_total' => $lineTotal,
            ];
        }

        $giftAddon = array_key_exists('giftAddon', $body) && $body['giftAddon'] === true;
        if ($giftAddon) {
            $lineGift = round(SHOPTOP_GIFT_ADDON_PRICE, 2);
            $totalAmount += $lineGift;
            $preparedItems[] = [
                'product_id' => SHOPTOP_GIFT_ADDON_PRODUCT_ID,
                'product_name' => 'Produs surpriza',
                'product_sku' => null,
                'unit_price' => SHOPTOP_GIFT_ADDON_PRICE,
                'quantity' => 1,
                'line_total' => $lineGift,
            ];
        }

        $totalAmount += shoptop_shipping_flat_rate();

        $orderId = shoptop_order_id();
        $accessToken = shoptop_order_access_token();
        $orderStmt = $pdo->prepare(
            'INSERT INTO orders (
                id, access_token, user_id, customer_name, customer_email, customer_phone,
                customer_address, customer_notes, total_amount, status, payment_method, payment_status
            ) VALUES (
                :id, :access_token, :user_id, :customer_name, :customer_email, :customer_phone,
                :customer_address, :customer_notes, :total_amount, :status, :payment_method, :payment_status
            )'
        );
        $orderStmt->execute([
            'id' => $orderId,
            'access_token' => $accessToken,
            'user_id' => $userId,
            'customer_name' => $customerName,
            'customer_email' => $customerEmail !== '' ? $customerEmail : null,
            'customer_phone' => $customerPhone,
            'customer_address' => $customerAddress,
            'customer_notes' => $customerNotes !== '' ? $customerNotes : null,
            'total_amount' => round($totalAmount, 2),
            'status' => 'new',
            'payment_method' => $paymentMethod,
            'payment_status' => 'pending',
        ]);

        $itemStmt = $pdo->prepare(
            'INSERT INTO order_items (
                order_id, product_id, product_name, product_sku,
                unit_price, quantity, line_total
            ) VALUES (
                :order_id, :product_id, :product_name, :product_sku,
                :unit_price, :quantity, :line_total
            )'
        );

        foreach ($preparedItems as $item) {
            $itemStmt->execute([
                'order_id' => $orderId,
                'product_id' => $item['product_id'],
                'product_name' => $item['product_name'],
                'product_sku' => $item['product_sku'],
                'unit_price' => $item['unit_price'],
                'quantity' => $item['quantity'],
                'line_total' => $item['line_total'],
            ]);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    $order = shoptop_fetch_order($pdo, $orderId);
    if ($order === null) {
        shoptop_json_error('Comanda a fost creata, dar nu a putut fi citita.', 500);
    }

    $order['accessToken'] = $accessToken;
    shoptop_send_order_confirmation_email($order);

    // Comenzile cu plata la livrare merg imediat in BaseLinker.
    // Cele cu card se trimit dupa confirmarea platii (IPN Netopia).
    if ($paymentMethod === 'cod') {
        shoptop_push_order_to_baselinker($pdo, $order);
    }

    shoptop_json_response($order, 201);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('orders.php POST: ' . $e->getMessage());
        shoptop_json_error('Nu am putut procesa comanda.', 500);
    }
}

shoptop_json_error('Metoda HTTP nu este suportata.', 405);
