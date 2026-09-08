<?php

declare(strict_types=1);

require_once __DIR__ . '/lib.php';

function shoptop_site_url(): string
{
    $configured = trim((string) (shoptop_config()['site_url'] ?? ''));
    if ($configured !== '') {
        return rtrim($configured, '/');
    }

    return 'https://shop-top.ro';
}

function shoptop_product_public_path(array $row): string
{
    $slug = trim((string) ($row['slug'] ?? ''));
    $segment = $slug !== '' ? $slug : (string) $row['id'];

    return '/produs/' . rawurlencode($segment);
}

function shoptop_sitemap_url(string $path): string
{
    return shoptop_site_url() . ($path === '/' ? '/' : $path);
}

function shoptop_sitemap_entry(string $path): string
{
    return "  <url>\n    <loc>"
        . htmlspecialchars(shoptop_sitemap_url($path), ENT_XML1 | ENT_COMPAT, 'UTF-8')
        . "</loc>\n  </url>\n";
}

header('Content-Type: application/xml; charset=utf-8');

$staticPaths = [
    '/',
    '/livrare-si-plata',
    '/retur',
    '/contact',
    '/intrebari-frecvente',
    '/termeni-si-conditii',
    '/politica-de-confidentialitate',
    '/politica-cookie',
];

$pdo = shoptop_pdo();
$stmt = $pdo->query(
    'SELECT id, slug
     FROM products
     WHERE sale_price > 0
     ORDER BY name ASC'
);

echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
echo "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";

foreach ($staticPaths as $path) {
    echo shoptop_sitemap_entry($path);
}

foreach ($stmt->fetchAll() as $row) {
    echo shoptop_sitemap_entry(shoptop_product_public_path($row));
}

echo "</urlset>\n";
