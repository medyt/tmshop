<?php

declare(strict_types=1);

/**
 * Shell HTML pentru SEO: injectează title/meta/JSON-LD + conținut citibil
 * în index.html pentru homepage și /produs/:slug — crawlerii văd date reale
 * fără să ruleze JavaScript. React rămâne aplicația pentru utilizatori.
 */

require_once __DIR__ . '/seo-lib.php';

$path = (string) (parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
$path = rawurldecode($path);
if ($path === '') {
    $path = '/';
}

$apiDir = shoptop_seo_api_dir();
$pdo = null;
if ($apiDir !== null) {
    require_once $apiDir . '/lib.php';
    try {
        $pdo = shoptop_pdo();
    } catch (Throwable $e) {
        $pdo = null;
    }
}

$html = shoptop_seo_read_index_html();
$site = shoptop_seo_site_url();

// ——— Pagina produs ———
if (preg_match('#^/produs/([^/]+)/?$#u', $path, $m) === 1) {
    $ref = $m[1];
    $row = null;
    $productLookupFailed = false;
    if ($pdo instanceof PDO) {
        try {
            $row = shoptop_seo_find_product($pdo, $ref);
        } catch (Throwable $e) {
            // Nu bloca landing-ul din reclame (fbclid etc.) — React servește pagina.
            $productLookupFailed = true;
        }
    }

    if ($productLookupFailed) {
        header('Content-Type: text/html; charset=utf-8');
        header('X-ShopTop-SEO: product-fallback');
        echo $html;
        exit;
    }

    if ($row === null && $pdo instanceof PDO && function_exists('shoptop_product_id_for_previous_slug')) {
        // Adresă veche (produs redenumit) → 301 permanent către adresa curentă.
        // Păstrăm query string-ul (fbclid, utm_*) ca atribuirea reclamelor să meargă.
        try {
            $ownerId = shoptop_product_id_for_previous_slug($pdo, rawurldecode($ref));
            $owner = $ownerId !== null ? shoptop_seo_find_product($pdo, $ownerId) : null;
        } catch (Throwable $e) {
            $owner = null;
        }
        if ($owner !== null) {
            $query = (string) ($_SERVER['QUERY_STRING'] ?? '');
            $target = rtrim($site, '/') . shoptop_seo_product_path($owner) . ($query !== '' ? '?' . $query : '');
            header('X-ShopTop-SEO: product-slug-redirect');
            header('Location: ' . $target, true, 301);
            exit;
        }
    }

    if ($row === null) {
        // Produs inexistent → catalog (fără pagină 404 dead-end).
        header('X-ShopTop-SEO: product-missing-redirect');
        header('Location: ' . rtrim($site, '/') . '/#catalog', true, 302);
        exit;
    }

    $name = trim((string) ($row['name'] ?? 'Produs'));
    $price = (float) ($row['sale_price'] ?? 0);
    $descHtml = (string) ($row['description'] ?? '');
    $plain = shoptop_seo_plain_text($descHtml, 160);
    if ($plain === '') {
        $plain = shoptop_seo_plain_text(
            'Cumpără ' . $name . ' la ' . number_format($price, 2, '.', '') . ' RON. Livrare prin curier, plată ramburs sau card.',
            160
        );
    }
    $productPath = shoptop_seo_product_path($row);
    $canonical = $site . $productPath;
    $image = shoptop_seo_product_image($row) ?? shoptop_seo_absolute_url('/og-cover.svg');
    $sku = trim((string) ($row['sku'] ?? ''));
    $brand = trim((string) ($row['brand'] ?? 'ShopTop'));
    $category = trim((string) ($row['category'] ?? ''));

    $jsonLd = [
        '@context' => 'https://schema.org',
        '@graph' => [
            [
                '@type' => 'Organization',
                'name' => 'TM SHOP SRL',
                'url' => $site,
            ],
            [
                '@type' => 'BreadcrumbList',
                'itemListElement' => [
                    [
                        '@type' => 'ListItem',
                        'position' => 1,
                        'name' => 'Acasă',
                        'item' => $site . '/',
                    ],
                    [
                        '@type' => 'ListItem',
                        'position' => 2,
                        'name' => $name,
                        'item' => $canonical,
                    ],
                ],
            ],
            [
                '@type' => 'Product',
                'name' => $name,
                'description' => $plain,
                'image' => [$image],
                'sku' => $sku !== '' ? $sku : null,
                'brand' => [
                    '@type' => 'Brand',
                    'name' => $brand !== '' ? $brand : 'ShopTop',
                ],
                'offers' => [
                    '@type' => 'Offer',
                    'url' => $canonical,
                    'priceCurrency' => 'RON',
                    'price' => number_format($price, 2, '.', ''),
                    'availability' => 'https://schema.org/InStock',
                    'itemCondition' => 'https://schema.org/NewCondition',
                ],
            ],
        ],
    ];

    $body = '<article itemscope itemtype="https://schema.org/Product">';
    $body .= '<nav aria-label="Breadcrumb"><a href="/">Acasă</a> / <span>' . shoptop_seo_h($name) . '</span></nav>';
    $body .= '<h1 itemprop="name">' . shoptop_seo_h($name) . '</h1>';
    if ($category !== '') {
        $body .= '<p>Categorie: ' . shoptop_seo_h($category) . '</p>';
    }
    $body .= '<p itemprop="offers" itemscope itemtype="https://schema.org/Offer">';
    $body .= '<meta itemprop="priceCurrency" content="RON">';
    $body .= 'Preț: <strong itemprop="price" content="' . shoptop_seo_h(number_format($price, 2, '.', '')) . '">'
        . shoptop_seo_h(number_format($price, 2, ',', '.')) . ' RON</strong>';
    $body .= ' — în stoc';
    $body .= '</p>';
    if ($image) {
        $body .= '<p><img src="' . shoptop_seo_h($image) . '" alt="' . shoptop_seo_h($name) . '" width="600" height="600" loading="lazy"></p>';
    }
    $long = shoptop_seo_plain_text($descHtml, 4000);
    if ($long !== '') {
        $body .= '<div itemprop="description"><p>' . shoptop_seo_h($long) . '</p></div>';
    }
    $body .= '<p><a href="' . shoptop_seo_h($productPath) . '">Vezi produsul în magazin</a></p>';
    $body .= '</article>';

    header('Content-Type: text/html; charset=utf-8');
    header('X-ShopTop-SEO: product');
    echo shoptop_seo_inject($html, [
        'title' => $name . ' — ShopTop',
        'description' => $plain,
        'canonical' => $canonical,
        'image' => $image,
        'type' => 'product',
        'jsonLd' => $jsonLd,
        'bodyHtml' => $body,
    ]);
    exit;
}

// ——— Homepage / catalog ———
if ($path === '/' || $path === '/index.html') {
    $products = $pdo instanceof PDO ? shoptop_seo_list_products($pdo, 120) : [];
    $items = [];
    $listHtml = '<section><h1>ShopTop — magazin online</h1>';
    $listHtml .= '<p>Produse în stoc, livrare prin curier, plată ramburs sau cu cardul în România.</p>';
    if ($products !== []) {
        $listHtml .= '<h2>Catalog produse</h2><ul>';
        $pos = 1;
        foreach ($products as $row) {
            $name = trim((string) ($row['name'] ?? ''));
            if ($name === '') {
                continue;
            }
            $pPath = shoptop_seo_product_path($row);
            $price = (float) ($row['sale_price'] ?? 0);
            $listHtml .= '<li><a href="' . shoptop_seo_h($pPath) . '">' . shoptop_seo_h($name)
                . '</a> — ' . shoptop_seo_h(number_format($price, 2, ',', '.')) . ' RON</li>';
            $items[] = [
                '@type' => 'ListItem',
                'position' => $pos,
                'url' => $site . $pPath,
                'name' => $name,
            ];
            $pos++;
        }
        $listHtml .= '</ul>';
    }
    $listHtml .= '</section>';

    $jsonLd = [
        '@context' => 'https://schema.org',
        '@graph' => [
            [
                '@type' => 'Organization',
                'name' => 'TM SHOP SRL',
                'url' => $site,
                'email' => 'tmshop366@gmail.com',
            ],
            [
                '@type' => 'WebSite',
                'name' => 'ShopTop',
                'url' => $site,
                'inLanguage' => 'ro-RO',
            ],
        ],
    ];
    if ($items !== []) {
        $jsonLd['@graph'][] = [
            '@type' => 'ItemList',
            'name' => 'Catalog ShopTop',
            'numberOfItems' => count($items),
            'itemListElement' => $items,
        ];
    }

    header('Content-Type: text/html; charset=utf-8');
    header('X-ShopTop-SEO: home');
    echo shoptop_seo_inject($html, [
        'title' => 'ShopTop — magazin online',
        'description' => 'ShopTop: magazin online cu produse în stoc, livrare prin curier și plată ramburs sau cu cardul în România.',
        'canonical' => $site . '/',
        'image' => shoptop_seo_absolute_url('/og-cover.svg'),
        'type' => 'website',
        'jsonLd' => $jsonLd,
        'bodyHtml' => $listHtml,
    ]);
    exit;
}

// Alte rute: SPA clasic (fără inject).
header('Content-Type: text/html; charset=utf-8');
header('X-ShopTop-SEO: spa');
echo $html;
