<?php

declare(strict_types=1);

function shoptop_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $path = __DIR__ . '/config.php';
    if (!is_file($path)) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'error' => 'Lipseste server/api/config.php. Copiaza config.example.php.',
        ]);
        exit;
    }

    $config = require $path;
    return $config;
}

function shoptop_pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $db = shoptop_config()['db'];
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        $db['host'],
        $db['name'],
        $db['charset']
    );

    $pdo = new PDO($dsn, $db['user'], $db['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

/**
 * Addon-uri checkout ca produse cu SKU (S000/D000/A000/L000).
 * Nu scad stoc; pe comenzi apar pe AWB/factură/BaseLinker.
 * Prețul / numele se citesc din `products` când e dat $pdo (editabile în Gestiune).
 *
 * @return array<string, array{product_id:string,product_sku:string,product_name:string,price:float}>
 */
function shoptop_checkout_addons_catalog(?PDO $pdo = null): array
{
    $catalog = [
        'gift' => [
            'product_id' => 'S000',
            'product_sku' => 'S000',
            'product_name' => 'Produs surpriza',
            'price' => 15.0,
        ],
        'packageOpening' => [
            'product_id' => 'D000',
            'product_sku' => 'D000',
            'product_name' => 'Deschidere colet',
            'price' => 4.99,
        ],
        'packageInsurance' => [
            'product_id' => 'A000',
            'product_sku' => 'A000',
            'product_name' => 'Garantie extinsa 1 an',
            'price' => 19.99,
        ],
        'priorityShipping' => [
            'product_id' => 'L000',
            'product_sku' => 'L000',
            'product_name' => 'Livrare prioritata',
            'price' => 4.99,
        ],
    ];

    if ($pdo === null) {
        return $catalog;
    }

    $ids = [];
    foreach ($catalog as $addon) {
        $ids[] = (string) $addon['product_id'];
    }
    $ids = array_values(array_unique($ids));
    if ($ids === []) {
        return $catalog;
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare(
        'SELECT id, name, sku, sale_price
         FROM products
         WHERE id IN (' . $placeholders . ')'
    );
    $stmt->execute($ids);
    $byId = [];
    foreach ($stmt->fetchAll() as $row) {
        $byId[(string) $row['id']] = $row;
    }

    foreach ($catalog as $key => $addon) {
        $row = $byId[$addon['product_id']] ?? null;
        if ($row === null) {
            continue;
        }
        $price = (float) $row['sale_price'];
        if (is_finite($price) && $price >= 0) {
            $catalog[$key]['price'] = $price;
        }
        $name = trim((string) ($row['name'] ?? ''));
        if ($name !== '') {
            $catalog[$key]['product_name'] = $name;
        }
        $sku = trim((string) ($row['sku'] ?? ''));
        if ($sku !== '') {
            $catalog[$key]['product_sku'] = $sku;
        }
    }

    return $catalog;
}

function shoptop_is_virtual_product_id(string $productId): bool
{
    static $ids = null;
    if ($ids === null) {
        $ids = [
            'S000' => true,
            'D000' => true,
            'A000' => true,
            'L000' => true,
            'T000' => true,
            'SHOPTOP-GIFT-ADDON' => true,
            'SHOPTOP-PACKAGE-OPENING' => true,
            'SHOPTOP-WARRANTY-5Y' => true,
            'SHOPTOP-PACKAGE-INSURANCE' => true,
            'SHOPTOP-PRIORITY-SHIPPING' => true,
        ];
        foreach (shoptop_checkout_addons_catalog() as $addon) {
            $pid = strtoupper(trim((string) $addon['product_id']));
            $psku = strtoupper(trim((string) ($addon['product_sku'] ?? '')));
            if ($pid !== '') {
                $ids[$pid] = true;
            }
            if ($psku !== '') {
                $ids[$psku] = true;
            }
        }
    }

    $key = strtoupper(trim($productId));
    return $key !== '' && isset($ids[$key]);
}

/** Verifică id sau SKU (produsul „Transport curier” poate avea id ≠ T000). */
function shoptop_is_virtual_product_row(array $row): bool
{
    $id = (string) ($row['id'] ?? '');
    $sku = (string) ($row['sku'] ?? '');
    return shoptop_is_virtual_product_id($id) || shoptop_is_virtual_product_id($sku);
}

function shoptop_send_cors(): void
{
    $configuredOrigin = trim((string) (shoptop_config()['cors_origin'] ?? ''));
    $requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $origin = $configuredOrigin !== '' && $configuredOrigin !== '*'
        ? $configuredOrigin
        : $requestOrigin;

    if ($origin !== '') {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
        header('Vary: Origin');
    }

    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}

function shoptop_is_https_request(): bool
{
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        return true;
    }
    if (isset($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443) {
        return true;
    }
    $fwd = strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''));
    if ($fwd === 'https' || str_starts_with($fwd, 'https,')) {
        return true;
    }
    $front = strtolower((string) ($_SERVER['HTTP_FRONT_END_HTTPS'] ?? ''));
    return $front === 'on' || $front === '1';
}

function shoptop_session_lifetime_seconds(): int
{
    $cfg = shoptop_config();
    $days = isset($cfg['session_lifetime_days'])
        ? (int) $cfg['session_lifetime_days']
        : 30;
    // Minim 1 zi, maxim 365 zile.
    $days = max(1, min(365, $days));
    return $days * 86400;
}

/**
 * Director local pentru fișierele de sesiune — pe hosting shared, /tmp e curățat
 * de alte site-uri cu gc_maxlifetime ~24 min (cauza tipică a delogării rapide).
 */
function shoptop_session_save_path(): string
{
    $dir = __DIR__ . '/sessions';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    return $dir;
}

function shoptop_session_cookie_options(int $expires): array
{
    return [
        'expires' => $expires,
        'path' => '/',
        'secure' => shoptop_is_https_request(),
        'httponly' => true,
        'samesite' => 'Lax',
    ];
}

function shoptop_refresh_session_cookie(): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        return;
    }
    $lifetime = shoptop_session_lifetime_seconds();
    // Expirare absolută pe cookie + touch pe fișierul de sesiune.
    setcookie(
        session_name(),
        (string) session_id(),
        shoptop_session_cookie_options(time() + $lifetime)
    );
    $_SESSION['_touched_at'] = time();
}

