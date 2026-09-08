<?php

declare(strict_types=1);

require_once __DIR__ . '/lib.php';

/**
 * DPD Romania REST API — creare shipment + print etichetă.
 * @see https://api.dpd.ro/api/docs/
 */

const SHOPTOP_DPD_BASE_URL = 'https://api.dpd.ro/v1';
/** Romania în nomenclatorul DPD/Speedy. */
const SHOPTOP_DPD_COUNTRY_RO = 642;

function shoptop_dpd_settings(): array
{
    $cfg = shoptop_config()['dpd'] ?? [];
    if (!is_array($cfg)) {
        $cfg = [];
    }

    $paperSize = strtoupper(trim((string) ($cfg['paper_size'] ?? 'A6')));
    if (!in_array($paperSize, ['A4', 'A6', 'A4_4XA6'], true)) {
        $paperSize = 'A6';
    }
    if ($paperSize === 'A4_4XA6') {
        $paperSize = 'A4_4xA6';
    }

    $clientSystemId = $cfg['client_system_id'] ?? null;
    if ($clientSystemId !== null && $clientSystemId !== '') {
        $clientSystemId = (int) $clientSystemId;
    } else {
        $clientSystemId = null;
    }

    return [
        'enabled' => ($cfg['enabled'] ?? true) !== false,
        'username' => trim((string) ($cfg['username'] ?? '')),
        'password' => (string) ($cfg['password'] ?? ''),
        'client_system_id' => $clientSystemId,
        'service_id' => (int) ($cfg['service_id'] ?? 0),
        'default_weight_kg' => max(0.1, (float) ($cfg['default_weight_kg'] ?? 1.0)),
        'paper_size' => $paperSize,
        'sender_phone' => trim((string) ($cfg['sender_phone'] ?? '')),
    ];
}

/**
 * Tarife contract DPD + suprascrieri din config (fallback când API nu returnează preț).
 *
 * @return array{
 *   door_to_door_under_3kg:float,
 *   cod_cash:float,
 *   obpd_open:float,
 *   extra_kg_under_30:float,
 *   fuel_index_percent:?float,
 *   labor_tax_ron:?float,
 *   vat_percent:float
 * }
 */
function shoptop_dpd_contract_rates(): array
{
    $cfg = shoptop_config()['dpd'] ?? [];
    if (!is_array($cfg)) {
        $cfg = [];
    }
    $rates = is_array($cfg['contract_rates'] ?? null) ? $cfg['contract_rates'] : [];

    $fuel = $cfg['fuel_index_percent'] ?? null;
    if ($fuel !== null && $fuel !== '') {
        $fuel = is_numeric($fuel) ? (float) $fuel : null;
    } else {
        $fuel = null;
    }

    $labor = $cfg['labor_tax_ron'] ?? null;
    if ($labor !== null && $labor !== '') {
        $labor = is_numeric($labor) ? (float) $labor : null;
    } else {
        $labor = null;
    }

    $vat = $cfg['vat_percent'] ?? 19.0;
    $vat = is_numeric($vat) ? (float) $vat : 19.0;

    return [
        'door_to_door_under_3kg' => max(0.0, (float) ($rates['door_to_door_under_3kg'] ?? 8.70)),
        'cod_cash' => max(0.0, (float) ($rates['cod_cash'] ?? 1.00)),
        'obpd_open' => max(0.0, (float) ($rates['obpd_open'] ?? 1.60)),
        'extra_kg_under_30' => max(0.0, (float) ($rates['extra_kg_under_30'] ?? 1.33)),
        'fuel_index_percent' => ($fuel !== null && $fuel > 0) ? $fuel : null,
        'labor_tax_ron' => ($labor !== null && $labor > 0) ? $labor : null,
        'vat_percent' => max(0.0, $vat),
    ];
}

/**
 * @param array<int, array<string, mixed>> $items
 */
function shoptop_dpd_order_has_package_opening(array $items): bool
{
    foreach ($items as $item) {
        $sku = strtoupper(trim((string) ($item['product_sku'] ?? $item['productSku'] ?? '')));
        $productId = strtoupper(trim((string) ($item['product_id'] ?? $item['productId'] ?? '')));
        $name = trim((string) ($item['product_name'] ?? $item['productName'] ?? ''));
        if (
            $sku === 'D000'
            || $productId === 'D000'
            || $productId === 'SHOPTOP-PACKAGE-OPENING'
            || stripos($name, 'deschidere') !== false
        ) {
            return true;
        }
    }

    return false;
}

/**
 * @param array<int, array<string, mixed>> $items
 * @return array{isCod:bool,hasPackageOpening:bool}
 */
function shoptop_dpd_order_service_flags(array $orderRow, array $items): array
{
    $paymentMethod = (string) ($orderRow['payment_method'] ?? 'cod');
    $paymentStatus = (string) ($orderRow['payment_status'] ?? 'pending');
    $totalAmount = (float) ($orderRow['total_amount'] ?? 0);
    $isCod = $paymentMethod === 'cod' && $paymentStatus !== 'paid' && $totalAmount > 0;

    return [
        'isCod' => $isCod,
        'hasPackageOpening' => shoptop_dpd_order_has_package_opening($items),
    ];
}

/**
 * Normalizează structura ShipmentPrice din API DPD.
 *
 * @return ?array{total:float,net:float,vat:float,details:array<string,float>}
 */
function shoptop_dpd_normalize_shipment_price(mixed $price): ?array
{
    if (!is_array($price)) {
        return null;
    }

    $totalRaw = $price['totalLocal'] ?? $price['total'] ?? null;
    if (!is_numeric($totalRaw)) {
        return null;
    }
    $total = round((float) $totalRaw, 2);
    if ($total <= 0) {
        return null;
    }

    $net = round((float) ($price['amountLocal'] ?? $price['amount'] ?? 0), 2);
    $vat = round((float) ($price['vatLocal'] ?? $price['vat'] ?? max(0.0, $total - $net)), 2);

    $detailsRaw = $price['detailsLocal'] ?? $price['details'] ?? [];
    $details = [];
    if (is_array($detailsRaw)) {
        foreach ($detailsRaw as $key => $entry) {
            if (!is_scalar($key)) {
                continue;
            }
            $label = trim((string) $key);
            if ($label === '') {
                continue;
            }
            if (is_array($entry)) {
                $amount = $entry['total'] ?? $entry['amount'] ?? null;
            } else {
                $amount = $entry;
            }
            if (is_numeric($amount)) {
                $details[$label] = round((float) $amount, 2);
            }
        }
    }

    return [
        'total' => $total,
        'net' => $net,
        'vat' => $vat,
        'details' => $details,
    ];
}

/**
 * Estimare cost din tarifele contractului (fără TVA/index dacă nu sunt setate în config).
 *
 * @param array<int, array<string, mixed>> $items
 * @return array{total:float,net:float,vat:float,details:array<string,float>}
 */
function shoptop_dpd_estimate_from_contract(array $orderRow, array $items): array
{
    $rates = shoptop_dpd_contract_rates();
    $flags = shoptop_dpd_order_service_flags($orderRow, $items);

    $components = [];
    $net = 0.0;

    $base = $rates['door_to_door_under_3kg'];
    $net += $base;
    $components['Transport door-to-door'] = $base;

    if ($flags['isCod']) {
        $cod = $rates['cod_cash'];
        $net += $cod;
        $components['Ramburs COD'] = $cod;
    }

    if ($flags['hasPackageOpening'] && $flags['isCod']) {
        $obpd = $rates['obpd_open'];
        $net += $obpd;
        $components['Deschidere colet'] = $obpd;
    }

    if ($rates['fuel_index_percent'] !== null) {
        $fuelAmount = round($net * ($rates['fuel_index_percent'] / 100), 2);
        $net += $fuelAmount;
        $components['Index combustibil'] = $fuelAmount;
    }

    if ($rates['labor_tax_ron'] !== null) {
        $net += $rates['labor_tax_ron'];
        $components['Taxa forta de munca'] = $rates['labor_tax_ron'];
    }

    $net = round($net, 2);
    $vat = round($net * ($rates['vat_percent'] / 100), 2);
    $total = round($net + $vat, 2);

    return [
        'total' => $total,
        'net' => $net,
        'vat' => $vat,
        'details' => $components,
    ];
}

