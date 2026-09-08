<?php

declare(strict_types=1);

/**
 * Bootstrap SEO: găsește API-ul PHP (producție: ./shoptop-api, local: ../server/api).
 */
function shoptop_seo_api_dir(): ?string
{
    $candidates = [
        __DIR__ . '/shoptop-api',
        __DIR__ . '/../server/api',
        __DIR__ . '/../shoptop-api',
    ];
    foreach ($candidates as $dir) {
        if (is_file($dir . '/lib.php') && is_file($dir . '/config.php')) {
            return $dir;
        }
    }
    return null;
}

function shoptop_seo_site_url(): string
{
    $cfg = function_exists('shoptop_config') ? shoptop_config() : [];
    $url = trim((string) ($cfg['site_url'] ?? 'https://shop-top.ro'));
    return rtrim($url !== '' ? $url : 'https://shop-top.ro', '/');
}

function shoptop_seo_column_exists(PDO $pdo, string $table, string $column): bool
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

function shoptop_seo_h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function shoptop_seo_plain_text(string $html, int $max = 0): string
{
    $text = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $text = preg_replace('/\s+/u', ' ', $text) ?? $text;
    $text = trim($text);
    if ($max > 0 && mb_strlen($text, 'UTF-8') > $max) {
        return mb_substr($text, 0, $max - 1, 'UTF-8') . '…';
    }
    return $text;
}

function shoptop_seo_absolute_url(string $pathOrUrl): string
{
    $v = trim($pathOrUrl);
    if ($v === '') {
        return shoptop_seo_site_url() . '/';
    }
    if (str_starts_with($v, 'http://') || str_starts_with($v, 'https://')) {
        return $v;
    }
    if (str_starts_with($v, '//')) {
        return 'https:' . $v;
    }
    return shoptop_seo_site_url() . (str_starts_with($v, '/') ? $v : '/' . $v);
}

function shoptop_seo_slugify(string $value): string
{
    if (function_exists('shoptop_slugify')) {
        return shoptop_slugify($value);
    }
    $value = mb_strtolower(trim($value), 'UTF-8');
    $map = [
        'ă' => 'a', 'â' => 'a', 'î' => 'i', 'ș' => 's', 'ş' => 's',
        'ț' => 't', 'ţ' => 't',
    ];
    $value = strtr($value, $map);
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? $value;
    return trim($value, '-');
}

/**
 * @return array<string,mixed>|null
 */
function shoptop_seo_find_product(PDO $pdo, string $ref): ?array
{
    $ref = trim(rawurldecode($ref));
    if ($ref === '') {
        return null;
    }

    $fields = 'id, name, slug, category, sku, brand, sale_price, discount_percent, stock_qty, image_urls, description';
    // PDO/MySQL: același named param nu poate apărea de două ori (:ref OR :ref → HY093).
    $stmt = $pdo->prepare(
        "SELECT {$fields} FROM products WHERE id = :ref_id OR slug = :ref_slug LIMIT 1"
    );
    $stmt->execute(['ref_id' => $ref, 'ref_slug' => $ref]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (is_array($row)) {
        if (function_exists('shoptop_is_virtual_product_id')
            && (function_exists('shoptop_is_virtual_product_row')
                ? shoptop_is_virtual_product_row($row)
                : shoptop_is_virtual_product_id((string) $row['id']))) {
            return null;
        }
        return $row;
    }

    // Fallback: potrivire pe slug generat din nume.
    $stmt = $pdo->query("SELECT {$fields} FROM products ORDER BY name ASC");
    if ($stmt === false) {
        return null;
    }
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        if (!is_array($row)) {
            continue;
        }
        if (function_exists('shoptop_is_virtual_product_id')
            && (function_exists('shoptop_is_virtual_product_row')
                ? shoptop_is_virtual_product_row($row)
                : shoptop_is_virtual_product_id((string) $row['id']))) {
            continue;
        }
        $slug = trim((string) ($row['slug'] ?? ''));
        if ($slug === '') {
            $slug = shoptop_seo_slugify((string) ($row['name'] ?? ''));
        }
        if ($slug === $ref || (string) $row['id'] === $ref) {
            return $row;
        }
    }
    return null;
}

