<?php

declare(strict_types=1);

require_once __DIR__ . '/lib.php';

/**
 * SmartBill Cloud API — emitere facturi, PDF, trimitere email.
 * @see https://api.smartbill.ro/
 */

function shoptop_smartbill_settings(): array
{
    $cfg = shoptop_config()['smartbill'] ?? [];
    if (!is_array($cfg)) {
        $cfg = [];
    }

    return [
        'email' => trim((string) ($cfg['email'] ?? '')),
        'token' => trim((string) ($cfg['token'] ?? '')),
        'company_vat_code' => trim((string) ($cfg['company_vat_code'] ?? '')),
        'series_name' => trim((string) ($cfg['series_name'] ?? 'TM')),
        'tax_name' => trim((string) ($cfg['tax_name'] ?? 'Normala')),
        'tax_percentage' => (float) ($cfg['tax_percentage'] ?? 21),
        'auto_emit' => ($cfg['auto_emit'] ?? false) === true,
        'send_email' => ($cfg['send_email'] ?? true) !== false,
        'warehouse_name' => trim((string) ($cfg['warehouse_name'] ?? 'depozit')),
        'use_stock' => ($cfg['use_stock'] ?? true) !== false,
        // Exact ca în SmartBill → Nomenclatoare → Unități de măsură
        'measuring_unit_name' => trim((string) ($cfg['measuring_unit_name'] ?? 'bucata')),
    ];
}

function shoptop_smartbill_enabled(): bool
{
    $s = shoptop_smartbill_settings();
    return $s['email'] !== ''
        && $s['token'] !== ''
        && $s['company_vat_code'] !== ''
        && $s['series_name'] !== '';
}

/**
 * Validează CUI/CIF românesc (cu sau fără prefix RO).
 */
function shoptop_validate_ro_cui(string $raw): bool
{
    $cui = strtoupper(preg_replace('/\s+/', '', $raw) ?? '');
    if (str_starts_with($cui, 'RO')) {
        $cui = substr($cui, 2);
    }
    if ($cui === '' || !ctype_digit($cui) || strlen($cui) > 10) {
        return false;
    }
    $cui = ltrim($cui, '0');
    if ($cui === '' || strlen($cui) > 10) {
        return false;
    }
    $control = (int) substr($cui, -1);
    $body = substr($cui, 0, -1);
    $weights = [7, 3, 1, 7, 3, 1, 7, 3, 1, 7, 3];
    $body = str_pad($body, 9, '0', STR_PAD_LEFT);
    $sum = 0;
    for ($i = 0; $i < 9; $i++) {
        $sum += (int) $body[$i] * $weights[$i];
    }
    $mod = $sum * 10 % 11;
    if ($mod === 10) {
        $mod = 0;
    }
    return $mod === $control;
}

function shoptop_normalize_ro_cui(string $raw): string
{
    $cui = strtoupper(preg_replace('/\s+/', '', $raw) ?? '');
    if (str_starts_with($cui, 'RO')) {
        $cui = substr($cui, 2);
    }
    $cui = ltrim($cui, '0');
    return $cui;
}

/**
 * @return array{ok:bool,status:int,json:?array,raw:string,error:?string}
 */
