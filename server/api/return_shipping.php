<?php

declare(strict_types=1);

/**
 * AWB de retur „în oglindă”: curierul ridică coletul de la adresa clientului
 * (din comanda asociată cererii) și îl livrează la magazin. Transportul e
 * plătit de magazin (destinatar). Suportă DPD și Fan Courier.
 *
 * Adresa de ridicare = clientul (editabilă din admin).
 * Adresa de livrare = punctul de lucru: config.php → return_pickup dacă există,
 * altfel adresa din contul curierului (DPD client/contract, Fan reports/branches).
 */

require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/dpd.php';
require_once __DIR__ . '/fan.php';

/** Structura comună pentru o adresă (ridicare sau livrare). */
const SHOPTOP_RETURN_ADDRESS_KEYS = [
    'name', 'contact', 'phone', 'email', 'county', 'city', 'street', 'streetNumber',
    'addressExtra', 'postalCode', 'dpdSiteId', 'dpdClientId',
];

function shoptop_return_empty_address(): array
{
    return [
        'name' => '', 'contact' => '', 'phone' => '', 'email' => '', 'county' => '', 'city' => '',
        'street' => '', 'streetNumber' => '', 'addressExtra' => '', 'postalCode' => '',
        'dpdSiteId' => 0, 'dpdClientId' => 0,
    ];
}

/** Normalizează o adresă primită din request (doar cheile cunoscute, trim). */
function shoptop_return_address_from_input(mixed $input): array
{
    $out = shoptop_return_empty_address();
    if (!is_array($input)) {
        return $out;
    }
    foreach (SHOPTOP_RETURN_ADDRESS_KEYS as $k) {
        if (!array_key_exists($k, $input)) {
            continue;
        }
        if ($k === 'dpdSiteId' || $k === 'dpdClientId') {
            $out[$k] = is_numeric($input[$k]) ? (int) $input[$k] : 0;
        } else {
            $out[$k] = trim((string) $input[$k]);
        }
    }
    $out['phone'] = shoptop_dpd_normalize_phone($out['phone']);
    return $out;
}

/** Suprascrie câmpurile nevide din $override peste $base. */
function shoptop_return_merge_address(array $base, array $override): array
{
    foreach (SHOPTOP_RETURN_ADDRESS_KEYS as $k) {
        $v = $override[$k] ?? null;
        if ($v === null || $v === '' || $v === 0) {
            continue;
        }
        $base[$k] = $v;
    }
    return $base;
}

function shoptop_return_awb_columns_available(PDO $pdo): bool
{
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }
    $stmt = $pdo->prepare(
        "SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'return_requests'
           AND COLUMN_NAME = 'return_awb_number' LIMIT 1"
    );
    $stmt->execute();
    $cached = (bool) $stmt->fetchColumn();
    return $cached;
}

/** Rândul comenzii (toate coloanele). */
function shoptop_return_load_order(PDO $pdo, string $orderId): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => trim($orderId)]);
    $row = $stmt->fetch();
    return is_array($row) ? $row : null;
}

/** Ce conține coletul: produsele din cerere (text) sau cele din comandă. */
function shoptop_return_contents(array $returnRow, PDO $pdo): string
{
    $items = trim((string) ($returnRow['items'] ?? ''));
    if ($items !== '') {
        $decoded = json_decode($items, true);
        if (is_string($decoded)) {
            $items = $decoded;
        } elseif (is_array($decoded)) {
            $items = implode(', ', array_map('strval', $decoded));
        }
    }
    if ($items === '') {
        $stmt = $pdo->prepare(
            'SELECT quantity, product_sku, product_id FROM order_items WHERE order_id = :id ORDER BY id ASC'
        );
        $stmt->execute(['id' => (string) $returnRow['order_id']]);
        $parts = [];
        foreach ($stmt->fetchAll() as $it) {
            $code = trim((string) ($it['product_sku'] ?? '')) ?: trim((string) $it['product_id']);
            if ($code !== '' && !shoptop_is_virtual_product_id($code)) {
                $parts[] = 'x' . (int) $it['quantity'] . ' ' . $code;
            }
        }
        $items = implode(', ', $parts);
    }
    $text = 'Retur #' . (string) $returnRow['order_id'] . ($items !== '' ? ': ' . $items : '');
    return mb_substr($text, 0, 100);
}