/**
 * @return list<array<string,mixed>>
 */
function shoptop_seo_list_products(PDO $pdo, int $limit = 200): array
{
    $fields = 'id, name, slug, category, sku, brand, sale_price, stock_qty, image_urls, description';
    $stmt = $pdo->query("SELECT {$fields} FROM products ORDER BY name ASC");
    if ($stmt === false) {
        return [];
    }
    $out = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        if (!is_array($row)) {
            continue;
        }
        if (function_exists('shoptop_is_virtual_product_id')
            && (function_exists('shoptop_is_virtual_product_row')
                ? shoptop_is_virtual_product_row($row)
                : shoptop_is_virtual_product_id((string) $row['id']))) {
            continue;
        }
        $out[] = $row;
        if (count($out) >= $limit) {
            break;
        }
    }
    return $out;
}

function shoptop_seo_product_path(array $row): string
{
    $slug = trim((string) ($row['slug'] ?? ''));
    if ($slug === '') {
        $slug = shoptop_seo_slugify((string) ($row['name'] ?? $row['id'] ?? 'produs'));
    }
    return '/produs/' . rawurlencode($slug);
}

function shoptop_seo_product_image(array $row): ?string
{
    $urls = json_decode((string) ($row['image_urls'] ?? '[]'), true);
    if (!is_array($urls) || $urls === []) {
        return null;
    }
    foreach ($urls as $url) {
        if (!is_string($url) || trim($url) === '') {
            continue;
        }
        $trimmed = trim($url);
        if (str_starts_with($trimmed, 'data:')) {
            continue;
        }
        if (str_starts_with($trimmed, 'http://')) {
            $trimmed = 'https://' . substr($trimmed, strlen('http://'));
        }
        return shoptop_seo_absolute_url($trimmed);
    }
    return null;
}

function shoptop_seo_csv_field(string $value): string
{
    if ($value === '') {
        return '';
    }
    if (strpbrk($value, ",\"\n\r") !== false) {
        return '"' . str_replace('"', '""', $value) . '"';
    }
    return $value;
}

function shoptop_seo_clip(string $value, int $max): string
{
    $text = preg_replace('/\s+/u', ' ', $value) ?? $value;
    $text = trim($text);
    if ($max > 0 && mb_strlen($text, 'UTF-8') > $max) {
        return mb_substr($text, 0, $max, 'UTF-8');
    }
    return $text;
}

function shoptop_seo_read_index_html(): string
{
    $path = __DIR__ . '/index.html';
    $html = @file_get_contents($path);
    if ($html === false || $html === '') {
        return '<!doctype html><html lang="ro"><head><meta charset="UTF-8"><title>ShopTop</title></head><body><div id="root"></div></body></html>';
    }
    return $html;
}

/**
 * @param array{
 *   title:string,
 *   description:string,
 *   canonical:string,
 *   image?:?string,
 *   type?:string,
 *   robots?:string,
 *   jsonLd?:?array,
 *   bodyHtml?:string
 * } $meta
 */