/**
 * Transformă payload shipment în payload calculate (API DPD).
 *
 * @param array<string, mixed> $shipmentPayload
 * @return array<string, mixed>
 */
function shoptop_dpd_shipment_payload_to_calculate(array $shipmentPayload): array
{
    $service = is_array($shipmentPayload['service'] ?? null) ? $shipmentPayload['service'] : [];
    $serviceId = (int) ($service['serviceId'] ?? 0);
    $calcService = [
        'serviceIds' => [$serviceId],
        'autoAdjustPickupDate' => ($service['autoAdjustPickupDate'] ?? true) !== false,
    ];
    if (!empty($service['additionalServices']) && is_array($service['additionalServices'])) {
        $calcService['additionalServices'] = $service['additionalServices'];
    }

    $recipient = is_array($shipmentPayload['recipient'] ?? null) ? $shipmentPayload['recipient'] : [];
    $calcRecipient = [
        'privatePerson' => ($recipient['privatePerson'] ?? true) !== false,
    ];
    $address = is_array($recipient['address'] ?? null) ? $recipient['address'] : [];
    if (!empty($address['siteId'])) {
        $calcRecipient['addressLocation'] = ['siteId' => (int) $address['siteId']];
        if (!empty($address['postCode'])) {
            $calcRecipient['addressLocation']['postCode'] = (string) $address['postCode'];
        }
    } elseif (!empty($address['siteName'])) {
        $calcRecipient['addressLocation'] = [
            'siteName' => (string) $address['siteName'],
        ];
        if (!empty($address['postCode'])) {
            $calcRecipient['addressLocation']['postCode'] = (string) $address['postCode'];
        }
    }

    $payload = [
        'recipient' => $calcRecipient,
        'service' => $calcService,
        'content' => $shipmentPayload['content'] ?? [],
        'payment' => $shipmentPayload['payment'] ?? ['courierServicePayer' => 'SENDER'],
    ];

    return $payload;
}

/**
 * Calculează prețul shipment-ului via POST /calculate.
 *
 * @param array<string, mixed> $calcPayload
 * @return ?array{total:float,net:float,vat:float,details:array<string,float>}
 */
function shoptop_dpd_calculate_price(array $calcPayload): ?array
{
    $res = shoptop_dpd_request('calculate', $calcPayload);
    if (!$res['ok'] || !is_array($res['json'])) {
        return null;
    }

    $calculations = $res['json']['calculations'] ?? [];
    if (!is_array($calculations)) {
        return null;
    }

    foreach ($calculations as $group) {
        if (!is_array($group)) {
            continue;
        }
        foreach ($group as $result) {
            if (!is_array($result)) {
                continue;
            }
            if (!isset($result['price'])) {
                continue;
            }
            $normalized = shoptop_dpd_normalize_shipment_price($result['price']);
            if ($normalized !== null) {
                return $normalized;
            }
        }
    }

    return null;
}

/**
 * Cost curier hibrid: răspuns shipment → calculate API → contract.
 *
 * @param array<int, array<string, mixed>> $items
 * @param ?array<string, mixed> $shipmentResponseJson
 * @return array{total:float,net:float,vat:float,details:array<string,float>,source:string}
 */
function shoptop_dpd_resolve_courier_cost(
    array $orderRow,
    array $items,
    ?array $shipmentResponseJson = null,
): array {
    if ($shipmentResponseJson !== null && isset($shipmentResponseJson['price'])) {
        $fromShipment = shoptop_dpd_normalize_shipment_price($shipmentResponseJson['price']);
        if ($fromShipment !== null) {
            return array_merge($fromShipment, ['source' => 'api']);
        }
    }

    try {
        $built = shoptop_dpd_build_shipment_payload($orderRow, $items);
        $calcPayload = shoptop_dpd_shipment_payload_to_calculate($built['payload']);
        $fromCalculate = shoptop_dpd_calculate_price($calcPayload);
        if ($fromCalculate !== null) {
            return array_merge($fromCalculate, ['source' => 'api']);
        }
    } catch (Throwable) {
        // fallback contract
    }

    return array_merge(
        shoptop_dpd_estimate_from_contract($orderRow, $items),
        ['source' => 'contract'],
    );
}

function shoptop_dpd_enabled(): bool
{
    $s = shoptop_dpd_settings();
    return $s['enabled']
        && $s['username'] !== ''
        && $s['password'] !== ''
        && $s['service_id'] > 0;
}

/**
 * @return array{userName:string,password:string,language:string,clientSystemId?:int}
 */
function shoptop_dpd_auth_payload(bool $includeClientSystemId = true): array
{
    $s = shoptop_dpd_settings();
    $payload = [
        'userName' => $s['username'],
        'password' => $s['password'],
        'language' => 'RO',
    ];
    if ($includeClientSystemId && $s['client_system_id'] !== null) {
        $payload['clientSystemId'] = $s['client_system_id'];
    }
    return $payload;
}

/**
 * @return array{ok:bool,status:int,json:?array,raw:string,error:?string,content_type:?string}
 */
function shoptop_dpd_request(string $path, array $payload, bool $expectBinary = false): array
{
    if (!shoptop_dpd_enabled()) {
        return [
            'ok' => false,
            'status' => 0,
            'json' => null,
            'raw' => '',
            'error' => 'DPD nu este configurat (username/password/service_id).',
            'content_type' => null,
        ];
    }

    $result = shoptop_dpd_do_request($path, array_merge(shoptop_dpd_auth_payload(true), $payload), $expectBinary);
    $err = (string) ($result['error'] ?? '');
    // clientSystemId greșit → deseori „Acces interzis”; reîncearcă fără el.
    if (
        !$result['ok']
        && shoptop_dpd_settings()['client_system_id'] !== null
        && (stripos($err, 'Acces interzis') !== false || stripos($err, 'forbidden') !== false)
    ) {
        $retry = shoptop_dpd_do_request(
            $path,
            array_merge(shoptop_dpd_auth_payload(false), $payload),
            $expectBinary
        );
        if ($retry['ok']) {
            return $retry;
        }
    }

    return $result;
}

/**
 * @return array{ok:bool,status:int,json:?array,raw:string,error:?string,content_type:?string}
 */
function shoptop_dpd_do_request(string $path, array $body, bool $expectBinary = false): array
{
    $url = SHOPTOP_DPD_BASE_URL . '/' . ltrim($path, '/');
    $jsonBody = json_encode($body, JSON_UNESCAPED_UNICODE);
    if ($jsonBody === false) {
        return [
            'ok' => false,
            'status' => 0,
            'json' => null,
            'raw' => '',
            'error' => 'Nu am putut serializa request-ul DPD.',
            'content_type' => null,
        ];
    }

    $ch = curl_init($url);
    if ($ch === false) {
        return [
            'ok' => false,
            'status' => 0,
            'json' => null,
            'raw' => '',
            'error' => 'Nu am putut inițializa cURL pentru DPD.',
            'content_type' => null,
        ];
    }

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $jsonBody,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json; charset=utf-8',
            'Accept: ' . ($expectBinary
                ? 'application/pdf, text/csv, text/plain, application/json, */*'
                : 'application/json'),
        ],
        CURLOPT_TIMEOUT => $expectBinary ? 180 : 60,
        CURLOPT_CONNECTTIMEOUT => 20,
    ]);

    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($raw === false) {
        return [
            'ok' => false,
            'status' => $status,
            'json' => null,
            'raw' => '',
            'error' => 'Eroare rețea DPD: ' . ($curlError !== '' ? $curlError : 'necunoscută'),
            'content_type' => $contentType !== '' ? $contentType : null,
        ];
    }

    $ctLower = strtolower($contentType);
    $isPdf = $expectBinary && (
        str_contains($ctLower, 'application/pdf')
        || str_starts_with($raw, '%PDF')
    );
    $isCsv = $expectBinary && (
        str_contains($ctLower, 'text/csv')
        || str_contains($ctLower, 'application/csv')
        || str_contains($ctLower, 'text/plain')
        || (!str_starts_with(ltrim($raw), '{') && str_contains($raw, ','))
    );

    if ($isPdf) {
        return [
            'ok' => $status >= 200 && $status < 300,
            'status' => $status,
            'json' => null,
            'raw' => $raw,
            'error' => ($status >= 200 && $status < 300) ? null : 'DPD a returnat PDF invalid.',
            'content_type' => 'application/pdf',
        ];
    }

    if ($isCsv && $status >= 200 && $status < 300) {
        return [
            'ok' => true,
            'status' => $status,
            'json' => null,
            'raw' => $raw,
            'error' => null,
            'content_type' => $contentType !== '' ? $contentType : 'text/csv',
        ];
    }

    $json = json_decode($raw, true);
    if (!is_array($json)) {
        $json = null;
    }

    $errorMsg = null;
    if (is_array($json) && isset($json['error']) && is_array($json['error'])) {
        $errorMsg = trim((string) ($json['error']['message'] ?? ''));
        if ($errorMsg === '') {
            $errorMsg = trim((string) ($json['error']['context'] ?? 'Eroare DPD'));
        }
        $component = trim((string) ($json['error']['component'] ?? ''));
        if ($component !== '') {
            $errorMsg .= ' (' . $component . ')';
        }
    }

    $ok = $status >= 200 && $status < 300 && $errorMsg === null;
    if (!$ok && $errorMsg === null) {
        $errorMsg = 'DPD a returnat status HTTP ' . $status . '.';
    }

    return [
        'ok' => $ok,
        'status' => $status,
        'json' => $json,
        'raw' => $raw,
        'error' => $errorMsg,
        'content_type' => $contentType !== '' ? $contentType : null,
    ];
}

