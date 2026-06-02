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

function shoptop_start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443);

    session_name('shoptop_session');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
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
    shoptop_start_session();
    $userId = $_SESSION['user_id'] ?? null;
    if (!is_string($userId) || trim($userId) === '') {
        return null;
    }

    $stmt = shoptop_pdo()->prepare(
        'SELECT id, email, role FROM users WHERE id = :id LIMIT 1'
    );
    $stmt->execute(['id' => trim($userId)]);
    $row = $stmt->fetch();
    if (!$row) {
        unset($_SESSION['user_id'], $_SESSION['user_role']);
        return null;
    }

    return shoptop_user_to_response($row);
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

    return 25.0;
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
    if (!empty($row['slug'])) {
        $product['slug'] = (string) $row['slug'];
    }
    if (!empty($row['category'])) {
        $product['category'] = (string) $row['category'];
    }
    if (!empty($row['brand'])) {
        $product['brand'] = (string) $row['brand'];
    }

    return $product;
}

function shoptop_row_to_product(array $row): array
{
    $imageUrls = json_decode((string) $row['image_urls'], true);
    if (!is_array($imageUrls)) {
        $imageUrls = [];
    }

    $marketObservations = null;
    if ($row['market_observations'] !== null && $row['market_observations'] !== '') {
        $decoded = json_decode((string) $row['market_observations'], true);
        if (is_array($decoded) && $decoded !== []) {
            $marketObservations = $decoded;
        }
    }

    $product = [
        'id' => (string) $row['id'],
        'name' => (string) $row['name'],
        'supplierPriceA' => (float) $row['supplier_price_a'],
        'supplierPriceB' => (float) $row['supplier_price_b'],
        'costSupplier' => (string) $row['cost_supplier'],
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
    if ($marketObservations !== null) {
        $product['marketObservations'] = $marketObservations;
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

    $supplierPriceA = is_numeric($input['supplierPriceA'] ?? null)
        ? (float) $input['supplierPriceA']
        : NAN;
    $supplierPriceB = is_numeric($input['supplierPriceB'] ?? null)
        ? (float) $input['supplierPriceB']
        : NAN;
    $salePrice = is_numeric($input['salePrice'] ?? null)
        ? (float) $input['salePrice']
        : NAN;

    if (!is_finite($supplierPriceA) || !is_finite($supplierPriceB) || !is_finite($salePrice)) {
        shoptop_json_error('Preturile trebuie sa fie numerice.', 400);
    }

    $costSupplier = $input['costSupplier'] ?? 'lower';
    if (!in_array($costSupplier, ['A', 'B', 'lower'], true)) {
        shoptop_json_error('costSupplier invalid.', 400);
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

    $marketObservations = null;
    if (isset($input['marketObservations']) && is_array($input['marketObservations'])) {
        $items = [];
        foreach ($input['marketObservations'] as $item) {
            if (!is_array($item) || !is_numeric($item['price'] ?? null)) {
                continue;
            }
            $price = (float) $item['price'];
            if (!is_finite($price)) {
                continue;
            }
            $entry = ['price' => $price];
            if (isset($item['sourceUrl']) && is_string($item['sourceUrl'])) {
                $entry['sourceUrl'] = $item['sourceUrl'];
            }
            if (isset($item['observedAt']) && is_string($item['observedAt'])) {
                $entry['observedAt'] = $item['observedAt'];
            }
            if (isset($item['note']) && is_string($item['note'])) {
                $entry['note'] = $item['note'];
            }
            $items[] = $entry;
        }
        if ($items !== []) {
            $marketObservations = $items;
        }
    }

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

    $slug = null;
    if (isset($input['slug']) && is_string($input['slug'])) {
        $trimmed = trim($input['slug']);
        $slug = $trimmed !== '' ? shoptop_slugify($trimmed) : null;
    }
    if ($slug === null) {
        $slug = shoptop_slugify(trim($name));
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
        'supplier_price_a' => $supplierPriceA,
        'supplier_price_b' => $supplierPriceB,
        'cost_supplier' => $costSupplier,
        'sale_price' => $salePrice,
        'discount_percent' => $discountPercent,
        'stock_qty' => $stockQty,
        'image_urls' => json_encode($imageUrls, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'description' => $description,
        'market_observations' => $marketObservations === null
            ? null
            : json_encode($marketObservations, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'notes' => $notes,
    ];
}

function shoptop_insert_product(PDO $pdo, array $product): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO products (
            id, name, slug, category, sku, ean, brand, google_category, mpn,
            supplier_price_a, supplier_price_b, cost_supplier,
            sale_price, discount_percent, stock_qty, image_urls, description, market_observations, notes
        ) VALUES (
            :id, :name, :slug, :category, :sku, :ean, :brand, :google_category, :mpn,
            :supplier_price_a, :supplier_price_b, :cost_supplier,
            :sale_price, :discount_percent, :stock_qty, :image_urls, :description, :market_observations, :notes
        )'
    );
    $stmt->execute($product);
}

function shoptop_update_product(PDO $pdo, array $product): int
{
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
            supplier_price_a = :supplier_price_a,
            supplier_price_b = :supplier_price_b,
            cost_supplier = :cost_supplier,
            sale_price = :sale_price,
            discount_percent = :discount_percent,
            stock_qty = :stock_qty,
            image_urls = :image_urls,
            description = :description,
            market_observations = :market_observations,
            notes = :notes
        WHERE id = :id'
    );
    $stmt->execute($product);

    return $stmt->rowCount();
}
