<?php

declare(strict_types=1);

/**
 * Expedieri curier (o linie per AWB) cu câmpurile derivate din tracking:
 * ridicat / livrat / zile lucrătoare / la timp / vina clientului / cost.
 * Etapa 1 din motorul de rutare (spec-alocare-curieri-portabil.md).
 *
 * GET  ?list=1[&carrier=&status=&days=]   -> listă + rezumat per curier + starea sincronizării (admin)
 * POST {action:'sync', force?:bool}        -> sincronizează tracking (throttle 30 min dacă nu e force)
 * POST {action:'backfill'}                 -> importă AWB-urile din comenzi/retururi, apoi sync
 * GET  ?cron=1&secret=...                  -> sync din cron cPanel (fără sesiune)
 */

require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/dpd.php';
require_once __DIR__ . '/fan.php';

// Toate momentele (scanări curier, cutoff 15:00, zile lucrătoare) sunt în ora României.
date_default_timezone_set('Europe/Bucharest');

/* ---------------------------------------------------------------------------
 * Utilitare
 * ------------------------------------------------------------------------- */

function shoptop_cs_table_exists(PDO $pdo, string $table): bool
{
    static $cache = [];
    if (array_key_exists($table, $cache)) {
        return $cache[$table];
    }
    $stmt = $pdo->prepare(
        'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t LIMIT 1'
    );
    $stmt->execute(['t' => $table]);
    $cache[$table] = (bool) $stmt->fetchColumn();
    return $cache[$table];
}

function shoptop_cs_column_exists(PDO $pdo, string $table, string $column): bool
{
    static $cache = [];
    $k = $table . '.' . $column;
    if (array_key_exists($k, $cache)) {
        return $cache[$k];
    }
    $stmt = $pdo->prepare(
        'SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND COLUMN_NAME = :c LIMIT 1'
    );
    $stmt->execute(['t' => $table, 'c' => $column]);
    $cache[$k] = (bool) $stmt->fetchColumn();
    return $cache[$k];
}

function shoptop_cs_available(PDO $pdo): bool
{
    return shoptop_cs_table_exists($pdo, 'courier_shipments')
        && shoptop_cs_table_exists($pdo, 'routing_settings')
        && shoptop_cs_table_exists($pdo, 'courier_settings');
}

/** Setările de rutare (cu valori implicite din spec). */
function shoptop_routing_settings(PDO $pdo): array
{
    $defaults = [
        'pondere_timp' => 20, 'pondere_retur' => 90, 'pondere_la_timp' => 90, 'pondere_cost' => 50,
        'zile_istoric' => 20, 'min_awb_localitate' => 5, 'min_awb_judet' => 5,
        'prag_preferat' => 90, 'deviatie_pret' => 13, 'deviatie_pret_fix' => 0,
        'sambata_optional' => 1, 'deschidere_optional' => 1, 'retur_mod' => 'innoship', 'ora_cutoff' => 15,
        'sync_interval_min' => 30, 'sync_batch' => 60, 'last_sync_at' => '',
    ];
    if (!shoptop_cs_table_exists($pdo, 'routing_settings')) {
        return $defaults;
    }
    foreach ($pdo->query('SELECT setting_key, setting_value FROM routing_settings')->fetchAll() as $row) {
        $defaults[(string) $row['setting_key']] = $row['setting_value'];
    }
    return $defaults;
}

function shoptop_routing_setting_set(PDO $pdo, string $key, string $value): void
{
    $pdo->prepare(
        'INSERT INTO routing_settings (setting_key, setting_value) VALUES (:k, :v)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)'
    )->execute(['k' => $key, 'v' => $value]);
}

/** @return array<string, array<string,mixed>> curier => setări */
function shoptop_courier_settings(PDO $pdo): array
{
    $out = [];
    if (!shoptop_cs_table_exists($pdo, 'courier_settings')) {
        return $out;
    }
    foreach ($pdo->query('SELECT * FROM courier_settings ORDER BY priority ASC')->fetchAll() as $row) {
        $row['services'] = is_string($row['services'] ?? null) ? (json_decode($row['services'], true) ?: []) : [];
        $out[(string) $row['carrier']] = $row;
    }
    return $out;
}

function shoptop_cs_parse_datetime(?string $raw): ?DateTimeImmutable
{
    $raw = trim((string) $raw);
    if ($raw === '') {
        return null;
    }
    // Fan: „dd.mm.yyyy HH:ii” sau „yyyy-mm-dd HH:ii:ss”; DPD: ISO 8601.
    $formats = ['Y-m-d\TH:i:sP', 'Y-m-d\TH:i:s.uP', 'Y-m-d\TH:i:s', 'Y-m-d H:i:s', 'Y-m-d H:i', 'd.m.Y H:i:s', 'd.m.Y H:i', 'd.m.Y', 'Y-m-d'];
    foreach ($formats as $f) {
        $d = DateTimeImmutable::createFromFormat($f, $raw);
        if ($d instanceof DateTimeImmutable) {
            return $d;
        }
    }
    $ts = strtotime($raw);
    return $ts === false ? null : (new DateTimeImmutable())->setTimestamp($ts);
}