/* ---------------------------------------------------------------------------
 * Adresa de RIDICARE (clientul) — implicit din comandă.
 * ------------------------------------------------------------------------- */

function shoptop_return_default_pickup(array $orderRow, array $returnRow): array
{
    $a = shoptop_dpd_order_address_parts($orderRow);
    $addr = shoptop_return_empty_address();
    $addr['name'] = trim((string) ($returnRow['customer_name'] ?? '')) ?: trim((string) ($orderRow['customer_name'] ?? ''));
    $addr['phone'] = shoptop_dpd_normalize_phone(
        (string) ($returnRow['customer_phone'] ?? '') ?: (string) ($orderRow['customer_phone'] ?? '')
    );
    $addr['email'] = trim((string) ($returnRow['customer_email'] ?? '') ?: (string) ($orderRow['customer_email'] ?? ''));
    $addr['county'] = $a['countyName'] !== '' ? $a['countyName'] : $a['county'];
    $addr['city'] = $a['city'];
    $addr['street'] = $a['street'];
    $addr['streetNumber'] = $a['streetNumber'];
    $addr['addressExtra'] = $a['addressExtra'];
    $addr['postalCode'] = $a['postalCode'];
    $addr['dpdSiteId'] = (int) $a['dpdSiteId'];
    return $addr;
}

/* ---------------------------------------------------------------------------
 * Adresa de LIVRARE (punctul de lucru) — config sau contul curierului.
 * ------------------------------------------------------------------------- */

/** Din config.php → return_pickup (dacă e completat). */
function shoptop_return_delivery_from_config(): ?array
{
    $cfg = shoptop_config()['return_pickup'] ?? null;
    if (!is_array($cfg)) {
        return null;
    }
    $addr = shoptop_return_empty_address();
    $addr['name'] = trim((string) ($cfg['name'] ?? ''));
    $addr['contact'] = trim((string) ($cfg['contact'] ?? ''));
    $addr['phone'] = shoptop_dpd_normalize_phone((string) ($cfg['phone'] ?? ''));
    $addr['county'] = trim((string) ($cfg['county'] ?? ''));
    $addr['city'] = trim((string) ($cfg['city'] ?? ''));
    $addr['street'] = trim((string) ($cfg['street'] ?? ''));
    $addr['streetNumber'] = trim((string) ($cfg['street_number'] ?? ''));
    $addr['addressExtra'] = trim((string) ($cfg['address_extra'] ?? ''));
    $addr['postalCode'] = trim((string) ($cfg['postal_code'] ?? ''));
    $addr['dpdSiteId'] = (int) ($cfg['dpd_site_id'] ?? 0);
    $addr['dpdClientId'] = (int) ($cfg['dpd_client_id'] ?? 0);
    if ($addr['city'] === '' && $addr['street'] === '') {
        return null;
    }
    return $addr;
}

/** Din contul DPD: primul client de contract (POST client/contract). */
function shoptop_return_delivery_from_dpd(): ?array
{
    static $cached = false;
    if ($cached !== false) {
        return $cached;
    }
    $cached = null;
    if (!shoptop_dpd_enabled()) {
        return null;
    }
    try {
        $res = shoptop_dpd_request('client/contract', []);
    } catch (Throwable $e) {
        return null;
    }
    $list = is_array($res['json'] ?? null) ? $res['json'] : [];
    // Răspunsul poate fi lista direct sau { clients: [...] }.
    if (isset($list['clients']) && is_array($list['clients'])) {
        $list = $list['clients'];
    }
    foreach ($list as $c) {
        if (!is_array($c) || empty($c['clientId'])) {
            continue;
        }
        $a = is_array($c['address'] ?? null) ? $c['address'] : [];
        $addr = shoptop_return_empty_address();
        $addr['dpdClientId'] = (int) $c['clientId'];
        $addr['name'] = trim((string) ($c['clientName'] ?? ''));
        $addr['contact'] = trim((string) ($c['contactName'] ?? ''));
        $addr['phone'] = shoptop_dpd_normalize_phone((string) ($c['phone1']['number'] ?? ''));
        $addr['email'] = trim((string) ($c['email'] ?? ''));
        $addr['county'] = trim((string) ($a['regionName'] ?? $a['stateName'] ?? ''));
        $addr['city'] = trim((string) ($a['siteName'] ?? ''));
        $addr['street'] = trim((string) ($a['streetName'] ?? ''));
        $addr['streetNumber'] = trim((string) ($a['streetNo'] ?? ''));
        $addr['addressExtra'] = trim((string) ($a['addressNote'] ?? ''));
        $addr['postalCode'] = trim((string) ($a['postCode'] ?? ''));
        $addr['dpdSiteId'] = (int) ($a['siteId'] ?? 0);
        $cached = $addr;
        return $addr;
    }
    return null;
}