function shoptop_smartbill_request(
    string $method,
    string $path,
    ?array $body = null,
    bool $expectBinary = false,
): array {
    $settings = shoptop_smartbill_settings();
    if ($settings['email'] === '' || $settings['token'] === '') {
        return [
            'ok' => false,
            'status' => 0,
            'json' => null,
            'raw' => '',
            'error' => 'SmartBill nu este configurat (email/token).',
        ];
    }

    $url = 'https://ws.smartbill.ro/SBORO/api/' . ltrim($path, '/');
    $auth = base64_encode($settings['email'] . ':' . $settings['token']);

    $headers = [
        'Authorization: Basic ' . $auth,
        'Accept: application/json',
    ];
    if ($expectBinary) {
        $headers = [
            'Authorization: Basic ' . $auth,
            'Accept: application/octet-stream',
        ];
    } else {
        $headers[] = 'Content-Type: application/json';
    }

    $ch = curl_init($url);
    if ($ch === false) {
        return [
            'ok' => false,
            'status' => 0,
            'json' => null,
            'raw' => '',
            'error' => 'Nu am putut inițializa cURL pentru SmartBill.',
        ];
    }

    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => strtoupper($method),
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 45,
        CURLOPT_CONNECTTIMEOUT => 15,
    ];
    if ($body !== null && !$expectBinary) {
        $opts[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE);
    }
    curl_setopt_array($ch, $opts);

    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($raw === false) {
        return [
            'ok' => false,
            'status' => $status,
            'json' => null,
            'raw' => '',
            'error' => $curlError !== '' ? $curlError : 'Eroare cURL SmartBill.',
        ];
    }

    if ($expectBinary) {
        return [
            'ok' => $status >= 200 && $status < 300,
            'status' => $status,
            'json' => null,
            'raw' => (string) $raw,
            'error' => $status >= 200 && $status < 300 ? null : 'SmartBill PDF eșuat (HTTP ' . $status . ').',
        ];
    }

    $json = null;
    $decoded = json_decode((string) $raw, true);
    if (is_array($decoded)) {
        $json = $decoded;
        if (isset($decoded['sbcResponse']) && is_array($decoded['sbcResponse'])) {
            $json = $decoded['sbcResponse'];
        }
    }

    $errorText = '';
    if (is_array($json)) {
        $errorText = trim((string) ($json['errorText'] ?? $json['error'] ?? ''));
    }
    $ok = $status >= 200 && $status < 300 && $errorText === '';

    return [
        'ok' => $ok,
        'status' => $status,
        'json' => $json,
        'raw' => (string) $raw,
        'error' => $ok
            ? null
            : ($errorText !== ''
                ? $errorText
                : ('SmartBill HTTP ' . $status . ($raw !== '' ? ': ' . substr((string) $raw, 0, 300) : ''))),
    ];
}

function shoptop_smartbill_save_invoice_error(PDO $pdo, string $orderId, string $message): void
{
    if (!shoptop_column_exists_smartbill($pdo, 'orders', 'invoice_error')) {
        return;
    }
    $stmt = $pdo->prepare(
        'UPDATE orders SET invoice_error = :err WHERE id = :id'
    );
    $stmt->execute([
        'err' => mb_substr($message, 0, 500),
        'id' => $orderId,
    ]);
}

function shoptop_column_exists_smartbill(PDO $pdo, string $table, string $column): bool
{
    static $cache = [];
    $key = $table . '.' . $column;
    if (array_key_exists($key, $cache)) {
        return $cache[$key];
    }
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS c
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = :table
           AND COLUMN_NAME = :column'
    );
    $stmt->execute(['table' => $table, 'column' => $column]);
    $row = $stmt->fetch();
    $cache[$key] = ((int) ($row['c'] ?? 0)) > 0;
    return $cache[$key];
}

/**
 * Caută un produs în SmartBill după cod (SKU) — denumirea/UM din gestiune.
 *
 * @return array{name:string,code:string,measuringUnit:string}
 */
function shoptop_smartbill_lookup_by_code(string $code): array
{
    static $cache = [];

    $code = trim($code);
    if ($code === '') {
        throw new RuntimeException('Cod produs lipsă pentru SmartBill.');
    }
    if (isset($cache[$code])) {
        return $cache[$code];
    }

    $settings = shoptop_smartbill_settings();
    $query = [
        'cif' => $settings['company_vat_code'],
        'date' => date('Y-m-d'),
        'productCode' => $code,
    ];
    $warehouse = $settings['warehouse_name'];
    if ($warehouse !== '') {
        $query['warehouseName'] = $warehouse;
    }

    $result = shoptop_smartbill_request('GET', 'stocks?' . http_build_query($query));
    if (!$result['ok'] || !is_array($result['json'])) {
        throw new RuntimeException(
            $result['error'] ?? ('Nu am putut căuta produsul cu codul ' . $code . ' în SmartBill.')
        );
    }

    $json = $result['json'];
    $list = $json['list'] ?? null;
    if (!is_array($list)) {
        $list = [];
    }

    $foundName = '';
    $foundUnit = '';
    foreach ($list as $group) {
        if (!is_array($group)) {
            continue;
        }
        $products = $group['products'] ?? null;
        // Uneori SmartBill întoarce un singur produs ca obiect, nu listă.
        if (is_array($products) && isset($products['productCode'])) {
            $products = [$products];
        }
        if (!is_array($products)) {
            continue;
        }
        foreach ($products as $product) {
            if (!is_array($product)) {
                continue;
            }
            $productCode = trim((string) ($product['productCode'] ?? ''));
            if ($productCode !== '' && strcasecmp($productCode, $code) !== 0) {
                continue;
            }
            $foundName = trim((string) ($product['productName'] ?? ''));
            $foundUnit = trim((string) ($product['measuringUnit'] ?? ''));
            if ($foundName !== '') {
                break 2;
            }
        }
    }

    if ($foundName === '') {
        throw new RuntimeException(
            'Produsul cu codul "' . $code . '" nu a fost găsit în gestiunea SmartBill'
            . ($warehouse !== '' ? ' „' . $warehouse . '”' : '')
            . '. Verifică nomenclatorul / stocul.'
        );
    }

    $resolved = [
        'name' => $foundName,
        'code' => $code,
        'measuringUnit' => $foundUnit !== ''
            ? $foundUnit
            : ($settings['measuring_unit_name'] !== '' ? $settings['measuring_unit_name'] : 'bucata'),
    ];
    $cache[$code] = $resolved;
    return $resolved;
}

