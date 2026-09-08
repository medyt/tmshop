<?php

declare(strict_types=1);

/**
 * Sitemap dinamic din produsele din MySQL.
 * URL public: https://shop-top.ro/sitemap.xml
 */

require_once __DIR__ . '/seo-lib.php';

$apiDir = shoptop_seo_api_dir();
$products = [];
if ($apiDir !== null) {
    require_once $apiDir . '/lib.php';
    try {
        $products = shoptop_seo_list_products(shoptop_pdo(), 5000);
    } catch (Throwable $e) {
        $products = [];
    }
}

$site = shoptop_seo_site_url();
$today = date('Y-m-d');

header('Content-Type: application/xml; charset=utf-8');
header('X-Robots-Tag: noindex');

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

$static = [
    ['loc' => $site . '/', 'priority' => '1.0', 'changefreq' => 'daily'],
    ['loc' => $site . '/livrare-si-plata', 'priority' => '0.5', 'changefreq' => 'monthly'],
    ['loc' => $site . '/retur', 'priority' => '0.5', 'changefreq' => 'monthly'],
    ['loc' => $site . '/contact', 'priority' => '0.5', 'changefreq' => 'monthly'],
    ['loc' => $site . '/intrebari-frecvente', 'priority' => '0.4', 'changefreq' => 'monthly'],
    ['loc' => $site . '/termeni-si-conditii', 'priority' => '0.3', 'changefreq' => 'yearly'],
    ['loc' => $site . '/politica-de-confidentialitate', 'priority' => '0.3', 'changefreq' => 'yearly'],
    ['loc' => $site . '/politica-cookie', 'priority' => '0.3', 'changefreq' => 'yearly'],
];

foreach ($static as $row) {
    echo "  <url>\n";
    echo '    <loc>' . htmlspecialchars($row['loc'], ENT_XML1) . "</loc>\n";
    echo '    <lastmod>' . $today . "</lastmod>\n";
    echo '    <changefreq>' . $row['changefreq'] . "</changefreq>\n";
    echo '    <priority>' . $row['priority'] . "</priority>\n";
    echo "  </url>\n";
}

foreach ($products as $product) {
    $path = shoptop_seo_product_path($product);
    echo "  <url>\n";
    echo '    <loc>' . htmlspecialchars($site . $path, ENT_XML1) . "</loc>\n";
    echo '    <lastmod>' . $today . "</lastmod>\n";
    echo "    <changefreq>weekly</changefreq>\n";
    echo "    <priority>0.8</priority>\n";
    echo "  </url>\n";
}

echo '</urlset>';
