<?php

declare(strict_types=1);

require_once __DIR__ . '/lib.php';

/**
 * FAN Courier SelfAWB REST API — AWB, print, tracking.
 * @see https://api.fancourier.ro
 */

const SHOPTOP_FAN_BASE_URL = 'https://api.fancourier.ro';

function shoptop_fan_settings(): array
{
    $cfg = shoptop_config()['fan'] ?? [];
    if (!is_array($cfg)) {
        $cfg = [];
    }

    $format = strtoupper(trim((string) ($cfg['paper_size'] ?? 'A6')));
    if (!in_array($format, ['A4', 'A5', 'A6'], true)) {
        $format = 'A6';
    }

    return [
        'enabled' => ($cfg['enabled'] ?? true) !== false,
        'username' => trim((string) ($cfg['username'] ?? '')),
        'password' => (string) ($cfg['password'] ?? ''),
        'client_id' => (int) ($cfg['client_id'] ?? 0),
        'service' => trim((string) ($cfg['service'] ?? 'Standard')),
        'service_cod' => trim((string) ($cfg['service_cod'] ?? 'Cont Colector')),
        'default_weight_kg' => max(0.1, (float) ($cfg['default_weight_kg'] ?? 1.0)),
        // A6 e acceptat de Fan doar pe AWB cu ePOD (opțiunea X).
        'paper_size' => $format,
        'epod' => ($cfg['epod'] ?? true) !== false,
        // PDF termic 4×6″ (TSC TE210) via ZPL + Labelary.
        'label_width_in' => max(1.0, (float) ($cfg['label_width_in'] ?? 4)),
        'label_height_in' => max(1.0, (float) ($cfg['label_height_in'] ?? 6)),
        'label_dpmm' => (int) ($cfg['label_dpmm'] ?? 8),
        'labelary_url' => trim((string) ($cfg['labelary_url'] ?? 'https://api.labelary.com/v1/printers')),
        // Fallback HTML (dacă Labelary e indisponibil).
        'label_width_mm' => max(40.0, (float) ($cfg['label_width_mm'] ?? 100)),
        'label_height_mm' => max(40.0, (float) ($cfg['label_height_mm'] ?? 150)),
        'label_scale' => max(0.2, min(1.0, (float) ($cfg['label_scale'] ?? 0.48))),
        'bank' => trim((string) ($cfg['bank'] ?? '')),
        'bank_account' => trim((string) ($cfg['bank_account'] ?? '')),
        'vat_percent' => max(0.0, (float) ($cfg['vat_percent'] ?? 19.0)),
    ];
}

function shoptop_fan_enabled(): bool
{
    $s = shoptop_fan_settings();
    return $s['enabled']
        && $s['username'] !== ''
        && $s['password'] !== ''
        && $s['client_id'] > 0;
}

/**
 * @return array{token:string,expiresAt:?string}
 */
function shoptop_fan_login(): array
{
    static $cached = null;
    if (is_array($cached) && !empty($cached['token'])) {
        $expiresAt = (string) ($cached['expiresAt'] ?? '');
        if ($expiresAt === '' || strtotime($expiresAt) > time() + 60) {
            return $cached;
        }
    }

    $s = shoptop_fan_settings();
    if ($s['username'] === '' || $s['password'] === '') {
        throw new RuntimeException('Fan Courier: lipsește username/password în config.php.');
    }

    $url = SHOPTOP_FAN_BASE_URL . '/login?' . http_build_query([
        'username' => $s['username'],
        'password' => $s['password'],
    ]);

    $ch = curl_init($url);
    if ($ch === false) {
        throw new RuntimeException('Fan Courier: nu am putut inițializa login.');
    }
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => ['Accept: application/json'],
    ]);
    $raw = curl_exec($ch);
    $errno = curl_errno($ch);
    $err = curl_error($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($errno !== 0) {
        throw new RuntimeException('Fan Courier login eșuat: ' . $err);
    }
    $json = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($json)) {
        throw new RuntimeException('Fan Courier login: răspuns invalid (HTTP ' . $code . ').');
    }

    $token = '';
    $expiresAt = null;
    if (!empty($json['data']) && is_array($json['data'])) {
        $token = trim((string) ($json['data']['token'] ?? ''));
        $expiresAt = isset($json['data']['expiresAt'])
            ? (string) $json['data']['expiresAt']
            : null;
    }
    if ($token === '') {
        $token = trim((string) ($json['token'] ?? ''));
    }
    if ($token === '') {
        $msg = trim((string) ($json['message'] ?? $json['error'] ?? 'Autentificare eșuată.'));
        throw new RuntimeException('Fan Courier login: ' . $msg);
    }

    $cached = ['token' => $token, 'expiresAt' => $expiresAt];
    return $cached;
}

