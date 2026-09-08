<?php

declare(strict_types=1);

/**
 * Feed catalog Meta (Facebook / Instagram).
 * URL public: https://shop-top.ro/catalog.csv
 */

require_once __DIR__ . '/seo-lib.php';

$apiDir = shoptop_seo_api_dir();
$products = [];
$shippingRon = 19.99;
$minProfit = 25.0;
if ($apiDir !== null) {
    require_once $apiDir . '/lib.php';
    $cfg = shoptop_config();
    if (function_exists('shoptop_shipping_flat_rate')) {
        $shippingRon = shoptop_shipping_flat_rate();
    } elseif (isset($cfg['shipping_flat_rate']) && is_numeric($cfg['shipping_flat_rate'])) {
        $shippingRon = (float) $cfg['shipping_flat_rate'];
    }
    if (function_exists('shoptop_meta_min_product_profit')) {
        $minProfit = shoptop_meta_min_product_profit();
    }
    try {
        $pdo = shoptop_pdo();
        $fields = 'id, name, slug, category, sku, brand, sale_price, stock_qty, image_urls, description';
        foreach (['ean', 'google_category', 'discount_percent', 'purchase_price'] as $extra) {
            if (shoptop_seo_column_exists($pdo, 'products', $extra)) {
                $fields .= ', ' . $extra;
            }
        }
        $stmt = $pdo->query('SELECT ' . $fields . ' FROM products ORDER BY name ASC');
        if ($stmt !== false) {
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                if (!is_array($row)) {
                    continue;
                }
                if (function_exists('shoptop_is_virtual_product_row')
                    && shoptop_is_virtual_product_row($row)) {
                    continue;
                }
                $products[] = $row;
            }
        }
    } catch (Throwable $e) {
        $products = [];
    }
}

$site = shoptop_seo_site_url();
$columns = [
    'id',
    'title',
    'description',
    'availability',
    'condition',
    'price',
    'link',
    'image_link',
    'brand',
    'google_product_category',
    'fb_product_category',
    'quantity_to_sell_on_facebook',
    'sale_price',
    'sale_price_effective_date',
    'item_group_id',
    'gender',
    'color',
    'size',
    'age_group',
    'material',
    'pattern',
    'shipping',
    'shipping_weight',
    'offer_disclaimer',
    'offer_disclaimer_url',
    'video[0].url',
    'video[0].tag[0]',
    'gtin',
    'product_tags[0]',
    'product_tags[1]',
    'style[0]',
];

$shipping = 'RO::Curier:' . number_format($shippingRon, 2, '.', '') . ' RON';
$disclaimer = 'Prețurile includ TVA. Livrare prin curier. Se aplică termenii și condițiile din magazin.';
$disclaimerUrl = $site . '/termeni-si-conditii';

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: inline; filename="catalog_products.csv"');
header('Cache-Control: public, max-age=300');
header('X-Robots-Tag: noindex');

$out = fopen('php://output', 'w');
if ($out === false) {
    http_response_code(500);
    exit;
}

fwrite($out, "\xEF\xBB\xBF");
fwrite($out, implode(',', $columns) . "\r\n");

foreach ($products as $row) {
    $title = shoptop_seo_clip((string) ($row['name'] ?? ''), 200);
    if ($title === '') {
        continue;
    }
    $sale = round((float) ($row['sale_price'] ?? 0), 2);
    if ($sale <= 0) {
        continue;
    }
    if ($minProfit > 0 && array_key_exists('purchase_price', $row)) {
        $purchase = round((float) ($row['purchase_price'] ?? 0), 2);
        if ($purchase > 0 && ($sale - $purchase) + 0.009 < $minProfit) {
            continue;
        }
    }
    $image = shoptop_seo_product_image($row);
    if ($image === null || $image === '') {
        continue;
    }
    $catalogId = shoptop_seo_clip(trim((string) ($row['sku'] ?? '')), 100);
    if ($catalogId === '') {
        continue;
    }

    $stock = max(0, (int) ($row['stock_qty'] ?? 0));
    // Combo / stoc intern 0: tot listăm ca „in stock” (comenzile se gestionează manual).
    $qtyForFeed = $stock > 0 ? $stock : 5;
    $description = shoptop_seo_clip(
        shoptop_seo_plain_text((string) ($row['description'] ?? ''), 9999) ?: $title,
        9999,
    );
    $brand = shoptop_seo_clip(trim((string) ($row['brand'] ?? '')) ?: 'ShopTop', 100);
    $discount = (float) ($row['discount_percent'] ?? 0);
    $discount = min(99.0, max(0.0, $discount));
    $compareAt = null;
    if ($discount > 0) {
        $compareAt = round($sale / (1 - $discount / 100), 2);
    }
    $gtin = preg_replace('/\D+/', '', (string) ($row['ean'] ?? '')) ?? '';
    if (strlen($gtin) < 8 || strlen($gtin) > 14) {
        $gtin = '';
    }
    $category = trim((string) ($row['category'] ?? ''));
    if ($category === '' || $category === 'Diverse') {
        $category = 'Casă și grădină';
    }

    $values = [
        'id' => $catalogId,
        'title' => $title,
        'description' => $description,
        'availability' => 'in stock',
        'condition' => 'new',
        'price' => number_format($compareAt ?? $sale, 2, '.', '') . ' RON',
        'link' => $site . shoptop_seo_product_path($row),
        'image_link' => $image,
        'brand' => $brand,
        'google_product_category' => trim((string) ($row['google_category'] ?? '')),
        'fb_product_category' => '',
        'quantity_to_sell_on_facebook' => (string) $qtyForFeed,
        'sale_price' => $compareAt !== null
            ? number_format($sale, 2, '.', '') . ' RON'
            : '',
        'sale_price_effective_date' => '',
        'item_group_id' => '',
        'gender' => '',
        'color' => '',
        'size' => '',
        'age_group' => '',
        'material' => '',
        'pattern' => '',
        'shipping' => $shipping,
        'shipping_weight' => '',
        'offer_disclaimer' => $disclaimer,
        'offer_disclaimer_url' => $disclaimerUrl,
        'video[0].url' => '',
        'video[0].tag[0]' => '',
        'gtin' => $gtin,
        'product_tags[0]' => shoptop_seo_clip($category, 110),
        'product_tags[1]' => '',
        'style[0]' => '',
    ];

    $line = [];
    foreach ($columns as $col) {
        $line[] = shoptop_seo_csv_field($values[$col]);
    }
    fwrite($out, implode(',', $line) . "\r\n");
}

fclose($out);