/**
 * @param mixed $products
 * @return list<array<string,mixed>>
 */
function shoptop_smartbill_normalize_stock_products(mixed $products): array
{
    if (!is_array($products)) {
        return [];
    }
    if (isset($products['productCode']) || isset($products['productName'])) {
        return [$products];
    }
    $out = [];
    foreach ($products as $product) {
        if (is_array($product)) {
            $out[] = $product;
        }
    }
    return $out;
}

/**
 * Stocuri din gestiunea SmartBill, indexate după SKU (uppercase).
 *
 * @return array<string, int>
 */
function shoptop_smartbill_fetch_warehouse_stocks(): array
{
    if (!shoptop_smartbill_enabled()) {
        throw new RuntimeException('SmartBill nu este configurat.');
    }

    $settings = shoptop_smartbill_settings();
    $query = [
        'cif' => $settings['company_vat_code'],
        'date' => date('Y-m-d'),
    ];
    $warehouse = $settings['warehouse_name'];
    if ($warehouse !== '') {
        $query['warehouseName'] = $warehouse;
    }

    $result = shoptop_smartbill_request('GET', 'stocks?' . http_build_query($query));
    if (!$result['ok'] || !is_array($result['json'])) {
        throw new RuntimeException(
            $result['error'] ?? 'Nu am putut citi stocurile din SmartBill.'
        );
    }

    $list = $result['json']['list'] ?? null;
    if (!is_array($list)) {
        $list = [];
    }

    $bySku = [];
    foreach ($list as $group) {
        if (!is_array($group)) {
            continue;
        }
        foreach (shoptop_smartbill_normalize_stock_products($group['products'] ?? null) as $product) {
            $code = strtoupper(trim((string) ($product['productCode'] ?? '')));
            if ($code === '') {
                continue;
            }
            $qty = (int) floor((float) ($product['quantity'] ?? 0));
            $bySku[$code] = ($bySku[$code] ?? 0) + max(0, $qty);
        }
    }

    return $bySku;
}

/**
 * Cantități ambalate / în tranzit / livrate fără factură SmartBill (încă pe raft în SB).
 *
 * @return array<string, int> product_id => qty
 */
function shoptop_uninvoiced_in_transit_qty(PDO $pdo): array
{
    $hasInvoice = shoptop_column_exists_smartbill($pdo, 'orders', 'invoice_series');
    $sql = "SELECT oi.product_id AS product_id, SUM(oi.quantity) AS qty
            FROM order_items oi
            INNER JOIN orders o ON o.id = oi.order_id
            WHERE o.status IN ('processing', 'shipped', 'delivered')";
    if ($hasInvoice) {
        $sql .= " AND (o.invoice_series IS NULL OR o.invoice_series = '')";
    }
    $sql .= ' GROUP BY oi.product_id';

    $stmt = $pdo->query($sql);
    $out = [];
    if ($stmt === false) {
        return $out;
    }
    foreach ($stmt->fetchAll() as $row) {
        $id = (string) ($row['product_id'] ?? '');
        if ($id === '' || shoptop_is_virtual_product_id($id)) {
            continue;
        }
        $out[$id] = (int) ($row['qty'] ?? 0);
    }
    return $out;
}

/**
 * Copiază stocul din SmartBill în `products.stock_qty`, minus ce e deja ambalat
 * / în tranzit și încă nefacturat (SmartBill nu a descărcat gestiunea).
 *
 * @return array{
 *   updated:int,
 *   unchanged:int,
 *   missing:int,
 *   skipped:int,
 *   warehouse:string
 * }
 */
