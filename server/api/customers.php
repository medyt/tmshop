<?php

declare(strict_types=1);

/**
 * Clienți (admin). Clienții sunt derivați din comenzi: un client = un telefon
 * normalizat (sau, fără telefon, un email). Peste ei se pun datele manuale din
 * `customer_meta` (notițe, blacklist, etichete) și contul din `users`.
 *
 * GET  customers.php              -> lista clienți (agregat)
 * GET  customers.php?key=...      -> detaliu + istoric comenzi
 * GET  customers.php?export=csv   -> CSV (Excel) cu toate câmpurile
 * POST {action:'updateMeta', key, notes, blacklisted, tags}
 */

require_once __DIR__ . '/lib.php';

shoptop_send_cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

shoptop_require_admin();
$pdo = shoptop_pdo();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function shoptop_customer_meta_available(PDO $pdo): bool
{
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }
    $stmt = $pdo->prepare(
        "SELECT 1 FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_meta' LIMIT 1"
    );
    $stmt->execute();
    $cached = (bool) $stmt->fetchColumn();
    return $cached;
}

/** Cheia clientului: telefon (10 cifre) sau email lowercase. */
function shoptop_customer_key(string $phone, string $email): string
{
    $digits = preg_replace('/\D+/', '', $phone) ?? '';
    if (strlen($digits) >= 9) {
        // 0040xxxxxxxxx / 40xxxxxxxxx -> 0xxxxxxxxx
        if (str_starts_with($digits, '0040')) {
            $digits = '0' . substr($digits, 4);
        } elseif (str_starts_with($digits, '40') && strlen($digits) === 11) {
            $digits = '0' . substr($digits, 2);
        }
        return 'tel:' . $digits;
    }
    $mail = strtolower(trim($email));
    if ($mail !== '') {
        return 'email:' . $mail;
    }
    return '';
}

/** „Prenume Nume” -> [prenume, nume]. */
function shoptop_split_customer_name(string $full): array
{
    $parts = preg_split('/\s+/u', trim($full)) ?: [];
    $parts = array_values(array_filter($parts, static fn ($p) => $p !== ''));
    if ($parts === []) {
        return ['', ''];
    }
    if (count($parts) === 1) {
        return [$parts[0], ''];
    }
    return [$parts[0], implode(' ', array_slice($parts, 1))];
}

function shoptop_customer_countable_status(string $status): bool
{
    return !in_array($status, ['cancelled', 'returned'], true);
}

/**
 * Agregă clienții din comenzi. Returnează map key => client.
 *
 * @return array<string, array<string, mixed>>
 */
