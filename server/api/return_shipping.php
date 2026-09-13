<?php

declare(strict_types=1);

/**
 * AWB de retur „în oglindă”: curierul ridică coletul de la adresa clientului
 * (din comanda asociată cererii) și îl livrează la magazin. Transportul e
 * plătit de magazin (destinatar). Suportă DPD și Fan Courier.
 */

require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/dpd.php';
require_once __DIR__ . '/fan.php';

/**
 * Adresa magazinului (destinatar) din config.php → return_pickup.
 *
 * @return array{
 *   name:string, contact:string, phone:string, county:string, city:string,
 *   street:string, street_number:string, address_extra:string, postal_code:string,
 *   dpd_site_id:int, dpd_client_id:int
 * }
 */
function shoptop_return_pickup_settings(): array
{
    $cfg = shoptop_config()['return_pickup'] ?? [];
    if (!is_array($cfg)) {
        $cfg = [];
    }
    $s = [
        'name' => trim((string) ($cfg['name'] ?? (shoptop_config()['operator_name'] ?? 'ShopTop'))),
        'contact' => trim((string) ($cfg['contact'] ?? '')),
        'phone' => shoptop_dpd_normalize_phone((string) ($cfg['phone'] ?? (shoptop_config()['return_phone'] ?? ''))),
        'county' => trim((string) ($cfg['county'] ?? '')),
        'city' => trim((string) ($cfg['city'] ?? '')),
        'street' => trim((string) ($cfg['street'] ?? '')),
        'street_number' => trim((string) ($cfg['street_number'] ?? '1')),
        'address_extra' => trim((string) ($cfg['address_extra'] ?? '')),
        'postal_code' => trim((string) ($cfg['postal_code'] ?? '')),
        'dpd_site_id' => (int) ($cfg['dpd_site_id'] ?? 0),
        'dpd_client_id' => (int) ($cfg['dpd_client_id'] ?? 0),
    ];
    if ($s['contact'] === '') {
        $s['contact'] = $s['name'];
    }
    if ($s['city'] === '' || $s['street'] === '' || $s['county'] === '' || $s['phone'] === '') {
        throw new RuntimeException(
            'Adresa magazinului pentru retururi nu este configurată. Completează în config.php '
            . 'blocul return_pickup (county, city, street, street_number, postal_code, phone).'
        );
    }
    return $s;
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

/** Rândul comenzii (toate coloanele) + produsele, pentru adresa clientului. */
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

/**
 * Expeditorul (clientul) din comandă, validat pentru curier.
 *
 * @return array{name:string, phone:string, email:string, address:array<string,string|int>}
 */
function shoptop_return_sender_from_order(array $orderRow, array $returnRow): array
{
    $address = shoptop_dpd_order_address_parts($orderRow);
    if ($address['city'] === '' || $address['street'] === '') {
        throw new RuntimeException(
            'Comanda #' . (string) $orderRow['id'] . ' nu are adresa structurată (localitate/stradă). '
            . 'Deschide comanda, completează adresa la „Client & livrare” și salvează, apoi reîncearcă.'
        );
    }
    $phone = shoptop_dpd_normalize_phone(
        (string) ($returnRow['customer_phone'] ?? '') ?: (string) ($orderRow['customer_phone'] ?? '')
    );
    if ($phone === '') {
        throw new RuntimeException('Telefonul clientului lipsește; curierul nu poate programa ridicarea.');
    }
    $name = trim((string) ($returnRow['customer_name'] ?? '')) ?: trim((string) ($orderRow['customer_name'] ?? ''));
    if (mb_strlen($name) < 3) {
        throw new RuntimeException('Numele clientului este prea scurt pentru AWB.');
    }
    return [
        'name' => mb_substr($name, 0, 60),
        'phone' => $phone,
        'email' => trim((string) ($returnRow['customer_email'] ?? '') ?: (string) ($orderRow['customer_email'] ?? '')),
        'address' => $address,
    ];
}

/** clientId-ul contractului DPD (config sau din API client/contract), 0 dacă nu se poate. */
function shoptop_return_dpd_client_id(): int
{
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }
    $configured = shoptop_return_pickup_settings()['dpd_client_id'];
    if ($configured > 0) {
        return $cached = $configured;
    }
    $cached = 0;
    try {
        $res = shoptop_dpd_request('client/contract', []);
        $list = is_array($res['json'] ?? null) ? $res['json'] : [];
        foreach ($list as $entry) {
            if (is_array($entry) && !empty($entry['clientId'])) {
                $cached = (int) $entry['clientId'];
                break;
            }
        }
    } catch (Throwable $e) {
        $cached = 0;
    }
    return $cached;
}