/**
 * @return array{siteId:int,siteName:string,postCode:?string}|null
 */
function shoptop_dpd_find_site(string $city, string $countyName = '', string $postCode = ''): ?array
{
    $city = trim($city);
    if ($city === '') {
        return null;
    }

    $normalize = static function (string $value): string {
        $value = mb_strtolower(trim($value), 'UTF-8');
        $map = [
            'ă' => 'a', 'â' => 'a', 'î' => 'i', 'ș' => 's', 'ş' => 's',
            'ț' => 't', 'ţ' => 't',
        ];
        return strtr($value, $map);
    };

    $cityNorm = $normalize($city);
    $countyNorm = $normalize($countyName);

    // 1) Cache local (fără sync CSV — multe conturi au „Acces interzis” pe dump).
    try {
        $nomen = shoptop_dpd_load_nomenclature();
        if ($nomen === null) {
            throw new RuntimeException('no-cache');
        }
        $bestCache = null;
        $bestCacheScore = -1;
        foreach ($nomen['localitiesByCounty'] as $regionKey => $list) {
            if (!is_array($list)) {
                continue;
            }
            $regionNorm = $normalize((string) $regionKey);
            $countyOk = $countyNorm === ''
                || $regionNorm === $countyNorm
                || str_contains($regionNorm, $countyNorm)
                || str_contains($countyNorm, $regionNorm);
            if (!$countyOk) {
                continue;
            }
            foreach ($list as $loc) {
                if (!is_array($loc)) {
                    continue;
                }
                $siteId = (int) ($loc['id'] ?? 0);
                $siteName = trim((string) ($loc['name'] ?? ''));
                if ($siteId <= 0 || $siteName === '') {
                    continue;
                }
                $nameNorm = $normalize($siteName);
                $score = 0;
                if ($nameNorm === $cityNorm) {
                    $score = 100;
                } elseif (str_starts_with($nameNorm, $cityNorm) || str_contains($nameNorm, $cityNorm)) {
                    $score = 50;
                } else {
                    continue;
                }
                if ($postCode !== '' && trim((string) ($loc['postCode'] ?? '')) === $postCode) {
                    $score += 20;
                }
                if ($score > $bestCacheScore) {
                    $bestCacheScore = $score;
                    $bestCache = [
                        'siteId' => $siteId,
                        'siteName' => $siteName,
                        'postCode' => trim((string) ($loc['postCode'] ?? '')) !== ''
                            ? trim((string) $loc['postCode'])
                            : null,
                    ];
                }
            }
        }
        if ($bestCache !== null && $bestCacheScore >= 100) {
            return $bestCache;
        }
    } catch (Throwable $e) {
        // Continuă cu API live.
    }

    $payload = [
        'countryId' => SHOPTOP_DPD_COUNTRY_RO,
        'name' => $city,
    ];
    if ($postCode !== '') {
        $payload['postCode'] = $postCode;
    }
    // Filtru pe județ: DPD vrea region FĂRĂ diacritice („Brasov”, nu „Brașov”).
    $countyName = trim($countyName);
    $regionAscii = $countyName !== '' ? $normalize($countyName) : '';
    if ($regionAscii !== '') {
        // Capitalizare tipică DPD (Brasov).
        $payload['region'] = mb_strtoupper(mb_substr($regionAscii, 0, 1, 'UTF-8'), 'UTF-8')
            . mb_substr($regionAscii, 1, null, 'UTF-8');
    }

    $res = shoptop_dpd_request('location/site', $payload);
    $sites = (is_array($res['json'] ?? null) ? ($res['json']['sites'] ?? null) : null);
    if (!$res['ok'] || !is_array($sites) || $sites === []) {
        // Reîncearcă fără postCode.
        if ($postCode !== '' && isset($payload['postCode'])) {
            unset($payload['postCode']);
            $res = shoptop_dpd_request('location/site', $payload);
            $sites = (is_array($res['json'] ?? null) ? ($res['json']['sites'] ?? null) : null);
        }
    }
    if (!$res['ok'] || !is_array($sites) || $sites === []) {
        // Reîncearcă fără region (sau cu region UPPERCASE).
        if (isset($payload['region'])) {
            $payload['region'] = mb_strtoupper($regionAscii, 'UTF-8');
            $res = shoptop_dpd_request('location/site', $payload);
            $sites = (is_array($res['json'] ?? null) ? ($res['json']['sites'] ?? null) : null);
        }
    }
    if (!$res['ok'] || !is_array($sites) || $sites === []) {
        if (isset($payload['region'])) {
            unset($payload['region']);
            $res = shoptop_dpd_request('location/site', $payload);
            $sites = (is_array($res['json'] ?? null) ? ($res['json']['sites'] ?? null) : null);
        }
    }
    if (!$res['ok'] || !is_array($sites) || $sites === []) {
        return null;
    }

    $best = null;
    $bestScore = -1;
    foreach ($sites as $site) {
        if (!is_array($site)) {
            continue;
        }
        $siteId = (int) ($site['id'] ?? 0);
        $siteName = trim((string) ($site['name'] ?? ''));
        if ($siteId <= 0 || $siteName === '') {
            continue;
        }

        $nameNorm = $normalize($siteName);
        $score = 0;
        if ($nameNorm === $cityNorm) {
            $score += 100;
        } elseif (str_starts_with($nameNorm, $cityNorm) || str_contains($nameNorm, $cityNorm)) {
            $score += 50;
        } else {
            continue;
        }

        if ($countyNorm !== '') {
            $region = $normalize(
                (string) ($site['region'] ?? $site['municipality'] ?? '')
            );
            if ($region !== '' && (str_contains($region, $countyNorm) || str_contains($countyNorm, $region))) {
                $score += 40;
            }
        }

        $sitePost = trim((string) ($site['postCode'] ?? ''));
        if ($postCode !== '' && $sitePost === $postCode) {
            $score += 20;
        }

        if ($score > $bestScore) {
            $bestScore = $score;
            $best = [
                'siteId' => $siteId,
                'siteName' => $siteName,
                'postCode' => $sitePost !== '' ? $sitePost : null,
            ];
        }
    }

    return $best;
}

/**
 * Normalizează cheie județ/region DPD (fără diacritice, UPPER).
 */
