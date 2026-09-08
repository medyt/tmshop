<?php

declare(strict_types=1);

require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/baselinker.php';
require_once __DIR__ . '/smartbill.php';
require_once __DIR__ . '/dpd.php';
require_once __DIR__ . '/fan.php';
require_once __DIR__ . '/meta_capi.php';

shoptop_send_cors();

/**
 * Coloane SELECT pentru orders (incl. facturare SmartBill dacă există).
 */
function shoptop_orders_select_sql(PDO $pdo): string
{
    $cols = [
        'id', 'access_token', 'user_id', 'customer_name', 'customer_email', 'customer_phone',
        'customer_address', 'customer_notes', 'total_amount', 'status',
        'payment_method', 'payment_status', 'payment_ref', 'baselinker_order_id',
        'awb_number', 'awb_issued_at', 'created_at',
    ];
    foreach ([
        'billing_type', 'company_name', 'company_cui', 'company_reg_com',
        'invoice_series', 'invoice_number', 'invoice_url', 'invoice_issued_at', 'invoice_error',
        'ship_county', 'ship_county_name', 'ship_city', 'ship_street',
        'ship_street_number', 'ship_address_extra', 'ship_postal_code', 'dpd_site_id',
        'dpd_parcel_id',
        'delivery_carrier',
        'stock_applied',
        'courier_status', 'courier_status_at',
        'return_received',
        'courier_cost_total', 'courier_cost_net', 'courier_cost_vat',
        'courier_cost_details', 'courier_cost_source', 'courier_cost_at',
        'invoice_storno_series', 'invoice_storno_number', 'invoice_storno_at',
    ] as $extra) {
        if (shoptop_column_exists($pdo, 'orders', $extra)) {
            $cols[] = $extra;
        }
    }
    return implode(', ', $cols);
}

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

/**
 * Număr scurt de comandă: 6 cifre (100000–999999), unic în DB.
 */
function shoptop_order_id(PDO $pdo): string
{
    $stmt = $pdo->prepare('SELECT 1 FROM orders WHERE id = :id LIMIT 1');
    for ($attempt = 0; $attempt < 32; $attempt++) {
        $id = (string) random_int(100000, 999999);
        $stmt->execute(['id' => $id]);
        if (!$stmt->fetchColumn()) {
            return $id;
        }
    }
    throw new RuntimeException('Nu am putut genera un număr unic de comandă.');
}

function shoptop_order_status_label(string $status): string
{
    return match ($status) {
        'confirmed' => 'confirmed',
        'processing' => 'processing',
        'shipped' => 'shipped',
        'delivered' => 'delivered',
        'returned' => 'returned',
        'cancelled' => 'cancelled',
        default => 'new',
    };
}

function shoptop_column_exists(PDO $pdo, string $table, string $column): bool
{
    static $cache = [];
    $key = $table . '.' . $column;
    if (array_key_exists($key, $cache)) {
        return $cache[$key];
    }

    $stmt = $pdo->prepare(
        'SELECT 1
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = :table_name
           AND COLUMN_NAME = :column_name
         LIMIT 1'
    );
    $stmt->execute([
        'table_name' => $table,
        'column_name' => $column,
    ]);
    $cache[$key] = (bool) $stmt->fetchColumn();
    return $cache[$key];
}

/**
 * Încarcă order_items pentru mai multe comenzi (evită N+1 pe listă admin).
 *
 * @param list<string> $orderIds
 * @return array<string, list<array<string, mixed>>>
 */
function shoptop_fetch_order_items_grouped(PDO $pdo, array $orderIds): array
{
    $ids = [];
    foreach ($orderIds as $id) {
        $trimmed = trim((string) $id);
        if ($trimmed !== '') {
            $ids[$trimmed] = true;
        }
    }
    $ids = array_keys($ids);
    if ($ids === []) {
        return [];
    }

    $byOrder = [];
    foreach ($ids as $id) {
        $byOrder[$id] = [];
    }

    foreach (array_chunk($ids, 400) as $chunk) {
        $placeholders = implode(',', array_fill(0, count($chunk), '?'));
        $stmt = $pdo->prepare(
            'SELECT order_id, product_id, product_name, product_sku, unit_price, quantity, line_total
             FROM order_items
             WHERE order_id IN (' . $placeholders . ')
             ORDER BY id ASC'
        );
        $stmt->execute($chunk);
        foreach ($stmt->fetchAll() as $row) {
            $oid = (string) $row['order_id'];
            if (!isset($byOrder[$oid])) {
                $byOrder[$oid] = [];
            }
            $byOrder[$oid][] = $row;
        }
    }

    return $byOrder;
}

/**
 * Persistă costul curier pe comandă (dacă migrarea a rulat).
 *
 * @param array{total:float,net:float,vat:float,details:array<string,float>,source:string} $cost
 */