function shoptop_customers_aggregate(PDO $pdo): array
{
    $cols = [
        'id', 'user_id', 'customer_name', 'customer_email', 'customer_phone', 'customer_address',
        'total_amount', 'status', 'created_at',
    ];
    foreach ([
        'payment_method', 'payment_status', 'awb_number',
        'billing_type', 'company_name', 'company_cui', 'company_reg_com',
        'ship_county', 'ship_county_name', 'ship_city', 'ship_street',
        'ship_street_number', 'ship_address_extra', 'ship_postal_code',
        'return_received',
    ] as $extra) {
        if (shoptop_column_exists_customers($pdo, 'orders', $extra)) {
            $cols[] = $extra;
        }
    }
    $where = '';
    if (in_array('payment_method', $cols, true) && in_array('payment_status', $cols, true)) {
        $where = ' WHERE ' . shoptop_sql_exclude_unpaid_card_drafts();
    }
    $rows = $pdo->query(
        'SELECT ' . implode(', ', $cols) . ' FROM orders' . $where . ' ORDER BY created_at ASC'
    )->fetchAll();

    // Conturi client: după user_id și după email.
    $usersById = [];
    $usersByEmail = [];
    foreach ($pdo->query('SELECT id, email, role, created_at FROM users')->fetchAll() as $u) {
        $usersById[(string) $u['id']] = $u;
        $usersByEmail[strtolower((string) $u['email'])] = $u;
    }

    $customers = [];
    foreach ($rows as $row) {
        $phone = (string) ($row['customer_phone'] ?? '');
        $email = (string) ($row['customer_email'] ?? '');
        $key = shoptop_customer_key($phone, $email);
        if ($key === '') {
            $key = 'name:' . strtolower(trim((string) $row['customer_name']));
        }
        $status = (string) ($row['status'] ?? 'new');
        $returned = $status === 'returned' || !empty($row['return_received']);
        $countable = shoptop_customer_countable_status($status);
        $total = (float) $row['total_amount'];
        $createdAt = (string) $row['created_at'];

        if (!isset($customers[$key])) {
            [$first, $last] = shoptop_split_customer_name((string) $row['customer_name']);
            $customers[$key] = [
                'key' => $key,
                'name' => (string) $row['customer_name'],
                'firstName' => $first,
                'lastName' => $last,
                'email' => '',
                'phone' => '',
                'address' => '',
                'county' => '',
                'countyName' => '',
                'city' => '',
                'street' => '',
                'streetNumber' => '',
                'addressExtra' => '',
                'postalCode' => '',
                'billingType' => 'person',
                'companyName' => '',
                'companyCui' => '',
                'companyRegCom' => '',
                'ordersCount' => 0,
                'countableOrders' => 0,
                'cancelledOrders' => 0,
                'returnedOrders' => 0,
                'totalSpent' => 0.0,
                'firstOrderAt' => $createdAt,
                'lastOrderAt' => $createdAt,
                'lastOrderId' => (string) $row['id'],
                'lastStatus' => $status,
                'lastPaymentMethod' => (string) ($row['payment_method'] ?? 'cod'),
                'hasAccount' => false,
                'accountEmail' => '',
                'accountCreatedAt' => '',
                'cities' => [],
                'notes' => '',
                'blacklisted' => false,
                'tags' => '',
            ];
        }
        $c = &$customers[$key];
        $c['ordersCount']++;
        if ($countable) {
            $c['countableOrders']++;
            $c['totalSpent'] += $total;
        }
        if ($status === 'cancelled') {
            $c['cancelledOrders']++;
        }
        if ($returned) {
            $c['returnedOrders']++;
        }
        // Rândurile vin cronologic: ultimul câștigă pentru datele de contact/adresă.
        if ($createdAt >= $c['lastOrderAt']) {
            $c['lastOrderAt'] = $createdAt;
            $c['lastOrderId'] = (string) $row['id'];
            $c['lastStatus'] = $status;
            $c['lastPaymentMethod'] = (string) ($row['payment_method'] ?? 'cod');
            $c['name'] = (string) $row['customer_name'];
            [$c['firstName'], $c['lastName']] = shoptop_split_customer_name((string) $row['customer_name']);
            if (trim($phone) !== '') {
                $c['phone'] = trim($phone);
            }
            if (trim($email) !== '') {
                $c['email'] = trim($email);
            }
            $c['address'] = (string) ($row['customer_address'] ?? '');
            foreach ([
                'county' => 'ship_county', 'countyName' => 'ship_county_name', 'city' => 'ship_city',
                'street' => 'ship_street', 'streetNumber' => 'ship_street_number',
                'addressExtra' => 'ship_address_extra', 'postalCode' => 'ship_postal_code',
            ] as $out => $col) {
                if (!empty($row[$col])) {
                    $c[$out] = (string) $row[$col];
                }
            }
            if (($row['billing_type'] ?? 'person') === 'company') {
                $c['billingType'] = 'company';
                $c['companyName'] = (string) ($row['company_name'] ?? '');
                $c['companyCui'] = (string) ($row['company_cui'] ?? '');
                $c['companyRegCom'] = (string) ($row['company_reg_com'] ?? '');
            }
        }
        if ($c['firstOrderAt'] > $createdAt) {
            $c['firstOrderAt'] = $createdAt;
        }
        if ($c['email'] === '' && trim($email) !== '') {
            $c['email'] = trim($email);
        }
        if ($c['phone'] === '' && trim($phone) !== '') {
            $c['phone'] = trim($phone);
        }
        if (!empty($row['ship_city'])) {
            $c['cities'][(string) $row['ship_city']] = true;
        }

        $user = null;
        if (!empty($row['user_id']) && isset($usersById[(string) $row['user_id']])) {
            $user = $usersById[(string) $row['user_id']];
        } elseif ($email !== '' && isset($usersByEmail[strtolower(trim($email))])) {
            $user = $usersByEmail[strtolower(trim($email))];
        }
        if ($user !== null && ($user['role'] ?? '') !== 'admin') {
            $c['hasAccount'] = true;
            $c['accountEmail'] = (string) $user['email'];
            $c['accountCreatedAt'] = (string) ($user['created_at'] ?? '');
        }
        unset($c);
    }

    // Conturi fără nicio comandă: apar și ele (utilizatori fără comenzi).
    foreach ($usersByEmail as $mail => $u) {
        if (($u['role'] ?? '') === 'admin') {
            continue;
        }
        $key = 'email:' . $mail;
        $exists = false;
        foreach ($customers as $c) {
            if ($c['hasAccount'] && strtolower($c['accountEmail']) === $mail) {
                $exists = true;
                break;
            }
        }
        if ($exists || isset($customers[$key])) {
            continue;
        }
        $customers[$key] = [
            'key' => $key, 'name' => (string) $u['email'], 'firstName' => '', 'lastName' => '',
            'email' => (string) $u['email'], 'phone' => '', 'address' => '',
            'county' => '', 'countyName' => '', 'city' => '', 'street' => '', 'streetNumber' => '',
            'addressExtra' => '', 'postalCode' => '', 'billingType' => 'person',
            'companyName' => '', 'companyCui' => '', 'companyRegCom' => '',
            'ordersCount' => 0, 'countableOrders' => 0, 'cancelledOrders' => 0, 'returnedOrders' => 0,
            'totalSpent' => 0.0, 'firstOrderAt' => '', 'lastOrderAt' => '', 'lastOrderId' => '',
            'lastStatus' => '', 'lastPaymentMethod' => '', 'hasAccount' => true,
            'accountEmail' => (string) $u['email'], 'accountCreatedAt' => (string) ($u['created_at'] ?? ''),
            'cities' => [], 'notes' => '', 'blacklisted' => false, 'tags' => '',
        ];
    }

    // Meta manuală.
    if (shoptop_customer_meta_available($pdo)) {
        foreach ($pdo->query('SELECT customer_key, notes, blacklisted, tags FROM customer_meta')->fetchAll() as $m) {
            $k = (string) $m['customer_key'];
            if (!isset($customers[$k])) {
                continue;
            }
            $customers[$k]['notes'] = (string) ($m['notes'] ?? '');
            $customers[$k]['blacklisted'] = !empty($m['blacklisted']);
            $customers[$k]['tags'] = (string) ($m['tags'] ?? '');
        }
    }

    foreach ($customers as &$c) {
        $c['cities'] = array_keys($c['cities']);
        $c['totalSpent'] = round((float) $c['totalSpent'], 2);
    }
    unset($c);

    uasort($customers, static fn ($a, $b) => strcmp((string) $b['lastOrderAt'], (string) $a['lastOrderAt']));
    return $customers;
}