function shoptop_dpd_ascii_upper(string $value): string
{
    $value = mb_strtoupper(trim($value), 'UTF-8');
    return strtr($value, [
        'Ă' => 'A', 'Â' => 'A', 'Î' => 'I', 'Ș' => 'S', 'Ş' => 'S',
        'Ț' => 'T', 'Ţ' => 'T',
        'ă' => 'A', 'â' => 'A', 'î' => 'I', 'ș' => 'S', 'ş' => 'S',
        'ț' => 'T', 'ţ' => 'T',
    ]);
}

/**
 * Județe RO pentru UI (cod ISO → nume). Folosit și la maparea BV → BRASOV.
 *
 * @return list<array{code:string,name:string,region:string}>
 */
function shoptop_dpd_static_counties(): array
{
    $rows = [
        ['B', 'București'], ['AB', 'Alba'], ['AR', 'Arad'], ['AG', 'Argeș'],
        ['BC', 'Bacău'], ['BH', 'Bihor'], ['BN', 'Bistrița-Năsăud'], ['BT', 'Botoșani'],
        ['BV', 'Brașov'], ['BR', 'Brăila'], ['BZ', 'Buzău'], ['CS', 'Caraș-Severin'],
        ['CL', 'Călărași'], ['CJ', 'Cluj'], ['CT', 'Constanța'], ['CV', 'Covasna'],
        ['DB', 'Dâmbovița'], ['DJ', 'Dolj'], ['GL', 'Galați'], ['GR', 'Giurgiu'],
        ['GJ', 'Gorj'], ['HR', 'Harghita'], ['HD', 'Hunedoara'], ['IL', 'Ialomița'],
        ['IS', 'Iași'], ['IF', 'Ilfov'], ['MM', 'Maramureș'], ['MH', 'Mehedinți'],
        ['MS', 'Mureș'], ['NT', 'Neamț'], ['OT', 'Olt'], ['PH', 'Prahova'],
        ['SM', 'Satu Mare'], ['SJ', 'Sălaj'], ['SB', 'Sibiu'], ['SV', 'Suceava'],
        ['TR', 'Teleorman'], ['TM', 'Timiș'], ['TL', 'Tulcea'], ['VS', 'Vaslui'],
        ['VL', 'Vâlcea'], ['VN', 'Vrancea'],
    ];
    $out = [];
    foreach ($rows as [$code, $name]) {
        $out[] = [
            'code' => $code,
            'name' => $name,
            'region' => $name,
        ];
    }
    return $out;
}

/**
 * Încarcă nomenclatorul din cache; sync CSV automat dacă lipsește.
 *
 * @return array{
 *   updatedAt:string,
 *   counties:list<array{code:string,name:string,region:string}>,
 *   localitiesByCounty:array<string,list<array{id:int,name:string,postCode:string,type:string}>>
 * }|null
 */
function shoptop_dpd_ensure_nomenclature(bool $allowSync = true): ?array
{
    $cached = shoptop_dpd_load_nomenclature();
    if ($cached !== null) {
        return $cached;
    }
    if (!$allowSync || !shoptop_dpd_enabled()) {
        return null;
    }
    try {
        return shoptop_dpd_sync_nomenclature(true);
    } catch (Throwable $e) {
        return null;
    }
}

/**
 * Localități DPD pentru un județ (cod ISO „BV” sau region „BRASOV”).
 *
 * @param array{
 *   localitiesByCounty?:array<string,list<array{id:int,name:string,postCode:string,type:string}>>
 * } $nomen
 * @return list<array{id:int,name:string,postCode:string,type:string}>
 */
function shoptop_dpd_localities_for_county(array $nomen, string $countyParam): array
{
    $byCounty = $nomen['localitiesByCounty'] ?? [];
    if (!is_array($byCounty) || $byCounty === []) {
        return [];
    }

    $param = mb_strtoupper(trim($countyParam), 'UTF-8');
    if ($param === '') {
        return [];
    }

    if (isset($byCounty[$param]) && is_array($byCounty[$param]) && $byCounty[$param] !== []) {
        return $byCounty[$param];
    }

    $candidates = [$param, shoptop_dpd_ascii_upper($param)];

    foreach (shoptop_dpd_static_counties() as $c) {
        $code = mb_strtoupper((string) ($c['code'] ?? ''), 'UTF-8');
        $nameAscii = shoptop_dpd_ascii_upper((string) ($c['name'] ?? ''));
        if ($code === $param || $nameAscii === shoptop_dpd_ascii_upper($param)) {
            $candidates[] = $nameAscii;
            // DPD folosește uneori fără spații / cratimă
            $candidates[] = str_replace([' ', '-'], '', $nameAscii);
            break;
        }
    }

    $candidates = array_values(array_unique(array_filter($candidates)));
    foreach ($candidates as $want) {
        foreach ($byCounty as $key => $list) {
            if (!is_array($list) || $list === []) {
                continue;
            }
            $keyAscii = shoptop_dpd_ascii_upper((string) $key);
            if (
                $keyAscii === $want
                || str_replace([' ', '-'], '', $keyAscii) === str_replace([' ', '-'], '', $want)
            ) {
                return $list;
            }
        }
    }

    return [];
}

/**
 * Cale fișier cache nomenclator DPD RO.
 */
function shoptop_dpd_nomenclature_cache_path(): string
{
    return __DIR__ . '/cache/dpd-ro-nomenclature.json';
}

/**
 * Parsează CSV DPD (UTF-8; delimiter , sau ;).
 *
 * @return list<list<string>>
 */
function shoptop_dpd_parse_csv(string $raw): array
{
    $raw = trim($raw);
    if ($raw === '') {
        return [];
    }
    // BOM
    if (str_starts_with($raw, "\xEF\xBB\xBF")) {
        $raw = substr($raw, 3);
    }

    // Detectează delimiter: DPD folosește virgulă; unele exporturi folosesc ;
    $firstLine = strtok($raw, "\r\n") ?: '';
    $commaCount = substr_count($firstLine, ',');
    $semiCount = substr_count($firstLine, ';');
    $delimiter = $semiCount > $commaCount ? ';' : ',';

    $rows = [];
    $fp = fopen('php://temp', 'r+');
    if ($fp === false) {
        return [];
    }
    fwrite($fp, $raw);
    rewind($fp);
    while (($data = fgetcsv($fp, 0, $delimiter)) !== false) {
        if (!is_array($data) || $data === [] || $data === [null]) {
            continue;
        }
        $rows[] = array_map(static fn ($v) => trim((string) $v), $data);
    }
    fclose($fp);
    return $rows;
}

/**
 * Normalizează antet CSV (postCode → postcode).
 *
 * @param list<string> $header
 * @return array{id:int,name:int,type:int,region:int,postCode:int,municipality:int}
 */
function shoptop_dpd_csv_column_index(array $header): array
{
    $norm = [];
    foreach ($header as $i => $h) {
        $key = mb_strtolower(preg_replace('/[\s_]+/', '', (string) $h) ?? '', 'UTF-8');
        $norm[$key] = $i;
    }

    $find = static function (array $aliases) use ($norm): int {
        foreach ($aliases as $alias) {
            if (isset($norm[$alias])) {
                return (int) $norm[$alias];
            }
        }
        return -1;
    };

    // Coloane oficiale DPD: id,countryId,mainSiteId,type,typeEn,name,nameEn,
    // municipality,municipalityEn,region,regionEn,postCode,...
    $id = $find(['id']);
    $name = $find(['name']);
    $type = $find(['type']);
    $region = $find(['region']);
    $postCode = $find(['postcode', 'post_code', 'zip', 'zipcode']);
    $municipality = $find(['municipality', 'municipalityname']);

    // Fallback pe poziții documentate dacă antetul lipsește / e netradus.
    if ($id < 0 && $name < 0) {
        return [
            'id' => 0,
            'name' => 5,
            'type' => 3,
            'region' => 9,
            'postCode' => 11,
            'municipality' => 7,
        ];
    }

    return [
        'id' => $id,
        'name' => $name,
        'type' => $type,
        'region' => $region,
        'postCode' => $postCode,
        'municipality' => $municipality,
    ];
}

/**
 * Descarcă și reconstruiește nomenclatorul județe/localități din DPD.
 *
 * @return array{
 *   updatedAt:string,
 *   counties:list<array{code:string,name:string,region:string}>,
 *   localitiesByCounty:array<string,list<array{id:int,name:string,postCode:string,type:string}>>
 * }
 */