function shoptop_start_session(): void
{
    $lifetime = shoptop_session_lifetime_seconds();

    if (session_status() !== PHP_SESSION_ACTIVE) {
        // Implicit PHP e ~24 min — pe shared hosting alte app-uri șterg sesiunile din /tmp.
        ini_set('session.gc_maxlifetime', (string) $lifetime);
        ini_set('session.cookie_lifetime', (string) $lifetime);
        // GC mai agresiv în directorul nostru (nu afectează alte site-uri).
        ini_set('session.gc_probability', '1');
        ini_set('session.gc_divisor', '100');

        $savePath = shoptop_session_save_path();
        if (is_dir($savePath) && is_writable($savePath)) {
            session_save_path($savePath);
        }

        session_name('shoptop_session');
        session_set_cookie_params([
            'lifetime' => $lifetime,
            'path' => '/',
            'secure' => shoptop_is_https_request(),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }

    // Fereastră glisantă: fiecare request autentificat prelungește cookie-ul.
    if (!empty($_SESSION['user_id'])) {
        shoptop_refresh_session_cookie();
    }
}

/**
 * Eliberează lock-ul pe fișierul de sesiune.
 * Fără asta, request-urile paralele din admin (produse + comenzi + statistici)
 * stau blocate pe același session file și LiteSpeed poate răspunde 503.
 */
function shoptop_release_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }
}

/** După login/register: ID nou de sesiune + cookie lung. */
function shoptop_establish_user_session(string $userId, string $role): void
{
    shoptop_start_session();
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_regenerate_id(true);
    }
    $_SESSION['user_id'] = $userId;
    $_SESSION['user_role'] = $role;
    shoptop_refresh_session_cookie();
}

function shoptop_user_to_response(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'email' => (string) $row['email'],
        'role' => (string) $row['role'],
    ];
}

function shoptop_current_user(): ?array
{
    static $cached = false;
    static $cachedUser = null;
    if ($cached) {
        return $cachedUser;
    }

    shoptop_start_session();
    $userId = $_SESSION['user_id'] ?? null;
    if (!is_string($userId) || trim($userId) === '') {
        shoptop_release_session();
        $cached = true;
        $cachedUser = null;
        return null;
    }

    $stmt = shoptop_pdo()->prepare(
        'SELECT id, email, role FROM users WHERE id = :id LIMIT 1'
    );
    $stmt->execute(['id' => trim($userId)]);
    $row = $stmt->fetch();
    if (!$row) {
        unset($_SESSION['user_id'], $_SESSION['user_role']);
        shoptop_release_session();
        $cached = true;
        $cachedUser = null;
        return null;
    }

    $cachedUser = shoptop_user_to_response($row);
    shoptop_release_session();
    $cached = true;
    return $cachedUser;
}

function shoptop_require_auth(): array
{
    $user = shoptop_current_user();
    if ($user === null) {
        shoptop_json_error('Autentificare necesara.', 401);
    }

    return $user;
}

function shoptop_require_admin(): array
{
    $user = shoptop_require_auth();
    if (($user['role'] ?? '') !== 'admin') {
        shoptop_json_error('Acces interzis.', 403);
    }

    return $user;
}

function shoptop_normalize_email(string $email): string
{
    return strtolower(trim($email));
}

/** Telefon RO: doar cifre. */
function shoptop_normalize_ro_phone(string $raw): string
{
    return preg_replace('/\D+/', '', trim($raw)) ?? '';
}

/** Telefon RO valid: exact 10 cifre, începe cu 0. */
function shoptop_validate_ro_phone(string $raw): bool
{
    $phone = shoptop_normalize_ro_phone($raw);
    return strlen($phone) === 10 && str_starts_with($phone, '0');
}

function shoptop_user_id(): string
{
    return 'usr-' . bin2hex(random_bytes(8));
}

function shoptop_read_json_body(): mixed
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return null;
    }

    $decoded = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        shoptop_json_error('JSON invalid.', 400);
    }

    return $decoded;
}

function shoptop_json_error(string $message, int $status = 400): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => $message]);
    exit;
}