function shoptop_column_exists_customers(PDO $pdo, string $table, string $column): bool
{
    static $cache = [];
    $k = $table . '.' . $column;
    if (array_key_exists($k, $cache)) {
        return $cache[$k];
    }
    $stmt = $pdo->prepare(
        'SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND COLUMN_NAME = :c LIMIT 1'
    );
    $stmt->execute(['t' => $table, 'c' => $column]);
    $cache[$k] = (bool) $stmt->fetchColumn();
    return $cache[$k];
}

/** Comenzile unui client (după cheie), cu produse. */
function shoptop_customer_orders(PDO $pdo, string $key): array
{
    $all = $pdo->query(
        'SELECT id, customer_name, customer_email, customer_phone, total_amount, status,
                created_at' .
        (shoptop_column_exists_customers($pdo, 'orders', 'payment_method') ? ', payment_method, payment_status' : '') .
        (shoptop_column_exists_customers($pdo, 'orders', 'awb_number') ? ', awb_number' : '') .
        (shoptop_column_exists_customers($pdo, 'orders', 'delivery_carrier') ? ', delivery_carrier' : '') .
        (shoptop_column_exists_customers($pdo, 'orders', 'courier_status') ? ', courier_status' : '') .
        ' FROM orders ORDER BY created_at DESC'
    )->fetchAll();
    $orders = [];
    foreach ($all as $row) {
        $k = shoptop_customer_key((string) $row['customer_phone'], (string) ($row['customer_email'] ?? ''));
        if ($k === '') {
            $k = 'name:' . strtolower(trim((string) $row['customer_name']));
        }
        if ($k !== $key) {
            continue;
        }
        $orders[(string) $row['id']] = [
            'id' => (string) $row['id'],
            'createdAt' => (string) $row['created_at'],
            'status' => (string) $row['status'],
            'paymentMethod' => (string) ($row['payment_method'] ?? 'cod'),
            'paymentStatus' => (string) ($row['payment_status'] ?? 'pending'),
            'totalAmount' => (float) $row['total_amount'],
            'awbNumber' => (string) ($row['awb_number'] ?? ''),
            'deliveryCarrier' => (string) ($row['delivery_carrier'] ?? ''),
            'courierStatus' => (string) ($row['courier_status'] ?? ''),
            'items' => [],
        ];
    }
    if ($orders !== []) {
        $ids = array_keys($orders);
        $ph = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $pdo->prepare(
            'SELECT order_id, product_id, product_name, product_sku, quantity, line_total
             FROM order_items WHERE order_id IN (' . $ph . ') ORDER BY id ASC'
        );
        $stmt->execute($ids);
        foreach ($stmt->fetchAll() as $it) {
            $orders[(string) $it['order_id']]['items'][] = [
                'productId' => (string) $it['product_id'],
                'productName' => (string) $it['product_name'],
                'productSku' => (string) ($it['product_sku'] ?? ''),
                'quantity' => (int) $it['quantity'],
                'lineTotal' => (float) $it['line_total'],
            ];
        }
    }
    return array_values($orders);
}