/**
 * @return array{ok:bool,code:int,json:?array,raw:string,error:?string}
 */
function shoptop_fan_request(
    string $method,
    string $path,
    ?array $query = null,
    ?array $jsonBody = null,
    bool $expectBinary = false,
): array {
    $auth = shoptop_fan_login();
    $url = SHOPTOP_FAN_BASE_URL . $path;
    if ($query !== null && $query !== []) {
        $url .= (str_contains($path, '?') ? '&' : '?') . http_build_query($query);
    }

    $headers = [
        'Authorization: Bearer ' . $auth['token'],
        'Accept: application/json',
    ];
    $body = null;
    if ($jsonBody !== null) {
        $body = json_encode($jsonBody, JSON_UNESCAPED_UNICODE);
        $headers[] = 'Content-Type: application/json';
    }

    $ch = curl_init($url);
    if ($ch === false) {
        return ['ok' => false, 'code' => 0, 'json' => null, 'raw' => '', 'error' => 'curl_init failed'];
    }

    $opts = [
        CURLOPT_CUSTOMREQUEST => strtoupper($method),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_HTTPHEADER => $headers,
    ];
    if ($body !== null) {
        $opts[CURLOPT_POSTFIELDS] = $body;
    }
    curl_setopt_array($ch, $opts);

    $raw = curl_exec($ch);
    $errno = curl_errno($ch);
    $err = curl_error($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($errno !== 0) {
        return ['ok' => false, 'code' => $code, 'json' => null, 'raw' => '', 'error' => $err];
    }
    $rawStr = is_string($raw) ? $raw : '';

    if ($expectBinary) {
        return [
            'ok' => $code >= 200 && $code < 300 && $rawStr !== '',
            'code' => $code,
            'json' => null,
            'raw' => $rawStr,
            'error' => ($code >= 200 && $code < 300) ? null : ('HTTP ' . $code),
        ];
    }

    $json = $rawStr !== '' ? json_decode($rawStr, true) : null;
    $ok = $code >= 200 && $code < 300;
    $status = is_array($json) ? (string) ($json['status'] ?? '') : '';
    if ($status !== '' && strcasecmp($status, 'success') !== 0) {
        $ok = false;
    }

    $error = null;
    if (!$ok) {
        if (is_array($json)) {
            $error = (string) ($json['message'] ?? $json['error'] ?? '');
            if ($error === '' && !empty($json['data']) && is_string($json['data'])) {
                $error = $json['data'];
            }
        }
        if ($error === '') {
            $error = 'Fan Courier HTTP ' . $code;
        }
    }

    return [
        'ok' => $ok,
        'code' => $code,
        'json' => is_array($json) ? $json : null,
        'raw' => $rawStr,
        'error' => $error,
    ];
}

function shoptop_fan_public_tracking_url(string $awb): string
{
    return 'https://www.fancourier.ro/awb-tracking/?awb=' . rawurlencode($awb);
}

/**
 * @param array<int, array<string, mixed>> $items
 */
function shoptop_fan_order_is_cod(array $orderRow, array $items = []): bool
{
    unset($items);
    $paymentMethod = (string) ($orderRow['payment_method'] ?? 'cod');
    $paymentStatus = (string) ($orderRow['payment_status'] ?? 'pending');
    $totalAmount = (float) ($orderRow['total_amount'] ?? 0);
    return $paymentMethod === 'cod' && $paymentStatus !== 'paid' && $totalAmount > 0;
}

/**
 * @param array<int, array<string, mixed>> $items
 * @return array{
 *   shipmentId:string,
 *   parcelId:string,
 *   courierCost:?array{total:float,net:float,vat:float,details:array<string,float>,source:string}
 * }
 */
function shoptop_fan_create_shipment(array $orderRow, array $items = []): array
{
    if (!shoptop_fan_enabled()) {
        throw new RuntimeException(
            'Fan Courier nu este configurat. Completează username, password și client_id în config.php.'
        );
    }

    $s = shoptop_fan_settings();
    // Reuse DPD address parser (same ship_* columns).
    require_once __DIR__ . '/dpd.php';
    $address = shoptop_dpd_order_address_parts($orderRow);
    $county = $address['countyName'] !== '' ? $address['countyName'] : $address['county'];
    $city = $address['city'];
    $street = $address['street'];
    $streetNo = $address['streetNumber'] !== '' ? $address['streetNumber'] : '1';

    if ($city === '' || $street === '' || $county === '') {
        throw new RuntimeException(
            'Adresa comenzii este incompletă pentru Fan Courier (județ, localitate, stradă).'
        );
    }

    $phone = shoptop_dpd_normalize_phone((string) ($orderRow['customer_phone'] ?? ''));
    if ($phone === '') {
        throw new RuntimeException('Telefonul clientului este obligatoriu pentru AWB Fan.');
    }

    $name = trim((string) ($orderRow['customer_name'] ?? ''));
    if (mb_strlen($name) < 3) {
        throw new RuntimeException('Numele clientului este prea scurt pentru Fan Courier.');
    }

    $isCod = shoptop_fan_order_is_cod($orderRow, $items);
    $service = $isCod ? $s['service_cod'] : $s['service'];
    $total = (float) ($orderRow['total_amount'] ?? 0);
    $orderId = (string) ($orderRow['id'] ?? '');

    $info = [
        'service' => $service,
        'packages' => [
            'parcel' => 1,
            'envelope' => 0,
        ],
        'weight' => $s['default_weight_kg'],
        'cod' => $isCod ? round($total, 2) : 0,
        'declaredValue' => 0,
        'payment' => 'sender',
        'refund' => null,
        'returnPayment' => null,
        'observation' => 'Comanda #' . $orderId,
        'content' => 'Comanda #' . $orderId,
        'dimensions' => [
            'length' => 10,
            'width' => 10,
            'height' => 5,
        ],
        // ePOD (X) — necesar ca Fan să accepte etichetă A6 la print.
        'options' => $s['epod'] ? ['X'] : [],
    ];

    if ($isCod) {
        if ($s['bank'] !== '') {
            $info['bank'] = $s['bank'];
        }
        if ($s['bank_account'] !== '') {
            $info['bankAccount'] = $s['bank_account'];
        }
    }

    $email = trim((string) ($orderRow['customer_email'] ?? ''));
    $recipient = [
        'name' => mb_substr($name, 0, 60),
        'phone' => $phone,
        'email' => $email !== '' ? $email : null,
        'address' => [
            'county' => mb_substr($county, 0, 50),
            'locality' => mb_substr($city, 0, 50),
            'street' => mb_substr($street, 0, 255),
            'streetNo' => mb_substr($streetNo, 0, 10),
            'zipCode' => mb_substr($address['postalCode'], 0, 6),
            'building' => mb_substr($address['addressExtra'], 0, 20),
            'pickupLocation' => '',
        ],
    ];

    $payload = [
        'clientId' => $s['client_id'],
        'shipments' => [
            [
                'info' => $info,
                'recipient' => $recipient,
            ],
        ],
    ];

    $res = shoptop_fan_request('POST', '/intern-awb', null, $payload);
    if (!$res['ok'] || !is_array($res['json'])) {
        throw new RuntimeException($res['error'] ?? 'Crearea AWB Fan a eșuat.');
    }

    $responseList = $res['json']['response'] ?? $res['json']['data'] ?? null;
    $first = null;
    if (is_array($responseList) && isset($responseList[0]) && is_array($responseList[0])) {
        $first = $responseList[0];
    }
    if ($first === null && is_array($res['json']['response'] ?? null)) {
        $first = $res['json']['response'];
    }
    if (!is_array($first)) {
        throw new RuntimeException('Fan Courier nu a returnat AWB-ul generat.');
    }

    if (!empty($first['errors'])) {
        $err = $first['errors'];
        if (is_array($err)) {
            $err = implode('; ', array_map('strval', $err));
        }
        throw new RuntimeException('Fan Courier: ' . (string) $err);
    }

    $awb = trim((string) ($first['awbNumber'] ?? $first['awb'] ?? ''));
    if ($awb === '') {
        throw new RuntimeException('Fan Courier nu a returnat numărul AWB.');
    }

    $courierCost = null;
    $tariff = isset($first['tariff']) && is_numeric($first['tariff']) ? (float) $first['tariff'] : null;
    $vat = isset($first['vat']) && is_numeric($first['vat']) ? (float) $first['vat'] : null;
    if ($tariff !== null) {
        $vatVal = $vat ?? round($tariff * ($s['vat_percent'] / 100), 2);
        $net = $tariff;
        // Unele răspunsuri dau tariff fără TVA; altele total. Păstrăm tariff ca net dacă există vat separat.
        $totalCost = $net + $vatVal;
        $courierCost = [
            'total' => round($totalCost, 2),
            'net' => round($net, 2),
            'vat' => round($vatVal, 2),
            'details' => [
                'fan_tariff' => round($net, 2),
                'fan_vat' => round($vatVal, 2),
            ],
            'source' => 'api',
        ];
    }

    return [
        'shipmentId' => $awb,
        'parcelId' => $awb,
        'courierCost' => $courierCost,
    ];
}

function shoptop_fan_delete_looks_already_gone(string $err): bool
{
    $e = mb_strtolower($err, 'UTF-8');
    foreach ([
        'already deleted',
        'already cancelled',
        'already canceled',
        'a fost șters',
        'a fost sters',
        'deja șters',
        'deja sters',
    ] as $needle) {
        if (str_contains($e, $needle)) {
            return true;
        }
    }
    return false;
}

/**
 * Șterge un AWB Fan din borderou (înainte de predare).
 * Dacă e deja șters sau inexistent, e no-op.
 */
function shoptop_fan_delete_awb(string $awb): void
{
    $num = trim($awb);
    if ($num === '') {
        throw new RuntimeException('Lipsește numărul AWB Fan pentru anulare.');
    }
    if (!shoptop_fan_enabled()) {
        throw new RuntimeException(
            'Fan Courier nu este configurat. Nu pot anula AWB-ul la curier.'
        );
    }

    $s = shoptop_fan_settings();
    $res = shoptop_fan_request('DELETE', '/awb', [
        'clientId' => $s['client_id'],
        'awb' => $num,
    ]);
    if (!empty($res['ok'])) {
        return;
    }

    $err = trim((string) ($res['error'] ?? ''));
    $code = (int) ($res['code'] ?? 0);
    if ($code === 404 || ($err !== '' && shoptop_fan_delete_looks_already_gone($err))) {
        return;
    }
    throw new RuntimeException($err !== '' ? $err : 'Anularea AWB Fan a eșuat.');
}

/**
 * Etichetă Fan pentru imprimantă termică (TSC etc.): ZPL → PDF 4×6″.
 *
 * @param string[] $awbNumbers
 */
function shoptop_fan_print_label(array $awbNumbers, ?string $paperSizeOverride = null): string
{
    unset($paperSizeOverride);
    if (!shoptop_fan_enabled()) {
        throw new RuntimeException('Fan Courier nu este configurat.');
    }

    $awbs = [];
    foreach ($awbNumbers as $id) {
        $id = trim((string) $id);
        if ($id !== '') {
            $awbs[] = $id;
        }
    }
    if ($awbs === []) {
        throw new RuntimeException('Lipsește AWB pentru print Fan.');
    }

    $s = shoptop_fan_settings();
    // Un singur request Fan pentru toate AWB-urile → ZPL multi-label → un PDF.
    $zpl = shoptop_fan_fetch_labels_zpl($s['client_id'], $awbs);
    if ($zpl === '') {
        throw new RuntimeException('Fan nu a returnat ZPL pentru etichetă.');
    }

    return shoptop_fan_zpl_to_thermal_pdf($zpl, $s);
}

/**
 * Convertește ZPL Fan în PDF 4×6″ (288×432 pt) via Labelary — potrivit TSC TE210.
 *
 * @param array<string, mixed> $settings
 */
function shoptop_fan_zpl_to_thermal_pdf(string $zpl, array $settings): string
{
    $dpmm = (int) ($settings['label_dpmm'] ?? 8);
    if (!in_array($dpmm, [6, 8, 12, 24], true)) {
        $dpmm = 8;
    }
    $widthIn = (float) ($settings['label_width_in'] ?? 4);
    $heightIn = (float) ($settings['label_height_in'] ?? 6);
    $widthIn = max(1.0, min(8.0, $widthIn));
    $heightIn = max(1.0, min(12.0, $heightIn));
    $wStr = rtrim(rtrim(number_format($widthIn, 2, '.', ''), '0'), '.');
    $hStr = rtrim(rtrim(number_format($heightIn, 2, '.', ''), '0'), '.');

    $base = trim((string) ($settings['labelary_url'] ?? ''));
    if ($base === '') {
        $base = 'https://api.labelary.com/v1/printers';
    }
    $base = rtrim($base, '/');
    // Fără index (/0/) — Labelary include toate etichetele ZPL într-un PDF multi-page.
    $url = $base . '/' . $dpmm . 'dpmm/labels/' . rawurlencode($wStr) . 'x' . rawurlencode($hStr) . '/';

    $ch = curl_init($url);
    if ($ch === false) {
        throw new RuntimeException('Nu am putut inițializa conversia etichetei termice.');
    }
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $zpl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_HTTPHEADER => [
            'Accept: application/pdf',
            'Content-Type: application/x-www-form-urlencoded',
        ],
    ]);
    $raw = curl_exec($ch);
    $errno = curl_errno($ch);
    $err = curl_error($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($errno !== 0) {
        throw new RuntimeException('Conversie etichetă termică eșuată: ' . $err);
    }
    if (!is_string($raw) || $raw === '' || !str_starts_with($raw, '%PDF')) {
        $hint = is_string($raw) ? trim(substr(strip_tags($raw), 0, 180)) : '';
        throw new RuntimeException(
            'Conversia ZPL→PDF termic a eșuat (HTTP ' . $code . ').'
            . ($hint !== '' ? ' ' . $hint : '')
        );
    }

    return $raw;
}