function shoptop_json_response(mixed $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function shoptop_normalize_image_url(string $url): string
{
    $trimmed = trim($url);
    if ($trimmed === '') {
        return $trimmed;
    }
    if (str_starts_with($trimmed, 'data:')) {
        return $trimmed;
    }
    if (str_starts_with($trimmed, 'http://')) {
        return 'https://' . substr($trimmed, strlen('http://'));
    }
    if (str_starts_with($trimmed, '//')) {
        return 'https:' . $trimmed;
    }
    if (str_starts_with($trimmed, '/seed-')) {
        return '/images' . $trimmed;
    }

    return $trimmed;
}

function shoptop_normalize_image_urls(array $urls): array
{
    $seen = [];
    $normalized = [];

    foreach ($urls as $url) {
        if (!is_string($url)) {
            continue;
        }

        $value = shoptop_normalize_image_url($url);
        if ($value === '' || isset($seen[$value])) {
            continue;
        }

        $seen[$value] = true;
        $normalized[] = $value;
    }

    return $normalized;
}

function shoptop_is_admin_user(): bool
{
    $user = shoptop_current_user();

    return $user !== null && ($user['role'] ?? '') === 'admin';
}

function shoptop_shipping_flat_rate(): float
{
    $config = shoptop_config();
    if (isset($config['shipping_flat_rate']) && is_numeric($config['shipping_flat_rate'])) {
        return max(0.0, round((float) $config['shipping_flat_rate'], 2));
    }

    return 19.99;
}

/** Prag subtotal (produse) de la care livrarea e 0. 0 = dezactivat. */
function shoptop_shipping_free_over(): float
{
    $config = shoptop_config();
    if (!array_key_exists('shipping_free_over', $config)) {
        return 0.0;
    }
    $raw = $config['shipping_free_over'];
    if ($raw === null || $raw === false || $raw === '') {
        return 0.0;
    }
    if (is_numeric($raw)) {
        return max(0.0, round((float) $raw, 2));
    }

    return 99.0;
}

function shoptop_shipping_cost_for_subtotal(float $subtotal): float
{
    $threshold = shoptop_shipping_free_over();
    if ($threshold > 0 && $subtotal + 0.009 >= $threshold) {
        return 0.0;
    }

    return shoptop_shipping_flat_rate();
}

/** Marjă minimă (sale − purchase) ca un SKU să rămână în feed-ul Meta. */
function shoptop_meta_min_product_profit(): float
{
    $config = shoptop_config();
    $meta = is_array($config['meta'] ?? null) ? $config['meta'] : [];
    if (isset($meta['min_product_profit']) && is_numeric($meta['min_product_profit'])) {
        return max(0.0, round((float) $meta['min_product_profit'], 2));
    }

    return 25.0;
}

/**
 * Alocă componentele de cost DPD pe categorii de serviciu.
 *
 * @param array<string, float> $details
 * @return array{shipping:float,cod:float,packageOpening:float,other:float}
 */
function shoptop_dpd_cost_components(array $details): array
{
    $out = [
        'shipping' => 0.0,
        'cod' => 0.0,
        'packageOpening' => 0.0,
        'other' => 0.0,
    ];

    foreach ($details as $label => $amount) {
        if (!is_numeric($amount)) {
            continue;
        }
        $value = round((float) $amount, 2);
        if ($value <= 0) {
            continue;
        }
        $key = mb_strtolower((string) $label, 'UTF-8');
        if (
            str_contains($key, 'ramburs')
            || str_contains($key, 'cod')
            || str_contains($key, 'cash on delivery')
        ) {
            $out['cod'] += $value;
        } elseif (
            str_contains($key, 'deschidere')
            || str_contains($key, 'obpd')
            || str_contains($key, 'open')
        ) {
            $out['packageOpening'] += $value;
        } elseif (
            str_contains($key, 'combustibil')
            || str_contains($key, 'forta')
            || str_contains($key, 'forță')
            || str_contains($key, 'tva')
            || str_contains($key, 'vat')
        ) {
            $out['other'] += $value;
        } elseif (
            str_contains($key, 'transport')
            || str_contains($key, 'door')
            || str_contains($key, 'curier')
            || str_contains($key, 'courier')
            || str_contains($key, 'standard')
        ) {
            $out['shipping'] += $value;
        } else {
            $out['other'] += $value;
        }
    }

    return $out;
}

/**
 * Venit / cost / marjă pe servicii (transport, addon-uri, ramburs).
 *
 * @param array<string, mixed> $order
 * @param array<int, array<string, mixed>> $items
 * @return array{
 *   lines: list<array{key:string,label:string,revenue:float,cost:float,margin:float}>,
 *   totals: array{revenue:float,cost:float,margin:float},
 *   courierCostSource: ?string
 * }
 */
function shoptop_order_service_margin_breakdown(array $order, array $items): array
{
    $flatRate = shoptop_shipping_flat_rate();
    $itemsTotal = 0.0;
    $addonRevenue = [
        'packageOpening' => 0.0,
        'priorityShipping' => 0.0,
        'packageInsurance' => 0.0,
        'gift' => 0.0,
    ];

    foreach ($items as $item) {
        $lineTotal = is_numeric($item['line_total'] ?? null)
            ? (float) $item['line_total']
            : ((float) ($item['unit_price'] ?? 0) * max(0, (int) ($item['quantity'] ?? 0)));
        $itemsTotal += $lineTotal;

        $sku = strtoupper(trim((string) ($item['product_sku'] ?? '')));
        $productId = strtoupper(trim((string) ($item['product_id'] ?? '')));
        $key = $sku !== '' ? $sku : $productId;

        match ($key) {
            'D000' => $addonRevenue['packageOpening'] += $lineTotal,
            'L000' => $addonRevenue['priorityShipping'] += $lineTotal,
            'A000' => $addonRevenue['packageInsurance'] += $lineTotal,
            'S000' => $addonRevenue['gift'] += $lineTotal,
            default => null,
        };
    }

    $totalAmount = (float) ($order['total_amount'] ?? 0);
    $shippingRevenue = round(max(0.0, $totalAmount - $itemsTotal), 2);
    if ($shippingRevenue <= 0 && $totalAmount + 0.009 >= $itemsTotal + $flatRate) {
        $shippingRevenue = $flatRate;
    }

    $courierCostTotal = isset($order['courier_cost_total']) && is_numeric($order['courier_cost_total'])
        ? round((float) $order['courier_cost_total'], 2)
        : 0.0;
    $courierSource = !empty($order['courier_cost_source'])
        ? (string) $order['courier_cost_source']
        : null;

    $details = [];
    if (!empty($order['courier_cost_details'])) {
        $decoded = is_array($order['courier_cost_details'])
            ? $order['courier_cost_details']
            : json_decode((string) $order['courier_cost_details'], true);
        if (is_array($decoded)) {
            foreach ($decoded as $label => $amount) {
                if (is_numeric($amount)) {
                    $details[(string) $label] = (float) $amount;
                }
            }
        }
    }

    if ($details === [] && $courierCostTotal <= 0) {
        if (!function_exists('shoptop_dpd_estimate_from_contract')) {
            require_once __DIR__ . '/dpd.php';
        }
        $estimated = shoptop_dpd_estimate_from_contract($order, $items);
        $courierCostTotal = (float) $estimated['total'];
        $details = $estimated['details'];
        $courierSource = 'contract';
    }

    $costParts = shoptop_dpd_cost_components($details);
    if ($costParts['shipping'] + $costParts['cod'] + $costParts['packageOpening'] + $costParts['other'] <= 0.009 && $courierCostTotal > 0) {
        if (!function_exists('shoptop_dpd_order_service_flags')) {
            require_once __DIR__ . '/dpd.php';
        }
        $flags = shoptop_dpd_order_service_flags($order, $items);
        $rates = shoptop_dpd_contract_rates();
        $costParts['shipping'] = $rates['door_to_door_under_3kg'];
        if ($flags['isCod']) {
            $costParts['cod'] = $rates['cod_cash'];
        }
        if ($flags['hasPackageOpening'] && $flags['isCod']) {
            $costParts['packageOpening'] = $rates['obpd_open'];
        }
        $allocated = $costParts['shipping'] + $costParts['cod'] + $costParts['packageOpening'];
        $costParts['other'] = round(max(0.0, $courierCostTotal - $allocated), 2);
    }

    $lines = [
        [
            'key' => 'shipping',
            'label' => 'Transport curier',
            'revenue' => $shippingRevenue,
            'cost' => round($costParts['shipping'] + $costParts['other'], 2),
            'margin' => round($shippingRevenue - ($costParts['shipping'] + $costParts['other']), 2),
        ],
        [
            'key' => 'packageOpening',
            'label' => 'Deschidere colet',
            'revenue' => round($addonRevenue['packageOpening'], 2),
            'cost' => round($costParts['packageOpening'], 2),
            'margin' => round($addonRevenue['packageOpening'] - $costParts['packageOpening'], 2),
        ],
        [
            'key' => 'priorityShipping',
            'label' => 'Livrare prioritară',
            'revenue' => round($addonRevenue['priorityShipping'], 2),
            'cost' => 0.0,
            'margin' => round($addonRevenue['priorityShipping'], 2),
        ],
        [
            'key' => 'packageInsurance',
            'label' => 'Garanție extinsă',
            'revenue' => round($addonRevenue['packageInsurance'], 2),
            'cost' => 0.0,
            'margin' => round($addonRevenue['packageInsurance'], 2),
        ],
        [
            'key' => 'gift',
            'label' => 'Produs surpriză',
            'revenue' => round($addonRevenue['gift'], 2),
            'cost' => 0.0,
            'margin' => round($addonRevenue['gift'], 2),
        ],
        [
            'key' => 'cod',
            'label' => 'Serviciu ramburs (COD)',
            'revenue' => 0.0,
            'cost' => round($costParts['cod'], 2),
            'margin' => round(0.0 - $costParts['cod'], 2),
        ],
    ];

    $serviceRevenue = $shippingRevenue
        + $addonRevenue['packageOpening']
        + $addonRevenue['priorityShipping']
        + $addonRevenue['packageInsurance']
        + $addonRevenue['gift'];
    $serviceCost = $courierCostTotal > 0
        ? $courierCostTotal
        : round($costParts['shipping'] + $costParts['cod'] + $costParts['packageOpening'] + $costParts['other'], 2);

    return [
        'lines' => $lines,
        'totals' => [
            'revenue' => round($serviceRevenue, 2),
            'cost' => round($serviceCost, 2),
            'margin' => round($serviceRevenue - $serviceCost, 2),
        ],
        'courierCostSource' => $courierSource,
    ];
}

function shoptop_slugify(string $value): string
{
    $value = strtolower(trim($value));
    $value = strtr($value, [
        'ă' => 'a',
        'â' => 'a',
        'î' => 'i',
        'ș' => 's',
        'ş' => 's',
        'ț' => 't',
        'ţ' => 't',
        'Ă' => 'a',
        'Â' => 'a',
        'Î' => 'i',
        'Ș' => 's',
        'Ş' => 's',
        'Ț' => 't',
        'Ţ' => 't',
    ]);
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
    $value = trim($value, '-');

    return $value !== '' ? $value : 'produs';
}

function shoptop_normalize_bundle_offers(mixed $input): ?array
{
    if (!is_array($input)) {
        return null;
    }

    $out = [];
    foreach ($input as $item) {
        if (!is_array($item)) {
            continue;
        }

        $qtyRaw = $item['qty'] ?? null;
        $qty = is_numeric($qtyRaw) ? (int) floor((float) $qtyRaw) : 0;
        if (!in_array($qty, [2, 3], true)) {
            continue;
        }

        $mode = (string) ($item['mode'] ?? '');
        if (!in_array($mode, ['fixed_total', 'percent_off'], true)) {
            continue;
        }

        $valueRaw = $item['value'] ?? null;
        $value = is_numeric($valueRaw) ? (float) $valueRaw : NAN;
        if (!is_finite($value) || $value <= 0) {
            continue;
        }
        if ($mode === 'percent_off') {
            $value = min(99.0, max(0.0, $value));
        }

        $enabled = (bool) ($item['enabled'] ?? false);

        $entry = [
            'qty' => $qty,
            'enabled' => $enabled,
            'mode' => $mode,
            'value' => round($value * 100) / 100,
        ];

        if (isset($item['title']) && is_string($item['title'])) {
            $t = trim($item['title']);
            if ($t !== '') {
                $entry['title'] = $t;
            }
        }
        if (isset($item['badge']) && is_string($item['badge'])) {
            $b = trim($item['badge']);
            if (in_array($b, ['popular', 'best'], true)) {
                $entry['badge'] = $b;
            }
        }

        $out[] = $entry;
    }

    return $out !== [] ? $out : null;
}

function shoptop_bundle_offers_from_row(array $row): ?array
{
    if (!array_key_exists('bundle_offers', $row) || $row['bundle_offers'] === null || $row['bundle_offers'] === '') {
        return null;
    }

    $decoded = json_decode((string) $row['bundle_offers'], true);
    return shoptop_normalize_bundle_offers($decoded);
}

function shoptop_row_to_shop_product(array $row): array
{
    $imageUrls = json_decode((string) $row['image_urls'], true);
    if (!is_array($imageUrls)) {
        $imageUrls = [];
    }

    $product = [
        'id' => (string) $row['id'],
        'name' => (string) $row['name'],
        'salePrice' => (float) $row['sale_price'],
        'discountPercent' => (float) ($row['discount_percent'] ?? 0),
        'stockQty' => (int) $row['stock_qty'],
        'imageUrls' => shoptop_normalize_image_urls(array_values(array_filter(
            $imageUrls,
            static fn ($url): bool => is_string($url) && trim($url) !== ''
        ))),
    ];

    if (!empty($row['sku'])) {
        $product['sku'] = (string) $row['sku'];
    }
    if (!empty($row['description'])) {
        $product['description'] = (string) $row['description'];
    }
    if (!empty($row['slug'])) {
        $product['slug'] = (string) $row['slug'];
    }
    if (!empty($row['category'])) {
        $product['category'] = (string) $row['category'];
    }
    if (!empty($row['brand'])) {
        $product['brand'] = (string) $row['brand'];
    }
    $bundleOffers = shoptop_bundle_offers_from_row($row);
    if ($bundleOffers !== null) {
        $product['bundleOffers'] = $bundleOffers;
    }

    return $product;
}

function shoptop_row_to_product(array $row): array
{
    $imageUrls = json_decode((string) $row['image_urls'], true);
    if (!is_array($imageUrls)) {
        $imageUrls = [];
    }

    $product = [
        'id' => (string) $row['id'],
        'name' => (string) $row['name'],
        'purchasePrice' => (float) $row['purchase_price'],
        'salePrice' => (float) $row['sale_price'],
        'discountPercent' => (float) ($row['discount_percent'] ?? 0),
        'stockQty' => (int) $row['stock_qty'],
        'imageUrls' => shoptop_normalize_image_urls(array_values(array_filter(
            $imageUrls,
            static fn ($url): bool => is_string($url) && trim($url) !== ''
        ))),
    ];

    if (!empty($row['sku'])) {
        $product['sku'] = (string) $row['sku'];
    }
    if (!empty($row['description'])) {
        $product['description'] = (string) $row['description'];
    }
    if (!empty($row['notes'])) {
        $product['notes'] = (string) $row['notes'];
    }
    if (!empty($row['slug'])) {
        $product['slug'] = (string) $row['slug'];
    }
    if (!empty($row['category'])) {
        $product['category'] = (string) $row['category'];
    }
    if (!empty($row['ean'])) {
        $product['ean'] = (string) $row['ean'];
    }
    if (!empty($row['brand'])) {
        $product['brand'] = (string) $row['brand'];
    }
    if (!empty($row['google_category'])) {
        $product['googleCategory'] = (string) $row['google_category'];
    }
    if (!empty($row['mpn'])) {
        $product['mpn'] = (string) $row['mpn'];
    }
    $bundleOffers = shoptop_bundle_offers_from_row($row);
    if ($bundleOffers !== null) {
        $product['bundleOffers'] = $bundleOffers;
    }

    return $product;
}

function shoptop_send_order_confirmation_email(array $order): void
{
    $email = trim((string) ($order['customerEmail'] ?? ''));
    if ($email === '') {
        return;
    }

    require_once __DIR__ . '/mailer.php';

    try {
        $rendered = shoptop_render_order_confirmation_email($order);
        shoptop_send_mail($email, $rendered['subject'], $rendered['html']);
    } catch (Throwable $e) {
        error_log('Order confirmation email failed: ' . $e->getMessage());
    }
}

/** Email (dacă există) + SMS pe telefonul din comandă. */
function shoptop_send_order_confirmation(array $order): void
{
    shoptop_send_order_confirmation_email($order);
    require_once __DIR__ . '/sms.php';
    shoptop_send_order_confirmation_sms($order);
}

function shoptop_send_order_status_email(array $order, string $status): void
{
    $email = trim((string) ($order['customerEmail'] ?? ''));
    if ($email === '') {
        return;
    }

    require_once __DIR__ . '/mailer.php';

    try {
        $rendered = shoptop_render_order_status_email($order, $status);
        if ($rendered === null) {
            return;
        }
        shoptop_send_mail($email, $rendered['subject'], $rendered['html']);
    } catch (Throwable $e) {
        error_log('Order status email failed: ' . $e->getMessage());
    }
}

function shoptop_normalize_product(mixed $input): array
{
    if (!is_array($input)) {
        shoptop_json_error('Produs invalid.', 400);
    }

    $id = $input['id'] ?? null;
    $name = $input['name'] ?? null;
    if (!is_string($id) || trim($id) === '' || !is_string($name) || trim($name) === '') {
        shoptop_json_error('Campurile id si name sunt obligatorii.', 400);
    }

    // Pretul de achizitie. Accepta si backup-urile vechi cu supplierPriceA/B + costSupplier.
    if (is_numeric($input['purchasePrice'] ?? null)) {
        $purchasePrice = (float) $input['purchasePrice'];
    } else {
        $a = is_numeric($input['supplierPriceA'] ?? null) ? (float) $input['supplierPriceA'] : 0.0;
        $b = is_numeric($input['supplierPriceB'] ?? null) ? (float) $input['supplierPriceB'] : 0.0;
        $which = $input['costSupplier'] ?? 'lower';
        if ($which === 'A') {
            $purchasePrice = $a;
        } elseif ($which === 'B') {
            $purchasePrice = $b;
        } elseif ($a > 0 && $b > 0) {
            $purchasePrice = min($a, $b);
        } else {
            $purchasePrice = $a > 0 ? $a : $b;
        }
    }
    $salePrice = is_numeric($input['salePrice'] ?? null)
        ? (float) $input['salePrice']
        : NAN;

    if (!is_finite($purchasePrice) || !is_finite($salePrice)) {
        shoptop_json_error('Preturile trebuie sa fie numerice.', 400);
    }

    $stockQty = 0;
    if (isset($input['stockQty']) && is_numeric($input['stockQty'])) {
        $stockQty = max(0, (int) floor((float) $input['stockQty']));
    }

    $discountPercent = 0.0;
    if (isset($input['discountPercent']) && is_numeric($input['discountPercent'])) {
        $discountPercent = (float) $input['discountPercent'];
    }
    if (!is_finite($discountPercent) || $discountPercent < 0) {
        $discountPercent = 0.0;
    }
    if ($discountPercent > 99) {
        $discountPercent = 99.0;
    }

    $imageUrls = [];
    if (isset($input['imageUrls']) && is_array($input['imageUrls'])) {
        foreach ($input['imageUrls'] as $url) {
            if (is_string($url) && trim($url) !== '') {
                $imageUrls[] = trim($url);
            }
        }
    } elseif (isset($input['imageUrl']) && is_string($input['imageUrl']) && trim($input['imageUrl']) !== '') {
        $imageUrls[] = trim($input['imageUrl']);
    }
    $imageUrls = shoptop_normalize_image_urls($imageUrls);

    $sku = null;
    if (isset($input['sku']) && is_string($input['sku'])) {
        $trimmed = trim($input['sku']);
        $sku = $trimmed !== '' ? $trimmed : null;
    }

    $description = null;
    if (isset($input['description']) && is_string($input['description'])) {
        $trimmed = trim($input['description']);
        $description = $trimmed !== '' ? $trimmed : null;
    }

    $notes = null;
    if (isset($input['notes']) && is_string($input['notes'])) {
        $trimmed = trim($input['notes']);
        $notes = $trimmed !== '' ? $trimmed : null;
    }

    $bundleOffers = null;
    if (array_key_exists('bundleOffers', $input)) {
        $bundleOffers = shoptop_normalize_bundle_offers($input['bundleOffers']);
    }
    $bundleOffersJson = $bundleOffers === null
        ? null
        : json_encode($bundleOffers, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    // Slug-ul NU se mai derivă din nume aici: la INSERT se fixează o singură
    // dată (shoptop_insert_product), la UPDATE se păstrează cel existent dacă
    // clientul nu trimite altul (shoptop_update_product). Altfel, orice
    // modificare de titlu ar schimba adresa și ar rupe linkurile din reclame.
    $slug = null;
    if (isset($input['slug']) && is_string($input['slug'])) {
        $trimmed = trim($input['slug']);
        $slug = $trimmed !== '' ? shoptop_slugify($trimmed) : null;
    }

    $category = null;
    if (isset($input['category']) && is_string($input['category'])) {
        $trimmed = trim($input['category']);
        $category = $trimmed !== '' ? $trimmed : null;
    }

    $ean = null;
    if (isset($input['ean']) && is_string($input['ean'])) {
        $trimmed = trim($input['ean']);
        $ean = $trimmed !== '' ? $trimmed : null;
    }

    $brand = null;
    if (isset($input['brand']) && is_string($input['brand'])) {
        $trimmed = trim($input['brand']);
        $brand = $trimmed !== '' ? $trimmed : null;
    }

    $googleCategory = null;
    if (isset($input['googleCategory']) && is_string($input['googleCategory'])) {
        $trimmed = trim($input['googleCategory']);
        $googleCategory = $trimmed !== '' ? $trimmed : null;
    }

    $mpn = null;
    if (isset($input['mpn']) && is_string($input['mpn'])) {
        $trimmed = trim($input['mpn']);
        $mpn = $trimmed !== '' ? $trimmed : null;
    }

    return [
        'id' => trim($id),
        'name' => trim($name),
        'slug' => $slug,
        'category' => $category,
        'sku' => $sku,
        'ean' => $ean,
        'brand' => $brand,
        'google_category' => $googleCategory,
        'mpn' => $mpn,
        'purchase_price' => $purchasePrice,
        'sale_price' => $salePrice,
        'discount_percent' => $discountPercent,
        'stock_qty' => $stockQty,
        'image_urls' => json_encode($imageUrls, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'description' => $description,
        'notes' => $notes,
        'bundle_offers' => $bundleOffersJson,
    ];
}

function shoptop_products_has_bundle_offers(PDO $pdo): bool
{
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }
    $stmt = $pdo->prepare(
        'SELECT 1
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = \'products\'
           AND COLUMN_NAME = \'bundle_offers\'
         LIMIT 1'
    );
    $stmt->execute();
    $cached = (bool) $stmt->fetchColumn();
    return $cached;
}

/** Tabelul de istoric slug există? (migrate-product-slug-history.sql) */
function shoptop_slug_history_available(PDO $pdo): bool
{
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }
    $stmt = $pdo->prepare(
        'SELECT 1
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = \'product_slug_history\'
         LIMIT 1'
    );
    $stmt->execute();
    $cached = (bool) $stmt->fetchColumn();
    return $cached;
}

/** Slug-ul curent efectiv al unui rând (cel salvat sau derivat din nume). */
function shoptop_product_row_slug(array $row): string
{
    $slug = trim((string) ($row['slug'] ?? ''));
    if ($slug !== '') {
        return $slug;
    }
    return shoptop_slugify((string) ($row['name'] ?? $row['id'] ?? 'produs'));
}

/**
 * Slug liber pentru produsul $productId: dacă $slug e folosit de alt produs,
 * adaugă sufix numeric (-2, -3, …), ca la Shopify.
 */
function shoptop_unique_product_slug(PDO $pdo, string $slug, string $productId): string
{
    $base = $slug !== '' ? $slug : 'produs';
    $stmt = $pdo->prepare('SELECT id FROM products WHERE slug = :slug LIMIT 1');
    $candidate = $base;
    for ($i = 2; $i < 1000; $i++) {
        $stmt->execute(['slug' => $candidate]);
        $owner = $stmt->fetchColumn();
        if ($owner === false || (string) $owner === $productId) {
            return $candidate;
        }
        $candidate = $base . '-' . $i;
    }
    return $base . '-' . bin2hex(random_bytes(3));
}

/**
 * Înregistrează schimbarea de adresă: slug-ul vechi rămâne valid și
 * redirecționează către produs. Slug-ul nou (devenit curent) e scos din istoric.
 */
function shoptop_record_slug_change(PDO $pdo, string $productId, string $oldSlug, string $newSlug): void
{
    if (!shoptop_slug_history_available($pdo)) {
        return;
    }
    $del = $pdo->prepare('DELETE FROM product_slug_history WHERE slug = :slug');
    $del->execute(['slug' => $newSlug]);
    if ($oldSlug === '' || $oldSlug === $newSlug) {
        return;
    }
    $ins = $pdo->prepare(
        'INSERT INTO product_slug_history (slug, product_id) VALUES (:slug, :pid)
         ON DUPLICATE KEY UPDATE product_id = VALUES(product_id)'
    );
    $ins->execute(['slug' => $oldSlug, 'pid' => $productId]);
}

/** @return list<string> adresele vechi ale produsului (cele mai noi primele) */
function shoptop_product_previous_slugs(PDO $pdo, string $productId): array
{
    if (!shoptop_slug_history_available($pdo)) {
        return [];
    }
    $stmt = $pdo->prepare(
        'SELECT slug FROM product_slug_history WHERE product_id = :pid ORDER BY created_at DESC'
    );
    $stmt->execute(['pid' => $productId]);
    $out = [];
    foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $slug) {
        $out[] = (string) $slug;
    }
    return $out;
}