/** Din contul Fan Courier: sucursala client_id (GET reports/branches). */
function shoptop_return_delivery_from_fan(): ?array
{
    static $cached = false;
    if ($cached !== false) {
        return $cached;
    }
    $cached = null;
    if (!shoptop_fan_enabled()) {
        return null;
    }
    $s = shoptop_fan_settings();
    try {
        $res = shoptop_fan_request('GET', '/reports/branches', ['clientId' => $s['client_id']]);
    } catch (Throwable $e) {
        return null;
    }
    if (!$res['ok'] || !is_array($res['json'])) {
        return null;
    }
    $list = $res['json']['data'] ?? $res['json']['response'] ?? [];
    if (!is_array($list)) {
        return null;
    }
    $chosen = null;
    foreach ($list as $b) {
        if (!is_array($b)) {
            continue;
        }
        if ((int) ($b['id'] ?? $b['clientId'] ?? 0) === (int) $s['client_id']) {
            $chosen = $b;
            break;
        }
        if ($chosen === null) {
            $chosen = $b;
        }
    }
    if ($chosen === null) {
        return null;
    }
    $a = is_array($chosen['address'] ?? null) ? $chosen['address'] : $chosen;
    $addr = shoptop_return_empty_address();
    $addr['name'] = trim((string) ($chosen['name'] ?? $chosen['branchName'] ?? ''));
    $addr['contact'] = trim((string) ($chosen['contactPerson'] ?? $chosen['contact'] ?? ''));
    $addr['phone'] = shoptop_dpd_normalize_phone((string) ($chosen['phone'] ?? $a['phone'] ?? ''));
    $addr['email'] = trim((string) ($chosen['email'] ?? ''));
    $addr['county'] = trim((string) ($a['county'] ?? $a['judet'] ?? ''));
    $addr['city'] = trim((string) ($a['locality'] ?? $a['localitate'] ?? $a['city'] ?? ''));
    $addr['street'] = trim((string) ($a['street'] ?? $a['strada'] ?? ''));
    $addr['streetNumber'] = trim((string) ($a['streetNo'] ?? $a['number'] ?? $a['nr'] ?? ''));
    $addr['addressExtra'] = trim((string) ($a['building'] ?? ''));
    $addr['postalCode'] = trim((string) ($a['zipCode'] ?? $a['postalCode'] ?? $a['codPostal'] ?? ''));
    $cached = $addr;
    return $addr;
}

/**
 * Adresa de livrare implicită + sursa ei.
 *
 * @return array{address:array, source:string}
 */
function shoptop_return_default_delivery(string $carrier): array
{
    $fromConfig = shoptop_return_delivery_from_config();
    $fromCourier = $carrier === 'dpd' ? shoptop_return_delivery_from_dpd() : shoptop_return_delivery_from_fan();

    if ($fromCourier !== null && ($fromCourier['city'] !== '' || $fromCourier['dpdClientId'] > 0)) {
        // Contul curierului e sursa principală; config completează golurile.
        $addr = $fromConfig !== null ? shoptop_return_merge_address($fromCourier, $fromConfig) : $fromCourier;
        // Dar câmpurile curierului rămân prioritare unde există.
        $addr = shoptop_return_merge_address($addr, $fromCourier);
        return ['address' => $addr, 'source' => $carrier === 'dpd' ? 'Contul DPD (client de contract)' : 'Contul Fan Courier (sucursala)'];
    }
    if ($fromConfig !== null) {
        return ['address' => $fromConfig, 'source' => 'config.php (return_pickup)'];
    }
    $empty = shoptop_return_empty_address();
    $empty['name'] = trim((string) (shoptop_config()['operator_name'] ?? ''));
    $empty['phone'] = shoptop_dpd_normalize_phone((string) (shoptop_config()['return_phone'] ?? ''));
    return ['address' => $empty, 'source' => 'necompletat'];
}