function shoptop_fan_fetch_label_zpl(int $clientId, string $awb): string
{
    return shoptop_fan_fetch_labels_zpl($clientId, [$awb]);
}

/**
 * @param list<string> $awbs
 */
function shoptop_fan_fetch_labels_zpl(int $clientId, array $awbs): string
{
    $awbs = array_values(array_filter(array_map(
        static fn ($id): string => trim((string) $id),
        $awbs
    ), static fn (string $id): bool => $id !== ''));
    if ($awbs === []) {
        throw new RuntimeException('Lipsește AWB pentru ZPL Fan.');
    }

    $parts = [
        http_build_query([
            'clientId' => $clientId,
            'zpl' => 1,
            'language' => 'ro',
        ]),
    ];
    foreach ($awbs as $awb) {
        $parts[] = 'awbs[]=' . rawurlencode($awb);
    }
    $path = '/awb/label?' . implode('&', $parts);

    $res = shoptop_fan_request('GET', $path, null, null, true);
    if (!$res['ok'] || $res['raw'] === '') {
        // Fallback: câte un ZPL per AWB, apoi concatenare.
        if (count($awbs) === 1) {
            throw new RuntimeException($res['error'] ?? 'Print AWB Fan (ZPL) a eșuat.');
        }
        $chunks = [];
        foreach ($awbs as $awb) {
            $chunks[] = shoptop_fan_fetch_labels_zpl($clientId, [$awb]);
        }
        return trim(implode("\n", $chunks));
    }
    $raw = trim($res['raw']);
    if (str_starts_with($raw, '{')) {
        $json = json_decode($raw, true);
        if (is_array($json)) {
            $msg = (string) ($json['message'] ?? $json['error'] ?? 'Răspuns Fan ZPL invalid.');
            throw new RuntimeException($msg);
        }
    }
    if (!str_contains($raw, '^XA')) {
        throw new RuntimeException('Fan nu a returnat ZPL valid.');
    }
    return $raw;
}