function shoptop_save_order_courier_cost(PDO $pdo, string $orderId, array $cost): void
{
    if (!shoptop_column_exists($pdo, 'orders', 'courier_cost_total')) {
        return;
    }

    $detailsJson = json_encode($cost['details'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($detailsJson === false) {
        $detailsJson = '{}';
    }

    $source = (string) ($cost['source'] ?? 'contract');
    if (!in_array($source, ['api', 'contract'], true)) {
        $source = 'contract';
    }

    $stmt = $pdo->prepare(
        'UPDATE orders
         SET courier_cost_total = :courier_cost_total,
             courier_cost_net = :courier_cost_net,
             courier_cost_vat = :courier_cost_vat,
             courier_cost_details = :courier_cost_details,
             courier_cost_source = :courier_cost_source,
             courier_cost_at = CURRENT_TIMESTAMP
         WHERE id = :id'
    );
    $stmt->execute([
        'courier_cost_total' => round((float) ($cost['total'] ?? 0), 2),
        'courier_cost_net' => round((float) ($cost['net'] ?? 0), 2),
        'courier_cost_vat' => round((float) ($cost['vat'] ?? 0), 2),
        'courier_cost_details' => $detailsJson,
        'courier_cost_source' => $source,
        'id' => $orderId,
    ]);
}

/**
 * Calculează și salvează costul DPD pentru o comandă existentă (backfill / re-sync).
 *
 * @param array<int, array<string, mixed>> $items
 * @return array{total:float,net:float,vat:float,details:array<string,float>,source:string}
 */
function shoptop_refresh_order_courier_cost(PDO $pdo, array $orderRow, array $items): array
{
    $cost = shoptop_dpd_resolve_courier_cost($orderRow, $items, null);
    shoptop_save_order_courier_cost($pdo, (string) $orderRow['id'], $cost);

    return $cost;
}

/**
 * Backfill cost curier pentru comenzi cu AWB dar fără cost salvat.
 *
 * @return array{processed:int,updated:int,failed:int,skipped:int,errors:list<string>}
 */
function shoptop_backfill_courier_costs(PDO $pdo, int $limit = 50): array
{
    if (!shoptop_column_exists($pdo, 'orders', 'courier_cost_total')) {
        throw new RuntimeException(
            'Coloanele courier_cost_* lipsesc. Rulează sql/migrate-courier-cost.sql.'
        );
    }

    $limit = max(1, min(200, $limit));
    $stmt = $pdo->prepare(
        'SELECT ' . shoptop_orders_select_sql($pdo) . '
         FROM orders
         WHERE awb_number IS NOT NULL
           AND TRIM(awb_number) <> \'\'
           AND courier_cost_total IS NULL
           AND status <> \'cancelled\'
         ORDER BY awb_issued_at ASC
         LIMIT ' . $limit
    );
    $stmt->execute();
    $rows = $stmt->fetchAll();

    $result = [
        'processed' => 0,
        'updated' => 0,
        'failed' => 0,
        'skipped' => 0,
        'errors' => [],
    ];

    $itemsStmt = $pdo->prepare(
        'SELECT product_id, product_name, product_sku, unit_price, quantity, line_total
         FROM order_items
         WHERE order_id = :order_id
         ORDER BY id ASC'
    );

    foreach ($rows as $orderRow) {
        $result['processed'] += 1;
        $orderId = (string) ($orderRow['id'] ?? '');
        if ($orderId === '') {
            $result['skipped'] += 1;
            continue;
        }

        try {
            $itemsStmt->execute(['order_id' => $orderId]);
            $items = $itemsStmt->fetchAll();
            shoptop_refresh_order_courier_cost($pdo, $orderRow, $items);
            $result['updated'] += 1;
        } catch (Throwable $e) {
            $result['failed'] += 1;
            $result['errors'][] = $orderId . ': ' . $e->getMessage();
        }

        usleep(300000);
    }

    return $result;
}

/**
 * Calculeaza pretul pentru bundle (2/3 buc) daca exista oferta activa.
 * Intoarce [unitPrice, lineTotal] sau null daca nu se aplica.
 */
function shoptop_bundle_pricing(array $productRow, int $quantity, float $salePrice): ?array
{
    if ($quantity !== 2 && $quantity !== 3) {
        return null;
    }

    $offers = shoptop_bundle_offers_from_row($productRow);
    if ($offers === null) {
        return null;
    }

    foreach ($offers as $offer) {
        $qty = (int) ($offer['qty'] ?? 0);
        if ($qty !== $quantity) {
            continue;
        }
        if (empty($offer['enabled'])) {
            continue;
        }
        $mode = (string) ($offer['mode'] ?? '');
        $value = is_numeric($offer['value'] ?? null) ? (float) $offer['value'] : NAN;
        if (!is_finite($value) || $value <= 0) {
            continue;
        }

        $regularTotal = round($salePrice * $quantity, 2);
        $total = null;
        if ($mode === 'fixed_total') {
            $total = $value;
        } elseif ($mode === 'percent_off') {
            $pct = min(99.0, max(0.0, $value));
            $total = $regularTotal * (1 - $pct / 100);
        }
        if ($total === null) {
            continue;
        }

        $lineTotal = round((float) $total, 2);
        if ($lineTotal <= 0 || $lineTotal >= $regularTotal) {
            return null;
        }
        $unitPrice = round($lineTotal / $quantity, 2);
        if ($unitPrice <= 0) {
            return null;
        }
        return [$unitPrice, $lineTotal];
    }

    return null;
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

/**
 * Normalizează carrier: dpd | fan-courier | null.
 */
function shoptop_normalize_delivery_carrier(mixed $value): ?string
{
    $raw = strtolower(trim((string) ($value ?? '')));
    if ($raw === 'dpd') {
        return 'dpd';
    }
    if ($raw === 'fan-courier' || $raw === 'fan' || $raw === 'fancourier') {
        return 'fan-courier';
    }
    return null;
}

/**
 * Carrier efectiv al unei comenzi (coloană → notes → dacă are AWB: dpd legacy).
 *
 * @param array<string, mixed> $order
 */
function shoptop_order_delivery_carrier(array $order): ?string
{
    if (array_key_exists('delivery_carrier', $order) || array_key_exists('deliveryCarrier', $order)) {
        $fromCol = shoptop_normalize_delivery_carrier(
            $order['delivery_carrier'] ?? $order['deliveryCarrier'] ?? null
        );
        if ($fromCol !== null) {
            return $fromCol;
        }
    }
    $fromNotes = shoptop_parse_delivery_carrier(
        isset($order['customer_notes'])
            ? (string) $order['customer_notes']
            : (isset($order['customerNotes']) ? (string) $order['customerNotes'] : null)
    );
    if ($fromNotes !== null) {
        return $fromNotes;
    }
    $awb = trim((string) ($order['awb_number'] ?? $order['awbNumber'] ?? ''));
    if ($awb !== '') {
        return 'dpd';
    }
    return null;
}

/**
 * Alias: sync din tracking Fan folosește același mapper ca DPD.
 *
 * @param array<string, mixed> $track
 */
function shoptop_sync_order_from_fan_track(PDO $pdo, string $orderId, array $track): void
{
    shoptop_sync_order_from_dpd_track($pdo, $orderId, $track);
}

function shoptop_order_row_to_response(
    array $order,
    array $items,
    bool $includeAccessToken = false,
    bool $includeMarginBreakdown = false,
): array {
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
    // Curierul nu se mai alege la checkout; livrarea este „prin curier”.
    if (!empty($order['ship_county'])) {
        $payload['shipCounty'] = (string) $order['ship_county'];
    }
    if (!empty($order['ship_county_name'])) {
        $payload['shipCountyName'] = (string) $order['ship_county_name'];
    }
    if (!empty($order['ship_city'])) {
        $payload['shipCity'] = (string) $order['ship_city'];
    }
    if (!empty($order['ship_street'])) {
        $payload['shipStreet'] = (string) $order['ship_street'];
    }
    if (!empty($order['ship_street_number'])) {
        $payload['shipStreetNumber'] = (string) $order['ship_street_number'];
    }
    if (!empty($order['ship_address_extra'])) {
        $payload['shipAddressExtra'] = (string) $order['ship_address_extra'];
    }
    if (!empty($order['ship_postal_code'])) {
        $payload['shipPostalCode'] = (string) $order['ship_postal_code'];
    }
    if (!empty($order['awb_number'])) {
        $payload['awbNumber'] = (string) $order['awb_number'];
    }
    if (!empty($order['awb_issued_at'])) {
        $payload['awbIssuedAt'] = (string) $order['awb_issued_at'];
    }
    if (!empty($order['dpd_parcel_id'])) {
        $payload['dpdParcelId'] = (string) $order['dpd_parcel_id'];
    }
    $carrier = shoptop_order_delivery_carrier($order);
    if ($carrier !== null) {
        $payload['deliveryCarrier'] = $carrier;
    }
    if (!empty($order['dpd_site_id'])) {
        $payload['dpdSiteId'] = (int) $order['dpd_site_id'];
    }
    if (!empty($order['courier_status'])) {
        $payload['courierStatus'] = (string) $order['courier_status'];
    }
    if (!empty($order['courier_status_at'])) {
        $payload['courierStatusAt'] = (string) $order['courier_status_at'];
    }
    if (array_key_exists('return_received', $order)) {
        $payload['returnReceived'] = !empty($order['return_received']);
    } elseif (
        !empty($order['courier_status'])
        && shoptop_dpd_desc_returned_to_sender(
            mb_strtolower((string) $order['courier_status'], 'UTF-8')
        )
    ) {
        $payload['returnReceived'] = true;
    }
    if (!empty($order['billing_type'])) {
        $payload['billingType'] = (string) $order['billing_type'];
    }
    if (!empty($order['company_name'])) {
        $payload['companyName'] = (string) $order['company_name'];
    }
    if (!empty($order['company_cui'])) {
        $payload['companyCui'] = (string) $order['company_cui'];
    }
    if (!empty($order['company_reg_com'])) {
        $payload['companyRegCom'] = (string) $order['company_reg_com'];
    }
    if (!empty($order['invoice_series'])) {
        $payload['invoiceSeries'] = (string) $order['invoice_series'];
    }
    if (!empty($order['invoice_number'])) {
        $payload['invoiceNumber'] = (string) $order['invoice_number'];
    }
    if (!empty($order['invoice_url'])) {
        $payload['invoiceUrl'] = (string) $order['invoice_url'];
    }
    if (!empty($order['invoice_issued_at'])) {
        $payload['invoiceIssuedAt'] = (string) $order['invoice_issued_at'];
    }
    if (!empty($order['invoice_error'])) {
        $payload['invoiceError'] = (string) $order['invoice_error'];
    }
    if (shoptop_is_admin_user()) {
        if (isset($order['courier_cost_total']) && $order['courier_cost_total'] !== null && $order['courier_cost_total'] !== '') {
            $payload['courierCostTotal'] = (float) $order['courier_cost_total'];
        }
        if (isset($order['courier_cost_net']) && $order['courier_cost_net'] !== null && $order['courier_cost_net'] !== '') {
            $payload['courierCostNet'] = (float) $order['courier_cost_net'];
        }
        if (isset($order['courier_cost_vat']) && $order['courier_cost_vat'] !== null && $order['courier_cost_vat'] !== '') {
            $payload['courierCostVat'] = (float) $order['courier_cost_vat'];
        }
        if (!empty($order['courier_cost_source'])) {
            $payload['courierCostSource'] = (string) $order['courier_cost_source'];
        }
        if (!empty($order['courier_cost_at'])) {
            $payload['courierCostAt'] = (string) $order['courier_cost_at'];
        }
        if (!empty($order['courier_cost_details'])) {
            $decoded = is_array($order['courier_cost_details'])
                ? $order['courier_cost_details']
                : json_decode((string) $order['courier_cost_details'], true);
            if (is_array($decoded)) {
                $payload['courierCostDetails'] = $decoded;
            }
        }
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

    if ($includeMarginBreakdown && shoptop_is_admin_user()) {
        try {
            $payload['serviceMarginBreakdown'] = shoptop_order_service_margin_breakdown($order, $items);
        } catch (Throwable) {
            // Nu blocăm răspunsul comenzii dacă estimarea costului DPD eșuează.
        }
    }

    return $payload;
}

function shoptop_fetch_order(PDO $pdo, string $orderId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT ' . shoptop_orders_select_sql($pdo) . '
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

    return shoptop_order_row_to_response($order, $items, false, true);
}

function shoptop_can_view_order(array $order, ?array $user, ?string $accessToken): bool
{
    if ($user !== null && ($user['role'] ?? '') === 'admin') {
        return true;
    }

    if ($accessToken !== null && $accessToken !== '' && !empty($order['access_token'])) {
        if (hash_equals((string) $order['access_token'], $accessToken)) {
            return true;
        }
    }

    if ($user === null) {
        return false;
    }

    // Contul care a plasat comanda (user_id pe comandă).
    if (!empty($order['user_id']) && hash_equals((string) $order['user_id'], (string) $user['id'])) {
        return true;
    }

    // Aceeași regulă ca la GET ?mine=1: emailul din cont = emailul comenzii.
    $userEmail = shoptop_normalize_email((string) ($user['email'] ?? ''));
    $orderEmail = shoptop_normalize_email((string) ($order['customer_email'] ?? ''));
    if ($userEmail !== '' && $orderEmail !== '' && strcasecmp($userEmail, $orderEmail) === 0) {
        return true;
    }

    return false;
}

function shoptop_issue_awb(PDO $pdo, string $orderId, ?string $requestedCarrier = null): array
{
    $requested = shoptop_normalize_delivery_carrier($requestedCarrier);

    $pdo->beginTransaction();

    try {
        $stmt = $pdo->prepare(
            'SELECT ' . shoptop_orders_select_sql($pdo) . '
             FROM orders
             WHERE id = :id
             LIMIT 1
             FOR UPDATE'
        );
        $stmt->execute(['id' => $orderId]);
        $order = $stmt->fetch();
        if (!$order) {
            $pdo->rollBack();
            throw new RuntimeException('Comanda nu a fost gasita.');
        }

        if ((string) ($order['status'] ?? '') === 'cancelled') {
            $pdo->rollBack();
            throw new RuntimeException('Nu poți genera AWB pentru o comandă anulată.');
        }
        if ((string) ($order['status'] ?? '') === 'returned') {
            $pdo->rollBack();
            throw new RuntimeException('Nu poți genera AWB pentru o comandă returnată.');
        }
        $payMethod = (string) ($order['payment_method'] ?? 'cod');
        $payStatus = (string) ($order['payment_status'] ?? 'pending');
        if ($payMethod === 'card' && $payStatus !== 'paid') {
            $pdo->rollBack();
            throw new RuntimeException(
                'Nu poți genera AWB până nu e confirmată plata cu cardul.'
            );
        }

        $existingCarrier = shoptop_normalize_delivery_carrier($order['delivery_carrier'] ?? null);
        if ($existingCarrier === null) {
            $existingCarrier = shoptop_parse_delivery_carrier(
                isset($order['customer_notes']) ? (string) $order['customer_notes'] : null
            );
        }

        $newlyIssued = false;
        if (empty($order['awb_number'])) {
            $carrier = $requested ?? $existingCarrier ?? 'dpd';
            if ($existingCarrier !== null && $existingCarrier !== $carrier) {
                $pdo->rollBack();
                throw new RuntimeException(
                    'Comanda e deja legată de alt curier (' . $existingCarrier . ').'
                );
            }

            if ($carrier === 'fan-courier') {
                if (!shoptop_fan_enabled()) {
                    $pdo->rollBack();
                    throw new RuntimeException(
                        'Fan Courier nu este configurat. Completează username, password și client_id în config.php.'
                    );
                }
            } elseif (!shoptop_dpd_enabled()) {
                $pdo->rollBack();
                throw new RuntimeException(
                    'DPD nu este configurat. Completează username, password și service_id în config.php.'
                );
            }

            $itemsStmt = $pdo->prepare(
                'SELECT product_id, product_name, product_sku, unit_price, quantity, line_total
                 FROM order_items
                 WHERE order_id = :order_id
                 ORDER BY id ASC'
            );
            $itemsStmt->execute(['order_id' => $orderId]);
            $items = $itemsStmt->fetchAll();

            try {
                $created = $carrier === 'fan-courier'
                    ? shoptop_fan_create_shipment($order, $items)
                    : shoptop_dpd_create_shipment($order, $items);
            } catch (Throwable $e) {
                $pdo->rollBack();
                throw new RuntimeException($e->getMessage(), 0, $e);
            }

            $hasParcelCol = shoptop_column_exists($pdo, 'orders', 'dpd_parcel_id');
            $hasCarrierCol = shoptop_column_exists($pdo, 'orders', 'delivery_carrier');
            $currentStatus = (string) ($order['status'] ?? 'new');
            $stockApplied = (int) ($order['stock_applied'] ?? 0) === 1;
            $nextStatus = in_array($currentStatus, ['shipped', 'delivered', 'returned', 'cancelled'], true)
                ? $currentStatus
                : 'processing';
            if ($nextStatus === 'processing' && !$stockApplied) {
                shoptop_order_apply_stock($pdo, $orderId);
                $stockApplied = true;
            }

            $setParts = [
                'awb_number = :awb_number',
                'awb_issued_at = CURRENT_TIMESTAMP',
                'status = :status',
                'stock_applied = :stock_applied',
            ];
            $params = [
                'awb_number' => $created['shipmentId'],
                'status' => $nextStatus,
                'stock_applied' => $stockApplied ? 1 : 0,
                'id' => $orderId,
            ];
            if ($hasParcelCol && $carrier === 'dpd') {
                $setParts[] = 'dpd_parcel_id = :dpd_parcel_id';
                $params['dpd_parcel_id'] = $created['parcelId'];
            }
            if ($hasCarrierCol) {
                $setParts[] = 'delivery_carrier = :delivery_carrier';
                $params['delivery_carrier'] = $carrier;
            }

            $updateStmt = $pdo->prepare(
                'UPDATE orders SET ' . implode(', ', $setParts) . ' WHERE id = :id'
            );
            $updateStmt->execute($params);

            if (!empty($created['courierCost']) && is_array($created['courierCost'])) {
                shoptop_save_order_courier_cost($pdo, $orderId, $created['courierCost']);
            }

            $newlyIssued = $nextStatus === 'processing' && $currentStatus !== 'processing';
            $emailStatus = $nextStatus;
        } elseif ($requested !== null) {
            $locked = $existingCarrier ?? 'dpd';
            if ($locked !== $requested) {
                $pdo->rollBack();
                throw new RuntimeException(
                    'Comanda are deja AWB pe ' . $locked . ', nu pe ' . $requested . '.'
                );
            }
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    $order = shoptop_fetch_order($pdo, $orderId);
    if ($order === null) {
        throw new RuntimeException('Comanda nu a putut fi citita dupa emiterea AWB.');
    }

    if ($newlyIssued) {
        shoptop_send_order_status_email(
            shoptop_order_attach_access_token($pdo, $order),
            $emailStatus ?? 'processing',
        );
    }

    return $order;
}

function shoptop_customer_notes_without_carrier(?string $notes): ?string
{
    if ($notes === null) {
        return null;
    }
    $trimmed = trim($notes);
    if ($trimmed === '') {
        return null;
    }
    if (shoptop_parse_delivery_carrier($trimmed) === null) {
        return $trimmed;
    }
    $remainder = preg_replace('/^Curier ales: [^\r\n]+(\r?\n)*/u', '', $trimmed, 1);
    $remainder = trim((string) $remainder);
    return $remainder === '' ? null : $remainder;
}

function shoptop_clear_order_courier_cost(PDO $pdo, string $orderId): void
{
    if (!shoptop_column_exists($pdo, 'orders', 'courier_cost_total')) {
        return;
    }
    $stmt = $pdo->prepare(
        'UPDATE orders
         SET courier_cost_total = NULL,
             courier_cost_net = NULL,
             courier_cost_vat = NULL,
             courier_cost_details = NULL,
             courier_cost_source = NULL,
             courier_cost_at = NULL
         WHERE id = :id'
    );
    $stmt->execute(['id' => $orderId]);
}

/**
 * Anulează AWB-ul la curier și deblochează comanda pentru reemitere (alt curier).
 * Stocul rămâne aplicat. Status processing → confirmed (tab „În așteptare”).
 */
function shoptop_cancel_order_awb(PDO $pdo, string $orderId): array
{
    $stmt = $pdo->prepare(
        'SELECT ' . shoptop_orders_select_sql($pdo) . '
         FROM orders
         WHERE id = :id
         LIMIT 1'
    );
    $stmt->execute(['id' => $orderId]);
    $order = $stmt->fetch();
    if (!$order) {
        throw new RuntimeException('Comanda nu a fost găsită.');
    }

    $status = shoptop_order_status_label((string) ($order['status'] ?? 'new'));
    if ($status === 'cancelled') {
        throw new RuntimeException('Nu poți anula AWB-ul unei comenzi anulate.');
    }
    if ($status === 'returned') {
        throw new RuntimeException('Nu poți anula AWB-ul unei comenzi returnate.');
    }
    if ($status === 'shipped' || $status === 'delivered') {
        throw new RuntimeException(
            'Nu poți anula AWB-ul după expediere / livrare. Coletul e deja la curier.'
        );
    }

    $awb = trim((string) ($order['awb_number'] ?? ''));
    if ($awb === '') {
        throw new RuntimeException('Comanda nu are AWB de anulat.');
    }

    $carrier = shoptop_order_delivery_carrier($order) ?? 'dpd';
    if ($carrier === 'fan-courier') {
        shoptop_fan_delete_awb($awb);
    } else {
        shoptop_dpd_cancel_shipment($awb);
    }

    $nextStatus = $status === 'processing' ? 'confirmed' : $status;
    $notes = shoptop_customer_notes_without_carrier(
        isset($order['customer_notes']) ? (string) $order['customer_notes'] : null
    );

    $setParts = [
        'awb_number = NULL',
        'awb_issued_at = NULL',
        'status = :status',
        'customer_notes = :customer_notes',
    ];
    $params = [
        'status' => $nextStatus,
        'customer_notes' => $notes,
        'id' => $orderId,
    ];
    if (shoptop_column_exists($pdo, 'orders', 'dpd_parcel_id')) {
        $setParts[] = 'dpd_parcel_id = NULL';
    }
    if (shoptop_column_exists($pdo, 'orders', 'delivery_carrier')) {
        $setParts[] = 'delivery_carrier = NULL';
    }
    if (shoptop_column_exists($pdo, 'orders', 'courier_status')) {
        $setParts[] = 'courier_status = NULL';
        $setParts[] = 'courier_status_at = NULL';
    }

    $update = $pdo->prepare(
        'UPDATE orders SET ' . implode(', ', $setParts) . ' WHERE id = :id'
    );
    $update->execute($params);
    shoptop_clear_order_courier_cost($pdo, $orderId);

    $updated = shoptop_fetch_order($pdo, $orderId);
    if ($updated === null) {
        throw new RuntimeException('Comanda nu a putut fi citită după anularea AWB.');
    }
    return $updated;
}

/**
 * Anulează AWB pentru mai multe comenzi.
 *
 * @param list<string> $orderIds
 * @return array{orders:list<array<string,mixed>>,errors:list<array{orderId:string,error:string}>}
 */
function shoptop_bulk_cancel_awb(PDO $pdo, array $orderIds): array
{
    $orders = [];
    $errors = [];
    foreach ($orderIds as $orderId) {
        $id = (string) $orderId;
        try {
            $orders[] = shoptop_cancel_order_awb($pdo, $id);
        } catch (Throwable $e) {
            $errors[] = [
                'orderId' => $id,
                'error' => $e->getMessage(),
            ];
        }
    }
    return ['orders' => $orders, 'errors' => $errors];
}

/**
 * Returnează bytes PDF pentru eticheta DPD a comenzii.
 * Pentru Fan: HTML termic (text/html).
 */
function shoptop_print_order_awb_pdf(PDO $pdo, string $orderId): string
{
    return shoptop_bulk_print_awb_pdf($pdo, [$orderId]);
}

function shoptop_send_awb_print_payload(string $payload, string $filenameBase): void
{
    $isHtml = str_starts_with(ltrim($payload), '<!') || str_starts_with(ltrim($payload), '<html');
    if ($isHtml) {
        header('Content-Type: text/html; charset=utf-8');
        header('Content-Disposition: inline; filename="' . $filenameBase . '.html"');
    } else {
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="' . $filenameBase . '.pdf"');
    }
    header('Content-Length: ' . (string) strlen($payload));
    echo $payload;
    exit;
}

/**
 * Normalizează lista de ID-uri comenzi (max 50, unice, nevide).
 *
 * @param mixed $raw
 * @return list<string>
 */
function shoptop_normalize_bulk_order_ids(mixed $raw): array
{
    if (!is_array($raw)) {
        return [];
    }
    $ids = [];
    $seen = [];
    foreach ($raw as $value) {
        if (!is_string($value) && !is_int($value) && !is_float($value)) {
            continue;
        }
        $id = trim((string) $value);
        if ($id === '' || isset($seen[$id])) {
            continue;
        }
        $seen[$id] = true;
        $ids[] = $id;
        if (count($ids) >= 50) {
            break;
        }
    }
    return $ids;
}

/**
 * Actualizează statusul pentru mai multe comenzi.
 *
 * @param list<string> $orderIds
 * @return array{orders:list<array<string,mixed>>,errors:list<array{orderId:string,error:string}>}
 */
function shoptop_bulk_update_order_status(PDO $pdo, array $orderIds, string $status): array
{
    $orders = [];
    $errors = [];
    foreach ($orderIds as $orderId) {
        try {
            $orders[] = shoptop_update_order_status($pdo, $orderId, $status);
        } catch (Throwable $e) {
            $errors[] = [
                'orderId' => $orderId,
                'error' => $e->getMessage(),
            ];
        }
    }
    return ['orders' => $orders, 'errors' => $errors];
}

/**
 * Emite AWB pentru comenzi fără AWB (păstrează cele existente).
 *
 * @param list<string> $orderIds
 * @return array{orders:list<array<string,mixed>>,errors:list<array{orderId:string,error:string}>}
 */
function shoptop_bulk_issue_awb(PDO $pdo, array $orderIds, ?string $carrier = null): array
{
    $orders = [];
    $errors = [];
    foreach ($orderIds as $orderId) {
        $id = (string) $orderId;
        try {
            $orders[] = shoptop_issue_awb($pdo, $id, $carrier);
        } catch (Throwable $e) {
            $errors[] = [
                'orderId' => $id,
                'error' => $e->getMessage(),
            ];
        }
    }
    return ['orders' => $orders, 'errors' => $errors];
}

/**
 * PDF etichete AWB pentru mai multe comenzi (același curier).
 *
 * @param list<string> $orderIds
 */
function shoptop_bulk_print_awb_pdf(PDO $pdo, array $orderIds): string
{
    $hasParcelCol = shoptop_column_exists($pdo, 'orders', 'dpd_parcel_id');
    $hasCarrierCol = shoptop_column_exists($pdo, 'orders', 'delivery_carrier');
    $dpdIds = [];
    $fanIds = [];
    $missing = [];

    foreach ($orderIds as $orderId) {
        $cols = ['awb_number', 'customer_notes'];
        if ($hasParcelCol) {
            $cols[] = 'dpd_parcel_id';
        }
        if ($hasCarrierCol) {
            $cols[] = 'delivery_carrier';
        }
        $stmt = $pdo->prepare(
            'SELECT ' . implode(', ', $cols) . ' FROM orders WHERE id = :id LIMIT 1'
        );
        $stmt->execute(['id' => $orderId]);
        $row = $stmt->fetch();
        if (!$row || empty($row['awb_number'])) {
            $missing[] = $orderId;
            continue;
        }
        $carrier = shoptop_order_delivery_carrier($row) ?? 'dpd';
        $awb = trim((string) $row['awb_number']);
        if ($carrier === 'fan-courier') {
            $fanIds[] = $awb;
        } else {
            $parcelId = $hasParcelCol ? trim((string) ($row['dpd_parcel_id'] ?? '')) : '';
            if ($parcelId === '') {
                $parcelId = $awb;
            }
            if ($parcelId !== '') {
                $dpdIds[] = $parcelId;
            }
        }
    }

    if ($dpdIds === [] && $fanIds === []) {
        shoptop_json_error(
            $missing !== []
                ? 'Nicio comandă selectată nu are AWB generat.'
                : 'Nu există AWB-uri de tipărit.',
            400
        );
    }

    if ($dpdIds !== [] && $fanIds !== []) {
        shoptop_json_error(
            'Selectează comenzi de la un singur curier (DPD sau Fan) pentru print bulk.',
            400
        );
    }

    try {
        if ($fanIds !== []) {
            if (!shoptop_fan_enabled()) {
                shoptop_json_error(
                    'Fan Courier nu este configurat. Completează username, password și client_id în config.php.',
                    503
                );
            }
            return shoptop_fan_print_label($fanIds, 'A6');
        }
        if (!shoptop_dpd_enabled()) {
            shoptop_json_error(
                'DPD nu este configurat. Completează username, password și service_id în config.php.',
                503
            );
        }
        return shoptop_dpd_print_label($dpdIds, 'A6');
    } catch (Throwable $e) {
        shoptop_json_error($e->getMessage(), 502);
    }
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
            if (shoptop_is_virtual_product_id((string) $item['product_id'])) {
                continue;
            }
            throw new RuntimeException('Un produs din comanda nu mai exista.');
        }

        $stockQty = (int) $product['stock_qty'];
        $quantity = (int) $item['quantity'];
        if ($stockQty < $quantity) {
            throw new RuntimeException(
                'Stoc insuficient pentru ' . (string) $product['name'] . '.'
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
            if (shoptop_is_virtual_product_id((string) $item['product_id'])) {
                continue;
            }
            throw new RuntimeException('Un produs din comanda nu mai exista.');
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
    $allowed = ['new', 'confirmed', 'processing', 'shipped', 'delivered', 'returned', 'cancelled'];
    if (!in_array($status, $allowed, true)) {
        throw new RuntimeException('Status invalid.');
    }

    $currentStatus = 'new';
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
            throw new RuntimeException('Comanda nu a fost gasita.');
        }

        $currentStatus = (string) ($order['status'] ?? 'new');
        $stockApplied = (int) ($order['stock_applied'] ?? 0) === 1;

        if ($status !== $currentStatus) {
            // Stocul scade la ambalare / expediere (processing+), nu la simpla confirmare.
            if (
                in_array($status, ['processing', 'shipped', 'delivered'], true)
                && !$stockApplied
            ) {
                shoptop_order_apply_stock($pdo, $orderId);
                $stockApplied = true;
            } elseif (in_array($status, ['cancelled', 'returned', 'new'], true) && $stockApplied) {
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

    if ($status !== $currentStatus && in_array($status, ['returned', 'cancelled'], true)) {
        try {
            shoptop_smartbill_reverse_invoice($pdo, $orderId);
        } catch (Throwable $e) {
            error_log('SmartBill storno ' . $orderId . ': ' . $e->getMessage());
        }
    }

    $order = shoptop_fetch_order($pdo, $orderId);
    if ($order === null) {
        throw new RuntimeException('Comanda nu a putut fi citita.');
    }

    if ($status !== $currentStatus) {
        shoptop_send_order_status_email(
            shoptop_order_attach_access_token($pdo, $order),
            $status,
        );
    }

    // Retur după livrare: coletul e considerat reîntors, ca să nu revină pe Livrată la sync.
    if ($status === 'returned' && $currentStatus === 'delivered') {
        try {
            $order = shoptop_mark_order_return_received($pdo, $orderId);
        } catch (Throwable $e) {
            error_log('Mark return received after delivered→returned ' . $orderId . ': ' . $e->getMessage());
        }
    }

    return $order;
}

/**
 * Actualizează datele clientului / adresa de livrare (admin).
 *
 * @param array<string,mixed> $body
 * @return array<string,mixed>
 */
function shoptop_update_order_customer(PDO $pdo, string $orderId, array $body): array
{
    $customerName = trim((string) ($body['customerName'] ?? ''));
    $customerPhone = shoptop_normalize_ro_phone((string) ($body['customerPhone'] ?? ''));
    $customerEmail = trim((string) ($body['customerEmail'] ?? ''));
    $customerNotes = trim((string) ($body['customerNotes'] ?? ''));
    $county = trim((string) ($body['shipCounty'] ?? $body['county'] ?? ''));
    $countyName = trim((string) ($body['shipCountyName'] ?? $body['countyName'] ?? ''));
    $city = trim((string) ($body['shipCity'] ?? $body['city'] ?? ''));
    $street = trim((string) ($body['shipStreet'] ?? $body['street'] ?? ''));
    $streetNumber = trim((string) ($body['shipStreetNumber'] ?? $body['streetNumber'] ?? ''));
    $addressExtra = trim((string) ($body['shipAddressExtra'] ?? $body['addressExtra'] ?? ''));
    $postalCode = trim((string) ($body['shipPostalCode'] ?? $body['postalCode'] ?? ''));
    $dpdSiteId = (int) ($body['dpdSiteId'] ?? 0);
    $billingType = trim((string) ($body['billingType'] ?? 'person'));
    if ($billingType !== 'company') {
        $billingType = 'person';
    }
    $companyName = trim((string) ($body['companyName'] ?? ''));
    $companyCuiRaw = trim((string) ($body['companyCui'] ?? ''));
    $companyRegCom = trim((string) ($body['companyRegCom'] ?? ''));
    $companyCui = '';

    if ($customerName === '' || $customerPhone === '') {
        throw new RuntimeException('Numele și telefonul sunt obligatorii.');
    }
    if (!shoptop_validate_ro_phone($customerPhone)) {
        throw new RuntimeException('Telefonul trebuie să aibă exact 10 cifre și să înceapă cu 0.');
    }
    if ($city === '' || $street === '' || $streetNumber === '') {
        throw new RuntimeException('Localitatea, strada și numărul sunt obligatorii.');
    }
    if ($county === '' && $countyName === '') {
        throw new RuntimeException('Județul este obligatoriu.');
    }
    // dpdSiteId e opțional: conturile fără acces location/site folosesc siteName la AWB.
    if ($billingType === 'company') {
        if ($companyName === '') {
            throw new RuntimeException('Denumirea firmei este obligatorie pentru facturare pe firmă.');
        }
        if ($companyCuiRaw === '' || !shoptop_validate_ro_cui($companyCuiRaw)) {
            throw new RuntimeException('CUI-ul firmei este invalid.');
        }
        $companyCui = shoptop_normalize_ro_cui($companyCuiRaw);
    }

    $streetLine = trim(
        ($street !== '' ? 'Str. ' . $street : '')
        . ($streetNumber !== '' ? ' nr. ' . $streetNumber : '')
    );
    $line1 = trim($streetLine . ($addressExtra !== '' ? ', ' . $addressExtra : ''), " ,");
    $line2 = trim(
        $city
        . ($countyName !== '' ? ', jud. ' . $countyName : ($county !== '' ? ', jud. ' . $county : '')),
        " ,"
    );
    $line3 = $postalCode !== '' ? 'Cod postal: ' . $postalCode : '';
    $customerAddress = trim(implode("\n", array_filter([$line1, $line2, $line3], static function ($v) {
        return $v !== '';
    })));

    $stmt = $pdo->prepare('SELECT id FROM orders WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $orderId]);
    if (!$stmt->fetch()) {
        throw new RuntimeException('Comanda nu a fost gasita.');
    }

    $hasShip = shoptop_column_exists($pdo, 'orders', 'ship_city');
    $hasDpdSite = shoptop_column_exists($pdo, 'orders', 'dpd_site_id');
    $hasBilling = shoptop_column_exists($pdo, 'orders', 'billing_type');

    $sets = [
        'customer_name = :customer_name',
        'customer_phone = :customer_phone',
        'customer_email = :customer_email',
        'customer_address = :customer_address',
        'customer_notes = :customer_notes',
    ];
    $params = [
        'id' => $orderId,
        'customer_name' => $customerName,
        'customer_phone' => $customerPhone,
        'customer_email' => $customerEmail !== '' ? $customerEmail : null,
        'customer_address' => $customerAddress,
        'customer_notes' => $customerNotes !== '' ? $customerNotes : null,
    ];

    if ($hasShip) {
        $sets[] = 'ship_county = :ship_county';
        $sets[] = 'ship_county_name = :ship_county_name';
        $sets[] = 'ship_city = :ship_city';
        $sets[] = 'ship_street = :ship_street';
        $sets[] = 'ship_street_number = :ship_street_number';
        $sets[] = 'ship_address_extra = :ship_address_extra';
        $sets[] = 'ship_postal_code = :ship_postal_code';
        $params['ship_county'] = $county !== '' ? $county : null;
        $params['ship_county_name'] = $countyName !== '' ? $countyName : null;
        $params['ship_city'] = $city;
        $params['ship_street'] = $street;
        $params['ship_street_number'] = $streetNumber;
        $params['ship_address_extra'] = $addressExtra !== '' ? $addressExtra : null;
        $params['ship_postal_code'] = $postalCode !== '' ? $postalCode : null;
    }
    if ($hasDpdSite) {
        $sets[] = 'dpd_site_id = :dpd_site_id';
        $params['dpd_site_id'] = $dpdSiteId;
    }
    if ($hasBilling) {
        $sets[] = 'billing_type = :billing_type';
        $sets[] = 'company_name = :company_name';
        $sets[] = 'company_cui = :company_cui';
        $sets[] = 'company_reg_com = :company_reg_com';
        $params['billing_type'] = $billingType;
        $params['company_name'] = $billingType === 'company' ? $companyName : null;
        $params['company_cui'] = $billingType === 'company' ? $companyCui : null;
        $params['company_reg_com'] = $billingType === 'company' && $companyRegCom !== ''
            ? $companyRegCom
            : null;
    }

    $update = $pdo->prepare(
        'UPDATE orders SET ' . implode(', ', $sets) . ' WHERE id = :id'
    );
    $update->execute($params);

    $order = shoptop_fetch_order($pdo, $orderId);
    if ($order === null) {
        throw new RuntimeException('Comanda nu a putut fi citita dupa actualizare.');
    }
    return $order;
}

/**
 * Înlocuiește produsele din comandă (admin). Ajustează stocul dacă a fost deja scăzut.
 *
 * @param list<array<string,mixed>> $itemsInput
 * @return array<string,mixed>
 */
function shoptop_update_order_items(PDO $pdo, string $orderId, array $itemsInput): array
{
    if ($itemsInput === []) {
        throw new RuntimeException('Adauga cel putin un produs.');
    }

    $normalized = [];
    foreach ($itemsInput as $item) {
        if (!is_array($item)) {
            throw new RuntimeException('Fiecare produs trebuie sa fie un obiect.');
        }
        $productId = trim((string) ($item['productId'] ?? $item['product_id'] ?? ''));
        $quantity = is_numeric($item['quantity'] ?? null)
            ? (int) floor((float) $item['quantity'])
            : 0;
        if ($productId === '' || $quantity <= 0) {
            throw new RuntimeException('Produsul si cantitatea trebuie sa fie valide.');
        }
        $unitPriceOverride = null;
        if (isset($item['unitPrice']) && is_numeric($item['unitPrice'])) {
            $unitPriceOverride = round((float) $item['unitPrice'], 2);
            if ($unitPriceOverride < 0) {
                throw new RuntimeException('Pretul unitar nu poate fi negativ.');
            }
        }
        $normalized[] = [
            'product_id' => $productId,
            'quantity' => $quantity,
            'unit_price_override' => $unitPriceOverride,
        ];
    }

    // Agregă duplicate pe același product_id.
    $merged = [];
    foreach ($normalized as $row) {
        $id = $row['product_id'];
        if (!isset($merged[$id])) {
            $merged[$id] = $row;
            continue;
        }
        $merged[$id]['quantity'] += $row['quantity'];
        if ($row['unit_price_override'] !== null) {
            $merged[$id]['unit_price_override'] = $row['unit_price_override'];
        }
    }
    $normalized = array_values($merged);

    $pdo->beginTransaction();

    try {
        $stmt = $pdo->prepare(
            'SELECT id, status, stock_applied, invoice_series, invoice_number
             FROM orders
             WHERE id = :id
             LIMIT 1
             FOR UPDATE'
        );
        $stmt->execute(['id' => $orderId]);
        $order = $stmt->fetch();
        if (!$order) {
            $pdo->rollBack();
            throw new RuntimeException('Comanda nu a fost gasita.');
        }

        $status = (string) ($order['status'] ?? 'new');
        if (in_array($status, ['cancelled', 'returned'], true)) {
            $pdo->rollBack();
            throw new RuntimeException('Nu poti edita produsele unei comenzi anulate sau returnate.');
        }

        $invoiceSeries = trim((string) ($order['invoice_series'] ?? ''));
        $invoiceNumber = trim((string) ($order['invoice_number'] ?? ''));
        if ($invoiceSeries !== '' || $invoiceNumber !== '') {
            $pdo->rollBack();
            throw new RuntimeException('Comanda are factura emisa — nu poti modifica produsele.');
        }

        $stockApplied = (int) ($order['stock_applied'] ?? 0) === 1;
        if ($stockApplied) {
            shoptop_order_restore_stock($pdo, $orderId);
        }

        $deleteItems = $pdo->prepare('DELETE FROM order_items WHERE order_id = :order_id');
        $deleteItems->execute(['order_id' => $orderId]);

        $hasBundleOffers = shoptop_column_exists($pdo, 'products', 'bundle_offers');
        $productFields = 'id, name, sku, sale_price, stock_qty'
            . ($hasBundleOffers ? ', bundle_offers' : '');
        $productStmt = $pdo->prepare(
            'SELECT ' . $productFields . '
             FROM products
             WHERE id = :id
             FOR UPDATE'
        );

        $preparedItems = [];
        $itemsSubtotal = 0.0;

        foreach ($normalized as $item) {
            $productStmt->execute(['id' => $item['product_id']]);
            $product = $productStmt->fetch();
            if (!$product) {
                $pdo->rollBack();
                throw new RuntimeException('Produsul ' . $item['product_id'] . ' nu mai exista.');
            }

            $isVirtual = shoptop_is_virtual_product_id((string) $product['id']);
            $salePrice = (float) $product['sale_price'];
            $stockQty = (int) $product['stock_qty'];

            if (!$isVirtual && $salePrice <= 0) {
                $pdo->rollBack();
                throw new RuntimeException(
                    'Pret indisponibil pentru ' . (string) $product['name'] . '.'
                );
            }
            if (!$isVirtual && $stockQty < $item['quantity']) {
                $pdo->rollBack();
                throw new RuntimeException(
                    'Stoc insuficient pentru ' . (string) $product['name'] . '.'
                );
            }

            $unitPrice = $salePrice;
            $lineTotal = round($salePrice * $item['quantity'], 2);
            if ($item['unit_price_override'] !== null) {
                $unitPrice = $item['unit_price_override'];
                $lineTotal = round($unitPrice * $item['quantity'], 2);
            } else {
                $bundlePricing = shoptop_bundle_pricing($product, $item['quantity'], $salePrice);
                if ($bundlePricing !== null) {
                    [$unitPrice, $lineTotal] = $bundlePricing;
                }
            }

            $itemsSubtotal += $lineTotal;
            $preparedItems[] = [
                'product_id' => (string) $product['id'],
                'product_name' => (string) $product['name'],
                'product_sku' => !empty($product['sku']) ? (string) $product['sku'] : null,
                'unit_price' => $unitPrice,
                'quantity' => $item['quantity'],
                'line_total' => $lineTotal,
            ];
        }

        $totalAmount = round($itemsSubtotal + shoptop_shipping_cost_for_subtotal($itemsSubtotal), 2);

        $itemStmt = $pdo->prepare(
            'INSERT INTO order_items (
                order_id, product_id, product_name, product_sku,
                unit_price, quantity, line_total
            ) VALUES (
                :order_id, :product_id, :product_name, :product_sku,
                :unit_price, :quantity, :line_total
            )'
        );
        foreach ($preparedItems as $row) {
            $itemStmt->execute([
                'order_id' => $orderId,
                'product_id' => $row['product_id'],
                'product_name' => $row['product_name'],
                'product_sku' => $row['product_sku'],
                'unit_price' => $row['unit_price'],
                'quantity' => $row['quantity'],
                'line_total' => $row['line_total'],
            ]);
        }

        $updateOrder = $pdo->prepare(
            'UPDATE orders SET total_amount = :total_amount WHERE id = :id'
        );
        $updateOrder->execute([
            'total_amount' => $totalAmount,
            'id' => $orderId,
        ]);

        if ($stockApplied) {
            shoptop_order_apply_stock($pdo, $orderId);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    $order = shoptop_fetch_order($pdo, $orderId);
    if ($order === null) {
        throw new RuntimeException('Comanda nu a putut fi citita dupa actualizare.');
    }
    return $order;
}

/**
 * Șterge comanda. Dacă stocul a fost scăzut (stock_applied), îl returnează întâi.
 */
function shoptop_delete_order(PDO $pdo, string $orderId): void
{
    $pdo->beginTransaction();

    try {
        $stmt = $pdo->prepare(
            'SELECT id, stock_applied
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

        if ((int) ($order['stock_applied'] ?? 0) === 1) {
            shoptop_order_restore_stock($pdo, $orderId);
        }

        // order_items are ON DELETE CASCADE; return_requests keep order_id as plain reference.
        $deleteStmt = $pdo->prepare('DELETE FROM orders WHERE id = :id');
        $deleteStmt->execute(['id' => $orderId]);

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function shoptop_order_attach_access_token(PDO $pdo, array $order): array
{
    if (!empty($order['accessToken'])) {
        return $order;
    }
    $id = trim((string) ($order['id'] ?? ''));
    if ($id === '') {
        return $order;
    }
    $stmt = $pdo->prepare('SELECT access_token FROM orders WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    if ($row && !empty($row['access_token'])) {
        $order['accessToken'] = (string) $row['access_token'];
    }
    return $order;
}

function shoptop_order_status_rank(string $status): int
{
    return match ($status) {
        'confirmed' => 1,
        'processing' => 2,
        'shipped' => 3,
        'delivered' => 4,
        'returned' => 4,
        'cancelled' => -1,
        default => 0,
    };
}

/**
 * La livrare: rambursul e încasat de curier → payment_status = paid.
 * Cardul rămâne neschimbat (deja paid din Netopia).
 *
 * @return bool true dacă s-a actualizat plata
 */
function shoptop_mark_cod_paid_on_delivery(PDO $pdo, string $orderId): bool
{
    $stmt = $pdo->prepare(
        'SELECT id, payment_method, payment_status, awb_number
         FROM orders WHERE id = :id LIMIT 1'
    );
    $stmt->execute(['id' => $orderId]);
    $row = $stmt->fetch();
    if (!$row) {
        return false;
    }

    $method = (string) ($row['payment_method'] ?? 'cod');
    $status = (string) ($row['payment_status'] ?? 'pending');
    if ($method !== 'cod' || $status === 'paid') {
        return false;
    }

    $awb = trim((string) ($row['awb_number'] ?? ''));
    $ref = $awb !== '' ? ('courier-cod:' . $awb) : 'courier-cod';

    $upd = $pdo->prepare(
        "UPDATE orders
         SET payment_status = 'paid', payment_ref = :ref
         WHERE id = :id AND payment_method = 'cod' AND payment_status <> 'paid'"
    );
    $upd->execute(['ref' => $ref, 'id' => $orderId]);

    return $upd->rowCount() > 0;
}

/**
 * Anulează plata ramburs marcată automat la „livrare” curier (sync greșit / nedlivrat încă).
 * Nu atinge plățile card / marcate manual altfel.
 */
function shoptop_unmark_cod_paid_on_undeliver(PDO $pdo, string $orderId): bool
{
    $stmt = $pdo->prepare(
        'SELECT id, payment_method, payment_status, payment_ref
         FROM orders WHERE id = :id LIMIT 1'
    );
    $stmt->execute(['id' => $orderId]);
    $row = $stmt->fetch();
    if (!$row) {
        return false;
    }
    if ((string) ($row['payment_method'] ?? '') !== 'cod') {
        return false;
    }
    if ((string) ($row['payment_status'] ?? '') !== 'paid') {
        return false;
    }

    $ref = strtolower(trim((string) ($row['payment_ref'] ?? '')));
    $autoCourier = $ref === ''
        || str_starts_with($ref, 'courier-cod')
        || str_starts_with($ref, 'dpd-cod')
        || str_starts_with($ref, 'fan-cod');
    if (!$autoCourier) {
        return false;
    }

    $upd = $pdo->prepare(
        "UPDATE orders
         SET payment_status = 'pending', payment_ref = NULL
         WHERE id = :id
           AND payment_method = 'cod'
           AND payment_status = 'paid'"
    );
    $upd->execute(['id' => $orderId]);

    return $upd->rowCount() > 0;
}

/**
 * Marchează manual plata ca finalizată (admin).
 * Pentru comenzi livrate cu card eșuat / plată recuperată ulterior.
 *
 * @return array<string,mixed>
 */
function shoptop_mark_payment_paid(PDO $pdo, string $orderId): array
{
    $stmt = $pdo->prepare(
        'SELECT id, status, payment_status, payment_ref
         FROM orders WHERE id = :id LIMIT 1'
    );
    $stmt->execute(['id' => $orderId]);
    $row = $stmt->fetch();
    if (!$row) {
        throw new RuntimeException('Comanda nu a fost găsită.');
    }

    $status = shoptop_order_status_label((string) ($row['status'] ?? 'new'));
    if (in_array($status, ['cancelled', 'returned'], true)) {
        throw new RuntimeException(
            'Nu poți marca plata pe o comandă anulată sau returnată.'
        );
    }

    if ((string) ($row['payment_status'] ?? '') === 'paid') {
        $already = shoptop_fetch_order($pdo, $orderId);
        if ($already === null) {
            throw new RuntimeException('Comanda nu a putut fi citită.');
        }
        return $already;
    }

    $ref = trim((string) ($row['payment_ref'] ?? ''));
    if ($ref === '') {
        $ref = 'admin-manual';
    }

    $upd = $pdo->prepare(
        "UPDATE orders
         SET payment_status = 'paid', payment_ref = :ref
         WHERE id = :id AND payment_status <> 'paid'"
    );
    $upd->execute(['ref' => $ref, 'id' => $orderId]);

    $fresh = shoptop_fetch_order($pdo, $orderId);
    if ($fresh === null) {
        throw new RuntimeException('Comanda nu a putut fi citită după actualizare.');
    }
    return $fresh;
}

/**
 * Sincronizează statusul comenzii din tracking DPD.
 *
 * Flux: new → processing (AWB) → shipped (ridicat/în tranzit) → delivered | returned.
 * La delivered: ramburs → paid + factură SmartBill.
 *
 * @param array{
 *   events:list<array{code:int,description:string,dateTime:string,place:?string}>,
 *   lastCode:?int,
 *   lastDescription:?string,
 *   outForDelivery:bool,
 *   delivered:bool,
 *   inTransit?:bool,
 *   returned?:bool,
 *   returnedToSender?:bool
 * } $track
 */
function shoptop_sync_order_from_dpd_track(PDO $pdo, string $orderId, array $track): void
{
    $hasReturnReceived = shoptop_column_exists($pdo, 'orders', 'return_received');
    $cols = 'id, status, awb_number';
    if ($hasReturnReceived) {
        $cols .= ', return_received';
    }
    $stmt = $pdo->prepare(
        'SELECT ' . $cols . ' FROM orders WHERE id = :id LIMIT 1'
    );
    $stmt->execute(['id' => $orderId]);
    $row = $stmt->fetch();
    if (!$row) {
        return;
    }

    $current = shoptop_order_status_label((string) ($row['status'] ?? 'new'));
    if ($current === 'cancelled') {
        return;
    }
    $returnReceived = $hasReturnReceived && !empty($row['return_received']);
    if ($current === 'returned' && $returnReceived) {
        return;
    }

    $courierLabel = trim((string) ($track['lastDescription'] ?? ''));
    if ($courierLabel === '' && !empty($track['returnedToSender'])) {
        $courierLabel = 'Returnat la expeditor';
    } elseif ($courierLabel === '' && !empty($track['returned'])) {
        $courierLabel = 'Refuzat / în returnare';
    } elseif ($courierLabel === '' && !empty($track['delivered'])) {
        $courierLabel = 'Livrat';
    } elseif ($courierLabel === '' && !empty($track['outForDelivery'])) {
        $courierLabel = 'În curs de livrare';
    } elseif ($courierLabel === '' && !empty($track['inTransit'])) {
        $courierLabel = 'În tranzit';
    } elseif ($courierLabel === '' && !empty($row['awb_number'])) {
        $courierLabel = 'AWB emis';
    }

    if (
        $courierLabel !== ''
        && shoptop_column_exists($pdo, 'orders', 'courier_status')
    ) {
        $upd = $pdo->prepare(
            'UPDATE orders
             SET courier_status = :cs, courier_status_at = NOW()
             WHERE id = :id'
        );
        $upd->execute([
            'cs' => mb_substr($courierLabel, 0, 64),
            'id' => $orderId,
        ]);
    }

    // Colet reîntors la expeditor (cod 124) — marchează „returnat la mine”.
    if (
        !empty($track['returnedToSender'])
        && shoptop_column_exists($pdo, 'orders', 'return_received')
    ) {
        $flag = $pdo->prepare(
            'UPDATE orders SET return_received = 1 WHERE id = :id AND return_received = 0'
        );
        $flag->execute(['id' => $orderId]);
    }

    // Refuz temporar urmat de re-livrare: DPD poate trece 123 → 12 → -14.
    // Nu anulăm un retur după livrare: AWB-ul rămâne „livrat”, dar coletul e înapoi.
    $trackDelivered = !empty($track['delivered'])
        && empty($track['returned'])
        && empty($track['returnedToSender']);
    $returnedRevoked = !$returnReceived
        && $current === 'returned'
        && empty($track['returned'])
        && empty($track['returnedToSender'])
        && (
            $trackDelivered
            || !empty($track['inTransit'])
            || !empty($track['outForDelivery'])
        );

    // Returnată rămâne finală — except când tracking-ul arată re-livrare / livrare reușită.
    if ($current === 'returned' && !$returnedRevoked) {
        return;
    }

    $target = null;
    if (!empty($track['returned']) || !empty($track['returnedToSender'])) {
        $target = 'returned';
    } elseif (!empty($track['delivered'])) {
        $target = 'delivered';
    } elseif (
        !empty($track['inTransit'])
        || !empty($track['outForDelivery'])
    ) {
        $target = 'shipped';
    }

    $becameDelivered = false;
    $demotedFromDelivered = false;
    if ($target !== null && $target !== $current) {
        // Returnarea poate veni din shipped (sau rareori delivered) — nu doar pe rank crescător.
        // Demotare livrată → expediată: sync a greșit (ex. Fan „Expediție ridicată”).
        $allow = true;
        $demoteDeliveredToShipped = $current === 'delivered'
            && $target === 'shipped'
            && !$trackDelivered;
        if ($demoteDeliveredToShipped) {
            $allow = true;
        } elseif ($target === 'returned') {
            if (!in_array($current, ['processing', 'shipped', 'delivered'], true)) {
                $allow = false;
            }
        } elseif (
            shoptop_order_status_rank($target) <= shoptop_order_status_rank($current)
            && !($current === 'returned' && in_array($target, ['delivered', 'shipped'], true))
        ) {
            $allow = false;
        }

        if ($allow) {
            $wasDelivered = $current === 'delivered';
            shoptop_update_order_status($pdo, $orderId, $target);
            $becameDelivered = $target === 'delivered' && !$wasDelivered;
            $demotedFromDelivered = $wasDelivered && $target === 'shipped';
        }
    }

    // Livrat (acum sau deja): ramburs încasat de curier + factură.
    // Re-sync pe comenzi deja „livrate” marchează plata / emite factura dacă lipseau.
    if ($becameDelivered || ($trackDelivered && in_array($current, ['delivered', 'shipped', 'processing', 'returned'], true))) {
        shoptop_mark_cod_paid_on_delivery($pdo, $orderId);
        shoptop_smartbill_on_courier_delivered($pdo, $orderId);
    }

    // Sync arată că NU e livrată: coboară din livrată → expediată + anulează ramburs/factură auto.
    if ($demotedFromDelivered) {
        shoptop_unmark_cod_paid_on_undeliver($pdo, $orderId);
        try {
            shoptop_smartbill_reverse_false_delivery($pdo, $orderId);
        } catch (Throwable $e) {
            error_log('SmartBill reverse false delivery ' . $orderId . ': ' . $e->getMessage());
        }
    }
}

/**
 * Marchează manual coletul ca reîntors la expeditor (la magazin).
 *
 * @return array<string,mixed>
 */
function shoptop_mark_order_return_received(PDO $pdo, string $orderId): array
{
    $order = shoptop_fetch_order($pdo, $orderId);
    if (!$order) {
        throw new RuntimeException('Comanda nu a fost găsită.');
    }
    $status = shoptop_order_status_label((string) ($order['status'] ?? 'new'));
    if ($status !== 'returned') {
        throw new RuntimeException('Doar comenzile refuzate/returnate pot fi marcate ca reîntorse.');
    }
    if (!shoptop_column_exists($pdo, 'orders', 'return_received')) {
        throw new RuntimeException(
            'Lipsește coloana return_received. Rulează migrarea sql/migrate-return-received.sql.'
        );
    }
    if (shoptop_column_exists($pdo, 'orders', 'courier_status')) {
        $pdo->prepare(
            'UPDATE orders
             SET return_received = 1,
                 courier_status = COALESCE(NULLIF(courier_status, \'\'), \'Returnat la expeditor\'),
                 courier_status_at = NOW()
             WHERE id = :id'
        )->execute(['id' => $orderId]);
    } else {
        $pdo->prepare('UPDATE orders SET return_received = 1 WHERE id = :id')
            ->execute(['id' => $orderId]);
    }
    $fresh = shoptop_fetch_order($pdo, $orderId);
    if (!$fresh) {
        throw new RuntimeException('Comanda nu a fost găsită după actualizare.');
    }
    return $fresh;
}

/**
 * Tracking DPD pentru o comandă (necesită AWB / parcel id).
 *
 * @return array{
 *   awb:?string,
 *   parcelId:?string,
 *   publicUrl:?string,
 *   events:list<array{code:int,description:string,dateTime:string,place:?string}>,
 *   lastStatus:?string,
 *   outForDelivery:bool,
 *   delivered:bool,
 *   error:?string
 * }
 */
function shoptop_order_fetch_tracking(PDO $pdo, string $orderId): array
{
    $empty = [
        'awb' => null,
        'parcelId' => null,
        'publicUrl' => null,
        'events' => [],
        'lastStatus' => null,
        'outForDelivery' => false,
        'delivered' => false,
        'inTransit' => false,
        'returned' => false,
        'returnedToSender' => false,
        'error' => null,
    ];

    $hasParcel = shoptop_column_exists($pdo, 'orders', 'dpd_parcel_id');
    $hasCourier = shoptop_column_exists($pdo, 'orders', 'courier_status');
    $hasCarrier = shoptop_column_exists($pdo, 'orders', 'delivery_carrier');
    $cols = ['awb_number', 'customer_notes'];
    if ($hasParcel) {
        $cols[] = 'dpd_parcel_id';
    }
    if ($hasCourier) {
        $cols[] = 'courier_status';
    }
    if ($hasCarrier) {
        $cols[] = 'delivery_carrier';
    }
    $stmt = $pdo->prepare(
        'SELECT ' . implode(', ', $cols) . ' FROM orders WHERE id = :id LIMIT 1'
    );
    $stmt->execute(['id' => $orderId]);
    $row = $stmt->fetch();
    if (!$row) {
        $empty['error'] = 'Comanda nu a fost găsită.';
        return $empty;
    }

    $awb = trim((string) ($row['awb_number'] ?? ''));
    $carrier = shoptop_order_delivery_carrier($row) ?? 'dpd';
    $parcelId = $hasParcel ? trim((string) ($row['dpd_parcel_id'] ?? '')) : '';
    if ($parcelId === '' || $carrier === 'fan-courier') {
        $parcelId = $awb;
    }

    $empty['awb'] = $awb !== '' ? $awb : null;
    $empty['parcelId'] = $parcelId !== '' ? $parcelId : null;
    if ($awb !== '') {
        $empty['publicUrl'] = $carrier === 'fan-courier'
            ? shoptop_fan_public_tracking_url($awb)
            : shoptop_dpd_public_tracking_url($awb);
    }
    if (!empty($row['courier_status'])) {
        $empty['lastStatus'] = (string) $row['courier_status'];
    }

    if ($parcelId === '') {
        $empty['error'] = 'Comanda nu are încă AWB de urmărit.';
        return $empty;
    }

    if ($carrier === 'fan-courier') {
        if (!shoptop_fan_enabled()) {
            $empty['error'] = 'Tracking Fan indisponibil momentan.';
            return $empty;
        }
        try {
            $track = shoptop_fan_track_awb($parcelId);
            shoptop_sync_order_from_fan_track($pdo, $orderId, $track);
            return [
                'awb' => $awb !== '' ? $awb : $parcelId,
                'parcelId' => $track['parcelId'],
                'publicUrl' => shoptop_fan_public_tracking_url($awb !== '' ? $awb : $parcelId),
                'events' => $track['events'],
                'lastStatus' => $track['lastDescription'],
                'outForDelivery' => $track['outForDelivery'],
                'delivered' => $track['delivered'],
                'inTransit' => !empty($track['inTransit']),
                'returned' => !empty($track['returned']),
                'returnedToSender' => !empty($track['returnedToSender']),
                'error' => null,
            ];
        } catch (Throwable $e) {
            $empty['error'] = $e->getMessage();
            return $empty;
        }
    }

    if (!shoptop_dpd_enabled()) {
        $empty['error'] = 'Tracking curier indisponibil momentan.';
        return $empty;
    }

    try {
        $track = shoptop_dpd_track_parcel($parcelId);
        shoptop_sync_order_from_dpd_track($pdo, $orderId, $track);
        return [
            'awb' => $awb !== '' ? $awb : $parcelId,
            'parcelId' => $track['parcelId'],
            'publicUrl' => shoptop_dpd_public_tracking_url($awb !== '' ? $awb : $parcelId),
            'events' => $track['events'],
            'lastStatus' => $track['lastDescription'],
            'outForDelivery' => $track['outForDelivery'],
            'delivered' => $track['delivered'],
            'inTransit' => !empty($track['inTransit']),
            'returned' => !empty($track['returned']),
            'returnedToSender' => !empty($track['returnedToSender']),
            'error' => null,
        ];
    } catch (Throwable $e) {
        $empty['error'] = $e->getMessage();
        return $empty;
    }
}

/**
 * Sync DPD pentru o comandă. Returnează comanda + tracking.
 *
 * @return array{order:array<string,mixed>, tracking:array<string,mixed>, statusChanged:bool}
 */
function shoptop_sync_order_dpd_status(PDO $pdo, string $orderId): array
{
    $before = shoptop_fetch_order($pdo, $orderId);
    if ($before === null) {
        throw new RuntimeException('Comanda nu a fost gasita.');
    }
    $beforeStatus = (string) ($before['status'] ?? '');
    $tracking = shoptop_order_fetch_tracking($pdo, $orderId);
    if (!empty($tracking['error']) && ($tracking['events'] ?? []) === []) {
        // Eroare hard (fără AWB / DPD down) — tot returnăm comanda curentă.
        $after = shoptop_fetch_order($pdo, $orderId) ?? $before;
        return [
            'order' => $after,
            'tracking' => $tracking,
            'statusChanged' => false,
            'error' => (string) $tracking['error'],
        ];
    }
    $after = shoptop_fetch_order($pdo, $orderId) ?? $before;
    $afterStatus = (string) ($after['status'] ?? '');
    return [
        'order' => $after,
        'tracking' => $tracking,
        'statusChanged' => $beforeStatus !== $afterStatus,
        'error' => null,
    ];
}

/**
 * Sync curier bulk (DPD + Fan pe baza delivery_carrier).
 *
 * @param list<string>|null $orderIds
 * @return array{updated:list<array<string,mixed>>, unchanged:int, errors:list<array{orderId:string,error:string}>}
 */
function shoptop_bulk_sync_dpd_status(PDO $pdo, ?array $orderIds): array
{
    @set_time_limit(180);

    $ids = [];
    if (is_array($orderIds) && $orderIds !== []) {
        foreach ($orderIds as $id) {
            $trimmed = trim((string) $id);
            if ($trimmed !== '') {
                $ids[] = $trimmed;
            }
        }
        $ids = array_values(array_unique($ids));
        if (count($ids) > 100) {
            $ids = array_slice($ids, 0, 100);
        }
    }

    if ($ids === []) {
        return [
            'orders' => [],
            'updated' => [],
            'statusChanged' => 0,
            'unchanged' => 0,
            'errors' => [
                [
                    'orderId' => '-',
                    'error' => 'Selectează cel puțin o comandă pentru sync curier.',
                ],
            ],
            'synced' => 0,
        ];
    }

    $hasParcel = shoptop_column_exists($pdo, 'orders', 'dpd_parcel_id');
    $hasCarrier = shoptop_column_exists($pdo, 'orders', 'delivery_carrier');
    $cols = ['id', 'status', 'payment_method', 'payment_status', 'awb_number', 'customer_notes'];
    if ($hasParcel) {
        $cols[] = 'dpd_parcel_id';
    }
    if ($hasCarrier) {
        $cols[] = 'delivery_carrier';
    }

    /** @var list<array{orderId:string,parcelId:string,carrier:string,beforeStatus:string,beforePayment:string}> $jobs */
    $jobs = [];
    $errors = [];

    foreach ($ids as $id) {
        $stmt = $pdo->prepare(
            'SELECT ' . implode(', ', $cols) . ' FROM orders WHERE id = :id LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        if (!$row) {
            $errors[] = ['orderId' => $id, 'error' => 'Comanda nu a fost găsită.'];
            continue;
        }
        $awb = trim((string) ($row['awb_number'] ?? ''));
        $carrier = shoptop_order_delivery_carrier($row) ?? 'dpd';
        $parcelId = $hasParcel ? trim((string) ($row['dpd_parcel_id'] ?? '')) : '';
        if ($parcelId === '' || $carrier === 'fan-courier') {
            $parcelId = $awb;
        }
        if ($parcelId === '') {
            $errors[] = ['orderId' => $id, 'error' => 'Comanda nu are încă AWB de urmărit.'];
            continue;
        }
        $jobs[] = [
            'orderId' => $id,
            'parcelId' => $parcelId,
            'carrier' => $carrier,
            'beforeStatus' => (string) ($row['status'] ?? ''),
            'beforePayment' => (string) ($row['payment_status'] ?? ''),
        ];
    }

    $dpdParcelIds = [];
    $fanAwbs = [];
    foreach ($jobs as $job) {
        if ($job['carrier'] === 'fan-courier') {
            $fanAwbs[] = $job['parcelId'];
        } else {
            $dpdParcelIds[] = $job['parcelId'];
        }
    }
    $dpdParcelIds = array_values(array_unique($dpdParcelIds));
    $fanAwbs = array_values(array_unique($fanAwbs));

    $dpdTrackMap = [];
    if ($dpdParcelIds !== []) {
        if (!shoptop_dpd_enabled()) {
            foreach ($jobs as $job) {
                if ($job['carrier'] === 'dpd') {
                    $errors[] = [
                        'orderId' => $job['orderId'],
                        'error' => 'Tracking DPD indisponibil momentan.',
                    ];
                }
            }
        } else {
            $dpdTrackMap = shoptop_dpd_track_parcels($dpdParcelIds);
        }
    }

    $fanTrackMap = [];
    if ($fanAwbs !== []) {
        if (!shoptop_fan_enabled()) {
            foreach ($jobs as $job) {
                if ($job['carrier'] === 'fan-courier') {
                    $errors[] = [
                        'orderId' => $job['orderId'],
                        'error' => 'Tracking Fan indisponibil momentan.',
                    ];
                }
            }
        } else {
            $fanTrackMap = shoptop_fan_track_awbs($fanAwbs);
        }
    }

    $updated = [];
    $unchanged = 0;

    foreach ($jobs as $job) {
        $orderId = $job['orderId'];
        $parcelId = $job['parcelId'];
        $tracked = $job['carrier'] === 'fan-courier'
            ? ($fanTrackMap[$parcelId] ?? null)
            : ($dpdTrackMap[$parcelId] ?? null);

        if (!is_array($tracked)) {
            // Deja raportat ca eroare de config, sau lipsă răspuns.
            $already = false;
            foreach ($errors as $err) {
                if (($err['orderId'] ?? '') === $orderId) {
                    $already = true;
                    break;
                }
            }
            if (!$already) {
                $errors[] = [
                    'orderId' => $orderId,
                    'error' => 'Curierul nu a returnat tracking pentru acest colet.',
                ];
            }
            continue;
        }
        if (isset($tracked['error'])) {
            $errors[] = [
                'orderId' => $orderId,
                'error' => (string) $tracked['error'],
            ];
            continue;
        }

        try {
            if ($job['carrier'] === 'fan-courier') {
                shoptop_sync_order_from_fan_track($pdo, $orderId, $tracked);
            } else {
                shoptop_sync_order_from_dpd_track($pdo, $orderId, $tracked);
            }
            $after = shoptop_fetch_order($pdo, $orderId);
            if ($after === null) {
                $errors[] = ['orderId' => $orderId, 'error' => 'Comanda nu a fost găsită după sync.'];
                continue;
            }
            $afterStatus = (string) ($after['status'] ?? '');
            $afterPayment = (string) ($after['paymentStatus'] ?? '');
            $changed =
                $afterStatus !== $job['beforeStatus']
                || $afterPayment !== $job['beforePayment'];
            $updated[] = $after;
            if (!$changed) {
                $unchanged++;
            }
        } catch (Throwable $e) {
            $errors[] = [
                'orderId' => $orderId,
                'error' => $e->getMessage(),
            ];
        }
    }

    $statusChangedCount = count($updated) - $unchanged;

    return [
        'orders' => $updated,
        'updated' => $updated,
        'statusChanged' => max(0, $statusChangedCount),
        'unchanged' => $unchanged,
        'errors' => $errors,
        'synced' => count($updated),
    ];
}

$isDirectRequest = realpath((string) ($_SERVER['SCRIPT_FILENAME'] ?? '')) === realpath(__FILE__);
if (!$isDirectRequest) {
    return;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$pdo = shoptop_pdo();

if ($method === 'GET') {
    $orderId = $_GET['id'] ?? '';
    $accessToken = $_GET['token'] ?? '';
    $mine = $_GET['mine'] ?? '';
    $invoicePdf = $_GET['invoicePdf'] ?? '';
    $track = $_GET['track'] ?? '';
    $currentUser = shoptop_current_user();

    if (is_string($invoicePdf) && trim($invoicePdf) === '1') {
        shoptop_require_admin();
        $pdfOrderId = is_string($orderId) ? trim($orderId) : '';
        if ($pdfOrderId === '') {
            shoptop_json_error('Campul id este obligatoriu.', 400);
        }
        $order = shoptop_fetch_order($pdo, $pdfOrderId);
        if ($order === null) {
            shoptop_json_error('Comanda nu a fost gasita.', 404);
        }
        $series = trim((string) ($order['invoiceSeries'] ?? ''));
        $number = trim((string) ($order['invoiceNumber'] ?? ''));
        if ($series === '' || $number === '') {
            shoptop_json_error('Comanda nu are factura emisa.', 400);
        }
        try {
            $pdf = shoptop_smartbill_invoice_pdf($series, $number);
        } catch (Throwable $e) {
            shoptop_json_error($e->getMessage(), 502);
        }
        header('Content-Type: application/pdf');
        header(
            'Content-Disposition: attachment; filename="factura-'
            . preg_replace('/[^A-Za-z0-9\-]/', '', $series . '-' . $number)
            . '.pdf"'
        );
        header('Content-Length: ' . (string) strlen($pdf));
        echo $pdf;
        exit;
    }

    if (is_string($mine) && trim($mine) === '1') {
        if ($currentUser === null) {
            shoptop_json_error('Autentificare necesara.', 401);
        }

        $email = shoptop_normalize_email((string) ($currentUser['email'] ?? ''));
        $ordersStmt = $pdo->prepare(
            'SELECT ' . shoptop_orders_select_sql($pdo) . '
             FROM orders
             WHERE ('
                . 'user_id = :user_id
                OR (
                    customer_email IS NOT NULL
                    AND customer_email <> ""
                    AND LOWER(customer_email) = LOWER(:email)
                )
             ) AND ' . shoptop_sql_exclude_unpaid_card_drafts() . '
             ORDER BY created_at DESC
             LIMIT 100'
        );
        $ordersStmt->execute([
            'user_id' => $currentUser['id'],
            'email' => $email,
        ]);
        $orders = $ordersStmt->fetchAll();
        $orderIds = [];
        foreach ($orders as $order) {
            $orderIds[] = (string) $order['id'];
        }
        $itemsByOrder = shoptop_fetch_order_items_grouped($pdo, $orderIds);
        $response = [];
        foreach ($orders as $order) {
            $oid = (string) $order['id'];
            $response[] = shoptop_order_row_to_response($order, $itemsByOrder[$oid] ?? []);
        }
        shoptop_json_response($response);
    }

    if (is_string($orderId) && trim($orderId) !== '') {
        $stmt = $pdo->prepare(
            'SELECT ' . shoptop_orders_select_sql($pdo) . '
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

        $wantTrack = is_string($track) && trim($track) === '1';
        $tracking = null;
        if ($wantTrack) {
            $tracking = shoptop_order_fetch_tracking($pdo, (string) $orderRow['id']);
            // Reîncarcă comanda după sync status (livrată / expediată).
            $stmt->execute(['id' => trim($orderId)]);
            $refreshed = $stmt->fetch();
            if ($refreshed) {
                $orderRow = $refreshed;
            }
        }

        $itemsStmt = $pdo->prepare(
            'SELECT product_id, product_name, product_sku, unit_price, quantity, line_total
             FROM order_items
             WHERE order_id = :order_id
             ORDER BY id ASC'
        );
        $itemsStmt->execute(['order_id' => $orderRow['id']]);
        $payload = shoptop_order_row_to_response($orderRow, $itemsStmt->fetchAll(), false, true);
        if ($wantTrack) {
            $payload['tracking'] = $tracking;
        }
        shoptop_json_response($payload);
    }

    shoptop_require_admin();
    @set_time_limit(120);

    try {
        shoptop_purge_stale_unpaid_card_orders($pdo);

        $limitRaw = $_GET['limit'] ?? null;
        $offsetRaw = $_GET['offset'] ?? null;
        $limit = 500;
        $offset = 0;
        if (is_string($limitRaw) || is_int($limitRaw) || is_float($limitRaw)) {
            $parsed = (int) $limitRaw;
            if ($parsed > 0) {
                // Cap pe request (hosting LiteSpeed); frontend-ul pagina până la toate.
                $limit = min(1000, max(1, $parsed));
            }
        }
        if (is_string($offsetRaw) || is_int($offsetRaw) || is_float($offsetRaw)) {
            $parsedOffset = (int) $offsetRaw;
            if ($parsedOffset > 0) {
                $offset = $parsedOffset;
            }
        }

        $ordersStmt = $pdo->query(
            'SELECT ' . shoptop_orders_select_sql($pdo) . '
             FROM orders
             WHERE ' . shoptop_sql_exclude_unpaid_card_drafts() . '
             ORDER BY created_at DESC, id DESC
             LIMIT ' . (string) $limit . ' OFFSET ' . (string) $offset
        );
        $orders = $ordersStmt->fetchAll();
        $orderIds = [];
        foreach ($orders as $order) {
            $orderIds[] = (string) $order['id'];
        }
        $itemsByOrder = shoptop_fetch_order_items_grouped($pdo, $orderIds);
        $response = [];
        foreach ($orders as $order) {
            $oid = (string) $order['id'];
            $response[] = shoptop_order_row_to_response($order, $itemsByOrder[$oid] ?? []);
        }
        shoptop_json_response($response);
    } catch (Throwable $e) {
        error_log('orders.php GET list: ' . $e->getMessage());
        shoptop_json_error('Eroare la încărcarea comenzilor: ' . $e->getMessage(), 500);
    }
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
        $carrier = shoptop_normalize_delivery_carrier($body['carrier'] ?? null);
        try {
            shoptop_json_response(shoptop_issue_awb($pdo, $orderId, $carrier));
        } catch (Throwable $e) {
            shoptop_json_error($e->getMessage(), 502);
        }
    }

    if (is_string($action) && trim($action) === 'backfillCourierCosts') {
        shoptop_require_admin();
        $limit = (int) ($body['limit'] ?? 50);
        try {
            shoptop_json_response(shoptop_backfill_courier_costs($pdo, $limit));
        } catch (Throwable $e) {
            shoptop_json_error($e->getMessage(), 502);
        }
    }

    if (is_string($action) && trim($action) === 'bulkUpdateStatus') {
        shoptop_require_admin();
        $orderIds = shoptop_normalize_bulk_order_ids($body['orderIds'] ?? null);
        $status = trim((string) ($body['status'] ?? ''));
        if ($orderIds === []) {
            shoptop_json_error('Selectează cel puțin o comandă (max. 50).', 400);
        }
        if ($status === '') {
            shoptop_json_error('Campul status este obligatoriu.', 400);
        }
        shoptop_json_response(shoptop_bulk_update_order_status($pdo, $orderIds, $status));
    }

    if (is_string($action) && trim($action) === 'bulkIssueAwb') {
        shoptop_require_admin();
        $orderIds = shoptop_normalize_bulk_order_ids($body['orderIds'] ?? null);
        if ($orderIds === []) {
            shoptop_json_error('Selectează cel puțin o comandă (max. 50).', 400);
        }
        $carrier = shoptop_normalize_delivery_carrier($body['carrier'] ?? null);
        shoptop_json_response(shoptop_bulk_issue_awb($pdo, $orderIds, $carrier));
    }

    if (is_string($action) && trim($action) === 'cancelAwb') {
        shoptop_require_admin();
        $orderId = trim((string) ($body['orderId'] ?? ''));
        if ($orderId === '') {
            shoptop_json_error('Campul orderId este obligatoriu.', 400);
        }
        try {
            shoptop_json_response(shoptop_cancel_order_awb($pdo, $orderId));
        } catch (Throwable $e) {
            shoptop_json_error($e->getMessage(), 502);
        }
    }

    if (is_string($action) && trim($action) === 'bulkCancelAwb') {
        shoptop_require_admin();
        $orderIds = shoptop_normalize_bulk_order_ids($body['orderIds'] ?? null);
        if ($orderIds === []) {
            shoptop_json_error('Selectează cel puțin o comandă (max. 50).', 400);
        }
        shoptop_json_response(shoptop_bulk_cancel_awb($pdo, $orderIds));
    }

    if (is_string($action) && trim($action) === 'syncDpdStatus') {
        shoptop_require_admin();
        $orderId = trim((string) ($body['orderId'] ?? ''));
        if ($orderId === '') {
            shoptop_json_error('Campul orderId este obligatoriu.', 400);
        }
        try {
            $result = shoptop_sync_order_dpd_status($pdo, $orderId);
            if (!empty($result['error']) && empty($result['statusChanged'])) {
                shoptop_json_error((string) $result['error'], 400);
            }
            $order = $result['order'];
            $order['tracking'] = $result['tracking'];
            $order['statusChanged'] = !empty($result['statusChanged']);
            shoptop_json_response($order);
        } catch (Throwable $e) {
            shoptop_json_error($e->getMessage(), 400);
        }
    }

    if (is_string($action) && trim($action) === 'markReturnReceived') {
        shoptop_require_admin();
        $orderId = trim((string) ($body['orderId'] ?? ''));
        if ($orderId === '') {
            shoptop_json_error('Campul orderId este obligatoriu.', 400);
        }
        try {
            shoptop_json_response(shoptop_mark_order_return_received($pdo, $orderId));
        } catch (Throwable $e) {
            shoptop_json_error($e->getMessage(), 400);
        }
    }

    if (is_string($action) && trim($action) === 'bulkSyncDpdStatus') {
        shoptop_require_admin();
        $rawIds = $body['orderIds'] ?? null;
        $orderIds = null;
        if (is_array($rawIds) && $rawIds !== []) {
            $orderIds = [];
            foreach ($rawIds as $id) {
                $trimmed = trim((string) $id);
                if ($trimmed !== '') {
                    $orderIds[] = $trimmed;
                }
            }
            $orderIds = array_values(array_unique($orderIds));
            if ($orderIds === []) {
                $orderIds = null;
            }
        }
        shoptop_json_response(shoptop_bulk_sync_dpd_status($pdo, $orderIds));
    }

    if (is_string($action) && trim($action) === 'bulkPrintAwb') {
        shoptop_require_admin();
        $orderIds = shoptop_normalize_bulk_order_ids($body['orderIds'] ?? null);
        if ($orderIds === []) {
            shoptop_json_error('Selectează cel puțin o comandă (max. 50).', 400);
        }
        $payload = shoptop_bulk_print_awb_pdf($pdo, $orderIds);
        shoptop_send_awb_print_payload($payload, 'awb-bulk');
    }

    if (is_string($action) && trim($action) === 'printAwb') {
        shoptop_require_admin();
        $orderId = trim((string) ($body['orderId'] ?? ''));
        if ($orderId === '') {
            shoptop_json_error('Campul orderId este obligatoriu.', 400);
        }
        $payload = shoptop_print_order_awb_pdf($pdo, $orderId);
        $safe = preg_replace('/[^a-zA-Z0-9_-]/', '', $orderId) ?: 'order';
        shoptop_send_awb_print_payload($payload, 'awb-' . $safe);
    }

    if (is_string($action) && trim($action) === 'updateStatus') {
        shoptop_require_admin();
        $orderId = trim((string) ($body['orderId'] ?? ''));
        $status = trim((string) ($body['status'] ?? ''));
        if ($orderId === '' || $status === '') {
            shoptop_json_error('Campurile orderId si status sunt obligatorii.', 400);
        }
        try {
            shoptop_json_response(shoptop_update_order_status($pdo, $orderId, $status));
        } catch (Throwable $e) {
            shoptop_json_error($e->getMessage(), 400);
        }
    }

    if (is_string($action) && trim($action) === 'markPaymentPaid') {
        shoptop_require_admin();
        $orderId = trim((string) ($body['orderId'] ?? ''));
        if ($orderId === '') {
            shoptop_json_error('Campul orderId este obligatoriu.', 400);
        }
        try {
            shoptop_json_response(shoptop_mark_payment_paid($pdo, $orderId));
        } catch (Throwable $e) {
            shoptop_json_error($e->getMessage(), 400);
        }
    }

    if (is_string($action) && trim($action) === 'abandonUnpaidCard') {
        $orderId = trim((string) ($body['orderId'] ?? ''));
        $token = trim((string) ($body['token'] ?? ''));
        if ($orderId === '') {
            shoptop_json_error('Campul orderId este obligatoriu.', 400);
        }
        $stmt = $pdo->prepare(
            'SELECT id, access_token, user_id, payment_method, payment_status, status, awb_number
             FROM orders WHERE id = :id LIMIT 1'
        );
        $stmt->execute(['id' => $orderId]);
        $row = $stmt->fetch();
        if (!$row) {
            shoptop_json_response(['ok' => true, 'discarded' => false]);
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
        $discarded = shoptop_discard_unpaid_card_order($pdo, $orderId);
        shoptop_json_response(['ok' => true, 'discarded' => $discarded]);
    }

    if (is_string($action) && trim($action) === 'updateCustomer') {
        shoptop_require_admin();
        $orderId = trim((string) ($body['orderId'] ?? ''));
        if ($orderId === '') {
            shoptop_json_error('Campul orderId este obligatoriu.', 400);
        }
        try {
            shoptop_json_response(shoptop_update_order_customer($pdo, $orderId, $body));
        } catch (Throwable $e) {
            shoptop_json_error($e->getMessage(), 400);
        }
    }

    if (is_string($action) && trim($action) === 'updateItems') {
        shoptop_require_admin();
        $orderId = trim((string) ($body['orderId'] ?? ''));
        $items = $body['items'] ?? null;
        if ($orderId === '') {
            shoptop_json_error('Campul orderId este obligatoriu.', 400);
        }
        if (!is_array($items)) {
            shoptop_json_error('Campul items este obligatoriu.', 400);
        }
        try {
            shoptop_json_response(shoptop_update_order_items($pdo, $orderId, $items));
        } catch (Throwable $e) {
            shoptop_json_error($e->getMessage(), 400);
        }
    }

    if (is_string($action) && trim($action) === 'deleteOrder') {
        shoptop_require_admin();
        $orderId = trim((string) ($body['orderId'] ?? ''));
        if ($orderId === '') {
            shoptop_json_error('Campul orderId este obligatoriu.', 400);
        }
        shoptop_delete_order($pdo, $orderId);
        shoptop_json_response(['ok' => true, 'id' => $orderId]);
    }

    if (is_string($action) && trim($action) === 'emitInvoice') {
        shoptop_require_admin();
        $orderId = trim((string) ($body['orderId'] ?? ''));
        if ($orderId === '') {
            shoptop_json_error('Campul orderId este obligatoriu.', 400);
        }
        $force = ($body['force'] ?? false) === true;
        try {
            shoptop_smartbill_emit_invoice($pdo, $orderId, [
                'force' => $force,
                'sendEmail' => shoptop_smartbill_settings()['send_email'],
            ]);
        } catch (Throwable $e) {
            shoptop_json_error($e->getMessage(), 502);
        }
        $order = shoptop_fetch_order($pdo, $orderId);
        if ($order === null) {
            shoptop_json_error('Comanda nu a putut fi citita.', 500);
        }
        shoptop_json_response($order);
    }

    if (is_string($action) && trim($action) === 'sendInvoiceEmail') {
        shoptop_require_admin();
        $orderId = trim((string) ($body['orderId'] ?? ''));
        if ($orderId === '') {
            shoptop_json_error('Campul orderId este obligatoriu.', 400);
        }
        $order = shoptop_fetch_order($pdo, $orderId);
        if ($order === null) {
            shoptop_json_error('Comanda nu a fost gasita.', 404);
        }
        $series = trim((string) ($order['invoiceSeries'] ?? ''));
        $number = trim((string) ($order['invoiceNumber'] ?? ''));
        $email = trim((string) ($order['customerEmail'] ?? ''));
        if ($series === '' || $number === '') {
            shoptop_json_error('Comanda nu are factura emisa.', 400);
        }
        if ($email === '') {
            shoptop_json_error('Comanda nu are email client.', 400);
        }
        try {
            shoptop_smartbill_send_invoice_email(
                $series,
                $number,
                $email,
                $orderId,
                trim((string) ($order['customerName'] ?? '')),
            );
        } catch (Throwable $e) {
            shoptop_json_error($e->getMessage(), 502);
        }
        shoptop_json_response(['ok' => true, 'id' => $orderId]);
    }

    $customer = $body['customer'] ?? null;
    $items = $body['items'] ?? null;
    if (!is_array($customer) || !is_array($items) || $items === []) {
        shoptop_json_error('Clientul si lista de produse sunt obligatorii.', 400);
    }

    $firstName = trim((string) ($customer['firstName'] ?? ''));
    $lastName = trim((string) ($customer['lastName'] ?? ''));
    $customerName = trim((string) ($customer['name'] ?? ''));
    if ($customerName === '') {
        $customerName = trim($firstName . ' ' . $lastName);
    }

    $customerPhone = shoptop_normalize_ro_phone((string) ($customer['phone'] ?? ''));
    $customerEmail = trim((string) ($customer['email'] ?? ''));
    $customerNotes = trim((string) ($customer['notes'] ?? ''));

    $county = trim((string) ($customer['county'] ?? ''));
    $countyName = trim((string) ($customer['countyName'] ?? ''));
    $city = trim((string) ($customer['city'] ?? ''));
    $street = trim((string) ($customer['street'] ?? ''));
    $streetNumber = trim((string) ($customer['streetNumber'] ?? ''));
    $addressExtra = trim((string) ($customer['addressExtra'] ?? ''));
    $postalCode = trim((string) ($customer['postalCode'] ?? ''));
    $dpdSiteId = (int) ($customer['dpdSiteId'] ?? 0);
    $customerAddress = trim((string) ($customer['address'] ?? ''));

    if ($customerAddress === '') {
        $streetLine = trim(
            ($street !== '' ? 'Str. ' . $street : '')
            . ($streetNumber !== '' ? ' nr. ' . $streetNumber : '')
        );
        $line1 = trim($streetLine . ($addressExtra !== '' ? ', ' . $addressExtra : ''), " ,");
        $line2 = trim(
            $city
            . ($countyName !== '' ? ', jud. ' . $countyName : ($county !== '' ? ', jud. ' . $county : '')),
            " ,"
        );
        $line3 = $postalCode !== '' ? 'Cod postal: ' . $postalCode : '';
        $customerAddress = trim(implode("\n", array_filter([$line1, $line2, $line3], static function ($v) {
            return $v !== '';
        })));
    }

    $paymentMethod = trim((string) ($body['paymentMethod'] ?? 'cod'));
    if (!in_array($paymentMethod, ['cod', 'card'], true)) {
        $paymentMethod = 'cod';
    }

    $billingType = trim((string) ($customer['billingType'] ?? 'person'));
    if ($billingType !== 'company') {
        $billingType = 'person';
    }
    $companyName = trim((string) ($customer['companyName'] ?? ''));
    $companyCuiRaw = trim((string) ($customer['companyCui'] ?? ''));
    $companyRegCom = trim((string) ($customer['companyRegCom'] ?? ''));
    $companyCui = '';
    if ($billingType === 'company') {
        if ($companyName === '') {
            shoptop_json_error('Denumirea firmei este obligatorie pentru facturare pe firma.', 400);
        }
        if ($companyCuiRaw === '' || !shoptop_validate_ro_cui($companyCuiRaw)) {
            shoptop_json_error('CUI-ul firmei este invalid.', 400);
        }
        $companyCui = shoptop_normalize_ro_cui($companyCuiRaw);
    }

    if (
        $customerName === ''
        || $customerPhone === ''
        || $city === ''
        || $street === ''
        || $streetNumber === ''
        || $customerAddress === ''
    ) {
        shoptop_json_error(
            'Numele, telefonul, judetul, localitatea, strada si numarul sunt obligatorii.',
            400
        );
    }

    if (!shoptop_validate_ro_phone($customerPhone)) {
        shoptop_json_error(
            'Telefonul trebuie sa aiba exact 10 cifre si sa inceapa cu 0.',
            400
        );
    }

    if ($county === '' && $countyName === '') {
        shoptop_json_error('Judetul este obligatoriu.', 400);
    }

    // dpdSiteId e opțional când DPD blochează Find Site — AWB folosește siteName.

    if (!array_key_exists('acceptedTerms', $body) || $body['acceptedTerms'] !== true) {
        shoptop_json_error(
            'Trebuie sa accepti termenii si conditiile inainte de plasarea comenzii.',
            400
        );
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
        $hasBundleOffers = shoptop_column_exists($pdo, 'products', 'bundle_offers');
        $productFields = 'id, name, sku, sale_price, stock_qty' . ($hasBundleOffers ? ', bundle_offers' : '');
        $productStmt = $pdo->prepare(
            'SELECT ' . $productFields . '
             FROM products
             WHERE id = :id
             FOR UPDATE'
        );

        foreach ($normalizedItems as $item) {
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

            $unitPrice = $salePrice;
            $lineTotal = round($salePrice * $item['quantity'], 2);
            $bundlePricing = shoptop_bundle_pricing($product, $item['quantity'], $salePrice);
            if ($bundlePricing !== null) {
                [$unitPrice, $lineTotal] = $bundlePricing;
            }
            $totalAmount += $lineTotal;
            $preparedItems[] = [
                'product_id' => (string) $product['id'],
                'product_name' => (string) $product['name'],
                'product_sku' => !empty($product['sku']) ? (string) $product['sku'] : null,
                'unit_price' => $unitPrice,
                'quantity' => $item['quantity'],
                'line_total' => $lineTotal,
            ];
        }

        $addonsInput = is_array($body['checkoutAddons'] ?? null) ? $body['checkoutAddons'] : [];
        if (array_key_exists('giftAddon', $body) && $body['giftAddon'] === true) {
            $addonsInput['gift'] = true;
        }
        // Alias vechi: warranty5y → packageInsurance (Garantie extinsa 1 an / A000).
        if (!empty($addonsInput['warranty5y'])) {
            $addonsInput['packageInsurance'] = true;
        }
        // Listă explicită de ID-uri (preferată) — evită pierderea bifelor din obiectul boolean.
        $addonIds = $body['checkoutAddonIds'] ?? null;
        if (is_array($addonIds)) {
            foreach ($addonIds as $addonId) {
                $key = trim((string) $addonId);
                if ($key === 'warranty5y') {
                    $key = 'packageInsurance';
                }
                if ($key !== '') {
                    $addonsInput[$key] = true;
                }
            }
        }
        $addedAddonProductIds = [];
        foreach (shoptop_checkout_addons_catalog($pdo) as $addonKey => $addon) {
            $flag = $addonsInput[$addonKey] ?? false;
            $selected = $flag === true || $flag === 1 || $flag === '1' || $flag === 'true';
            if (!$selected) {
                continue;
            }
            $productId = (string) $addon['product_id'];
            if (isset($addedAddonProductIds[$productId])) {
                continue;
            }
            $addedAddonProductIds[$productId] = true;
            $lineAddon = round((float) $addon['price'], 2);
            $totalAmount += $lineAddon;
            $preparedItems[] = [
                'product_id' => $productId,
                'product_name' => (string) $addon['product_name'],
                'product_sku' => (string) ($addon['product_sku'] ?? $productId),
                'unit_price' => (float) $addon['price'],
                'quantity' => 1,
                'line_total' => $lineAddon,
            ];
        }

        $totalAmount += shoptop_shipping_cost_for_subtotal($totalAmount);

        $orderId = shoptop_order_id($pdo);
        $accessToken = shoptop_order_access_token();
        $hasBilling = shoptop_column_exists($pdo, 'orders', 'billing_type');
        $hasShip = shoptop_column_exists($pdo, 'orders', 'ship_city');

        $shipCols = '';
        $shipVals = '';
        $shipParams = [];
        if ($hasShip) {
            $hasDpdSite = shoptop_column_exists($pdo, 'orders', 'dpd_site_id');
            $shipCols = ', ship_county, ship_county_name, ship_city, ship_street, ship_street_number, ship_address_extra, ship_postal_code'
                . ($hasDpdSite ? ', dpd_site_id' : '');
            $shipVals = ', :ship_county, :ship_county_name, :ship_city, :ship_street, :ship_street_number, :ship_address_extra, :ship_postal_code'
                . ($hasDpdSite ? ', :dpd_site_id' : '');
            $shipParams = [
                'ship_county' => $county !== '' ? $county : null,
                'ship_county_name' => $countyName !== '' ? $countyName : null,
                'ship_city' => $city !== '' ? $city : null,
                'ship_street' => $street !== '' ? $street : null,
                'ship_street_number' => $streetNumber !== '' ? $streetNumber : null,
                'ship_address_extra' => $addressExtra !== '' ? $addressExtra : null,
                'ship_postal_code' => $postalCode !== '' ? $postalCode : null,
            ];
            if ($hasDpdSite) {
                $shipParams['dpd_site_id'] = $dpdSiteId > 0 ? $dpdSiteId : null;
            }
        }

        if ($hasBilling) {
            $orderStmt = $pdo->prepare(
                'INSERT INTO orders (
                    id, access_token, user_id, customer_name, customer_email, customer_phone,
                    customer_address' . $shipCols . ', customer_notes, billing_type, company_name, company_cui, company_reg_com,
                    total_amount, status, payment_method, payment_status
                ) VALUES (
                    :id, :access_token, :user_id, :customer_name, :customer_email, :customer_phone,
                    :customer_address' . $shipVals . ', :customer_notes, :billing_type, :company_name, :company_cui, :company_reg_com,
                    :total_amount, :status, :payment_method, :payment_status
                )'
            );
            $orderStmt->execute(array_merge([
                'id' => $orderId,
                'access_token' => $accessToken,
                'user_id' => $userId,
                'customer_name' => $customerName,
                'customer_email' => $customerEmail !== '' ? $customerEmail : null,
                'customer_phone' => $customerPhone,
                'customer_address' => $customerAddress,
                'customer_notes' => $customerNotes !== '' ? $customerNotes : null,
                'billing_type' => $billingType,
                'company_name' => $billingType === 'company' ? $companyName : null,
                'company_cui' => $billingType === 'company' ? $companyCui : null,
                'company_reg_com' => $billingType === 'company' && $companyRegCom !== ''
                    ? $companyRegCom
                    : null,
                'total_amount' => round($totalAmount, 2),
                'status' => 'new',
                'payment_method' => $paymentMethod,
                'payment_status' => 'pending',
            ], $shipParams));
        } else {
            $orderStmt = $pdo->prepare(
                'INSERT INTO orders (
                    id, access_token, user_id, customer_name, customer_email, customer_phone,
                    customer_address' . $shipCols . ', customer_notes, total_amount, status, payment_method, payment_status
                ) VALUES (
                    :id, :access_token, :user_id, :customer_name, :customer_email, :customer_phone,
                    :customer_address' . $shipVals . ', :customer_notes, :total_amount, :status, :payment_method, :payment_status
                )'
            );
            $orderStmt->execute(array_merge([
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
            ], $shipParams));
        }

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
    // Import în masă din admin: emailul de confirmare poate fi oprit (suppressEmail).
    $suppressEmail = shoptop_is_admin_user() && ($body['suppressEmail'] ?? false) === true;
    if ($paymentMethod !== 'card' && !$suppressEmail) {
        shoptop_send_order_confirmation($order);
    }
    if ($customerEmail !== '') {
        require_once __DIR__ . '/checkout_drafts.php';
        if (function_exists('shoptop_checkout_draft_complete')) {
            shoptop_checkout_draft_complete($customerEmail);
        }
    }

    $isAdminOrder = shoptop_is_admin_user();
    $metaContext = shoptop_meta_capi_context_from_request(
        is_array($body['meta'] ?? null) ? $body['meta'] : null
    );
    if (!$isAdminOrder) {
        shoptop_meta_capi_store_attribution($pdo, $orderId, $metaContext);
        if ($paymentMethod === 'cod') {
            shoptop_meta_capi_send_purchase($order, $metaContext);
        }
    }

    // Comenzile cu plata ramburs merg imediat in BaseLinker.
    // Cele cu card se trimit dupa confirmarea platii (IPN Netopia).
    if ($paymentMethod === 'cod') {
        $streetLine = trim(
            ($street !== '' ? 'Str. ' . $street : '')
            . ($streetNumber !== '' ? ' nr. ' . $streetNumber : '')
        );
        if ($addressExtra !== '') {
            $streetLine = trim($streetLine . ', ' . $addressExtra, " ,");
        }
        $order['deliveryStreet'] = $streetLine !== '' ? $streetLine : (string) ($order['customerAddress'] ?? '');
        $order['deliveryCity'] = $city;
        $order['deliveryState'] = $countyName !== '' ? $countyName : $county;
        $order['deliveryPostcode'] = $postalCode;
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