function shoptop_smartbill_sync_local_stock(PDO $pdo): array
{
    $settings = shoptop_smartbill_settings();
    $sbStocks = shoptop_smartbill_fetch_warehouse_stocks();
    $reserved = shoptop_uninvoiced_in_transit_qty($pdo);

    $stmt = $pdo->query('SELECT id, sku, stock_qty FROM products');
    if ($stmt === false) {
        throw new RuntimeException('Nu am putut citi produsele locale.');
    }

    $update = $pdo->prepare(
        'UPDATE products SET stock_qty = :qty WHERE id = :id'
    );

    $updated = 0;
    $unchanged = 0;
    $missing = 0;
    $skipped = 0;

    foreach ($stmt->fetchAll() as $row) {
        $id = (string) ($row['id'] ?? '');
        $sku = strtoupper(trim((string) ($row['sku'] ?? '')));
        if ($id === '' || shoptop_is_virtual_product_id($id) || shoptop_is_virtual_product_id($sku)) {
            $skipped++;
            continue;
        }
        if ($sku === '') {
            $skipped++;
            continue;
        }

        // SKU-uri combo (A008X2+A003X2) sau produse doar locale nu există în
        // SmartBill — nu le forțăm stocul la 0, altfel dispar din magazin.
        if (!array_key_exists($sku, $sbStocks)) {
            $missing++;
            continue;
        }

        $sbQty = (int) $sbStocks[$sku];
        $hold = (int) ($reserved[$id] ?? 0);
        $next = max(0, $sbQty - $hold);
        $current = (int) ($row['stock_qty'] ?? 0);
        if ($next === $current) {
            $unchanged++;
            continue;
        }

        $update->execute([
            'qty' => $next,
            'id' => $id,
        ]);
        $updated++;
    }

    return [
        'updated' => $updated,
        'unchanged' => $unchanged,
        'missing' => $missing,
        'skipped' => $skipped,
        'warehouse' => $settings['warehouse_name'],
    ];
}

/**
 * Stornează factura SmartBill (reîncarcă stocul în gestiune). Idempotent.
 */
function shoptop_smartbill_reverse_invoice(PDO $pdo, string $orderId): void
{
    if (!shoptop_smartbill_enabled()) {
        return;
    }
    if (!shoptop_column_exists_smartbill($pdo, 'orders', 'invoice_series')) {
        return;
    }

    $cols = ['invoice_series', 'invoice_number'];
    if (shoptop_column_exists_smartbill($pdo, 'orders', 'invoice_issued_at')) {
        $cols[] = 'invoice_issued_at';
    }
    if (shoptop_column_exists_smartbill($pdo, 'orders', 'invoice_storno_number')) {
        $cols[] = 'invoice_storno_number';
    }

    $stmt = $pdo->prepare(
        'SELECT ' . implode(', ', $cols) . ' FROM orders WHERE id = :id LIMIT 1'
    );
    $stmt->execute(['id' => $orderId]);
    $row = $stmt->fetch();
    if (!$row) {
        return;
    }

    $series = trim((string) ($row['invoice_series'] ?? ''));
    $number = trim((string) ($row['invoice_number'] ?? ''));
    if ($series === '' || $number === '') {
        return;
    }
    if (trim((string) ($row['invoice_storno_number'] ?? '')) !== '') {
        return;
    }

    $settings = shoptop_smartbill_settings();
    $issueDate = date('Y-m-d');
    $issuedAt = trim((string) ($row['invoice_issued_at'] ?? ''));
    if ($issuedAt !== '') {
        $orig = substr($issuedAt, 0, 10);
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $orig) === 1 && $orig > $issueDate) {
            $issueDate = $orig;
        }
    }

    $result = shoptop_smartbill_request('POST', 'invoice/reverse', [
        'companyVatCode' => $settings['company_vat_code'],
        'seriesName' => $series,
        'number' => $number,
        'issueDate' => $issueDate,
    ]);

    $err = trim((string) ($result['error'] ?? ''));
    $already = $err !== '' && (
        stripos($err, 'deja stornata') !== false
        || stripos($err, 'deja stornată') !== false
        || stripos($err, 'este de tip storno') !== false
    );

    if (!$result['ok'] && !$already) {
        shoptop_smartbill_save_invoice_error(
            $pdo,
            $orderId,
            'Storno SmartBill eșuat: ' . ($err !== '' ? $err : 'eroare necunoscută')
        );
        throw new RuntimeException(
            $err !== '' ? $err : 'Nu am putut storna factura SmartBill.'
        );
    }

    $json = is_array($result['json']) ? $result['json'] : [];
    $stornoSeries = trim((string) ($json['series'] ?? ''));
    $stornoNumber = trim((string) ($json['number'] ?? ''));
    if ($stornoNumber === '') {
        $stornoNumber = 'stornata';
    }

    if (shoptop_column_exists_smartbill($pdo, 'orders', 'invoice_storno_number')) {
        $upd = $pdo->prepare(
            'UPDATE orders
             SET invoice_storno_series = :ss,
                 invoice_storno_number = :sn,
                 invoice_storno_at = NOW(),
                 invoice_error = NULL
             WHERE id = :id'
        );
        $upd->execute([
            'ss' => $stornoSeries !== '' ? $stornoSeries : $series,
            'sn' => $stornoNumber,
            'id' => $orderId,
        ]);
    }
}