/**
 * @param list<string> $labelHtmlChunks
 * @param array<string, mixed> $settings
 */
function shoptop_fan_wrap_thermal_html(array $labelHtmlChunks, array $settings): string
{
    $w = (float) ($settings['label_width_mm'] ?? 100);
    $h = (float) ($settings['label_height_mm'] ?? 150);
    $scale = (float) ($settings['label_scale'] ?? 0.40);
    $wCss = rtrim(rtrim(number_format($w, 2, '.', ''), '0'), '.');
    $hCss = rtrim(rtrim(number_format($h, 2, '.', ''), '0'), '.');
    $scaleCss = rtrim(rtrim(number_format($scale, 3, '.', ''), '0'), '.');

    $pages = '';
    foreach ($labelHtmlChunks as $chunk) {
        $inner = shoptop_fan_extract_label_body($chunk);
        $pages .= '<section class="fan-label-page"><div class="fan-label-scale">'
            . $inner
            . '</div></section>';
    }

    return '<!DOCTYPE html><html lang="ro"><head><meta charset="utf-8">'
        . '<title>AWB Fan Courier</title>'
        . '<style>'
        . 'html,body{margin:0;padding:0;background:#fff;}'
        . '@page{size:' . $wCss . 'mm ' . $hCss . 'mm;margin:0;}'
        . '.fan-label-page{width:' . $wCss . 'mm;height:' . $hCss . 'mm;overflow:hidden;'
        . 'page-break-after:always;position:relative;}'
        . '.fan-label-page:last-child{page-break-after:auto;}'
        . '.fan-label-scale{transform:scale(' . $scaleCss . ');transform-origin:top left;width:210mm;}'
        . '@media print{html,body{margin:0;}'
        . '.fan-label-page{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}'
        . '</style></head><body>'
        . $pages
        . '<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},200)});</script>'
        . '</body></html>';
}