function shoptop_dpd_sync_nomenclature(bool $force = false): array
{
    $path = shoptop_dpd_nomenclature_cache_path();
    if (!$force && is_file($path)) {
        $mtime = filemtime($path);
        if ($mtime !== false && (time() - $mtime) < 7 * 24 * 3600) {
            $existing = shoptop_dpd_load_nomenclature();
            if ($existing !== null) {
                return $existing;
            }
        }
    }

    if (!shoptop_dpd_enabled()) {
        throw new RuntimeException(
            'DPD nu este configurat — nu pot sincroniza nomenclatorul de localități.'
        );
    }

    @set_time_limit(300);
    if (function_exists('ini_set')) {
        @ini_set('memory_limit', '512M');
    }

    $res = shoptop_dpd_request(
        'location/site/csv/' . SHOPTOP_DPD_COUNTRY_RO,
        [],
        true
    );
    $raw = (string) ($res['raw'] ?? '');

    // Răspuns JSON de eroare (nu CSV).
    $trimRaw = ltrim($raw);
    if (str_starts_with($trimRaw, '{')) {
        $err = $res['error'] ?? null;
        if ($err === null || $err === '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded) && isset($decoded['error']) && is_array($decoded['error'])) {
                $err = trim((string) ($decoded['error']['message'] ?? 'Eroare DPD'));
            }
        }
        throw new RuntimeException(
            $err !== null && $err !== ''
                ? 'DPD CSV: ' . $err
                : 'DPD a returnat JSON în loc de CSV pentru nomenclator.'
        );
    }

    if (!$res['ok'] || $raw === '' || (!str_contains($raw, ',') && !str_contains($raw, ';'))) {
        throw new RuntimeException(
            $res['error'] ?? 'Nu am putut descărca nomenclatorul de localități DPD.'
        );
    }

    $rows = shoptop_dpd_parse_csv($raw);
    if ($rows === [] || count($rows) < 2) {
        throw new RuntimeException(
            'Nomenclatorul DPD (sites CSV) este gol sau invalid (rânduri: '
            . (string) count($rows) . ').'
        );
    }

    $header = $rows[0];
    $firstCell = trim((string) ($header[0] ?? ''), " \t\"'");
    if (ctype_digit($firstCell)) {
        // Fără antet — poziții din documentația DPD.
        $start = 0;
        $idx = [
            'id' => 0,
            'name' => 5,
            'type' => 3,
            'region' => 9,
            'postCode' => 11,
            'municipality' => 7,
        ];
    } else {
        $start = 1;
        $idx = shoptop_dpd_csv_column_index($header);
    }

    if ($idx['id'] < 0 || $idx['name'] < 0) {
        $sample = implode(' | ', array_slice($header, 0, 12));
        throw new RuntimeException(
            'Antet CSV DPD nerecunoscut. Coloane: ' . $sample
        );
    }

    /** @var array<string, array{code:string,name:string,region:string}> $countiesMap */
    $countiesMap = [];
    /** @var array<string, array<int, array{id:int,name:string,postCode:string,type:string}>> $localities */
    $localities = [];
    $skippedNoRegion = 0;
    $parsed = 0;

    for ($i = $start; $i < count($rows); $i++) {
        $row = $rows[$i];
        $id = (int) ($row[$idx['id']] ?? 0);
        $name = trim((string) ($row[$idx['name']] ?? ''));
        $region = $idx['region'] >= 0 ? trim((string) ($row[$idx['region']] ?? '')) : '';
        // Fallback: unele site-uri RO au region gol, județul e în municipality.
        if ($region === '' && $idx['municipality'] >= 0) {
            $region = trim((string) ($row[$idx['municipality']] ?? ''));
        }
        $type = $idx['type'] >= 0 ? trim((string) ($row[$idx['type']] ?? '')) : '';
        $postCode = $idx['postCode'] >= 0 ? trim((string) ($row[$idx['postCode']] ?? '')) : '';
        if ($id <= 0 || $name === '') {
            continue;
        }
        if ($region === '') {
            $skippedNoRegion++;
            continue;
        }

        $regionKey = mb_strtoupper($region, 'UTF-8');
        if (!isset($countiesMap[$regionKey])) {
            $countiesMap[$regionKey] = [
                'code' => $regionKey,
                'name' => $region,
                'region' => $region,
            ];
        }

        if (!isset($localities[$regionKey])) {
            $localities[$regionKey] = [];
        }
        $localities[$regionKey][$id] = [
            'id' => $id,
            'name' => $name,
            'postCode' => $postCode,
            'type' => $type,
        ];
        $parsed++;
    }

    if ($countiesMap === []) {
        $sample = implode(' | ', array_slice($rows[$start] ?? $header, 0, 12));
        throw new RuntimeException(
            'Nu am găsit județe în nomenclatorul DPD (rânduri CSV: '
            . (string) count($rows)
            . ', parse: ' . (string) $parsed
            . ', fără region: ' . (string) $skippedNoRegion
            . '). Exemplu rând: ' . $sample
        );
    }

    ksort($countiesMap, SORT_STRING);
    $counties = array_values($countiesMap);
    $localitiesByCounty = [];
    foreach ($localities as $code => $byId) {
        $list = array_values($byId);
        usort(
            $list,
            static fn (array $a, array $b): int => strcasecmp($a['name'], $b['name'])
        );
        $localitiesByCounty[$code] = $list;
    }

    $payload = [
        'updatedAt' => date('c'),
        'counties' => $counties,
        'localitiesByCounty' => $localitiesByCounty,
    ];

    $dir = dirname($path);
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new RuntimeException('Nu am putut crea directorul cache DPD.');
    }
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || file_put_contents($path, $json) === false) {
        throw new RuntimeException(
            'Nu am putut salva cache-ul nomenclatorului DPD. Verifică drepturile pe shoptop-api/cache/.'
        );
    }

    return $payload;
}

/**
 * @return array{
 *   updatedAt:string,
 *   counties:list<array{code:string,name:string,region:string}>,
 *   localitiesByCounty:array<string,list<array{id:int,name:string,postCode:string,type:string}>>
 * }|null
 */
function shoptop_dpd_load_nomenclature(): ?array
{
    $path = shoptop_dpd_nomenclature_cache_path();
    if (!is_file($path)) {
        return null;
    }
    $raw = file_get_contents($path);
    if ($raw === false || $raw === '') {
        return null;
    }
    $data = json_decode($raw, true);
    if (!is_array($data) || !isset($data['counties'], $data['localitiesByCounty'])) {
        return null;
    }
    if (!is_array($data['counties']) || $data['counties'] === []) {
        return null;
    }
    return $data;
}

/**
 * Încarcă nomenclatorul (sync automat dacă lipsește).
 *
 * @return array{
 *   updatedAt:string,
 *   counties:list<array{code:string,name:string,region:string}>,
 *   localitiesByCounty:array<string,list<array{id:int,name:string,postCode:string,type:string}>>
 * }
 */
function shoptop_dpd_nomenclature(): array
{
    $cached = shoptop_dpd_load_nomenclature();
    if ($cached !== null) {
        return $cached;
    }
    return shoptop_dpd_sync_nomenclature(true);
}

/**
 * Normalizează telefonul pentru DPD (doar cifre / + la început).
 */
function shoptop_dpd_normalize_phone(string $phone): string
{
    $phone = trim($phone);
    $phone = preg_replace('/[^\d+]/', '', $phone) ?? '';
    if (str_starts_with($phone, '00')) {
        $phone = '+' . substr($phone, 2);
    }
    // 07xxxxxxxx → păstrează local
    if (preg_match('/^0\d{9}$/', $phone) === 1) {
        return $phone;
    }
    if (preg_match('/^\+40\d{9}$/', $phone) === 1) {
        return $phone;
    }
    if (preg_match('/^40\d{9}$/', $phone) === 1) {
        return '+' . $phone;
    }
    return $phone;
}

/**
 * @return array{
 *   county:string,countyName:string,city:string,street:string,
 *   streetNumber:string,addressExtra:string,postalCode:string,dpdSiteId:int
 * }
 */