/**
 * Storno după sync greșit (livrată → expediată): anulează factura local + SmartBill,
 * ca să poată fi reemisă la livrarea reală.
 */
function shoptop_smartbill_reverse_false_delivery(PDO $pdo, string $orderId): void
{
    if (!shoptop_column_exists_smartbill($pdo, 'orders', 'invoice_series')) {
        return;
    }

    try {
        shoptop_smartbill_reverse_invoice($pdo, $orderId);
    } catch (Throwable $e) {
        // Continuăm cu clear local — admin poate storna manual în SmartBill.
        error_log('SmartBill reverse false delivery ' . $orderId . ': ' . $e->getMessage());
        shoptop_smartbill_save_invoice_error($pdo, $orderId, $e->getMessage());
    }

    // Eliberăm referința facturii originale ca emiterea ulterioară să creeze document nou.
    $sets = [
        'invoice_series = NULL',
        'invoice_number = NULL',
        'invoice_url = NULL',
        'invoice_issued_at = NULL',
    ];
    if (shoptop_column_exists_smartbill($pdo, 'orders', 'invoice_error')) {
        // păstrăm invoice_error dacă storno a eșuat; altfel curățăm
        $sets[] = 'invoice_error = CASE
            WHEN invoice_error IS NOT NULL AND invoice_error <> \'\' THEN invoice_error
            ELSE NULL END';
    }

    $pdo->prepare(
        'UPDATE orders SET ' . implode(', ', $sets) . ' WHERE id = :id'
    )->execute(['id' => $orderId]);
}

/**
 * Construiește payload-ul POST /invoice din comanda ShopTop.
 *
 * Produsele fizice se identifică DOAR după cod (SKU) din SmartBill —
 * denumirea de pe site nu se trimite; se preia din gestiunea SmartBill.
 *
 * @return array<string, mixed>
 */