/** Validare minimă pentru ambele adrese; aruncă mesaj clar. */
function shoptop_return_validate_address(array $a, string $label, bool $allowClientIdOnly = false): void
{
    if ($allowClientIdOnly && $a['dpdClientId'] > 0) {
        return;
    }
    $missing = [];
    if (mb_strlen($a['name']) < 3) {
        $missing[] = 'nume';
    }
    if ($a['phone'] === '') {
        $missing[] = 'telefon';
    }
    if ($a['county'] === '') {
        $missing[] = 'județ';
    }
    if ($a['city'] === '') {
        $missing[] = 'localitate';
    }
    if ($a['street'] === '') {
        $missing[] = 'stradă';
    }
    if ($missing !== []) {
        throw new RuntimeException($label . ': lipsesc ' . implode(', ', $missing) . '.');
    }
}

/* ---------------------------------------------------------------------------
 * DPD
 * ------------------------------------------------------------------------- */

/** Adresă DPD (siteId sau siteName + postCode). */
function shoptop_return_dpd_address(array $a, string $label): array
{
    $out = [
        'countryId' => SHOPTOP_DPD_COUNTRY_RO,
        'streetName' => mb_substr($a['street'], 0, 50),
        'streetNo' => mb_substr($a['streetNumber'] !== '' ? $a['streetNumber'] : '1', 0, 10),
    ];
    $siteId = (int) $a['dpdSiteId'];
    $postal = $a['postalCode'];
    if ($siteId <= 0) {
        $site = shoptop_dpd_find_site($a['city'], $a['county'], $postal);
        if ($site !== null) {
            $siteId = (int) $site['siteId'];
            if ($postal === '' && !empty($site['postCode'])) {
                $postal = (string) $site['postCode'];
            }
        }
    }
    if ($siteId > 0) {
        $out['siteId'] = $siteId;
    } else {
        $out['siteName'] = mb_substr($a['city'], 0, 50);
        if ($postal === '') {
            throw new RuntimeException(
                $label . ': localitatea „' . $a['city'] . '” nu are site ID DPD și lipsește codul poștal.'
            );
        }
    }
    if ($postal !== '') {
        $out['postCode'] = $postal;
    }
    if ($a['addressExtra'] !== '') {
        $out['addressNote'] = mb_substr($a['addressExtra'], 0, 200);
    }
    return $out;
}

/** @return array{awb:string, parcelId:string} */
function shoptop_return_dpd_create(array $pickup, array $delivery, array $returnRow, PDO $pdo): array
{
    if (!shoptop_dpd_enabled()) {
        throw new RuntimeException('DPD nu este configurat (username/password/service_id).');
    }
    $settings = shoptop_dpd_settings();
    shoptop_return_validate_address($pickup, 'Adresa de ridicare');
    shoptop_return_validate_address($delivery, 'Adresa de livrare', true);

    $sender = [
        'privatePerson' => true,
        'clientName' => mb_substr($pickup['name'], 0, 60),
        'phone1' => ['number' => $pickup['phone']],
        'address' => shoptop_return_dpd_address($pickup, 'Adresa de ridicare'),
    ];
    if ($pickup['email'] !== '') {
        $sender['email'] = mb_substr($pickup['email'], 0, 255);
    }

    if ($delivery['dpdClientId'] > 0) {
        $recipient = ['clientId' => $delivery['dpdClientId']];
    } else {
        $recipient = [
            'privatePerson' => false,
            'clientName' => mb_substr($delivery['name'], 0, 60),
            'contactName' => mb_substr($delivery['contact'] !== '' ? $delivery['contact'] : $delivery['name'], 0, 60),
            'phone1' => ['number' => $delivery['phone']],
            'address' => shoptop_return_dpd_address($delivery, 'Adresa de livrare'),
        ];
    }

    $orderId = (string) $returnRow['order_id'];
    $payload = [
        'sender' => $sender,
        'recipient' => $recipient,
        'service' => ['serviceId' => $settings['service_id'], 'autoAdjustPickupDate' => true],
        'content' => [
            'parcelsCount' => 1,
            'totalWeight' => $settings['default_weight_kg'],
            'contents' => shoptop_return_contents($returnRow, $pdo),
            'package' => 'BOX',
        ],
        'payment' => ['courierServicePayer' => 'RECIPIENT'],
        'ref1' => mb_substr('RETUR-' . $orderId, 0, 30),
        'shipmentNote' => mb_substr('Retur comanda #' . $orderId . ' - ridicare de la client', 0, 200),
    ];

    $res = shoptop_dpd_request('shipment', $payload);
    if (!$res['ok'] || !is_array($res['json'])) {
        throw new RuntimeException('DPD: ' . (string) ($res['error'] ?? 'crearea AWB de retur a eșuat.'));
    }
    $shipmentId = trim((string) ($res['json']['id'] ?? ''));
    if ($shipmentId === '') {
        throw new RuntimeException('DPD nu a returnat ID-ul expedierii de retur.');
    }
    $parcels = $res['json']['parcels'] ?? [];
    $parcelId = is_array($parcels) && isset($parcels[0]['id']) ? trim((string) $parcels[0]['id']) : $shipmentId;
    return ['awb' => $shipmentId, 'parcelId' => $parcelId];
}