function shoptop_fan_extract_label_body(string $html): string
{
    if (preg_match('/<body[^>]*>(.*)<\/body>/is', $html, $m) === 1) {
        return $m[1];
    }
    return $html;
}

function shoptop_fan_fetch_label_html(int $clientId, string $awb): string
{
    $path = '/awb/label?' . http_build_query([
        'clientId' => $clientId,
        'pdf' => 0,
        'language' => 'ro',
        'format' => 'A5',
    ]) . '&awbs[]=' . rawurlencode($awb);

    $res = shoptop_fan_request('GET', $path, null, null, true);
    if (!$res['ok'] || $res['raw'] === '') {
        throw new RuntimeException($res['error'] ?? 'Print AWB Fan (HTML) a eșuat.');
    }
    $raw = $res['raw'];
    if (str_starts_with(ltrim($raw), '{')) {
        $json = json_decode($raw, true);
        if (is_array($json)) {
            $msg = (string) ($json['message'] ?? $json['error'] ?? 'Răspuns Fan invalid.');
            throw new RuntimeException($msg);
        }
    }
    if (stripos($raw, '<html') === false && stripos($raw, '<div') === false) {
        throw new RuntimeException('Fan nu a returnat eticheta HTML.');
    }
    return $raw;
}

/**
 * @param list<string> $awbs
 */