function shoptop_dpd_order_address_parts(array $orderRow): array
{
    $parts = [
        'county' => trim((string) ($orderRow['ship_county'] ?? '')),
        'countyName' => trim((string) ($orderRow['ship_county_name'] ?? '')),
        'city' => trim((string) ($orderRow['ship_city'] ?? '')),
        'street' => trim((string) ($orderRow['ship_street'] ?? '')),
        'streetNumber' => trim((string) ($orderRow['ship_street_number'] ?? '')),
        'addressExtra' => trim((string) ($orderRow['ship_address_extra'] ?? '')),
        'postalCode' => trim((string) ($orderRow['ship_postal_code'] ?? '')),
        'dpdSiteId' => (int) ($orderRow['dpd_site_id'] ?? 0),
    ];

    if ($parts['city'] !== '' && $parts['street'] !== '') {
        return $parts;
    }

    $address = (string) ($orderRow['customer_address'] ?? '');
    $lines = array_values(array_filter(array_map('trim', preg_split('/\r\n|\r|\n/', $address) ?: [])));

    if ($parts['street'] === '' && isset($lines[0])) {
        $line0 = $lines[0];
        if (preg_match('/^Str\.\s*(.+?)\s+nr\.\s*(\S+)(?:,\s*(.*))?$/iu', $line0, $m)) {
            $parts['street'] = trim($m[1]);
            $parts['streetNumber'] = trim($m[2]);
            if (!empty($m[3])) {
                $parts['addressExtra'] = trim($m[3]);
            }
        } else {
            $parts['street'] = $line0;
        }
    }

    if ($parts['city'] === '' && isset($lines[1])) {
        $line1 = $lines[1];
        if (preg_match('/^(.+?),\s*jud\.\s*(.+)$/iu', $line1, $m)) {
            $parts['city'] = trim($m[1]);
            $parts['countyName'] = trim($m[2]);
        } else {
            $parts['city'] = $line1;
        }
    }

    if ($parts['postalCode'] === '') {
        foreach ($lines as $line) {
            if (preg_match('/Cod\s*postal[:\s]+(\d{5,6})/iu', $line, $m)) {
                $parts['postalCode'] = $m[1];
                break;
            }
        }
    }

    return $parts;
}

/**
 * Construiește payload-ul DPD pentru shipment / calculate.
 *
 * @param array<int, array<string, mixed>> $items
 * @return array{
 *   payload:array<string,mixed>,
 *   isCod:bool,
 *   hasPackageOpening:bool
 * }
 */
function shoptop_dpd_build_shipment_payload(array $orderRow, array $items = []): array
{
    if (!shoptop_dpd_enabled()) {
        throw new RuntimeException('DPD nu este configurat (username/password/service_id).');
    }

    $settings = shoptop_dpd_settings();
    $address = shoptop_dpd_order_address_parts($orderRow);
    if ($address['city'] === '' || $address['street'] === '') {
        throw new RuntimeException(
            'Adresa comenzii este incompletă pentru DPD (lipsesc localitatea sau strada).'
        );
    }

    $siteId = $address['dpdSiteId'];
    if ($siteId <= 0) {
        $site = shoptop_dpd_find_site(
            $address['city'],
            $address['countyName'] !== '' ? $address['countyName'] : $address['county'],
            $address['postalCode']
        );
        if ($site !== null) {
            $siteId = (int) $site['siteId'];
            if ($address['postalCode'] === '' && !empty($site['postCode'])) {
                $address['postalCode'] = (string) $site['postCode'];
            }
        }
    }

    $recipientAddress = [
        'countryId' => SHOPTOP_DPD_COUNTRY_RO,
        'streetName' => mb_substr($address['street'], 0, 50),
        'streetNo' => mb_substr(
            $address['streetNumber'] !== '' ? $address['streetNumber'] : '1',
            0,
            10
        ),
    ];
    if ($siteId > 0) {
        $recipientAddress['siteId'] = $siteId;
    } else {
        $recipientAddress['siteName'] = mb_substr($address['city'], 0, 50);
        if ($address['postalCode'] === '') {
            throw new RuntimeException(
                'Localitatea „' . $address['city'] . '” nu are site ID DPD. '
                . 'Completează codul poștal sau alege din nou localitatea (Editează → salvează), apoi reîncearcă AWB.'
            );
        }
    }
    if ($address['postalCode'] !== '') {
        $recipientAddress['postCode'] = $address['postalCode'];
    }
    if ($address['addressExtra'] !== '') {
        $recipientAddress['addressNote'] = mb_substr($address['addressExtra'], 0, 200);
    }

    $phone = shoptop_dpd_normalize_phone((string) ($orderRow['customer_phone'] ?? ''));
    if ($phone === '') {
        throw new RuntimeException('Telefonul clientului este obligatoriu pentru AWB DPD.');
    }

    $clientName = trim((string) ($orderRow['customer_name'] ?? ''));
    if (mb_strlen($clientName) < 3) {
        throw new RuntimeException('Numele clientului este prea scurt pentru DPD.');
    }
    $clientName = mb_substr($clientName, 0, 60);

    $billingType = (string) ($orderRow['billing_type'] ?? 'person');
    $privatePerson = $billingType !== 'company';
    $recipient = [
        'phone1' => ['number' => $phone],
        'clientName' => $clientName,
        'privatePerson' => $privatePerson,
        'address' => $recipientAddress,
    ];
    if (!$privatePerson) {
        $companyName = trim((string) ($orderRow['company_name'] ?? ''));
        if ($companyName !== '') {
            $recipient['clientName'] = mb_substr($companyName, 0, 60);
            $recipient['contactName'] = $clientName;
        }
    }
    $email = trim((string) ($orderRow['customer_email'] ?? ''));
    if ($email !== '') {
        $recipient['email'] = mb_substr($email, 0, 255);
    }

    $lineParts = [];
    $flags = shoptop_dpd_order_service_flags($orderRow, $items);
    foreach ($items as $item) {
        $qty = max(1, (int) ($item['quantity'] ?? 1));
        $sku = trim((string) ($item['product_sku'] ?? $item['productSku'] ?? ''));
        $productId = trim((string) ($item['product_id'] ?? $item['productId'] ?? ''));
        $name = trim((string) ($item['product_name'] ?? $item['productName'] ?? ''));
        $code = $sku !== '' ? $sku : ($productId !== '' ? $productId : $name);
        if ($code === '') {
            continue;
        }
        $lineParts[] = 'x' . $qty . ' ' . $code;
    }

    $contentsSummary = $lineParts !== []
        ? implode(', ', $lineParts)
        : ('Comanda ' . (string) ($orderRow['id'] ?? ''));
    $contents = mb_substr($contentsSummary, 0, 100);
    if ($contents === '') {
        $contents = 'Marfa';
    }

    $noteParts = [];
    if ($lineParts !== []) {
        $noteParts[] = $contentsSummary;
    }
    if ($flags['hasPackageOpening']) {
        $noteParts[] = 'Deschidere colet';
    }
    $customerNotes = trim((string) ($orderRow['customer_notes'] ?? ''));
    if ($customerNotes !== '') {
        $customerNotes = preg_replace('/^Curier ales:\s*[^\n]+\n?/u', '', $customerNotes) ?? $customerNotes;
        $customerNotes = trim($customerNotes);
    }
    if ($customerNotes !== '') {
        $noteParts[] = $customerNotes;
    }
    $shipmentNote = mb_substr(implode(' | ', $noteParts), 0, 200);

    $service = [
        'serviceId' => $settings['service_id'],
        'autoAdjustPickupDate' => true,
    ];

    $totalAmount = (float) ($orderRow['total_amount'] ?? 0);
    $additionalServices = [];

    if ($flags['isCod']) {
        $additionalServices['cod'] = [
            'amount' => round($totalAmount, 2),
            'currencyCode' => 'RON',
            'processingType' => 'CASH',
        ];
    }

    if ($flags['hasPackageOpening'] && $flags['isCod']) {
        $additionalServices['obpd'] = [
            'option' => 'OPEN',
            'returnShipmentServiceId' => $settings['service_id'],
            'returnShipmentPayer' => 'SENDER',
        ];
    }

    if ($additionalServices !== []) {
        $service['additionalServices'] = $additionalServices;
    }

    $payload = [
        'recipient' => $recipient,
        'service' => $service,
        'content' => [
            'parcelsCount' => 1,
            'totalWeight' => $settings['default_weight_kg'],
            'contents' => $contents,
            'package' => 'BOX',
        ],
        'payment' => [
            'courierServicePayer' => 'SENDER',
        ],
        'ref1' => mb_substr((string) ($orderRow['id'] ?? ''), 0, 30),
    ];
    if ($shipmentNote !== '') {
        $payload['shipmentNote'] = $shipmentNote;
    }

    return [
        'payload' => $payload,
        'isCod' => $flags['isCod'],
        'hasPackageOpening' => $flags['hasPackageOpening'],
    ];
}