/* ---------------------------------------------------------------------------
 * Fan Courier
 * ------------------------------------------------------------------------- */

function shoptop_return_fan_party(array $a, string $label): array
{
    $postal = $a['postalCode'];
    if ($postal === '') {
        $site = shoptop_dpd_find_site($a['city'], $a['county'], '');
        if ($site !== null && !empty($site['postCode'])) {
            $postal = trim((string) $site['postCode']);
        }
    }
    if ($postal === '') {
        throw new RuntimeException($label . ': codul poștal lipsește (Fan Courier îl cere).');
    }
    return [
        'name' => mb_substr($a['name'], 0, 60),
        'contactPerson' => mb_substr($a['contact'] !== '' ? $a['contact'] : $a['name'], 0, 50),
        'phone' => $a['phone'],
        'email' => $a['email'] !== '' ? $a['email'] : null,
        'address' => [
            'county' => mb_substr($a['county'], 0, 50),
            'locality' => mb_substr($a['city'], 0, 50),
            'street' => mb_substr($a['street'], 0, 255),
            'streetNo' => mb_substr($a['streetNumber'] !== '' ? $a['streetNumber'] : '1', 0, 10),
            'zipCode' => mb_substr($postal, 0, 6),
            'building' => mb_substr($a['addressExtra'], 0, 20),
            'pickupLocation' => '',
        ],
    ];
}

/** @return array{awb:string, parcelId:string} */
function shoptop_return_fan_create(array $pickup, array $delivery, array $returnRow, PDO $pdo): array
{
    if (!shoptop_fan_enabled()) {
        throw new RuntimeException('Fan Courier nu este configurat (username, password, client_id).');
    }
    $s = shoptop_fan_settings();
    shoptop_return_validate_address($pickup, 'Adresa de ridicare');
    shoptop_return_validate_address($delivery, 'Adresa de livrare');

    $orderId = (string) $returnRow['order_id'];
    $info = [
        'service' => $s['service'],
        'packages' => ['parcel' => 1, 'envelope' => 0],
        'weight' => $s['default_weight_kg'],
        'cod' => 0,
        'declaredValue' => 0,
        'payment' => 'recipient',
        'refund' => null,
        'returnPayment' => null,
        'observation' => 'Retur comanda #' . $orderId . ' - ridicare de la client',
        'content' => shoptop_return_contents($returnRow, $pdo),
        'dimensions' => ['length' => 10, 'width' => 10, 'height' => 5],
        'options' => $s['epod'] ? ['X'] : [],
    ];
    $payload = [
        'clientId' => $s['client_id'],
        'shipments' => [[
            'info' => $info,
            'sender' => shoptop_return_fan_party($pickup, 'Adresa de ridicare'),
            'recipient' => shoptop_return_fan_party($delivery, 'Adresa de livrare'),
        ]],
    ];

    $res = shoptop_fan_request('POST', '/intern-awb', null, $payload);
    if (!$res['ok'] || !is_array($res['json'])) {
        throw new RuntimeException('Fan Courier: ' . ($res['error'] ?? 'crearea AWB de retur a eșuat.'));
    }
    $list = $res['json']['response'] ?? $res['json']['data'] ?? null;
    $first = is_array($list) && isset($list[0]) && is_array($list[0]) ? $list[0] : (is_array($list) ? $list : null);
    if (!is_array($first)) {
        throw new RuntimeException('Fan Courier nu a returnat AWB-ul de retur.');
    }
    if (!empty($first['errors'])) {
        $msg = shoptop_fan_format_errors($first['errors']);
        throw new RuntimeException('Fan Courier: ' . ($msg !== '' ? $msg : 'cererea a fost respinsă.'));
    }
    $awb = trim((string) ($first['awbNumber'] ?? $first['awb'] ?? ''));
    if ($awb === '') {
        throw new RuntimeException('Fan Courier nu a returnat numărul AWB de retur.');
    }
    return ['awb' => $awb, 'parcelId' => $awb];
}