/** Id-ul produsului care a avut cândva acest slug (după redenumire). */
function shoptop_product_id_for_previous_slug(PDO $pdo, string $slug): ?string
{
    $slug = trim($slug);
    if ($slug === '' || !shoptop_slug_history_available($pdo)) {
        return null;
    }
    $stmt = $pdo->prepare('SELECT product_id FROM product_slug_history WHERE slug = :slug LIMIT 1');
    $stmt->execute(['slug' => $slug]);
    $id = $stmt->fetchColumn();
    return $id === false ? null : (string) $id;
}

function shoptop_insert_product(PDO $pdo, array $product): void
{
    // Adresa se fixează o singură dată, la creare; unică între produse.
    $wanted = $product['slug'] ?? null;
    if (!is_string($wanted) || trim($wanted) === '') {
        $wanted = shoptop_slugify((string) $product['name']);
    }
    $product['slug'] = shoptop_unique_product_slug($pdo, $wanted, (string) $product['id']);
    // Dacă adresa era în istoricul altui produs, acum e a produsului nou.
    shoptop_record_slug_change($pdo, (string) $product['id'], '', $product['slug']);

    $hasBundle = shoptop_products_has_bundle_offers($pdo);
    if (!$hasBundle) {
        unset($product['bundle_offers']);
    }
    $bundleCol = $hasBundle ? ', bundle_offers' : '';
    $bundleVal = $hasBundle ? ', :bundle_offers' : '';
    $stmt = $pdo->prepare(
        'INSERT INTO products (
            id, name, slug, category, sku, ean, brand, google_category, mpn,
            purchase_price,
            sale_price, discount_percent, stock_qty, image_urls, description, notes' . $bundleCol . '
        ) VALUES (
            :id, :name, :slug, :category, :sku, :ean, :brand, :google_category, :mpn,
            :purchase_price,
            :sale_price, :discount_percent, :stock_qty, :image_urls, :description, :notes' . $bundleVal . '
        )'
    );
    $stmt->execute($product);
}