function shoptop_fan_fetch_label_pdf(int $clientId, array $awbs, string $format): string
{
    $query = [
        'clientId' => $clientId,
        'pdf' => 1,
        'language' => 'ro',
        'format' => $format,
    ];
    $parts = [http_build_query($query)];
    foreach ($awbs as $awb) {
        $parts[] = 'awbs[]=' . rawurlencode($awb);
    }
    $path = '/awb/label?' . implode('&', $parts);

    $res = shoptop_fan_request('GET', $path, null, null, true);
    if (!$res['ok'] || $res['raw'] === '') {
        throw new RuntimeException($res['error'] ?? 'Print AWB Fan a eșuat.');
    }
    if (!str_starts_with($res['raw'], '%PDF')) {
        $json = json_decode($res['raw'], true);
        if (is_array($json)) {
            $msg = (string) ($json['message'] ?? $json['error'] ?? 'Răspuns Fan invalid (nu e PDF).');
            throw new RuntimeException($msg);
        }
        throw new RuntimeException('Răspunsul Fan nu este un PDF valid.');
    }

    return $res['raw'];
}

function shoptop_fan_pdf_looks_like_a4(string $pdf): bool
{
    if (preg_match('/\/MediaBox\s*\[\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\]/', $pdf, $m) !== 1) {
        return false;
    }
    $width = (float) $m[3];
    $height = (float) $m[4];
    return $width > 500 && $height > 700;
}