function shoptop_smartbill_build_invoice_payload(PDO $pdo, string $orderId): array
{
    $settings = shoptop_smartbill_settings();

    $selectCols = [
        'id', 'customer_name', 'customer_email', 'customer_phone', 'customer_address',
        'customer_notes', 'total_amount', 'payment_method', 'payment_status',
    ];
    foreach (['billing_type', 'company_name', 'company_cui', 'company_reg_com'] as $col) {
        if (shoptop_column_exists_smartbill($pdo, 'orders', $col)) {
            $selectCols[] = $col;
        }
    }

    $stmt = $pdo->prepare(
        'SELECT ' . implode(', ', $selectCols) . '
         FROM orders WHERE id = :id LIMIT 1'
    );
    $stmt->execute(['id' => $orderId]);
    $order = $stmt->fetch();
    if (!$order) {
        throw new RuntimeException('Comanda nu a fost găsită.');
    }

    $itemsStmt = $pdo->prepare(
        'SELECT oi.product_id, oi.product_name, oi.product_sku, oi.unit_price, oi.quantity, oi.line_total,
                p.sku AS live_sku
         FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = :id
         ORDER BY oi.id ASC'
    );
    $itemsStmt->execute(['id' => $orderId]);
    $items = $itemsStmt->fetchAll();
    if ($items === []) {
        throw new RuntimeException('Comanda nu are produse de facturat.');
    }

    $taxName = $settings['tax_name'];
    $taxPct = $settings['tax_percentage'];
    $warehouse = $settings['warehouse_name'];
    $useStock = $settings['use_stock'] && $warehouse !== '';
    $defaultUnit = $settings['measuring_unit_name'] !== ''
        ? $settings['measuring_unit_name']
        : 'bucata';
    $products = [];
    $itemsSum = 0.0;

    foreach ($items as $item) {
        $qty = (int) $item['quantity'];
        $unit = (float) $item['unit_price'];
        $line = (float) $item['line_total'];
        $itemsSum += $line;
        $isService = shoptop_is_virtual_product_id((string) $item['product_id']);

        $sku = trim((string) ($item['product_sku'] ?? ''));
        if ($sku === '') {
            $sku = trim((string) ($item['live_sku'] ?? ''));
        }
        if ($sku === '' && $isService) {
            $sku = trim((string) ($item['product_id'] ?? ''));
        }

        if ($isService) {
            // Servicii / add-on-uri: nu descarcă stoc; denumirea locală e ok.
            if ($sku === '') {
                throw new RuntimeException(
                    'Lipsește codul pentru serviciul „'
                    . trim((string) ($item['product_name'] ?? ''))
                    . '”.'
                );
            }
            $products[] = [
                'name' => (string) $item['product_name'],
                'code' => $sku,
                'isDiscount' => false,
                'measuringUnitName' => $defaultUnit,
                'currency' => 'RON',
                'quantity' => $qty,
                'price' => $unit,
                'isTaxIncluded' => true,
                'taxName' => $taxName,
                'taxPercentage' => $taxPct,
                'saveToDb' => false,
                'isService' => true,
            ];
            continue;
        }

        if ($sku === '') {
            throw new RuntimeException(
                'Produsul „'
                . trim((string) ($item['product_name'] ?? $item['product_id'] ?? ''))
                . '” nu are SKU/cod. Completează codul produsului (același ca în SmartBill).'
            );
        }

        // Conversie pe cod: denumirea + UM din gestiunea SmartBill.
        $resolved = shoptop_smartbill_lookup_by_code($sku);
        $entry = [
            'name' => $resolved['name'],
            'code' => $resolved['code'],
            'isDiscount' => false,
            'measuringUnitName' => $resolved['measuringUnit'],
            'currency' => 'RON',
            'quantity' => $qty,
            'price' => $unit,
            'isTaxIncluded' => true,
            'taxName' => $taxName,
            'taxPercentage' => $taxPct,
            'saveToDb' => false,
            'isService' => false,
        ];
        if ($useStock) {
            $entry['warehouseName'] = $warehouse;
        }
        $products[] = $entry;
    }

    $shipping = round((float) $order['total_amount'] - $itemsSum, 2);
    if ($shipping > 0.009) {
        $products[] = [
            'name' => 'Transport curier',
            'code' => 'T000',
            'isDiscount' => false,
            'measuringUnitName' => $defaultUnit,
            'currency' => 'RON',
            'quantity' => 1,
            'price' => $shipping,
            'isTaxIncluded' => true,
            'taxName' => $taxName,
            'taxPercentage' => $taxPct,
            'saveToDb' => false,
            'isService' => true,
        ];
    }

    $billingType = (string) ($order['billing_type'] ?? 'person');
    $companyName = trim((string) ($order['company_name'] ?? ''));
    $companyCui = trim((string) ($order['company_cui'] ?? ''));
    $clientName = $billingType === 'company' && $companyName !== ''
        ? $companyName
        : (string) $order['customer_name'];

    // SmartBill respinge unele caractere speciale în nume.
    $clientName = preg_replace('/[^\p{L}\p{N}\s.\-\'&\/]/u', '', $clientName) ?? $clientName;
    $clientName = trim(preg_replace('/\s+/', ' ', $clientName) ?? $clientName);
    if ($clientName === '') {
        $clientName = 'Client';
    }

    $address = trim((string) ($order['customer_address'] ?? ''));
    $addressLines = preg_split('/\R+/', $address) ?: [];
    $streetLine = trim((string) ($addressLines[0] ?? $address));
    $city = '';
    $county = '';
    if (isset($addressLines[1])) {
        $cityLine = (string) $addressLines[1];
        if (preg_match('/^(.*?),\s*jud\.\s*(.+)$/iu', $cityLine, $m)) {
            $city = trim($m[1]);
            $county = trim($m[2]);
        } else {
            $city = trim($cityLine);
        }
    }

    $client = [
        'name' => $clientName,
        'address' => $streetLine !== '' ? $streetLine : $address,
        'city' => $city !== '' ? $city : 'Romania',
        'country' => 'Romania',
        'saveToDb' => false,
        'isTaxPayer' => false,
    ];
    if ($county !== '') {
        $client['county'] = $county;
    }
    $email = trim((string) ($order['customer_email'] ?? ''));
    if ($email !== '') {
        $client['email'] = $email;
    }
    $phone = trim((string) ($order['customer_phone'] ?? ''));
    if ($phone !== '') {
        $client['phone'] = $phone;
    }
    if ($billingType === 'company' && $companyCui !== '') {
        $normalized = shoptop_normalize_ro_cui($companyCui);
        $client['vatCode'] = $normalized;
        $client['isTaxPayer'] = true;
    }

    $today = date('Y-m-d');
    $payload = [
        'companyVatCode' => $settings['company_vat_code'],
        'client' => $client,
        'isDraft' => false,
        'issueDate' => $today,
        'dueDate' => $today,
        'deliveryDate' => $today,
        'seriesName' => $settings['series_name'],
        'currency' => 'RON',
        'language' => 'RO',
        'precision' => 2,
        'useStock' => $useStock,
        'products' => $products,
        'observations' => 'Comanda ShopTop ' . (string) $order['id'],
    ];

    $paymentMethod = (string) ($order['payment_method'] ?? 'cod');
    $paymentStatus = (string) ($order['payment_status'] ?? 'pending');
    if ($paymentStatus === 'paid') {
        if ($paymentMethod === 'card') {
            $payload['payment'] = [
                'value' => round((float) $order['total_amount'], 2),
                'type' => 'Card',
                'isCash' => false,
            ];
        } else {
            // Ramburs încasat de curier — tip SmartBill valid (nu „Ramburs”).
            $payload['payment'] = [
                'value' => round((float) $order['total_amount'], 2),
                'type' => 'Alta incasare',
                'isCash' => false,
            ];
        }
    }

    return $payload;
}