if ($method === 'GET') {
    header('Cache-Control: no-store');
    $customers = shoptop_customers_aggregate($pdo);

    $key = isset($_GET['key']) && is_string($_GET['key']) ? trim($_GET['key']) : '';
    if ($key !== '') {
        if (!isset($customers[$key])) {
            shoptop_json_error('Clientul nu a fost gasit.', 404);
        }
        $out = $customers[$key];
        $out['orders'] = shoptop_customer_orders($pdo, $key);
        shoptop_json_response($out);
    }

    $export = isset($_GET['export']) ? strtolower((string) $_GET['export']) : '';
    if ($export === 'csv') {
        $columns = [
            'Prenume' => 'firstName', 'Nume' => 'lastName', 'Nume complet' => 'name',
            'Email' => 'email', 'Telefon' => 'phone',
            'Cont client' => 'hasAccount', 'Email cont' => 'accountEmail', 'Cont creat la' => 'accountCreatedAt',
            'Judet' => 'countyName', 'Cod judet' => 'county', 'Localitate' => 'city',
            'Strada' => 'street', 'Numar' => 'streetNumber', 'Detalii adresa' => 'addressExtra',
            'Cod postal' => 'postalCode', 'Adresa completa' => 'address',
            'Tip facturare' => 'billingType', 'Firma' => 'companyName', 'CUI' => 'companyCui', 'Reg. Com.' => 'companyRegCom',
            'Nr comenzi' => 'ordersCount', 'Comenzi valide' => 'countableOrders',
            'Comenzi anulate' => 'cancelledOrders', 'Comenzi returnate' => 'returnedOrders',
            'Total cheltuit (RON)' => 'totalSpent', 'Prima comanda' => 'firstOrderAt',
            'Ultima comanda' => 'lastOrderAt', 'Ultima comanda ID' => 'lastOrderId', 'Ultimul status' => 'lastStatus',
            'Ultima plata' => 'lastPaymentMethod', 'Localitati' => 'cities',
            'Blacklist' => 'blacklisted', 'Etichete' => 'tags', 'Notite' => 'notes', 'Cheie' => 'key',
        ];
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="clienti-shoptop-' . date('Y-m-d') . '.csv"');
        $out = fopen('php://output', 'w');
        fwrite($out, "\xEF\xBB\xBF"); // BOM: Excel deschide direct cu diacritice
        fputcsv($out, array_keys($columns), ';');
        foreach ($customers as $c) {
            $line = [];
            foreach ($columns as $field) {
                $v = $c[$field] ?? '';
                if (is_bool($v)) {
                    $v = $v ? 'da' : 'nu';
                } elseif (is_array($v)) {
                    $v = implode(', ', $v);
                } elseif ($field === 'totalSpent') {
                    $v = number_format((float) $v, 2, ',', '');
                } elseif ($field === 'billingType') {
                    $v = $v === 'company' ? 'firma' : 'persoana fizica';
                }
                $line[] = (string) $v;
            }
            fputcsv($out, $line, ';');
        }
        fclose($out);
        exit;
    }

    shoptop_json_response([
        'customers' => array_values($customers),
        'metaAvailable' => shoptop_customer_meta_available($pdo),
    ]);
}

if ($method === 'POST') {
    $body = shoptop_read_json_body();
    if (!is_array($body)) {
        shoptop_json_error('Corpul cererii trebuie sa fie JSON.', 400);
    }
    $action = trim((string) ($body['action'] ?? ''));
    if ($action !== 'updateMeta') {
        shoptop_json_error('Actiune necunoscuta.', 400);
    }
    if (!shoptop_customer_meta_available($pdo)) {
        shoptop_json_error(
            'Tabelul customer_meta lipseste. Ruleaza sql/migrate-customer-meta(-server).sql.',
            409
        );
    }
    $key = trim((string) ($body['key'] ?? ''));
    if ($key === '' || strlen($key) > 190) {
        shoptop_json_error('Cheia clientului este invalida.', 400);
    }
    $notes = trim((string) ($body['notes'] ?? ''));
    $tags = trim((string) ($body['tags'] ?? ''));
    $blacklisted = !empty($body['blacklisted']) ? 1 : 0;
    $stmt = $pdo->prepare(
        'INSERT INTO customer_meta (customer_key, notes, blacklisted, tags)
         VALUES (:k, :n, :b, :t)
         ON DUPLICATE KEY UPDATE notes = VALUES(notes), blacklisted = VALUES(blacklisted), tags = VALUES(tags)'
    );
    $stmt->execute(['k' => $key, 'n' => $notes !== '' ? $notes : null, 'b' => $blacklisted, 't' => $tags !== '' ? $tags : null]);
    shoptop_json_response(['ok' => true, 'key' => $key, 'notes' => $notes, 'blacklisted' => $blacklisted === 1, 'tags' => $tags]);
}

shoptop_json_error('Metoda HTTP nu este suportata.', 405);