/**
 * @return array{
 *   parcelId:string,
 *   events:list<array{code:int,description:string,dateTime:string,place:?string}>,
 *   lastDescription:?string,
 *   outForDelivery:bool,
 *   delivered:bool,
 *   inTransit:bool,
 *   returned:bool,
 *   returnedToSender:bool,
 *   error?:string
 * }
 */
function shoptop_fan_track_awb(string $awb): array
{
    $map = shoptop_fan_track_awbs([$awb]);
    $tracked = $map[$awb] ?? null;
    if (!is_array($tracked)) {
        throw new RuntimeException('Fan Courier nu a returnat tracking pentru AWB ' . $awb . '.');
    }
    if (isset($tracked['error'])) {
        throw new RuntimeException((string) $tracked['error']);
    }
    return $tracked;
}

/**
 * @param string[] $awbNumbers
 * @return array<string, array<string, mixed>>
 */
function shoptop_fan_track_awbs(array $awbNumbers): array
{
    if (!shoptop_fan_enabled()) {
        $out = [];
        foreach ($awbNumbers as $awb) {
            $out[$awb] = ['error' => 'Fan Courier nu este configurat.', 'parcelId' => $awb, 'events' => []];
        }
        return $out;
    }

    $awbs = [];
    foreach ($awbNumbers as $id) {
        $id = trim((string) $id);
        if ($id !== '') {
            $awbs[] = $id;
        }
    }
    if ($awbs === []) {
        return [];
    }

    $s = shoptop_fan_settings();
    $queryParts = [
        'clientId=' . rawurlencode((string) $s['client_id']),
        'language=ro',
    ];
    foreach ($awbs as $awb) {
        $queryParts[] = 'awb[]=' . rawurlencode($awb);
    }

    $res = shoptop_fan_request('GET', '/reports/awb/tracking?' . implode('&', $queryParts));
    if (!$res['ok'] || !is_array($res['json'])) {
        $out = [];
        foreach ($awbs as $awb) {
            $out[$awb] = [
                'error' => $res['error'] ?? 'Tracking Fan eșuat.',
                'parcelId' => $awb,
                'events' => [],
            ];
        }
        return $out;
    }

    $data = $res['json']['data'] ?? [];
    if (!is_array($data)) {
        $data = [];
    }

    $byAwb = [];
    foreach ($data as $row) {
        if (!is_array($row)) {
            continue;
        }
        $num = trim((string) ($row['awbNumber'] ?? ''));
        if ($num === '') {
            continue;
        }
        $byAwb[$num] = shoptop_fan_normalize_track_row($row);
    }

    $out = [];
    foreach ($awbs as $awb) {
        $out[$awb] = $byAwb[$awb] ?? [
            'error' => 'Fan nu a returnat tracking pentru acest AWB.',
            'parcelId' => $awb,
            'events' => [],
        ];
    }
    return $out;
}