/**
 * Emite factura SmartBill pentru o comandă.
 *
 * @param array{force?:bool,sendEmail?:bool} $opts
 * @return array{series:string,number:string,url:?string}
 */
function shoptop_smartbill_emit_invoice(PDO $pdo, string $orderId, array $opts = []): array
{
    if (!shoptop_smartbill_enabled()) {
        throw new RuntimeException('SmartBill nu este configurat.');
    }
    if (!shoptop_column_exists_smartbill($pdo, 'orders', 'invoice_series')) {
        throw new RuntimeException(
            'Lipesc coloanele de factură pe orders. Rulează sql/migrate-smartbill-invoices-server.sql.'
        );
    }

    $force = ($opts['force'] ?? false) === true;
    $settings = shoptop_smartbill_settings();
    $sendEmail = array_key_exists('sendEmail', $opts)
        ? ($opts['sendEmail'] === true)
        : $settings['send_email'];

    $checkCols = ['customer_email', 'customer_name'];
    if (shoptop_column_exists_smartbill($pdo, 'orders', 'invoice_series')) {
        $checkCols = ['invoice_series', 'invoice_number', 'customer_email', 'customer_name'];
    }
    $check = $pdo->prepare(
        'SELECT ' . implode(', ', $checkCols) . '
         FROM orders WHERE id = :id LIMIT 1'
    );
    $check->execute(['id' => $orderId]);
    $row = $check->fetch();
    if (!$row) {
        throw new RuntimeException('Comanda nu a fost găsită.');
    }

    $existingSeries = trim((string) ($row['invoice_series'] ?? ''));
    $existingNumber = trim((string) ($row['invoice_number'] ?? ''));
    if (!$force && $existingSeries !== '' && $existingNumber !== '') {
        return [
            'series' => $existingSeries,
            'number' => $existingNumber,
            'url' => null,
        ];
    }

    if ($force && $existingSeries !== '' && $existingNumber !== '') {
        // Reemitere: ștergem referința locală; documentul vechi rămâne în SmartBill
        // (admin îl anulează manual acolo dacă e nevoie).
        $clear = $pdo->prepare(
            'UPDATE orders
             SET invoice_series = NULL, invoice_number = NULL, invoice_url = NULL,
                 invoice_issued_at = NULL, invoice_error = NULL
             WHERE id = :id'
        );
        $clear->execute(['id' => $orderId]);
    }

    $payload = shoptop_smartbill_build_invoice_payload($pdo, $orderId);
    $result = shoptop_smartbill_request('POST', 'invoice', $payload);

    if (!$result['ok'] || !is_array($result['json'])) {
        $err = $result['error'] ?? 'Emitere factură eșuată.';
        shoptop_smartbill_save_invoice_error($pdo, $orderId, $err);
        throw new RuntimeException($err);
    }

    $series = trim((string) ($result['json']['series'] ?? $settings['series_name']));
    $number = trim((string) ($result['json']['number'] ?? ''));
    $url = isset($result['json']['url']) ? trim((string) $result['json']['url']) : '';

    if ($number === '') {
        $err = 'SmartBill nu a returnat numărul facturii.';
        shoptop_smartbill_save_invoice_error($pdo, $orderId, $err);
        throw new RuntimeException($err);
    }

    $update = $pdo->prepare(
        'UPDATE orders
         SET invoice_series = :series,
             invoice_number = :number,
             invoice_url = :url,
             invoice_issued_at = NOW(),
             invoice_error = NULL'
        . (
            shoptop_column_exists_smartbill($pdo, 'orders', 'invoice_storno_number')
                ? ',
             invoice_storno_series = NULL,
             invoice_storno_number = NULL,
             invoice_storno_at = NULL'
                : ''
        )
        . '
         WHERE id = :id'
    );
    $update->execute([
        'series' => $series,
        'number' => $number,
        'url' => $url !== '' ? $url : null,
        'id' => $orderId,
    ]);

    if ($sendEmail) {
        $email = trim((string) ($row['customer_email'] ?? ''));
        if ($email !== '') {
            try {
                shoptop_smartbill_send_invoice_email(
                    $series,
                    $number,
                    $email,
                    $orderId,
                    trim((string) ($row['customer_name'] ?? '')),
                );
            } catch (Throwable $e) {
                error_log('Invoice email to customer: ' . $e->getMessage());
                shoptop_smartbill_save_invoice_error(
                    $pdo,
                    $orderId,
                    'Factură emisă, dar emailul către client a eșuat: ' . $e->getMessage()
                );
            }
        }
    }

    return [
        'series' => $series,
        'number' => $number,
        'url' => $url !== '' ? $url : null,
    ];
}