function shoptop_update_product(PDO $pdo, array $product): int
{
    $exists = $pdo->prepare('SELECT id, name, slug FROM products WHERE id = :id LIMIT 1');
    $exists->execute(['id' => $product['id']]);
    $existing = $exists->fetch();
    if (!$existing) {
        return 0;
    }

    // Adresa curentă (salvată sau, la produsele vechi, derivată din numele de
    // dinainte de modificare) rămâne dacă clientul nu trimite alta.
    $oldSlug = shoptop_product_row_slug($existing);
    $wanted = $product['slug'] ?? null;
    if (!is_string($wanted) || trim($wanted) === '') {
        $wanted = $oldSlug;
    }
    $conflict = $pdo->prepare('SELECT id FROM products WHERE slug = :slug AND id <> :id LIMIT 1');
    $conflict->execute(['slug' => $wanted, 'id' => $product['id']]);
    if ($conflict->fetchColumn()) {
        shoptop_json_error('Adresa URL „' . $wanted . '” este folosită deja de alt produs.', 409);
    }
    $product['slug'] = $wanted;
    if ($wanted !== $oldSlug) {
        shoptop_record_slug_change($pdo, (string) $product['id'], $oldSlug, $wanted);
    }

    $hasBundle = shoptop_products_has_bundle_offers($pdo);
    if (!$hasBundle) {
        unset($product['bundle_offers']);
    }
    $bundleSet = $hasBundle ? ",\n            bundle_offers = :bundle_offers" : '';
    $stmt = $pdo->prepare(
        'UPDATE products SET
            name = :name,
            slug = :slug,
            category = :category,
            sku = :sku,
            ean = :ean,
            brand = :brand,
            google_category = :google_category,
            mpn = :mpn,
            purchase_price = :purchase_price,
            sale_price = :sale_price,
            discount_percent = :discount_percent,
            stock_qty = :stock_qty,
            image_urls = :image_urls,
            description = :description,
            notes = :notes' . $bundleSet . '
        WHERE id = :id'
    );
    $stmt->execute($product);

    // MySQL PDO: rowCount() e 0 dacă valorile nu s-au schimbat — produsul există totuși.
    return 1;
}