/**
 * Zile lucrătoare (luni-vineri) între data lui $a (exclusiv) și data lui $b (inclusiv).
 * Formula din spec (tabelul de corecție 7x7, weekday 0 = luni).
 */
function shoptop_working_days(DateTimeInterface $a, DateTimeInterface $b): int
{
    $da = new DateTimeImmutable($a->format('Y-m-d'));
    $db = new DateTimeImmutable($b->format('Y-m-d'));
    if ($db < $da) {
        return 0;
    }
    $diff = (int) $da->diff($db)->days;
    $weekday = ((int) $da->format('N')) - 1; // 0 = luni
    static $corr = [
        [0, 1, 2, 3, 4, 4, 4],
        [0, 1, 2, 3, 3, 3, 4],
        [0, 1, 2, 2, 2, 3, 4],
        [0, 1, 1, 1, 2, 3, 4],
        [0, 0, 0, 1, 2, 3, 4],
        [0, 0, 1, 2, 3, 4, 5],
        [0, 1, 2, 3, 4, 5, 5],
    ];
    return 5 * intdiv($diff, 7) + $corr[$weekday][$diff % 7];
}

/** Predare fără scanare: după ora de cutoff → următoarea zi lucrătoare (ora 9). */
function shoptop_cs_estimated_pickup(DateTimeImmutable $awbAt, int $cutoffHour): DateTimeImmutable
{
    $d = $awbAt;
    if ((int) $d->format('G') >= $cutoffHour) {
        $d = $d->modify('+1 day')->setTime(9, 0);
    }
    while ((int) $d->format('N') >= 6) {
        $d = $d->modify('+1 day')->setTime(9, 0);
    }
    return $d;
}

/* ---------------------------------------------------------------------------
 * Clasificarea evenimentelor (adaptoare DPD / Fan)
 * type: pickup transit out delivered failed refused return returned_sender cancel info
 * customer: true dacă întârzierea e din vina clientului (Innoship: Bad Address,
 * Not Home, Closed, Redirected, Refused, Scheduled, Customer pick-up)
 * ------------------------------------------------------------------------- */

const SHOPTOP_CS_CUSTOMER_RE = '/absent|lips[aă]|indisponibil|nu r[aă]spunde|nu a fost g[aă]sit|adres[aă]|refuz|am[aâ]nat|reprogram|la cerere|solicitarea (destinatarului|clientului)|ridicare personal|inchis|închis|contact/iu';

/** @return array{type:string, customer:bool} */
function shoptop_cs_classify_dpd(int $code, string $desc): array
{
    $d = mb_strtolower($desc, 'UTF-8');
    $cust = preg_match(SHOPTOP_CS_CUSTOMER_RE, $d) === 1;
    switch ($code) {
        case 39:
            return ['type' => 'pickup', 'customer' => false];
        case 1: case 2: case 11: case 21:
            return ['type' => 'transit', 'customer' => false];
        case 148: // date înregistrate de expeditor (înainte de ridicare)
        case 181: // întârziere neașteptată / forță majoră (informativ, nu vina clientului)
            return ['type' => 'info', 'customer' => false];
        case 12: case 175:
            return ['type' => 'out', 'customer' => false];
        case -14:
            return ['type' => 'delivered', 'customer' => false];
        case 44:
            return ['type' => 'failed', 'customer' => $cust];
        case 69:
            return ['type' => 'failed', 'customer' => true];
        case 123:
            return ['type' => 'refused', 'customer' => true];
        case 134:
            return ['type' => 'info', 'customer' => true];
        case 38: case 111:
            return ['type' => 'return', 'customer' => false];
        case 124:
            return ['type' => 'returned_sender', 'customer' => false];
        case 128:
            return ['type' => 'cancel', 'customer' => false];
    }
    return shoptop_cs_classify_text($d);
}

/** @return array{type:string, customer:bool} */
function shoptop_cs_classify_text(string $lower): array
{
    $d = $lower;
    $cust = preg_match(SHOPTOP_CS_CUSTOMER_RE, $d) === 1;
    if (str_contains($d, 'returnat la expeditor') || str_contains($d, 'returnat expeditorului') || str_contains($d, 'livrat la expeditor')) {
        return ['type' => 'returned_sender', 'customer' => false];
    }
    if (str_contains($d, 'anulat')) {
        return ['type' => 'cancel', 'customer' => false];
    }
    if (str_contains($d, 'refuz')) {
        return ['type' => 'refused', 'customer' => true];
    }
    if (str_contains($d, 'retur')) {
        return ['type' => 'return', 'customer' => false];
    }
    if (preg_match('/\blivrat[aăe]?\b/u', $d) === 1 && !str_contains($d, 'nelivrat') && !str_contains($d, 'in curs') && !str_contains($d, 'în curs')) {
        return ['type' => 'delivered', 'customer' => false];
    }
    if (str_contains($d, 'curs de livrare') || str_contains($d, 'din curier') || str_contains($d, 'in livrare') || str_contains($d, 'în livrare')) {
        return ['type' => 'out', 'customer' => false];
    }
    if (str_contains($d, 'ridicat') || str_contains($d, 'preluat') || str_contains($d, 'colectat')) {
        return ['type' => 'pickup', 'customer' => false];
    }
    if (str_contains($d, 'nereu') || str_contains($d, 'nelivrat') || str_contains($d, 'incercare') || str_contains($d, 'încercare') || $cust) {
        return ['type' => 'failed', 'customer' => $cust];
    }
    if (str_contains($d, 'tranzit') || str_contains($d, 'sortat') || str_contains($d, 'depozit') || str_contains($d, 'expedi') || str_contains($d, 'incarcat') || str_contains($d, 'încărcat') || str_contains($d, 'scanare') || str_contains($d, 'procesat')) {
        return ['type' => 'transit', 'customer' => false];
    }
    return ['type' => 'info', 'customer' => false];
}