/* ---------------------------------------------------------------------------
 * Orchestrare
 * ------------------------------------------------------------------------- */

/**
 * Adresele propuse în admin înainte de emitere.
 *
 * @return array{pickup:array, delivery:array, deliverySource:string, carrierConfigured:bool}
 */
function shoptop_return_awb_defaults(PDO $pdo, array $returnRow, string $carrier): array
{
    $carrier = $carrier === 'dpd' ? 'dpd' : 'fan-courier';
    $order = shoptop_return_load_order($pdo, (string) $returnRow['order_id']);
    $pickup = $order !== null
        ? shoptop_return_default_pickup($order, $returnRow)
        : shoptop_return_merge_address(shoptop_return_empty_address(), [
            'name' => (string) ($returnRow['customer_name'] ?? ''),
            'phone' => shoptop_dpd_normalize_phone((string) ($returnRow['customer_phone'] ?? '')),
            'email' => (string) ($returnRow['customer_email'] ?? ''),
        ]);
    $delivery = shoptop_return_default_delivery($carrier);
    return [
        'pickup' => $pickup,
        'delivery' => $delivery['address'],
        'deliverySource' => $delivery['source'],
        'carrierConfigured' => $carrier === 'dpd' ? shoptop_dpd_enabled() : shoptop_fan_enabled(),
    ];
}

/**
 * Emite AWB de retur și îl salvează pe cerere.
 *
 * @return array{awb:string, carrier:string, parcelId:string}
 */
function shoptop_return_issue_awb(
    PDO $pdo,
    array $returnRow,
    string $carrier,
    ?array $pickupOverride = null,
    ?array $deliveryOverride = null,
): array {
    if (!shoptop_return_awb_columns_available($pdo)) {
        throw new RuntimeException(
            'Lipsesc coloanele AWB pe return_requests. Rulează sql/migrate-return-awb(-server).sql.'
        );
    }
    if (!empty($returnRow['return_awb_number'])) {
        throw new RuntimeException(
            'Cererea are deja AWB de retur (' . (string) $returnRow['return_awb_number'] . '). Anulează-l întâi.'
        );
    }
    $carrier = $carrier === 'dpd' ? 'dpd' : 'fan-courier';
    $defaults = shoptop_return_awb_defaults($pdo, $returnRow, $carrier);
    $pickup = $pickupOverride !== null
        ? shoptop_return_merge_address($defaults['pickup'], shoptop_return_address_from_input($pickupOverride))
        : $defaults['pickup'];
    $delivery = $deliveryOverride !== null
        ? shoptop_return_merge_address($defaults['delivery'], shoptop_return_address_from_input($deliveryOverride))
        : $defaults['delivery'];
    // Dacă operatorul a schimbat localitatea, siteId-ul vechi nu mai e valabil.
    if ($pickupOverride !== null && trim((string) ($pickupOverride['city'] ?? '')) !== '' && $pickupOverride['city'] !== $defaults['pickup']['city']) {
        $pickup['dpdSiteId'] = 0;
    }

    $created = $carrier === 'dpd'
        ? shoptop_return_dpd_create($pickup, $delivery, $returnRow, $pdo)
        : shoptop_return_fan_create($pickup, $delivery, $returnRow, $pdo);

    $stmt = $pdo->prepare(
        'UPDATE return_requests
         SET return_awb_number = :awb, return_awb_carrier = :carrier,
             return_awb_parcel_id = :parcel, return_awb_issued_at = NOW()
         WHERE id = :id'
    );
    $stmt->execute([
        'awb' => $created['awb'],
        'carrier' => $carrier,
        'parcel' => $created['parcelId'],
        'id' => (int) $returnRow['id'],
    ]);

    return ['awb' => $created['awb'], 'carrier' => $carrier, 'parcelId' => $created['parcelId']];
}