/**
 * Comandă card neplătită, încă neprocesată (fără AWB / stoc).
 * Acestea nu trebuie să apară în admin până la confirmarea Netopia.
 *
 * @param array<string,mixed> $row rând din `orders` (coloane SQL)
 */
function shoptop_is_unpaid_card_draft(array $row): bool
{
    $method = (string) ($row['payment_method'] ?? '');
    $pay = (string) ($row['payment_status'] ?? 'pending');
    $status = (string) ($row['status'] ?? 'new');
    $awb = trim((string) ($row['awb_number'] ?? ''));
    return $method === 'card'
        && $pay !== 'paid'
        && $awb === ''
        && in_array($status, ['new', 'confirmed'], true);
}

/** Filtru SQL: exclude draft-urile card neplătite din listele admin / „comenzile mele”. */
function shoptop_sql_exclude_unpaid_card_drafts(): string
{
    return "("
        . "payment_method <> 'card'"
        . " OR payment_status = 'paid'"
        . " OR status NOT IN ('new', 'confirmed')"
        . " OR (awb_number IS NOT NULL AND awb_number <> '')"
        . ")";
}

/**
 * Șterge o comandă card neplătită care nu a fost procesată.
 * Stocul nu e scăzut la creare, deci DELETE e suficient.
 */
