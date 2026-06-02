<?php

declare(strict_types=1);

require_once __DIR__ . '/lib.php';

/**
 * Client BaseLinker (API connector) + sincronizare produse/stoc si push comenzi.
 * Toate apelurile sunt "best-effort": daca tokenul nu e configurat sau apelul esueaza,
 * fluxul magazinului continua, iar eroarea e logata.
 */

function shoptop_baselinker_settings(): array
{
    $config = shoptop_config();
    $bl = is_array($config['baselinker'] ?? null) ? $config['baselinker'] : [];

    return [
        'token' => trim((string) ($bl['token'] ?? '')),
        'inventory_id' => trim((string) ($bl['inventory_id'] ?? '')),
        'price_group_id' => trim((string) ($bl['price_group_id'] ?? '')),
        'warehouse_id' => trim((string) ($bl['warehouse_id'] ?? '')),
        'order_status_id' => trim((string) ($bl['order_status_id'] ?? '')),
    ];
}

function shoptop_baselinker_enabled(): bool
{
    $s = shoptop_baselinker_settings();
    return $s['token'] !== '';
}

/**
 * Apel low-level catre BaseLinker. Returneaza raspunsul decodat.
 * Arunca RuntimeException la eroare de transport sau status ERROR.
 */
function shoptop_baselinker_call(string $method, array $parameters = []): array
{
    $s = shoptop_baselinker_settings();
    if ($s['token'] === '') {
        throw new RuntimeException('BaseLinker token lipseste.');
    }

    $ch = curl_init('https://api.baselinker.com/connector.php');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['X-BLToken: ' . $s['token']],
        CURLOPT_POSTFIELDS => http_build_query([
            'method' => $method,
            'parameters' => json_encode($parameters, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]),
        CURLOPT_TIMEOUT => 30,
    ]);

    $raw = curl_exec($ch);
    if ($raw === false) {
        $err = curl_error($ch);
        curl_close($ch);
        throw new RuntimeException('BaseLinker request failed: ' . $err);
    }
    curl_close($ch);

    $decoded = json_decode((string) $raw, true);
    if (!is_array($decoded)) {
        throw new RuntimeException('BaseLinker raspuns invalid.');
    }
    if (($decoded['status'] ?? '') === 'ERROR') {
        throw new RuntimeException(
            'BaseLinker eroare: ' . (string) ($decoded['error_message'] ?? 'necunoscuta')
        );
    }

    return $decoded;
}

/**
 * Sincronizeaza un produs (creeaza sau actualizeaza in catalogul BaseLinker).
 * $product = randul normalizat din shoptop_normalize_product (image_urls = JSON string).
 * Best-effort: nu arunca exceptii in sus.
 */
function shoptop_baselinker_sync_product(PDO $pdo, array $product): void
{
    $s = shoptop_baselinker_settings();
    if ($s['token'] === '' || $s['inventory_id'] === '') {
        return;
    }

    $productId = (string) ($product['id'] ?? '');
    if ($productId === '') {
        return;
    }

    try {
        // Mapare existenta catre BaseLinker.
        $stmt = $pdo->prepare('SELECT baselinker_product_id FROM products WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $productId]);
        $blProductId = (string) ($stmt->fetchColumn() ?: '');

        $params = [
            'inventory_id' => $s['inventory_id'],
            'sku' => (string) ($product['sku'] ?? $productId),
            'ean' => (string) ($product['ean'] ?? ''),
            'text_fields' => [
                'name' => (string) ($product['name'] ?? ''),
                'description' => (string) ($product['description'] ?? ''),
            ],
        ];
        if ($blProductId !== '') {
            $params['product_id'] = $blProductId;
        }
        if (!empty($product['brand'])) {
            $params['man_name'] = (string) $product['brand'];
        }

        // Imagini (URL-uri prefixate cu "url:").
        $images = json_decode((string) ($product['image_urls'] ?? '[]'), true);
        if (is_array($images) && $images !== []) {
            $imageMap = [];
            $i = 0;
            foreach ($images as $url) {
                if (!is_string($url) || trim($url) === '') {
                    continue;
                }
                if (str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) {
                    $imageMap[(string) $i] = 'url:' . $url;
                    $i++;
                }
                if ($i >= 16) {
                    break;
                }
            }
            if ($imageMap !== []) {
                $params['images'] = $imageMap;
            }
        }

        if ($s['price_group_id'] !== '') {
            $params['prices'] = [
                $s['price_group_id'] => (float) ($product['sale_price'] ?? 0),
            ];
        }
        if ($s['warehouse_id'] !== '') {
            $params['stock'] = [
                $s['warehouse_id'] => (int) ($product['stock_qty'] ?? 0),
            ];
        }

        $response = shoptop_baselinker_call('addInventoryProduct', $params);

        // Daca am creat produsul, salvam ID-ul intors pentru actualizari ulterioare.
        if ($blProductId === '' && !empty($response['product_id'])) {
            $update = $pdo->prepare(
                'UPDATE products SET baselinker_product_id = :bl WHERE id = :id'
            );
            $update->execute([
                'bl' => (string) $response['product_id'],
                'id' => $productId,
            ]);
        }
    } catch (Throwable $e) {
        error_log('BaseLinker sync product ' . $productId . ': ' . $e->getMessage());
    }
}

/**
 * Trimite o comanda in BaseLinker (addOrder). Returneaza order_id BaseLinker sau null.
 * $order = payload din shoptop_order_row_to_response (cu items).
 */
function shoptop_baselinker_push_order(array $order): ?string
{
    $s = shoptop_baselinker_settings();
    if ($s['token'] === '') {
        return null;
    }

    try {
        $paid = ($order['paymentStatus'] ?? '') === 'paid';
        $paymentMethod = ($order['paymentMethod'] ?? 'cod') === 'card'
            ? 'Card online (Netopia)'
            : 'Ramburs la livrare';

        $products = [];
        foreach ($order['items'] as $item) {
            $products[] = [
                'name' => (string) $item['productName'],
                'sku' => (string) ($item['productSku'] ?? ''),
                'price_brutto' => (float) $item['unitPrice'],
                'quantity' => (int) $item['quantity'],
                'tax_rate' => 19,
            ];
        }

        $params = [
            'order_status_id' => $s['order_status_id'] !== '' ? (int) $s['order_status_id'] : 0,
            'date_add' => time(),
            'currency' => 'RON',
            'payment_method' => $paymentMethod,
            'payment_method_cod' => $paid ? 0 : 1,
            'paid' => $paid ? 1 : 0,
            'user_comments' => (string) ($order['customerNotes'] ?? ''),
            'email' => (string) ($order['customerEmail'] ?? ''),
            'phone' => (string) ($order['customerPhone'] ?? ''),
            'delivery_fullname' => (string) ($order['customerName'] ?? ''),
            'delivery_address' => (string) ($order['customerAddress'] ?? ''),
            'delivery_country_code' => 'RO',
            'products' => $products,
            'custom_extra_fields' => [],
        ];
        if ($s['order_status_id'] === '') {
            unset($params['order_status_id']);
        }

        $response = shoptop_baselinker_call('addOrder', $params);
        if (!empty($response['order_id'])) {
            return (string) $response['order_id'];
        }
    } catch (Throwable $e) {
        error_log('BaseLinker push order ' . (string) ($order['id'] ?? '') . ': ' . $e->getMessage());
    }

    return null;
}