/**
 * Creează shipment DPD pentru o comandă.
 *
 * @param array<int, array<string, mixed>> $items
 * @return array{
 *   shipmentId:string,
 *   parcelId:string,
 *   courierCost:array{total:float,net:float,vat:float,details:array<string,float>,source:string}
 * }
 */
function shoptop_dpd_create_shipment(array $orderRow, array $items = []): array
{
    $built = shoptop_dpd_build_shipment_payload($orderRow, $items);
    $payload = $built['payload'];

    $res = shoptop_dpd_request('shipment', $payload);
    if (!$res['ok'] || !is_array($res['json'])) {
        $err = (string) ($res['error'] ?? 'Crearea shipment DPD a eșuat.');
        if (stripos($err, 'Acces interzis') !== false || stripos($err, 'forbidden') !== false) {
            throw new RuntimeException(
                'DPD a refuzat crearea AWB: Acces interzis pe Create Shipment. '
                . 'Verifică în config.php: username/password API și pune client_system_id pe null dacă e setat greșit. '
                . 'Apoi cere la DPD (support / manager cont) activarea WebAPI: Create Shipment + Find Site. '
                . '(' . $err . ')'
            );
        }
        throw new RuntimeException($err);
    }

    $shipmentId = trim((string) ($res['json']['id'] ?? ''));
    $parcels = $res['json']['parcels'] ?? [];
    $parcelId = '';
    if (is_array($parcels) && isset($parcels[0]) && is_array($parcels[0])) {
        $parcelId = trim((string) ($parcels[0]['id'] ?? ''));
    }
    if ($shipmentId === '') {
        throw new RuntimeException('DPD nu a returnat ID-ul shipment-ului.');
    }
    if ($parcelId === '') {
        $parcelId = $shipmentId;
    }

    $courierCost = shoptop_dpd_resolve_courier_cost($orderRow, $items, $res['json']);

    return [
        'shipmentId' => $shipmentId,
        'parcelId' => $parcelId,
        'courierCost' => $courierCost,
    ];
}

function shoptop_dpd_cancel_looks_already_gone(string $err): bool
{
    $e = mb_strtolower($err, 'UTF-8');
    foreach ([
        'already cancel',
        'already cancelled',
        'already canceled',
        'has been cancelled',
        'has been canceled',
        'a fost anulat',
        'este deja anulat',
        'deja anulat',
        'shipment not found',
        'no such shipment',
    ] as $needle) {
        if (str_contains($e, $needle)) {
            return true;
        }
    }
    return false;
}

/**
 * Anulează un shipment DPD (înainte de predare / manifest).
 * Dacă e deja anulat sau inexistent, e no-op.
 */
function shoptop_dpd_cancel_shipment(string $shipmentId): void
{
    $id = trim($shipmentId);
    if ($id === '') {
        throw new RuntimeException('Lipsește ID-ul shipment DPD pentru anulare.');
    }
    if (!shoptop_dpd_enabled()) {
        throw new RuntimeException(
            'DPD nu este configurat. Nu pot anula AWB-ul la curier.'
        );
    }

    $res = shoptop_dpd_request('shipment/cancel', [
        'shipmentId' => $id,
        'comment' => 'Anulare AWB din admin (reemitere curier).',
    ]);
    if (!empty($res['ok'])) {
        return;
    }

    $err = trim((string) ($res['error'] ?? ''));
    $status = (int) ($res['status'] ?? 0);
    if ($status === 404 || ($err !== '' && shoptop_dpd_cancel_looks_already_gone($err))) {
        return;
    }
    throw new RuntimeException($err !== '' ? $err : 'Anularea AWB DPD a eșuat.');
}

/**
 * Descarcă PDF etichetă pentru parcel ID-uri DPD.
 *
 * @param string[] $parcelIds
 * @param ?string $paperSizeOverride ex. A6 pentru etichetă mică
 */
function shoptop_dpd_print_label(array $parcelIds, ?string $paperSizeOverride = null): string
{
    $ids = [];
    foreach ($parcelIds as $id) {
        $id = trim((string) $id);
        if ($id !== '') {
            $ids[] = $id;
        }
    }
    if ($ids === []) {
        throw new RuntimeException('Lipsește parcel ID pentru print AWB DPD.');
    }

    $settings = shoptop_dpd_settings();
    $paperSize = $settings['paper_size'];
    if ($paperSizeOverride !== null) {
        $override = strtoupper(trim($paperSizeOverride));
        if ($override === 'A4_4XA6') {
            $override = 'A4_4xA6';
        }
        if (in_array($override, ['A4', 'A6', 'A4_4xA6'], true)) {
            $paperSize = $override;
        }
    }

    $parcels = [];
    foreach ($ids as $id) {
        $parcels[] = [
            'parcel' => ['id' => $id],
        ];
    }

    $res = shoptop_dpd_request('print', [
        'format' => 'pdf',
        'paperSize' => $paperSize,
        'parcels' => $parcels,
    ], true);

    if (!$res['ok'] || $res['raw'] === '') {
        throw new RuntimeException($res['error'] ?? 'Print AWB DPD a eșuat.');
    }
    if (!str_starts_with($res['raw'], '%PDF')) {
        throw new RuntimeException($res['error'] ?? 'Răspunsul DPD nu este un PDF valid.');
    }

    return $res['raw'];
}

/**
 * Etichete RO pentru codurile de operațiune DPD (Appendix 1).
 */
function shoptop_dpd_operation_label(int $code): string
{
    static $labels = [
        1 => 'Scanare sosire',
        2 => 'Scanare plecare',
        11 => 'Recepționat în depozit',
        12 => 'În curs de livrare',
        -14 => 'Livrat',
        21 => 'Procesat în depozit',
        38 => 'Returnat la depozit',
        39 => 'Preluat de curier',
        44 => 'Livrare nereușită',
        69 => 'Livrare amânată',
        111 => 'Returnare către expeditor',
        123 => 'Refuzat de destinatar',
        124 => 'Returnat la expeditor',
        128 => 'Anulat',
        134 => 'Pregătit pentru ridicare personală',
        148 => 'Date colet înregistrate',
        175 => 'Anunț livrare (Predict)',
    ];

    return $labels[$code] ?? ('Eveniment curier (' . $code . ')');
}

/** Coduri DPD: ridicat / în tranzit (comanda trece pe „expediată”). */
function shoptop_dpd_is_in_transit_code(int $code): bool
{
    return in_array($code, [1, 2, 11, 12, 21, 39], true);
}

/** Coduri DPD: refuz / returnare în curs (încă nu la expeditor). */
function shoptop_dpd_is_refused_code(int $code): bool
{
    return in_array($code, [38, 111, 123], true);
}

/** Cod DPD: colet reîntors la expeditor (la tine). */
function shoptop_dpd_is_returned_to_sender_code(int $code): bool
{
    return $code === 124;
}

/** Coduri DPD: returnat / refuzat (orice etapă de retur). */
function shoptop_dpd_is_returned_code(int $code): bool
{
    return shoptop_dpd_is_refused_code($code) || shoptop_dpd_is_returned_to_sender_code($code);
}

function shoptop_dpd_desc_returned_to_sender(string $descLower): bool
{
    return str_contains($descLower, 'returnat la expeditor')
        || str_contains($descLower, 'returnat expeditorului')
        || str_contains($descLower, 'livrat la expeditor');
}