function shoptop_discard_unpaid_card_order(PDO $pdo, string $orderId): bool
{
    $orderId = trim($orderId);
    if ($orderId === '') {
        return false;
    }

    $stmt = $pdo->prepare(
        'SELECT id, status, payment_method, payment_status, awb_number
         FROM orders WHERE id = :id LIMIT 1'
    );
    $stmt->execute(['id' => $orderId]);
    $row = $stmt->fetch();
    if (!$row || !shoptop_is_unpaid_card_draft($row)) {
        return false;
    }

    $del = $pdo->prepare('DELETE FROM orders WHERE id = :id');
    $del->execute(['id' => $orderId]);
    return $del->rowCount() > 0;
}

/** Șterge draft-urile card neplătite mai vechi de $maxAgeMinutes (abandon / plată închisă). */
function shoptop_purge_stale_unpaid_card_orders(PDO $pdo, int $maxAgeMinutes = 120): int
{
    $minutes = max(15, $maxAgeMinutes);
    $sql = "DELETE FROM orders
            WHERE payment_method = 'card'
              AND IFNULL(payment_status, 'pending') <> 'paid'
              AND status IN ('new', 'confirmed')
              AND (awb_number IS NULL OR awb_number = '')
              AND created_at < (NOW() - INTERVAL {$minutes} MINUTE)";
    $deleted = $pdo->exec($sql);
    return is_int($deleted) ? $deleted : 0;
}