/**
 * Aplică evenimentele pe expediere: statusuri, momente, câmpuri derivate.
 *
 * @param array<string,mixed> $row rândul curent din courier_shipments
 * @param list<array{code?:int,description:string,dateTime:string,place?:?string}> $events
 * @param array<string,mixed> $flags răspunsul normalizat al adaptorului (delivered, returned, ...)
 * @return array<string,mixed> câmpuri de actualizat
 */
function shoptop_cs_apply_events(array $row, array $events, array $flags, array $settings, array $courierSettings): array
{
    $carrier = (string) $row['carrier'];
    $norm = [];
    foreach ($events as $ev) {
        $at = shoptop_cs_parse_datetime((string) ($ev['dateTime'] ?? ''));
        $desc = trim((string) ($ev['description'] ?? ''));
        $cls = $carrier === 'dpd'
            ? shoptop_cs_classify_dpd((int) ($ev['code'] ?? 0), $desc)
            : shoptop_cs_classify_text(mb_strtolower($desc, 'UTF-8'));
        $norm[] = [
            'at' => $at?->format('Y-m-d H:i:s'),
            'ts' => $at?->getTimestamp() ?? 0,
            'code' => (int) ($ev['code'] ?? 0),
            'description' => $desc,
            'place' => $ev['place'] ?? null,
            'type' => $cls['type'],
            'customer' => $cls['customer'],
        ];
    }
    usort($norm, static fn ($a, $b) => $a['ts'] <=> $b['ts']);

    $first = static function (string $type) use ($norm): ?array {
        foreach ($norm as $e) {
            if ($e['type'] === $type && $e['ts'] > 0) {
                return $e;
            }
        }
        return null;
    };

    $pickup = $first('pickup');
    $pickupEstimated = 0;
    if ($pickup === null) {
        $pickup = $first('transit') ?? $first('out');
        if ($pickup !== null) {
            $pickupEstimated = 1;
        }
    }
    $delivered = $first('delivered');
    $customerDelay = 0;
    foreach ($norm as $e) {
        if ($e['customer']) {
            $customerDelay = 1;
            break;
        }
    }

    // Status intern: din flag-urile adaptorului (au deja logica „ultimul câștigă”).
    $status = (string) $row['status'];
    $last = $norm !== [] ? $norm[count($norm) - 1] : null;
    if (!empty($flags['returnedToSender'])) {
        $status = 'retur';
    } elseif (!empty($flags['returned'])) {
        $status = ($last !== null && $last['type'] === 'refused') ? 'refuzat' : 'retur';
    } elseif (!empty($flags['delivered'])) {
        $status = 'livrat';
    } elseif ($last !== null && $last['type'] === 'cancel') {
        $status = 'anulat';
    } elseif (!empty($flags['outForDelivery'])) {
        $status = 'in_livrare';
    } elseif (!empty($flags['inTransit'])) {
        $status = $pickup !== null && $first('transit') === null && $first('out') === null ? 'ridicat' : 'in_tranzit';
    } elseif ($pickup !== null) {
        $status = 'ridicat';
    } elseif ($status === '' || $status === 'awb_emis') {
        $status = 'awb_emis';
    }

    $awbAt = shoptop_cs_parse_datetime((string) ($row['awb_at'] ?? ''));
    $pickedAt = $pickup !== null ? (new DateTimeImmutable())->setTimestamp((int) $pickup['ts']) : null;
    // Fără scanare de ridicare dar coletul e pe drum/livrat: estimăm din emiterea AWB + cutoff.
    if ($pickedAt === null && $awbAt !== null && in_array($status, ['in_tranzit', 'in_livrare', 'livrat', 'refuzat', 'retur'], true)) {
        $pickedAt = shoptop_cs_estimated_pickup($awbAt, (int) ($settings['ora_cutoff'] ?? 15));
        $pickupEstimated = 1;
    }
    $deliveredAt = $delivered !== null ? (new DateTimeImmutable())->setTimestamp((int) $delivered['ts']) : null;
    if ($deliveredAt === null && $status === 'livrat' && $last !== null && $last['ts'] > 0) {
        $deliveredAt = (new DateTimeImmutable())->setTimestamp((int) $last['ts']);
    }

    $finalizedAt = null;
    if (in_array($status, ['livrat', 'refuzat', 'retur'], true)) {
        $finalizedAt = $deliveredAt ?? ($last !== null && $last['ts'] > 0 ? (new DateTimeImmutable())->setTimestamp((int) $last['ts']) : new DateTimeImmutable());
    }

    $promised = $row['promised_days'] !== null ? (int) $row['promised_days'] : null;
    if ($promised === null) {
        $promised = (int) ($courierSettings[$carrier]['sla_days'] ?? 1);
    }

    $transitDays = null;
    $workingDays = null;
    $onTime = null;
    if ($pickedAt !== null && $deliveredAt !== null) {
        $hours = ($deliveredAt->getTimestamp() - $pickedAt->getTimestamp()) / 3600;
        $transitDays = round(max(0, $hours) / 24, 2);
        $workingDays = shoptop_working_days($pickedAt, $deliveredAt);
        $onTime = $workingDays <= $promised ? 1 : 0;
    }
    $pickedOnTime = null;
    if ($pickedAt !== null && $awbAt !== null && $pickupEstimated === 0) {
        $pickedOnTime = ($pickedAt->getTimestamp() - $awbAt->getTimestamp()) <= 36 * 3600 ? 1 : 0;
    }

    return [
        'status' => $status,
        'picked_up_at' => $pickedAt?->format('Y-m-d H:i:s'),
        'pickup_estimated' => $pickupEstimated,
        'delivered_at' => $deliveredAt?->format('Y-m-d H:i:s'),
        'finalized_at' => $finalizedAt?->format('Y-m-d H:i:s'),
        'promised_days' => $promised,
        'transit_days' => $transitDays,
        'working_days' => $workingDays,
        'on_time' => $onTime,
        'picked_on_time' => $pickedOnTime,
        'customer_delay' => $customerDelay,
        'last_event' => $last !== null ? mb_substr((string) $last['description'], 0, 255) : ($row['last_event'] ?? null),
        'last_event_at' => $last !== null && $last['at'] !== null ? $last['at'] : ($row['last_event_at'] ?? null),
        'tracking' => json_encode(array_map(static fn ($e) => [
            'at' => $e['at'], 'code' => $e['code'], 'description' => $e['description'],
            'place' => $e['place'], 'type' => $e['type'], 'customer' => $e['customer'],
        ], $norm), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ];
}

/* ---------------------------------------------------------------------------
 * Import din comenzi / retururi
 * ------------------------------------------------------------------------- */

/** Status intern inițial din statusul comenzii (până vine tracking-ul). */
function shoptop_cs_status_from_order(string $orderStatus, bool $returnReceived): string
{
    return match ($orderStatus) {
        'shipped' => 'in_tranzit',
        'delivered' => 'livrat',
        'returned' => $returnReceived ? 'retur' : 'refuzat',
        'cancelled' => 'anulat',
        default => 'awb_emis',
    };
}

/** @return array{inserted:int} */
function shoptop_cs_backfill(PDO $pdo): array
{
    $hasCarrier = shoptop_cs_column_exists($pdo, 'orders', 'delivery_carrier');
    $hasCost = shoptop_cs_column_exists($pdo, 'orders', 'courier_cost_total');
    $hasReturn = shoptop_cs_column_exists($pdo, 'orders', 'return_received');
    $hasShip = shoptop_cs_column_exists($pdo, 'orders', 'ship_city');
    $hasParcel = shoptop_cs_column_exists($pdo, 'orders', 'dpd_parcel_id');
    $hasPay = shoptop_cs_column_exists($pdo, 'orders', 'payment_method');

    $cols = 'o.id, o.awb_number, o.awb_issued_at, o.created_at, o.status, o.total_amount, o.customer_address'
        . ($hasCarrier ? ', o.delivery_carrier' : '')
        . ($hasCost ? ', o.courier_cost_total, o.courier_cost_source' : '')
        . ($hasReturn ? ', o.return_received' : '')
        . ($hasShip ? ', o.ship_county_name, o.ship_county, o.ship_city' : '')
        . ($hasParcel ? ', o.dpd_parcel_id' : '')
        . ($hasPay ? ', o.payment_method, o.payment_status' : '');
    $rows = $pdo->query(
        'SELECT ' . $cols . ' FROM orders o
         LEFT JOIN courier_shipments s ON s.awb = o.awb_number
         WHERE o.awb_number IS NOT NULL AND o.awb_number <> \'\' AND s.id IS NULL
         ORDER BY o.awb_issued_at ASC'
    )->fetchAll();

    $dpdW = shoptop_dpd_settings()['default_weight_kg'];
    $fanW = shoptop_fan_settings()['default_weight_kg'];
    $ins = $pdo->prepare(
        'INSERT IGNORE INTO courier_shipments
            (kind, order_id, carrier, awb, parcel_id, status, county, city, parcels, weight_kg, cod_amount,
             created_at, awb_at, cost, cost_source)
         VALUES
            (\'delivery\', :order_id, :carrier, :awb, :parcel_id, :status, :county, :city, 1, :weight, :cod,
             :created_at, :awb_at, :cost, :cost_source)'
    );
    $inserted = 0;
    foreach ($rows as $o) {
        $carrier = $hasCarrier && !empty($o['delivery_carrier']) ? (string) $o['delivery_carrier'] : 'dpd';
        if ($carrier !== 'dpd' && $carrier !== 'fan-courier') {
            $carrier = str_contains($carrier, 'fan') ? 'fan-courier' : 'dpd';
        }
        $isCod = !$hasPay || (($o['payment_method'] ?? 'cod') === 'cod');
        $county = $hasShip ? trim((string) ($o['ship_county_name'] ?? '') ?: (string) ($o['ship_county'] ?? '')) : '';
        $city = $hasShip ? trim((string) ($o['ship_city'] ?? '')) : '';
        if ($city === '') {
            // Adresa liberă: linia a doua „Oraș, jud. X”.
            $lines = preg_split('/\r\n|\r|\n/', (string) ($o['customer_address'] ?? '')) ?: [];
            if (isset($lines[1]) && preg_match('/^(.+?),\s*jud\.\s*(.+)$/iu', trim($lines[1]), $m)) {
                $city = trim($m[1]);
                if ($county === '') {
                    $county = trim($m[2]);
                }
            }
        }
        $cost = $hasCost && $o['courier_cost_total'] !== null ? (float) $o['courier_cost_total'] : null;
        $costSource = $cost !== null ? (string) ($o['courier_cost_source'] ?? 'api') : null;
        $ins->execute([
            'order_id' => (string) $o['id'],
            'carrier' => $carrier,
            'awb' => (string) $o['awb_number'],
            'parcel_id' => $hasParcel && !empty($o['dpd_parcel_id']) ? (string) $o['dpd_parcel_id'] : null,
            'status' => shoptop_cs_status_from_order((string) $o['status'], $hasReturn && !empty($o['return_received'])),
            'county' => $county !== '' ? $county : null,
            'city' => $city !== '' ? $city : null,
            'weight' => $carrier === 'dpd' ? $dpdW : $fanW,
            'cod' => $isCod && (($o['payment_status'] ?? 'pending') !== 'paid') ? (float) $o['total_amount'] : 0,
            'created_at' => $o['created_at'],
            'awb_at' => $o['awb_issued_at'] ?? $o['created_at'],
            'cost' => $cost,
            'cost_source' => $costSource,
        ]);
        $inserted += $ins->rowCount();
    }

    // AWB-uri de retur (ridicare de la client) — kind = return, nu intră în indicatori.
    if (shoptop_cs_table_exists($pdo, 'return_requests') && shoptop_cs_column_exists($pdo, 'return_requests', 'return_awb_number')) {
        $rets = $pdo->query(
            'SELECT r.id, r.order_id, r.return_awb_number, r.return_awb_carrier, r.return_awb_parcel_id, r.return_awb_issued_at, r.created_at
             FROM return_requests r
             LEFT JOIN courier_shipments s ON s.awb = r.return_awb_number
             WHERE r.return_awb_number IS NOT NULL AND r.return_awb_number <> \'\' AND s.id IS NULL'
        )->fetchAll();
        $insR = $pdo->prepare(
            'INSERT IGNORE INTO courier_shipments
                (kind, order_id, return_request_id, carrier, awb, parcel_id, status, parcels, weight_kg, cod_amount, created_at, awb_at)
             VALUES (\'return\', :order_id, :rid, :carrier, :awb, :parcel_id, \'awb_emis\', 1, :weight, 0, :created_at, :awb_at)'
        );
        foreach ($rets as $r) {
            $carrier = (string) ($r['return_awb_carrier'] ?? 'dpd') === 'dpd' ? 'dpd' : 'fan-courier';
            $insR->execute([
                'order_id' => (string) $r['order_id'],
                'rid' => (int) $r['id'],
                'carrier' => $carrier,
                'awb' => (string) $r['return_awb_number'],
                'parcel_id' => $r['return_awb_parcel_id'] ?? null,
                'weight' => $carrier === 'dpd' ? $dpdW : $fanW,
                'created_at' => $r['created_at'],
                'awb_at' => $r['return_awb_issued_at'] ?? $r['created_at'],
            ]);
            $inserted += $insR->rowCount();
        }
    }

    return ['inserted' => $inserted];
}

/** Costul estimat din contract când nu avem preț real (Fan / DPD). */
function shoptop_cs_estimate_cost(PDO $pdo, array $ship): ?array
{
    $weight = (float) $ship['weight_kg'];
    $parcels = max(1, (int) $ship['parcels']);
    $cod = (float) $ship['cod_amount'];
    if ((string) $ship['carrier'] === 'fan-courier') {
        return shoptop_fan_estimate_from_contract($weight, $parcels, $cod, false);
    }
    $orderStmt = $pdo->prepare('SELECT * FROM orders WHERE id = :id LIMIT 1');
    $orderStmt->execute(['id' => (string) $ship['order_id']]);
    $order = $orderStmt->fetch();
    if (!$order) {
        return null;
    }
    $itemsStmt = $pdo->prepare('SELECT product_id, product_sku, product_name, quantity FROM order_items WHERE order_id = :id');
    $itemsStmt->execute(['id' => (string) $ship['order_id']]);
    $est = shoptop_dpd_estimate_from_contract($order, $itemsStmt->fetchAll());
    $est['source'] = 'contract';
    return $est;
}

/* ---------------------------------------------------------------------------
 * Sincronizare tracking
 * ------------------------------------------------------------------------- */

/**
 * @return array{skipped:bool, synced:int, errors:int, pending:int, lastSyncAt:?string, reason?:string}
 */
function shoptop_cs_sync(PDO $pdo, bool $force = false): array
{
    $settings = shoptop_routing_settings($pdo);
    $interval = max(5, (int) ($settings['sync_interval_min'] ?? 30));
    $last = shoptop_cs_parse_datetime((string) ($settings['last_sync_at'] ?? ''));
    if (!$force && $last !== null && (time() - $last->getTimestamp()) < $interval * 60) {
        $pending = (int) $pdo->query(
            "SELECT COUNT(*) FROM courier_shipments WHERE last_sync_at IS NULL OR status NOT IN ('livrat','retur','anulat')"
        )->fetchColumn();
        return ['skipped' => true, 'synced' => 0, 'errors' => 0, 'pending' => $pending, 'lastSyncAt' => $last->format('Y-m-d H:i:s'), 'reason' => 'recent'];
    }

    $batch = max(10, min(200, (int) ($settings['sync_batch'] ?? 60)));
    // Prioritate: niciodată sincronizate, apoi cele active; refuzatele mai stau 21 zile (pot deveni retur).
    $rows = $pdo->query(
        "SELECT * FROM courier_shipments
         WHERE last_sync_at IS NULL
            OR status IN ('awb_emis','ridicat','in_tranzit','in_livrare')
            OR (status = 'refuzat' AND (finalized_at IS NULL OR finalized_at > DATE_SUB(NOW(), INTERVAL 21 DAY)))
         ORDER BY (last_sync_at IS NULL) DESC, last_sync_at ASC
         LIMIT " . $batch
    )->fetchAll();

    $courierSettings = shoptop_courier_settings($pdo);
    $byCarrier = ['dpd' => [], 'fan-courier' => []];
    foreach ($rows as $r) {
        $byCarrier[(string) $r['carrier']][] = $r;
    }

    $upd = $pdo->prepare(
        'UPDATE courier_shipments SET
            status = :status, picked_up_at = :picked_up_at, pickup_estimated = :pickup_estimated,
            delivered_at = :delivered_at, finalized_at = :finalized_at, promised_days = :promised_days,
            transit_days = :transit_days, working_days = :working_days, on_time = :on_time,
            picked_on_time = :picked_on_time, customer_delay = :customer_delay,
            last_event = :last_event, last_event_at = :last_event_at, tracking = :tracking,
            cost = COALESCE(cost, :cost), cost_source = COALESCE(cost_source, :cost_source),
            last_sync_at = NOW(), sync_error = NULL
         WHERE id = :id'
    );
    $updErr = $pdo->prepare('UPDATE courier_shipments SET last_sync_at = NOW(), sync_error = :err WHERE id = :id');

    $synced = 0;
    $errors = 0;
    foreach ($byCarrier as $carrier => $list) {
        if ($list === []) {
            continue;
        }
        $enabled = $carrier === 'dpd' ? shoptop_dpd_enabled() : shoptop_fan_enabled();
        if (!$enabled) {
            foreach ($list as $r) {
                $updErr->execute(['err' => 'Curierul nu este configurat', 'id' => (int) $r['id']]);
                $errors++;
            }
            continue;
        }
        $ids = [];
        $byId = [];
        foreach ($list as $r) {
            $id = $carrier === 'dpd' ? (trim((string) ($r['parcel_id'] ?? '')) ?: (string) $r['awb']) : (string) $r['awb'];
            $ids[] = $id;
            $byId[$id] = $r;
        }
        try {
            $tracked = $carrier === 'dpd' ? shoptop_dpd_track_parcels($ids) : shoptop_fan_track_awbs($ids);
        } catch (Throwable $e) {
            foreach ($list as $r) {
                $updErr->execute(['err' => mb_substr($e->getMessage(), 0, 255), 'id' => (int) $r['id']]);
                $errors++;
            }
            continue;
        }
        foreach ($byId as $id => $r) {
            $t = $tracked[$id] ?? null;
            if (!is_array($t) || isset($t['error'])) {
                $updErr->execute(['err' => mb_substr((string) ($t['error'] ?? 'Fără răspuns de tracking'), 0, 255), 'id' => (int) $r['id']]);
                $errors++;
                continue;
            }
            $events = is_array($t['events'] ?? null) ? $t['events'] : [];
            $fields = shoptop_cs_apply_events($r, $events, $t, $settings, $courierSettings);
            $est = $r['cost'] === null ? shoptop_cs_estimate_cost($pdo, $r) : null;
            $upd->execute($fields + [
                'cost' => $est !== null ? $est['total'] : null,
                'cost_source' => $est !== null ? 'estimate' : null,
                'id' => (int) $r['id'],
            ]);
            $synced++;
        }
    }

    shoptop_routing_setting_set($pdo, 'last_sync_at', date('Y-m-d H:i:s'));
    $pending = (int) $pdo->query(
        "SELECT COUNT(*) FROM courier_shipments WHERE last_sync_at IS NULL OR status NOT IN ('livrat','retur','anulat')"
    )->fetchColumn();
    return ['skipped' => false, 'synced' => $synced, 'errors' => $errors, 'pending' => $pending, 'lastSyncAt' => date('Y-m-d H:i:s')];
}

/* ---------------------------------------------------------------------------
 * Listă + rezumat
 * ------------------------------------------------------------------------- */

function shoptop_cs_row_to_response(array $r): array
{
    return [
        'id' => (int) $r['id'],
        'kind' => (string) $r['kind'],
        'orderId' => (string) $r['order_id'],
        'carrier' => (string) $r['carrier'],
        'awb' => (string) $r['awb'],
        'status' => (string) $r['status'],
        'county' => (string) ($r['county'] ?? ''),
        'city' => (string) ($r['city'] ?? ''),
        'weightKg' => (float) $r['weight_kg'],
        'codAmount' => (float) $r['cod_amount'],
        'createdAt' => (string) ($r['created_at'] ?? ''),
        'awbAt' => (string) ($r['awb_at'] ?? ''),
        'pickedUpAt' => (string) ($r['picked_up_at'] ?? ''),
        'pickupEstimated' => !empty($r['pickup_estimated']),
        'deliveredAt' => (string) ($r['delivered_at'] ?? ''),
        'promisedDays' => $r['promised_days'] !== null ? (int) $r['promised_days'] : null,
        'transitDays' => $r['transit_days'] !== null ? (float) $r['transit_days'] : null,
        'workingDays' => $r['working_days'] !== null ? (int) $r['working_days'] : null,
        'onTime' => $r['on_time'] !== null ? (bool) $r['on_time'] : null,
        'pickedOnTime' => $r['picked_on_time'] !== null ? (bool) $r['picked_on_time'] : null,
        'customerDelay' => !empty($r['customer_delay']),
        'cost' => $r['cost'] !== null ? (float) $r['cost'] : null,
        'costSource' => (string) ($r['cost_source'] ?? ''),
        'lastEvent' => (string) ($r['last_event'] ?? ''),
        'lastEventAt' => (string) ($r['last_event_at'] ?? ''),
        'lastSyncAt' => (string) ($r['last_sync_at'] ?? ''),
        'syncError' => (string) ($r['sync_error'] ?? ''),
        'events' => is_string($r['tracking'] ?? null) ? (json_decode($r['tracking'], true) ?: []) : [],
    ];
}

/**
 * Rezumat per curier pe expedierile de livrare din perioadă (după data AWB), sec. 8 din spec.
 *
 * @return array<string, array<string,mixed>>
 */
function shoptop_cs_summary(PDO $pdo, int $days): array
{
    $where = "kind = 'delivery' AND status <> 'anulat'";
    if ($days > 0) {
        $where .= ' AND awb_at >= DATE_SUB(NOW(), INTERVAL ' . $days . ' DAY)';
    }
    $rows = $pdo->query(
        "SELECT carrier,
                COUNT(*) AS n,
                SUM(status IN ('livrat','retur','refuzat')) AS finalized,
                SUM(status = 'livrat') AS delivered,
                SUM(status = 'livrat' AND on_time = 1) AS otd,
                SUM(status IN ('retur','refuzat') AND customer_delay = 1) AS client_fault,
                SUM(status = 'retur') AS returned,
                SUM(status IN ('retur','refuzat')) AS returned_all,
                SUM(status = 'livrat' AND on_time = 0 AND customer_delay = 1) AS late_client,
                SUM(status = 'livrat' AND on_time = 0 AND customer_delay = 0) AS late_courier,
                AVG(CASE WHEN status = 'livrat' THEN working_days END) AS avg_wd,
                AVG(CASE WHEN status = 'livrat' THEN transit_days END) AS avg_td,
                SUM(picked_on_time = 1) AS picked_ok,
                SUM(picked_on_time IS NOT NULL) AS picked_known,
                SUM(cost) AS cost_sum,
                SUM(cost IS NOT NULL) AS cost_n
         FROM courier_shipments
         WHERE " . $where . '
         GROUP BY carrier'
    )->fetchAll();
    $out = [];
    foreach ($rows as $r) {
        $n = (int) $r['n'];
        $fin = (int) $r['finalized'];
        $out[(string) $r['carrier']] = [
            'n' => $n,
            'finalized' => $fin,
            'inProgress' => $n - $fin,
            'delivered' => (int) $r['delivered'],
            'otdPct' => $fin > 0 ? round((int) $r['otd'] / $fin * 100, 1) : null,
            'lateClientPct' => $fin > 0 ? round(((int) $r['late_client'] + (int) $r['client_fault']) / $fin * 100, 1) : null,
            'lateCourierPct' => $fin > 0 ? round(((int) $r['late_courier'] + ((int) $r['returned_all'] - (int) $r['client_fault'])) / $fin * 100, 1) : null,
            'returnPct' => $n > 0 ? round((int) $r['returned'] / $n * 100, 1) : null,
            'returnAllPct' => $n > 0 ? round((int) $r['returned_all'] / $n * 100, 1) : null,
            'avgWorkingDays' => $r['avg_wd'] !== null ? round((float) $r['avg_wd'], 2) : null,
            'avgTransitDays' => $r['avg_td'] !== null ? round((float) $r['avg_td'], 2) : null,
            'pickedOnTimePct' => (int) $r['picked_known'] > 0 ? round((int) $r['picked_ok'] / (int) $r['picked_known'] * 100, 1) : null,
            'avgCost' => (int) $r['cost_n'] > 0 ? round((float) $r['cost_sum'] / (int) $r['cost_n'], 2) : null,
        ];
    }
    return $out;
}

/* ---------------------------------------------------------------------------
 * Router
 * ------------------------------------------------------------------------- */

// Inclus din alt fișier (motorul de alocare, teste): doar funcțiile, fără router.
$shoptopCsDirect = realpath((string) ($_SERVER['SCRIPT_FILENAME'] ?? '')) === realpath(__FILE__);
if (!$shoptopCsDirect) {
    return;
}

shoptop_send_cors();
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$pdo = shoptop_pdo();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET' && isset($_GET['cron'])) {
    $secret = trim((string) ((shoptop_config()['courier_sync']['secret'] ?? '')));
    $provided = trim((string) ($_GET['secret'] ?? ''));
    if ($secret === '' || !hash_equals($secret, $provided)) {
        shoptop_json_error('Secret invalid sau neconfigurat (config.php -> courier_sync.secret).', 403);
    }
    if (!shoptop_cs_available($pdo)) {
        shoptop_json_error('Ruleaza sql/migrate-courier-shipments(-server).sql.', 409);
    }
    $bf = shoptop_cs_backfill($pdo);
    $res = shoptop_cs_sync($pdo, true);
    shoptop_json_response(['ok' => true, 'backfill' => $bf, 'sync' => $res]);
}

shoptop_require_admin();

if (!shoptop_cs_available($pdo)) {
    shoptop_json_error('Tabelele de rutare lipsesc. Ruleaza sql/migrate-courier-shipments(-server).sql.', 409);
}

if ($method === 'GET') {
    header('Cache-Control: no-store');
    $carrier = trim((string) ($_GET['carrier'] ?? ''));
    $status = trim((string) ($_GET['status'] ?? ''));
    $days = (int) ($_GET['days'] ?? 90);
    $kind = trim((string) ($_GET['kind'] ?? 'delivery'));

    $where = ['1=1'];
    $params = [];
    if ($kind === 'delivery' || $kind === 'return') {
        $where[] = 'kind = :kind';
        $params['kind'] = $kind;
    }
    if ($carrier === 'dpd' || $carrier === 'fan-courier') {
        $where[] = 'carrier = :carrier';
        $params['carrier'] = $carrier;
    }
    if ($status !== '' && $status !== 'all') {
        if ($status === 'active') {
            $where[] = "status IN ('awb_emis','ridicat','in_tranzit','in_livrare')";
        } elseif ($status === 'returned') {
            $where[] = "status IN ('retur','refuzat')";
        } else {
            $where[] = 'status = :status';
            $params['status'] = $status;
        }
    }
    if ($days > 0) {
        $where[] = 'awb_at >= DATE_SUB(NOW(), INTERVAL ' . $days . ' DAY)';
    }
    $stmt = $pdo->prepare(
        'SELECT * FROM courier_shipments WHERE ' . implode(' AND ', $where) . ' ORDER BY awb_at DESC LIMIT 500'
    );
    $stmt->execute($params);
    $shipments = array_map('shoptop_cs_row_to_response', $stmt->fetchAll());

    $settings = shoptop_routing_settings($pdo);
    $pending = (int) $pdo->query(
        "SELECT COUNT(*) FROM courier_shipments WHERE last_sync_at IS NULL OR status NOT IN ('livrat','retur','anulat')"
    )->fetchColumn();
    $total = (int) $pdo->query('SELECT COUNT(*) FROM courier_shipments')->fetchColumn();
    $missing = (int) $pdo->query(
        "SELECT COUNT(*) FROM orders o LEFT JOIN courier_shipments s ON s.awb = o.awb_number
         WHERE o.awb_number IS NOT NULL AND o.awb_number <> '' AND s.id IS NULL"
    )->fetchColumn();

    shoptop_json_response([
        'shipments' => $shipments,
        'summary' => shoptop_cs_summary($pdo, $days),
        'couriers' => array_values(shoptop_courier_settings($pdo)),
        'sync' => [
            'lastSyncAt' => (string) ($settings['last_sync_at'] ?? ''),
            'intervalMin' => (int) ($settings['sync_interval_min'] ?? 30),
            'pending' => $pending,
            'total' => $total,
            'missingFromOrders' => $missing,
            'dpdConfigured' => shoptop_dpd_enabled(),
            'fanConfigured' => shoptop_fan_enabled(),
        ],
    ]);
}

if ($method === 'POST') {
    $body = shoptop_read_json_body();
    $action = is_array($body) ? trim((string) ($body['action'] ?? '')) : '';
    if ($action === 'backfill') {
        $bf = shoptop_cs_backfill($pdo);
        $res = shoptop_cs_sync($pdo, true);
        shoptop_json_response(['ok' => true, 'backfill' => $bf, 'sync' => $res]);
    }
    if ($action === 'sync') {
        $force = !empty($body['force']);
        // Importă automat AWB-urile noi înainte de sync.
        $bf = shoptop_cs_backfill($pdo);
        $res = shoptop_cs_sync($pdo, $force || $bf['inserted'] > 0);
        shoptop_json_response(['ok' => true, 'backfill' => $bf, 'sync' => $res]);
    }
    shoptop_json_error('Actiune necunoscuta.', 400);
}

shoptop_json_error('Metoda HTTP nu este suportata.', 405);