/**
 * Parsează un parcel din răspunsul DPD track → flags magazin.
 *
 * @param array<string,mixed> $tracked
 * @return array{
 *   parcelId:string,
 *   events:list<array{code:int,description:string,dateTime:string,place:?string}>,
 *   lastCode:?int,
 *   lastDescription:?string,
 *   outForDelivery:bool,
 *   delivered:bool,
 *   inTransit:bool,
 *   returned:bool,
 *   returnedToSender:bool
 * }
 */
function shoptop_dpd_parse_tracked_parcel(array $tracked, string|int $fallbackId = ''): array
{
    $fallbackId = trim((string) $fallbackId);
    if (!empty($tracked['error']) && is_array($tracked['error'])) {
        $msg = trim((string) ($tracked['error']['message'] ?? 'Eroare tracking DPD.'));
        throw new RuntimeException($msg !== '' ? $msg : 'Eroare tracking DPD.');
    }

    $operations = $tracked['operations'] ?? [];
    if (!is_array($operations)) {
        $operations = [];
    }

    $events = [];
    $outForDelivery = false;
    $sawDelivered = false;
    $sawInTransit = false;
    foreach ($operations as $op) {
        if (!is_array($op)) {
            continue;
        }
        $code = (int) ($op['operationCode'] ?? 0);
        $desc = trim((string) ($op['description'] ?? ''));
        if ($desc === '') {
            $desc = shoptop_dpd_operation_label($code);
        }
        $place = trim((string) ($op['place'] ?? ''));
        $events[] = [
            'code' => $code,
            'description' => $desc,
            'dateTime' => (string) ($op['dateTime'] ?? ''),
            'place' => $place !== '' ? $place : null,
        ];
        if ($code === 12) {
            $outForDelivery = true;
        }
        if ($code === -14) {
            $sawDelivered = true;
        }
        if (shoptop_dpd_is_in_transit_code($code)) {
            $sawInTransit = true;
        }
        $descLower = mb_strtolower($desc, 'UTF-8');
        if (
            str_contains($descLower, 'preluat')
            || str_contains($descLower, 'ridicat')
            || str_contains($descLower, 'tranzit')
            || str_contains($descLower, 'în curs de livrare')
            || str_contains($descLower, 'in curs de livrare')
        ) {
            $sawInTransit = true;
        }
    }

    usort($events, static function (array $a, array $b): int {
        return strcmp((string) ($b['dateTime'] ?? ''), (string) ($a['dateTime'] ?? ''));
    });

    $lastCode = $events !== [] ? (int) $events[0]['code'] : null;
    $lastDescription = $events !== [] ? (string) $events[0]['description'] : null;
    $lastDescLower = mb_strtolower((string) $lastDescription, 'UTF-8');
    $lastIsDelivered = $lastCode === -14;

    $returnedToSender = !$lastIsDelivered && (
        ($lastCode !== null && shoptop_dpd_is_returned_to_sender_code($lastCode))
        || shoptop_dpd_desc_returned_to_sender($lastDescLower)
    );

    $returned = !$lastIsDelivered && (
        $returnedToSender
        || ($lastCode !== null && shoptop_dpd_is_returned_code($lastCode))
        || str_contains($lastDescLower, 'returnat')
        || str_contains($lastDescLower, 'refuzat')
        || str_contains($lastDescLower, 'returnare')
    );

    $delivered = $lastIsDelivered || (!$returned && $sawDelivered);
    $inTransit = !$returned && !$delivered && ($sawInTransit || $outForDelivery);

    $parcelId = trim((string) ($tracked['parcelId'] ?? $tracked['id'] ?? $fallbackId));

    return [
        'parcelId' => $parcelId !== '' ? $parcelId : $fallbackId,
        'events' => $events,
        'lastCode' => $lastCode,
        'lastDescription' => $lastDescription,
        'outForDelivery' => !$returned && $outForDelivery,
        'delivered' => $delivered,
        'inTransit' => $inTransit,
        'returned' => $returned,
        'returnedToSender' => $returnedToSender,
    ];
}

/**
 * Tracking DPD în bulk (max 10 colete / request — limita API).
 * Între request-uri așteaptă ~250ms ca să nu depășim 5 req/sec.
 *
 * @param list<string> $parcelIds
 * @return array<string, array{
 *   parcelId:string,
 *   events:list<array{code:int,description:string,dateTime:string,place:?string}>,
 *   lastCode:?int,
 *   lastDescription:?string,
 *   outForDelivery:bool,
 *   delivered:bool,
 *   inTransit:bool,
 *   returned:bool,
 *   returnedToSender:bool
 * }|array{error:string}>
 *   cheie = id-ul cerut
 */
function shoptop_dpd_track_parcels(array $parcelIds): array
{
    // Listă (nu map) — cheile numerice PHP ar transforma AWB-ul în int.
    $ids = [];
    $seen = [];
    foreach ($parcelIds as $id) {
        $trimmed = trim((string) $id);
        if ($trimmed === '' || isset($seen[$trimmed])) {
            continue;
        }
        // Păstrăm cheia ca string chiar dacă AWB e doar cifre.
        $seen[$trimmed] = true;
        $ids[] = $trimmed;
    }
    if ($ids === []) {
        return [];
    }

    $out = [];
    $chunks = array_chunk($ids, 10);
    foreach ($chunks as $index => $chunk) {
        if ($index > 0) {
            // DPD: max 5 tracking requests / secundă.
            usleep(250000);
        }

        $parcelsPayload = [];
        foreach ($chunk as $pid) {
            $parcelsPayload[] = ['id' => (string) $pid];
        }

        $res = shoptop_dpd_request('track', [
            'language' => 'RO',
            'lastOperationOnly' => false,
            'parcels' => $parcelsPayload,
        ]);

        if (!$res['ok'] || !is_array($res['json'])) {
            $err = $res['error'] ?? 'Tracking DPD a eșuat.';
            foreach ($chunk as $pid) {
                $out[(string) $pid] = ['error' => $err];
            }
            continue;
        }

        $parcels = $res['json']['parcels'] ?? null;
        if (!is_array($parcels) || $parcels === []) {
            foreach ($chunk as $pid) {
                $out[(string) $pid] = ['error' => 'DPD nu a returnat informații de tracking.'];
            }
            continue;
        }

        // Preferă maparea pe index (aceeași ordine ca în request).
        foreach ($chunk as $i => $pid) {
            $key = (string) $pid;
            if (!isset($parcels[$i]) || !is_array($parcels[$i])) {
                $out[$key] = ['error' => 'DPD nu a returnat tracking pentru acest colet.'];
                continue;
            }
            try {
                $out[$key] = shoptop_dpd_parse_tracked_parcel($parcels[$i], $key);
            } catch (Throwable $e) {
                $out[$key] = ['error' => $e->getMessage()];
            }
        }
    }

    return $out;
}

/**
 * Urmărește un colet DPD.
 *
 * @return array{
 *   parcelId:string,
 *   events:list<array{code:int,description:string,dateTime:string,place:?string}>,
 *   lastCode:?int,
 *   lastDescription:?string,
 *   outForDelivery:bool,
 *   delivered:bool,
 *   inTransit:bool,
 *   returned:bool,
 *   returnedToSender:bool
 * }
 */
function shoptop_dpd_track_parcel(string $parcelId): array
{
    $parcelId = trim($parcelId);
    if ($parcelId === '') {
        throw new RuntimeException('Lipsește ID-ul coletului DPD pentru tracking.');
    }

    $map = shoptop_dpd_track_parcels([$parcelId]);
    $tracked = $map[$parcelId] ?? null;
    if (!is_array($tracked)) {
        throw new RuntimeException('DPD nu a returnat informații de tracking.');
    }
    if (isset($tracked['error'])) {
        throw new RuntimeException((string) $tracked['error']);
    }

    return $tracked;
}

/**
 * Link public de urmărire DPD (site tracking).
 */
function shoptop_dpd_public_tracking_url(string $shipmentOrParcelId): string
{
    $id = trim($shipmentOrParcelId);
    return 'https://tracking.dpd.ro/?shipmentNumber=' . rawurlencode($id);
}
