<?php

declare(strict_types=1);

require_once __DIR__ . '/lib.php';

/**
 * Pagina de retur dupa plata Netopia. Netopia redirectioneaza clientul aici
 * (GET sau POST) cu orderID. Trimitem clientul inapoi la pagina comenzii din magazin.
 * Confirmarea reala a platii vine separat prin IPN (payment_netopia_ipn.php).
 */

$orderId = trim((string) ($_REQUEST['orderID'] ?? ($_REQUEST['orderId'] ?? '')));

$config = shoptop_config();
$siteUrl = rtrim(trim((string) ($config['site_url'] ?? 'https://shop-top.ro')), '/');

$target = $orderId !== ''
    ? $siteUrl . '/comanda/' . rawurlencode($orderId)
    : $siteUrl . '/';

header('Location: ' . $target, true, 302);
echo 'Redirecting...';