/**
 * @param array<string, mixed> $row
 * @return array<string, mixed>
 */
function shoptop_fan_normalize_track_row(array $row): array
{
    $awb = trim((string) ($row['awbNumber'] ?? ''));
    $eventsIn = is_array($row['events'] ?? null) ? $row['events'] : [];
    $events = [];
    $delivered = false;
    $outForDelivery = false;
    $inTransit = false;
    $returned = false;
    $returnedToSender = false;
    $lastDescription = null;
    $lastDate = null;

    foreach ($eventsIn as $idx => $ev) {
        if (!is_array($ev)) {
            continue;
        }
        $id = strtoupper(trim((string) ($ev['id'] ?? '')));
        $name = trim((string) ($ev['name'] ?? ''));
        $date = trim((string) ($ev['date'] ?? ''));
        $place = isset($ev['location']) ? trim((string) $ev['location']) : null;
        $nameLower = mb_strtolower($name, 'UTF-8');

        // S2 = livrat. Nu folosi „livrare” aici (apare și pe „în curs de livrare”).
        if (
            $id === 'S2'
            || preg_match('/\blivrat[aăe]?\b/u', $nameLower) === 1
        ) {
            $delivered = true;
        }
        if (
            $id === 'C1'
            || $id === 'S1'
            || str_contains($nameLower, 'in curs de livrare')
            || str_contains($nameLower, 'în curs de livrare')
            || str_contains($nameLower, 'din curier')
        ) {
            $outForDelivery = true;
        }
        // C0 = Expediție ridicată → expediată (în tranzit), NU livrată.
        if (
            $id === 'C0'
            || str_contains($nameLower, 'tranzit')
            || str_contains($nameLower, 'sortat')
            || str_contains($nameLower, 'preluat')
            || str_contains($nameLower, 'ridicat')
            || str_contains($nameLower, 'expeditie')
            || str_contains($nameLower, 'expediție')
        ) {
            $inTransit = true;
        }
        if (
            str_contains($nameLower, 'refuz')
            || str_contains($nameLower, 'return')
            || $id === 'R1'
        ) {
            $returned = true;
        }
        if (
            str_contains($nameLower, 'returnat la expeditor')
            || str_contains($nameLower, 'returnat expeditorului')
            || !empty($row['returnAwbNumber'])
        ) {
            $returnedToSender = true;
            $returned = true;
        }

        $events[] = [
            'code' => $idx + 1,
            'description' => $name !== '' ? $name : ($id !== '' ? $id : 'Eveniment'),
            'dateTime' => $date,
            'place' => $place !== '' ? $place : null,
        ];

        if ($date !== '' && ($lastDate === null || strcmp($date, $lastDate) >= 0)) {
            $lastDate = $date;
            $lastDescription = $name !== '' ? $name : $lastDescription;
        }
    }

    // Fan trimite adesea „confirmation” gol încă de la ridicare — livrat doar cu nume confirmare.
    if (!empty($row['confirmation']) && is_array($row['confirmation'])) {
        $confName = trim((string) ($row['confirmation']['name'] ?? ''));
        if ($confName !== '') {
            $delivered = true;
            $lastDescription = 'Livrat (' . $confName . ')';
        }
    }

    if ($delivered) {
        $outForDelivery = false;
        $inTransit = false;
    }

    return [
        'parcelId' => $awb,
        'events' => $events,
        'lastDescription' => $lastDescription,
        'outForDelivery' => $outForDelivery,
        'delivered' => $delivered,
        'inTransit' => $inTransit && !$delivered && !$returned,
        'returned' => $returned,
        'returnedToSender' => $returnedToSender,
    ];
}