function shoptop_seo_inject(string $html, array $meta): string
{
    $title = $meta['title'];
    $description = $meta['description'];
    $canonical = $meta['canonical'];
    $image = $meta['image'] ?? shoptop_seo_absolute_url('/og-cover.svg');
    $type = $meta['type'] ?? 'website';
    $robots = $meta['robots'] ?? 'index, follow';
    $jsonLd = $meta['jsonLd'] ?? null;
    $bodyHtml = $meta['bodyHtml'] ?? '';

    // title
    if (preg_match('/<title>.*?<\/title>/is', $html) === 1) {
        $html = preg_replace(
            '/<title>.*?<\/title>/is',
            '<title>' . shoptop_seo_h($title) . '</title>',
            $html,
            1
        ) ?? $html;
    } else {
        $html = str_replace('</head>', '<title>' . shoptop_seo_h($title) . '</title></head>', $html);
    }

    $headExtra = [];
    $headExtra[] = '<meta name="description" content="' . shoptop_seo_h($description) . '">';
    $headExtra[] = '<meta name="robots" content="' . shoptop_seo_h($robots) . '">';
    $headExtra[] = '<link rel="canonical" href="' . shoptop_seo_h($canonical) . '">';
    $headExtra[] = '<meta property="og:type" content="' . shoptop_seo_h($type) . '">';
    $headExtra[] = '<meta property="og:title" content="' . shoptop_seo_h($title) . '">';
    $headExtra[] = '<meta property="og:description" content="' . shoptop_seo_h($description) . '">';
    $headExtra[] = '<meta property="og:url" content="' . shoptop_seo_h($canonical) . '">';
    $headExtra[] = '<meta property="og:image" content="' . shoptop_seo_h((string) $image) . '">';
    $headExtra[] = '<meta property="og:locale" content="ro_RO">';
    $headExtra[] = '<meta property="og:site_name" content="ShopTop">';
    $headExtra[] = '<meta name="twitter:card" content="summary_large_image">';
    $headExtra[] = '<meta name="twitter:title" content="' . shoptop_seo_h($title) . '">';
    $headExtra[] = '<meta name="twitter:description" content="' . shoptop_seo_h($description) . '">';
    $headExtra[] = '<meta name="twitter:image" content="' . shoptop_seo_h((string) $image) . '">';

    if (is_array($jsonLd)) {
        $encoded = json_encode($jsonLd, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($encoded !== false) {
            $headExtra[] = '<script type="application/ld+json" id="shoptop-jsonld">'
                . $encoded
                . '</script>';
        }
    }

    // Stil: blocul SEO nu trebuie să apară vizual (utilizatorii văd doar React).
    // Conținutul rămâne în HTML (noscript) pentru crawleri fără JS.
    $headExtra[] = '<style id="shoptop-seo-css">#seo-static{display:none!important}</style>';

    // Elimină duplicatele vechi din index.html (description/canonical/og) — le înlocuim.
    $html = preg_replace('/<meta\s+name="description"[^>]*>\s*/i', '', $html) ?? $html;
    $html = preg_replace('/<meta\s+name="robots"[^>]*>\s*/i', '', $html) ?? $html;
    $html = preg_replace('/<link\s+rel="canonical"[^>]*>\s*/i', '', $html) ?? $html;
    $html = preg_replace('/<meta\s+property="og:[^"]+"[^>]*>\s*/i', '', $html) ?? $html;
    $html = preg_replace('/<meta\s+name="twitter:[^"]+"[^>]*>\s*/i', '', $html) ?? $html;
    $html = preg_replace('/<script[^>]*id="shoptop-jsonld"[^>]*>.*?<\/script>\s*/is', '', $html) ?? $html;
    $html = preg_replace('/<style[^>]*id="shoptop-seo-css"[^>]*>.*?<\/style>\s*/is', '', $html) ?? $html;

    $html = str_replace('</head>', implode("\n    ", $headExtra) . "\n  </head>", $html);

    if ($bodyHtml !== '') {
        // noscript = vizibil doar fără JS (crawleri simpli); cu JS nu există flash.
        $block = '<noscript><div id="seo-static">' . $bodyHtml . '</div></noscript>';
        if (str_contains($html, '<div id="root"></div>')) {
            $html = str_replace('<div id="root"></div>', $block . "\n    <div id=\"root\"></div>", $html);
        } elseif (preg_match('/<body[^>]*>/i', $html) === 1) {
            $html = preg_replace('/<body([^>]*)>/i', '<body$1>' . $block, $html, 1) ?? $html;
        }
    }

    return $html;
}