/**
 * Încearcă emiterea automată; nu aruncă excepții către caller.
 * Folosit la livrare DPD (vezi shoptop_smartbill_on_courier_delivered).
 */
function shoptop_smartbill_try_auto_emit(PDO $pdo, string $orderId): void
{
    if (!shoptop_smartbill_enabled()) {
        return;
    }
    $settings = shoptop_smartbill_settings();
    if (!$settings['auto_emit']) {
        return;
    }

    try {
        shoptop_smartbill_emit_invoice($pdo, $orderId, [
            'force' => false,
            'sendEmail' => $settings['send_email'],
        ]);
    } catch (Throwable $e) {
        error_log('SmartBill auto-emit ' . $orderId . ': ' . $e->getMessage());
        shoptop_smartbill_save_invoice_error($pdo, $orderId, $e->getMessage());
    }
}

/**
 * Hook curier: la livrare marchează rambursul ca plătit și emite factura SmartBill.
 * Idempotent — dacă factura există deja, emiterea e no-op.
 */
function shoptop_smartbill_on_courier_delivered(PDO $pdo, string $orderId): void
{
    if (!shoptop_smartbill_enabled()) {
        return;
    }

    try {
        shoptop_smartbill_emit_invoice($pdo, $orderId, [
            'force' => false,
            'sendEmail' => shoptop_smartbill_settings()['send_email'],
        ]);
    } catch (Throwable $e) {
        error_log('SmartBill on delivered ' . $orderId . ': ' . $e->getMessage());
        shoptop_smartbill_save_invoice_error($pdo, $orderId, $e->getMessage());
    }
}

/**
 * Descarcă PDF-ul din SmartBill și îl trimite clientului pe SMTP ShopTop.
 */
function shoptop_smartbill_send_invoice_email(
    string $series,
    string $number,
    string $toEmail,
    string $orderId = '',
    string $customerName = '',
): void {
    $toEmail = trim($toEmail);
    if ($toEmail === '' || !filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('Email client invalid.');
    }

    $pdf = shoptop_smartbill_invoice_pdf($series, $number);
    if ($pdf === '') {
        throw new RuntimeException('PDF-ul facturii este gol.');
    }

    require_once __DIR__ . '/mailer.php';
    $rendered = shoptop_render_invoice_email($orderId, $customerName, $series, $number);
    $filename = 'factura-' . preg_replace('/[^A-Za-z0-9_-]+/', '-', $series . '-' . $number) . '.pdf';
    $ok = shoptop_send_mail(
        $toEmail,
        $rendered['subject'],
        $rendered['html'],
        null,
        null,
        [
            [
                'filename' => $filename,
                'content' => $pdf,
                'mime' => 'application/pdf',
            ],
        ]
    );
    if (!$ok) {
        throw new RuntimeException('Trimiterea emailului cu factura a eșuat.');
    }
}

/**
 * @return string binary PDF content
 */
function shoptop_smartbill_invoice_pdf(string $series, string $number): string
{
    $settings = shoptop_smartbill_settings();
    $query = http_build_query([
        'cif' => $settings['company_vat_code'],
        'seriesname' => $series,
        'number' => $number,
    ]);
    $result = shoptop_smartbill_request('GET', 'invoice/pdf?' . $query, null, true);
    if (!$result['ok'] || $result['raw'] === '') {
        throw new RuntimeException($result['error'] ?? 'Nu am putut descărca PDF-ul facturii.');
    }
    return $result['raw'];
}