/**
 * DPD: shipment cu expeditor terț (clientul) și destinatar magazinul; plătește destinatarul.
 *
 * @return array{awb:string, parcelId:string, shipmentId:string}
 */
function shoptop_return_dpd_create(array $orderRow, array $returnRow, PDO $pdo): array
{
    if (!shoptop_dpd_enabled()) {
        throw new RuntimeException('DPD nu este configurat (username/password/service_id).');
    }
    $settings = shoptop_dpd_settings();
    $shop = shoptop_return_pickup_settings();
    $client = shoptop_return_sender_from_order($orderRow, $returnRow);
    $addr = $client['address'];

    // Expeditor = clientul.
    $senderAddress = [
        'countryId' => SHOPTOP_DPD_COUNTRY_RO,
        'streetName' => mb_substr($addr['street'], 0, 50),
        'streetNo' => mb_substr($addr['streetNumber'] !== '' ? $addr['streetNumber'] : '1', 0, 10),
    ];
    $siteId = (int) $addr['dpdSiteId'];
    if ($siteId <= 0) {
        $site = shoptop_dpd_find_site(
            $addr['city'],
            $addr['countyName'] !== '' ? $addr['countyName'] : $addr['county'],
            $addr['postalCode']
        );
        if ($site !== null) {
            $siteId = (int) $site['siteId'];
            if ($addr['postalCode'] === '' && !empty($site['postCode'])) {
                $addr['postalCode'] = (string) $site['postCode'];
            }
        }
    }
    if ($siteId > 0) {
        $senderAddress['siteId'] = $siteId;
    } else {
        $senderAddress['siteName'] = mb_substr($addr['city'], 0, 50);
        if ($addr['postalCode'] === '') {
            throw new RuntimeException(
                'Localitatea clientului „' . $addr['city'] . '” nu are site ID DPD și lipsește codul poștal. '
                . 'Completează codul poștal pe comandă și reîncearcă.'
            );
        }
    }
    if ($addr['postalCode'] !== '') {
        $senderAddress['postCode'] = $addr['postalCode'];
    }
    if ($addr['addressExtra'] !== '') {
        $senderAddress['addressNote'] = mb_substr($addr['addressExtra'], 0, 200);
    }
    $sender = [
        'privatePerson' => true,
        'clientName' => $client['name'],
        'phone1' => ['number' => $client['phone']],
        'address' => $senderAddress,
    ];
    if ($client['email'] !== '') {
        $sender['email'] = mb_substr($client['email'], 0, 255);
    }

    // Destinatar = magazinul (clientId de contract dacă există, altfel adresă).
    $clientId = shoptop_return_dpd_client_id();
    if ($clientId > 0) {
        $recipient = ['clientId' => $clientId];
    } else {
        $shopSiteId = $shop['dpd_site_id'];
        if ($shopSiteId <= 0) {
            $site = shoptop_dpd_find_site($shop['city'], $shop['county'], $shop['postal_code']);
            $shopSiteId = $site !== null ? (int) $site['siteId'] : 0;
        }
        $shopAddress = [
            'countryId' => SHOPTOP_DPD_COUNTRY_RO,
            'streetName' => mb_substr($shop['street'], 0, 50),
            'streetNo' => mb_substr($shop['street_number'], 0, 10),
        ];
        if ($shopSiteId > 0) {
            $shopAddress['siteId'] = $shopSiteId;
        } else {
            $shopAddress['siteName'] = mb_substr($shop['city'], 0, 50);
        }
        if ($shop['postal_code'] !== '') {
            $shopAddress['postCode'] = $shop['postal_code'];
        }
        if ($shop['address_extra'] !== '') {
            $shopAddress['addressNote'] = mb_substr($shop['address_extra'], 0, 200);
        }
        $recipient = [
            'privatePerson' => false,
            'clientName' => mb_substr($shop['name'], 0, 60),
            'contactName' => mb_substr($shop['contact'], 0, 60),
            'phone1' => ['number' => $shop['phone']],
            'address' => $shopAddress,
        ];
    }

    $payload = [
        'sender' => $sender,
        'recipient' => $recipient,
        'service' => [
            'serviceId' => $settings['service_id'],
            'autoAdjustPickupDate' => true,
        ],
        'content' => [
            'parcelsCount' => 1,
            'totalWeight' => $settings['default_weight_kg'],
            'contents' => shoptop_return_contents($returnRow, $pdo),
            'package' => 'BOX',
        ],
        'payment' => [
            'courierServicePayer' => 'RECIPIENT',
        ],
        'ref1' => mb_substr('RETUR-' . (string) $orderRow['id'], 0, 30),
        'shipmentNote' => mb_substr('Retur comanda #' . (string) $orderRow['id'] . ' - ridicare de la client', 0, 200),
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

    return ['awb' => $shipmentId, 'parcelId' => $parcelId, 'shipmentId' => $shipmentId];
}

/**
 * Fan Courier: AWB cu expeditor terț (clientul), destinatar magazinul, plata destinatar.
 *
 * @return array{awb:string, parcelId:string, shipmentId:string}
 */
function shoptop_return_fan_create(array $orderRow, array $returnRow, PDO $pdo): array
{
    if (!shoptop_fan_enabled()) {
        throw new RuntimeException('Fan Courier nu este configurat (username, password, client_id).');
    }
    $s = shoptop_fan_settings();
    $shop = shoptop_return_pickup_settings();
    $client = shoptop_return_sender_from_order($orderRow, $returnRow);
    $addr = $client['address'];
    $county = $addr['countyName'] !== '' ? $addr['countyName'] : $addr['county'];
    if ($county === '') {
        throw new RuntimeException('Județul clientului lipsește pe comandă; completează-l și reîncearcă.');
    }
    $postal = $addr['postalCode'];
    if ($postal === '') {
        $site = shoptop_dpd_find_site($addr['city'], $county, '');
        if ($site !== null && !empty($site['postCode'])) {
            $postal = trim((string) $site['postCode']);
        }
    }
    if ($postal === '') {
        throw new RuntimeException('Codul poștal al clientului lipsește (Fan îl cere). Completează-l pe comandă.');
    }

    $info = [
        'service' => $s['service'],
        'packages' => ['parcel' => 1, 'envelope' => 0],
        'weight' => $s['default_weight_kg'],
        'cod' => 0,
        'declaredValue' => 0,
        'payment' => 'recipient',
        'refund' => null,
        'returnPayment' => null,
        'observation' => 'Retur comanda #' . (string) $orderRow['id'] . ' - ridicare de la client',
        'content' => shoptop_return_contents($returnRow, $pdo),
        'dimensions' => ['length' => 10, 'width' => 10, 'height' => 5],
        'options' => $s['epod'] ? ['X'] : [],
    ];
    $sender = [
        'name' => $client['name'],
        'contactPerson' => mb_substr($client['name'], 0, 50),
        'phone' => $client['phone'],
        'email' => $client['email'] !== '' ? $client['email'] : null,
        'address' => [
            'county' => mb_substr($county, 0, 50),
            'locality' => mb_substr($addr['city'], 0, 50),
            'street' => mb_substr($addr['street'], 0, 255),
            'streetNo' => mb_substr($addr['streetNumber'] !== '' ? $addr['streetNumber'] : '1', 0, 10),
            'zipCode' => mb_substr($postal, 0, 6),
            'building' => mb_substr($addr['addressExtra'], 0, 20),
            'pickupLocation' => '',
        ],
    ];
    $recipient = [
        'name' => mb_substr($shop['name'], 0, 60),
        'contactPerson' => mb_substr($shop['contact'], 0, 50),
        'phone' => $shop['phone'],
        'email' => null,
        'address' => [
            'county' => mb_substr($shop['county'], 0, 50),
            'locality' => mb_substr($shop['city'], 0, 50),
            'street' => mb_substr($shop['street'], 0, 255),
            'streetNo' => mb_substr($shop['street_number'], 0, 10),
            'zipCode' => mb_substr($shop['postal_code'], 0, 6),
            'building' => mb_substr($shop['address_extra'], 0, 20),
            'pickupLocation' => '',
        ],
    ];
    $payload = [
        'clientId' => $s['client_id'],
        'shipments' => [[
            'info' => $info,
            'sender' => $sender,
            'recipient' => $recipient,
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
    return ['awb' => $awb, 'parcelId' => $awb, 'shipmentId' => $awb];
}

/**
 * Emite AWB de retur pentru cererea dată și îl salvează pe cerere.
 *
 * @return array{awb:string, carrier:string, parcelId:string, issuedAt:string}
 */
function shoptop_return_issue_awb(PDO $pdo, array $returnRow, string $carrier): array
{
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
    $order = shoptop_return_load_order($pdo, (string) $returnRow['order_id']);
    if ($order === null) {
        throw new RuntimeException('Comanda #' . (string) $returnRow['order_id'] . ' nu există; nu pot prelua adresa clientului.');
    }

    $created = $carrier === 'dpd'
        ? shoptop_return_dpd_create($order, $returnRow, $pdo)
        : shoptop_return_fan_create($order, $returnRow, $pdo);

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

    return [
        'awb' => $created['awb'],
        'carrier' => $carrier,
        'parcelId' => $created['parcelId'],
        'issuedAt' => date('Y-m-d H:i:s'),
    ];
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
function shoptop_return_notify_pickup(array $returnRow, string $carrier, string $awb): bool
{
    $email = trim((string) ($returnRow['customer_email'] ?? ''));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return false;
    }
    require_once __DIR__ . '/mailer.php';
    $carrierLabel = $carrier === 'dpd' ? 'DPD' : 'Fan Courier';
    $orderId = htmlspecialchars((string) ($returnRow['order_id'] ?? ''), ENT_QUOTES, 'UTF-8');
    $name = htmlspecialchars((string) ($returnRow['customer_name'] ?? ''), ENT_QUOTES, 'UTF-8');
    $awbH = htmlspecialchars($awb, ENT_QUOTES, 'UTF-8');
    $content = '<p>Bună, ' . $name . ',</p>'
        . '<p>Am programat ridicarea coletului de retur pentru comanda <strong>#' . $orderId . '</strong> '
        . 'prin <strong>' . $carrierLabel . '</strong>. Transportul este plătit de noi.</p>'
        . '<p>Număr AWB: <strong>' . $awbH . '</strong></p>'
        . '<p>Te rugăm să pregătești coletul (produsele împachetate, cu accesoriile) la adresa din comandă. '
        . 'Curierul te va contacta telefonic înainte de ridicare, de obicei în 1–2 zile lucrătoare. '
        . 'Nu trebuie să plătești nimic curierului.</p>'
        . '<p>După ce primim coletul, rambursăm suma în contul IBAN indicat în cerere.</p>';
    $html = shoptop_email_layout('Ridicare colet retur — comanda #' . $orderId, $content);
    return shoptop_send_mail($email, 'Ridicare colet retur — comanda #' . $orderId, $html);
}