function shoptop_return_cancel_awb(PDO $pdo, array $returnRow): void
{
    $awb = trim((string) ($returnRow['return_awb_number'] ?? ''));
    if ($awb === '') {
        throw new RuntimeException('Cererea nu are AWB de retur.');
    }
    $carrier = (string) ($returnRow['return_awb_carrier'] ?? 'dpd');
    if ($carrier === 'dpd') {
        shoptop_dpd_cancel_shipment($awb);
    } else {
        shoptop_fan_delete_awb($awb);
    }
    $stmt = $pdo->prepare(
        'UPDATE return_requests
         SET return_awb_number = NULL, return_awb_carrier = NULL,
             return_awb_parcel_id = NULL, return_awb_issued_at = NULL
         WHERE id = :id'
    );
    $stmt->execute(['id' => (int) $returnRow['id']]);
}

/** Eticheta (PDF/HTML) pentru AWB-ul de retur. */
function shoptop_return_print_awb(array $returnRow): string
{
    $awb = trim((string) ($returnRow['return_awb_number'] ?? ''));
    if ($awb === '') {
        throw new RuntimeException('Cererea nu are AWB de retur.');
    }
    $carrier = (string) ($returnRow['return_awb_carrier'] ?? 'dpd');
    if ($carrier === 'dpd') {
        $parcel = trim((string) ($returnRow['return_awb_parcel_id'] ?? '')) ?: $awb;
        return shoptop_dpd_print_label([$parcel]);
    }
    return shoptop_fan_print_label([$awb]);
}

/** Email către client: curierul vine să ridice coletul (best-effort). */
function shoptop_return_notify_pickup(array $returnRow, string $carrier, string $awb, ?array $pickup = null): bool
{
    $email = trim((string) ($pickup['email'] ?? '') ?: (string) ($returnRow['customer_email'] ?? ''));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return false;
    }
    require_once __DIR__ . '/mailer.php';
    $carrierLabel = $carrier === 'dpd' ? 'DPD' : 'Fan Courier';
    $h = static fn (string $v): string => htmlspecialchars($v, ENT_QUOTES, 'UTF-8');
    $orderId = $h((string) ($returnRow['order_id'] ?? ''));
    $name = $h((string) ($pickup['name'] ?? '') ?: (string) ($returnRow['customer_name'] ?? ''));
    $addressLine = '';
    if (is_array($pickup) && ($pickup['street'] ?? '') !== '') {
        $addressLine = $h(trim(
            'Str. ' . $pickup['street'] . ($pickup['streetNumber'] !== '' ? ' nr. ' . $pickup['streetNumber'] : '')
            . ($pickup['addressExtra'] !== '' ? ', ' . $pickup['addressExtra'] : '')
            . ', ' . $pickup['city'] . ($pickup['county'] !== '' ? ', jud. ' . $pickup['county'] : '')
        ));
    }
    $content = '<p>Bună, ' . $name . ',</p>'
        . '<p>Am programat ridicarea coletului de retur pentru comanda <strong>#' . $orderId . '</strong> '
        . 'prin <strong>' . $carrierLabel . '</strong>. Transportul este plătit de noi.</p>'
        . '<p>Număr AWB: <strong>' . $h($awb) . '</strong></p>'
        . ($addressLine !== '' ? '<p>Adresa de ridicare: ' . $addressLine . '</p>' : '')
        . '<p>Te rugăm să pregătești coletul (produsele împachetate, cu accesoriile). '
        . 'Curierul te va contacta telefonic înainte de ridicare, de obicei în 1–2 zile lucrătoare. '
        . 'Nu trebuie să plătești nimic curierului.</p>'
        . '<p>După ce primim coletul, rambursăm suma în contul IBAN indicat în cerere.</p>';
    $html = shoptop_email_layout('Ridicare colet retur — comanda #' . $orderId, $content);
    return shoptop_send_mail($email, 'Ridicare colet retur — comanda #' . $orderId, $html);
}
