<?php

declare(strict_types=1);

/**
 * Panou curierat (stil Innoship), rutare curieri, simulator și tarife.
 * Etapele 2–4 din spec-alocare-curieri-portabil.md, peste datele din courier_shipments.php.
 *
 * GET  ?dashboard=1&days=30&carrier=&sla=0   -> indicatori: total, per curier, per județ, pe zile, retururi
 * GET  ?routing=1                            -> setări rutare + curieri + acoperirea istoricului
 * GET  ?rates=1&days=30                      -> tarife per curier + cost real vs. estimat
 * POST {action:'saveRouting', settings:{}}   -> salvează opțiunile de rutare (ponderi, ferestre, praguri)
 * POST {action:'saveCouriers', couriers:[]}  -> salvează curierii (activ, prioritate, termen, greutate, limită, servicii)
 * POST {action:'saveRates', carrier, rates}  -> salvează tarifele din contract (peste config.php)
 * POST {action:'simulate', county, city, kg, cod, parcels, saturday, opening} -> clasament pentru o expediere
 * POST {action:'backtest', days:30}          -> ultimele N zile: curier real vs. curier recomandat
 */

require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/courier_shipments.php';

const SHOPTOP_COUNTIES = [
    'AB' => 'Alba', 'AR' => 'Arad', 'AG' => 'Argeș', 'BC' => 'Bacău', 'BH' => 'Bihor', 'BN' => 'Bistrița-Năsăud',
    'BT' => 'Botoșani', 'BR' => 'Brăila', 'BV' => 'Brașov', 'B' => 'București', 'BZ' => 'Buzău', 'CL' => 'Călărași',
    'CS' => 'Caraș-Severin', 'CJ' => 'Cluj', 'CT' => 'Constanța', 'CV' => 'Covasna', 'DB' => 'Dâmbovița', 'DJ' => 'Dolj',
    'GL' => 'Galați', 'GR' => 'Giurgiu', 'GJ' => 'Gorj', 'HR' => 'Harghita', 'HD' => 'Hunedoara', 'IL' => 'Ialomița',
    'IS' => 'Iași', 'IF' => 'Ilfov', 'MM' => 'Maramureș', 'MH' => 'Mehedinți', 'MS' => 'Mureș', 'NT' => 'Neamț',
    'OT' => 'Olt', 'PH' => 'Prahova', 'SJ' => 'Sălaj', 'SM' => 'Satu Mare', 'SB' => 'Sibiu', 'SV' => 'Suceava',
    'TR' => 'Teleorman', 'TM' => 'Timiș', 'TL' => 'Tulcea', 'VL' => 'Vâlcea', 'VS' => 'Vaslui', 'VN' => 'Vrancea',
];

/* ---------------------------------------------------------------------------
 * Normalizare județ / localitate
 * ------------------------------------------------------------------------- */

function shoptop_cr_norm(string $s): string
{
    $s = strtr($s, [
        'ă' => 'a', 'â' => 'a', 'î' => 'i', 'ș' => 's', 'ş' => 's', 'ț' => 't', 'ţ' => 't',
        'Ă' => 'a', 'Â' => 'a', 'Î' => 'i', 'Ș' => 's', 'Ş' => 's', 'Ț' => 't', 'Ţ' => 't',
    ]);
    $s = mb_strtolower(trim($s), 'UTF-8');
    $s = preg_replace('/\s+/', ' ', $s) ?? $s;
    // „Municipiul X”, „Comuna Y” etc. nu contează la nivel de zonă.
    $s = preg_replace('/^(municipiul|mun\.|oras|orasul|comuna|com\.|sat|satul)\s+/', '', $s) ?? $s;
    return $s;
}

function shoptop_cr_county_code(string $raw): string
{
    static $byName = null;
    if ($byName === null) {
        $byName = [];
        foreach (SHOPTOP_COUNTIES as $code => $name) {
            $byName[shoptop_cr_norm($name)] = $code;
        }
        for ($i = 1; $i <= 6; $i++) {
            $byName['sector ' . $i] = 'B';
        }
    }
    $raw = trim($raw);
    if ($raw === '') {
        return '';
    }
    $upper = strtoupper($raw);
    if (isset(SHOPTOP_COUNTIES[$upper])) {
        return $upper;
    }
    $n = shoptop_cr_norm($raw);
    $n = preg_replace('/^(judetul|jud\.|jud)\s+/', '', $n) ?? $n;
    return $byName[$n] ?? '';
}

/* ---------------------------------------------------------------------------
 * Panou: indicatori
 * ------------------------------------------------------------------------- */

function shoptop_cr_blank(): array
{
    return [
        'n' => 0, 'finalized' => 0, 'inProgress' => 0, 'delivered' => 0, 'deliveredKnown' => 0,
        'otdBase' => 0, 'otd' => 0, 'lateClient' => 0, 'lateCourier' => 0,
        'returned' => 0, 'refused' => 0, 'retClient' => 0, 'retCourier' => 0, 'retUnknown' => 0,
        'in24h' => 0, 'in48h' => 0, 'nextDay' => 0, 'buckets' => [0, 0, 0, 0], 'hours' => [],
        'costSum' => 0.0, 'costN' => 0, 'pickedOk' => 0, 'pickedKnown' => 0,
        'wdSum' => 0, 'wdN' => 0, 'tdSum' => 0.0,
    ];
}

/** Măsurile unei expedieri (o linie din courier_shipments); SLA > 0 înlocuiește termenul promis. */
function shoptop_cr_row_metrics(array $r, int $sla, array $courierSettings): array
{
    $status = (string) $r['status'];
    $carrier = (string) $r['carrier'];
    $fin = in_array($status, ['livrat', 'retur', 'refuzat'], true);
    $delivered = $status === 'livrat';
    $picked = shoptop_cs_parse_datetime((string) ($r['picked_up_at'] ?? ''));
    $deliveredAt = shoptop_cs_parse_datetime((string) ($r['delivered_at'] ?? ''));
    $hours = null;
    if ($picked !== null && $deliveredAt !== null) {
        $hours = max(0.0, ($deliveredAt->getTimestamp() - $picked->getTimestamp()) / 3600);
    }
    $wd = $r['working_days'] !== null ? (int) $r['working_days'] : null;
    if ($wd === null && $picked !== null && $deliveredAt !== null) {
        $wd = shoptop_working_days($picked, $deliveredAt);
    }
    // Termenul: SLA ales în panou > termenul din setările curierului > valoarea salvată la sincronizare.
    $promised = $sla > 0
        ? $sla
        : (int) ($courierSettings[$carrier]['sla_days'] ?? ($r['promised_days'] !== null ? (int) $r['promised_days'] : 1));
    $customer = !empty($r['customer_delay']);
    $hasEvents = is_string($r['tracking'] ?? null) && strlen((string) $r['tracking']) > 2;
    // „known” = avem date din tracking ca să judecăm: livrat cu ridicare+livrare, sau retur/refuz cu evenimente.
    $known = $delivered ? ($wd !== null) : ($fin && $hasEvents);
    $onTime = $delivered && $wd !== null && $wd <= $promised;

    return [
        'carrier' => $carrier,
        'status' => $status,
        'fin' => $fin,
        'delivered' => $delivered,
        'known' => $known,
        'otd' => $onTime,
        'lateClient' => $fin && $known && !$onTime && $customer,
        'lateCourier' => $fin && $known && !$onTime && !$customer,
        'returned' => $status === 'retur',
        'refused' => $status === 'refuzat',
        'retResp' => ($status === 'retur' || $status === 'refuzat') ? ($customer ? 'client' : ($hasEvents ? 'curier' : 'necunoscut')) : '',
        'hours' => $hours,
        'wd' => $wd,
        'promised' => $promised,
        'cost' => $r['cost'] !== null ? (float) $r['cost'] : null,
        'pickedOnTime' => $r['picked_on_time'] !== null ? (int) $r['picked_on_time'] : null,
        'day' => substr((string) ($r['awb_at'] ?? ''), 0, 10),
        'county' => shoptop_cr_county_code((string) ($r['county'] ?? '')),
        'city' => (string) ($r['city'] ?? ''),
        'transitDays' => $r['transit_days'] !== null ? (float) $r['transit_days'] : null,
    ];
}

function shoptop_cr_add(array &$a, array $m, bool $keepHours = false): void
{
    $a['n']++;
    if ($m['fin']) {
        $a['finalized']++;
    } else {
        $a['inProgress']++;
    }
    if ($m['delivered']) {
        $a['delivered']++;
    }
    if ($m['fin'] && $m['known']) {
        $a['otdBase']++;
        if ($m['otd']) {
            $a['otd']++;
        } elseif ($m['lateClient']) {
            $a['lateClient']++;
        } else {
            $a['lateCourier']++;
        }
    }
    if ($m['returned']) {
        $a['returned']++;
    }
    if ($m['refused']) {
        $a['refused']++;
    }
    if ($m['retResp'] === 'client') {
        $a['retClient']++;
    } elseif ($m['retResp'] === 'curier') {
        $a['retCourier']++;
    } elseif ($m['retResp'] === 'necunoscut') {
        $a['retUnknown']++;
    }
    if ($m['delivered'] && $m['hours'] !== null) {
        $a['deliveredKnown']++;
        $h = $m['hours'];
        if ($h <= 24) {
            $a['in24h']++;
            $a['buckets'][0]++;
        } elseif ($h <= 48) {
            $a['buckets'][1]++;
        } elseif ($h <= 72) {
            $a['buckets'][2]++;
        } else {
            $a['buckets'][3]++;
        }
        if ($h <= 48) {
            $a['in48h']++;
        }
        if ($keepHours) {
            $a['hours'][] = $h;
        }
        if ($m['transitDays'] !== null) {
            $a['tdSum'] += $m['transitDays'];
        }
    }
    if ($m['delivered'] && $m['wd'] !== null) {
        $a['wdSum'] += $m['wd'];
        $a['wdN']++;
        if ($m['wd'] <= 1) {
            $a['nextDay']++;
        }
    }
    if ($m['cost'] !== null) {
        $a['costSum'] += $m['cost'];
        $a['costN']++;
    }
    if ($m['pickedOnTime'] !== null) {
        $a['pickedKnown']++;
        if ($m['pickedOnTime'] === 1) {
            $a['pickedOk']++;
        }
    }
}

function shoptop_cr_pct(int $part, int $base): ?float
{
    return $base > 0 ? round($part / $base * 100, 1) : null;
}

function shoptop_cr_percentile(array $values, float $p): ?float
{
    if ($values === []) {
        return null;
    }
    sort($values);
    $idx = (int) ceil($p * count($values)) - 1;
    $idx = max(0, min(count($values) - 1, $idx));
    return round($values[$idx], 1);
}

function shoptop_cr_finish(array $a): array
{
    $n = $a['n'];
    $fin = $a['finalized'];
    $dk = $a['deliveredKnown'];
    return [
        'n' => $n,
        'finalized' => $fin,
        'inProgress' => $a['inProgress'],
        'delivered' => $a['delivered'],
        'deliveredKnown' => $dk,
        'deliveredUnknown' => $a['delivered'] - $a['wdN'],
        'otdBase' => $a['otdBase'],
        'otd' => $a['otd'],
        'lateClient' => $a['lateClient'],
        'lateCourier' => $a['lateCourier'],
        'otdPct' => shoptop_cr_pct($a['otd'], $a['otdBase']),
        'lateClientPct' => shoptop_cr_pct($a['lateClient'], $a['otdBase']),
        'lateCourierPct' => shoptop_cr_pct($a['lateCourier'], $a['otdBase']),
        'returned' => $a['returned'],
        'refused' => $a['refused'],
        'returnPct' => shoptop_cr_pct($a['returned'], $n),
        'returnAllPct' => shoptop_cr_pct($a['returned'] + $a['refused'], $n),
        'refusedPct' => shoptop_cr_pct($a['refused'], $n),
        'retClient' => $a['retClient'],
        'retCourier' => $a['retCourier'],
        'retUnknown' => $a['retUnknown'],
        'in24h' => $a['in24h'],
        'in24hPct' => shoptop_cr_pct($a['in24h'], $dk),
        'in24hOfFinalizedPct' => shoptop_cr_pct($a['in24h'], $fin),
        'in48hPct' => shoptop_cr_pct($a['in48h'], $dk),
        'nextDayPct' => shoptop_cr_pct($a['nextDay'], $a['wdN']),
        'buckets' => $a['buckets'],
        'p50Hours' => shoptop_cr_percentile($a['hours'], 0.5),
        'p90Hours' => shoptop_cr_percentile($a['hours'], 0.9),
        'avgHours' => $a['hours'] !== [] ? round(array_sum($a['hours']) / count($a['hours']), 1) : null,
        'avgWorkingDays' => $a['wdN'] > 0 ? round($a['wdSum'] / $a['wdN'], 2) : null,
        'avgTransitDays' => $dk > 0 ? round($a['tdSum'] / $dk, 2) : null,
        'avgCost' => $a['costN'] > 0 ? round($a['costSum'] / $a['costN'], 2) : null,
        'costSum' => round($a['costSum'], 2),
        'pickedOnTimePct' => shoptop_cr_pct($a['pickedOk'], $a['pickedKnown']),
    ];
}

function shoptop_cr_reason_label(string $desc): string
{
    $l = shoptop_cr_norm($desc);
    if ($l === '') {
        return 'Fără detalii din tracking';
    }
    if (preg_match('/refuz/', $l)) {
        return 'Refuzat de destinatar';
    }
    if (preg_match('/absent|nu raspunde|nu a raspuns|negasit|nu a fost gasit|lipsa destinatar|not home/', $l)) {
        return 'Destinatar absent / nu răspunde';
    }
    if (preg_match('/adresa (gresita|incompleta|incorecta)|adresa invalida|bad address/', $l)) {
        return 'Adresă greșită / incompletă';
    }
    if (preg_match('/inchis|program/', $l)) {
        return 'Sediu închis';
    }
    if (preg_match('/reprogram|amanat|amanare|schedul/', $l)) {
        return 'Reprogramat de client';
    }
    if (preg_match('/anulat|anulare|cancel/', $l)) {
        return 'Anulat de expeditor';
    }
    if (preg_match('/retur|returnat|inapoi|sender/', $l)) {
        return 'Returnat la expeditor';
    }
    if (preg_match('/deteriorat|distrus|pierdut/', $l)) {
        return 'Colet deteriorat / pierdut';
    }
    return mb_substr(trim($desc), 0, 60);
}

function shoptop_cr_dashboard(PDO $pdo, int $days, string $carrier, int $sla): array
{
    $where = ["kind = 'delivery'", "status <> 'anulat'"];
    $params = [];
    if ($days > 0) {
        $where[] = 'awb_at >= DATE_SUB(NOW(), INTERVAL ' . $days . ' DAY)';
    }
    if ($carrier !== '' && $carrier !== 'all') {
        $where[] = 'carrier = :carrier';
        $params['carrier'] = $carrier;
    }
    $stmt = $pdo->prepare(
        'SELECT carrier, status, county, city, awb_at, picked_up_at, delivered_at, promised_days, working_days,
                transit_days, on_time, picked_on_time, customer_delay, cost, last_event, tracking
         FROM courier_shipments WHERE ' . implode(' AND ', $where)
    );
    $stmt->execute($params);
    $courierSettings = shoptop_courier_settings($pdo);

    $total = shoptop_cr_blank();
    $byCarrier = [];
    $byCounty = [];
    $byDay = [];
    $byCity = [];
    $reasons = [];
    $unmapped = 0;

    while (($r = $stmt->fetch()) !== false) {
        $m = shoptop_cr_row_metrics($r, $sla, $courierSettings);
        $c = $m['carrier'];
        shoptop_cr_add($total, $m, true);
        if (!isset($byCarrier[$c])) {
            $byCarrier[$c] = shoptop_cr_blank();
        }
        shoptop_cr_add($byCarrier[$c], $m, true);

        if ($m['county'] !== '') {
            $k = $m['county'];
            if (!isset($byCounty[$k])) {
                $byCounty[$k] = ['all' => shoptop_cr_blank(), 'carriers' => []];
            }
            shoptop_cr_add($byCounty[$k]['all'], $m);
            if (!isset($byCounty[$k]['carriers'][$c])) {
                $byCounty[$k]['carriers'][$c] = shoptop_cr_blank();
            }
            shoptop_cr_add($byCounty[$k]['carriers'][$c], $m);
        } else {
            $unmapped++;
        }

        if ($m['day'] !== '') {
            if (!isset($byDay[$m['day']])) {
                $byDay[$m['day']] = ['date' => $m['day'], 'n' => 0, 'otd' => 0, 'lateClient' => 0, 'lateCourier' => 0, 'inProgress' => 0, 'unknown' => 0, 'returned' => 0];
            }
            $d = &$byDay[$m['day']];
            $d['n']++;
            if (!$m['fin']) {
                $d['inProgress']++;
            } elseif (!$m['known']) {
                $d['unknown']++;
            } elseif ($m['otd']) {
                $d['otd']++;
            } elseif ($m['lateClient']) {
                $d['lateClient']++;
            } else {
                $d['lateCourier']++;
            }
            if ($m['returned'] || $m['refused']) {
                $d['returned']++;
            }
            unset($d);
        }

        if ($m['city'] !== '') {
            $cityKey = $m['county'] . '|' . shoptop_cr_norm($m['city']);
            if (!isset($byCity[$cityKey])) {
                $byCity[$cityKey] = [
                    'city' => mb_convert_case(mb_strtolower($m['city'], 'UTF-8'), MB_CASE_TITLE, 'UTF-8'),
                    'county' => $m['county'],
                    'agg' => shoptop_cr_blank(),
                ];
            }
            shoptop_cr_add($byCity[$cityKey]['agg'], $m);
        }

        if ($m['returned'] || $m['refused']) {
            $desc = '';
            $events = is_string($r['tracking'] ?? null) ? (json_decode($r['tracking'], true) ?: []) : [];
            foreach ($events as $e) {
                if (!empty($e['customer'])) {
                    $desc = (string) ($e['description'] ?? '');
                    break;
                }
            }
            if ($desc === '') {
                foreach ($events as $e) {
                    if (in_array($e['type'] ?? '', ['refused', 'failed', 'return', 'returned_sender'], true)) {
                        $desc = (string) ($e['description'] ?? '');
                        break;
                    }
                }
            }
            if ($desc === '') {
                $desc = (string) ($r['last_event'] ?? '');
            }
            $label = shoptop_cr_reason_label($desc);
            if (!isset($reasons[$label])) {
                $reasons[$label] = ['reason' => $label, 'n' => 0, 'client' => 0, 'carriers' => []];
            }
            $reasons[$label]['n']++;
            if ($m['retResp'] === 'client') {
                $reasons[$label]['client']++;
            }
            $reasons[$label]['carriers'][$c] = ($reasons[$label]['carriers'][$c] ?? 0) + 1;
        }
    }

    $carriersOut = [];
    foreach ($byCarrier as $c => $agg) {
        $carriersOut[$c] = shoptop_cr_finish($agg);
    }
    $countiesOut = [];
    foreach ($byCounty as $code => $data) {
        $entry = shoptop_cr_finish($data['all']);
        $entry['code'] = $code;
        $entry['name'] = SHOPTOP_COUNTIES[$code] ?? $code;
        $entry['carriers'] = [];
        foreach ($data['carriers'] as $c => $agg) {
            $f = shoptop_cr_finish($agg);
            $entry['carriers'][$c] = [
                'n' => $f['n'], 'otdPct' => $f['otdPct'], 'in24hPct' => $f['in24hPct'],
                'returnAllPct' => $f['returnAllPct'], 'avgWorkingDays' => $f['avgWorkingDays'],
            ];
        }
        $countiesOut[] = $entry;
    }
    usort($countiesOut, static fn ($a, $b) => $b['n'] <=> $a['n']);

    ksort($byDay);
    $citiesOut = [];
    foreach ($byCity as $c) {
        $f = shoptop_cr_finish($c['agg']);
        $citiesOut[] = [
            'city' => $c['city'], 'county' => $c['county'], 'n' => $f['n'], 'otdPct' => $f['otdPct'],
            'in24hPct' => $f['in24hPct'], 'returnAllPct' => $f['returnAllPct'], 'avgWorkingDays' => $f['avgWorkingDays'],
        ];
    }
    usort($citiesOut, static fn ($a, $b) => $b['n'] <=> $a['n']);
    usort($reasons, static fn ($a, $b) => $b['n'] <=> $a['n']);

    return [
        'period' => ['days' => $days, 'carrier' => $carrier === '' ? 'all' : $carrier, 'sla' => $sla],
        'total' => shoptop_cr_finish($total),
        'carriers' => $carriersOut,
        'counties' => $countiesOut,
        'countyNames' => SHOPTOP_COUNTIES,
        'unmappedCounty' => $unmapped,
        'days' => array_values($byDay),
        'cities' => array_slice($citiesOut, 0, 12),
        'returnReasons' => array_slice(array_values($reasons), 0, 8),
        'courierSettings' => array_values($courierSettings),
    ];
}

function shoptop_cr_rates_report(PDO $pdo, int $days): array
{
    $rates = shoptop_cr_rates($pdo);
    $stmt = $pdo->prepare(
        "SELECT carrier, weight_kg, parcels, cod_amount, cost, cost_source, status
         FROM courier_shipments
         WHERE kind = 'delivery' AND status <> 'anulat' AND awb_at >= DATE_SUB(NOW(), INTERVAL :d DAY)"
    );
    $stmt->bindValue('d', max(1, $days), PDO::PARAM_INT);
    $stmt->execute();
    $agg = [];
    foreach (['fan-courier', 'dpd'] as $c) {
        $agg[$c] = ['n' => 0, 'realN' => 0, 'realSum' => 0.0, 'estSum' => 0.0, 'estN' => 0, 'pairN' => 0, 'pairReal' => 0.0, 'pairEst' => 0.0, 'min' => null, 'max' => null, 'weights' => []];
    }
    while (($r = $stmt->fetch()) !== false) {
        $c = (string) $r['carrier'];
        if (!isset($agg[$c])) {
            continue;
        }
        $a = &$agg[$c];
        $a['n']++;
        $est = shoptop_cr_estimate($rates, $c, (float) $r['weight_kg'], max(1, (int) $r['parcels']), (float) $r['cod_amount'], false, false);
        $a['estSum'] += $est['total'];
        $a['estN']++;
        $wk = (string) min(30, (int) ceil((float) $r['weight_kg']));
        $a['weights'][$wk] = ($a['weights'][$wk] ?? 0) + 1;
        if ($r['cost'] !== null && (string) $r['cost_source'] === 'api') {
            $cost = (float) $r['cost'];
            $a['realN']++;
            $a['realSum'] += $cost;
            $a['pairN']++;
            $a['pairReal'] += $cost;
            $a['pairEst'] += $est['total'];
            $a['min'] = $a['min'] === null ? $cost : min($a['min'], $cost);
            $a['max'] = $a['max'] === null ? $cost : max($a['max'], $cost);
        }
        unset($a);
    }
    $out = [];
    foreach ($agg as $c => $a) {
        ksort($a['weights'], SORT_NUMERIC);
        $out[$c] = [
            'carrier' => $c,
            'fields' => shoptop_cr_rate_fields($c),
            'values' => $rates[$c]['values'],
            'source' => $rates[$c]['source'],
            'n' => $a['n'],
            'realN' => $a['realN'],
            'avgReal' => $a['realN'] > 0 ? round($a['realSum'] / $a['realN'], 2) : null,
            'avgEstimate' => $a['estN'] > 0 ? round($a['estSum'] / $a['estN'], 2) : null,
            'avgRealPaired' => $a['pairN'] > 0 ? round($a['pairReal'] / $a['pairN'], 2) : null,
            'avgEstimatePaired' => $a['pairN'] > 0 ? round($a['pairEst'] / $a['pairN'], 2) : null,
            'minReal' => $a['min'],
            'maxReal' => $a['max'],
            'sumReal' => round($a['realSum'], 2),
            'weights' => $a['weights'],
            'sample' => [
                '1kg' => shoptop_cr_estimate($rates, $c, 1, 1, 100, false, false)['total'],
                '5kg' => shoptop_cr_estimate($rates, $c, 5, 1, 100, false, false)['total'],
                '10kg' => shoptop_cr_estimate($rates, $c, 10, 1, 100, false, false)['total'],
                '20kg' => shoptop_cr_estimate($rates, $c, 20, 1, 100, false, false)['total'],
            ],
        ];
    }
    return ['days' => $days, 'carriers' => $out];
}

/* ---------------------------------------------------------------------------
 * Rutare: istoric pe zonă, subscoruri, clasament (spec 4–5)
 * ------------------------------------------------------------------------- */

/** Expedierile din fereastra de istoric (zile_istoric, după data ridicării), normalizate pentru zone. */
function shoptop_cr_history(PDO $pdo, array $settings, array $courierSettings): array
{
    $days = max(1, (int) ($settings['zile_istoric'] ?? 20));
    $stmt = $pdo->prepare(
        "SELECT carrier, status, county, city, picked_up_at, awb_at, working_days, promised_days, customer_delay, cost
         FROM courier_shipments
         WHERE kind = 'delivery' AND status <> 'anulat'
           AND COALESCE(picked_up_at, awb_at) >= DATE_SUB(NOW(), INTERVAL :d DAY)"
    );
    $stmt->bindValue('d', $days, PDO::PARAM_INT);
    $stmt->execute();
    $rows = [];
    while (($r = $stmt->fetch()) !== false) {
        $r['delivered_at'] = null;
        $r['transit_days'] = null;
        $r['picked_on_time'] = null;
        $m = shoptop_cr_row_metrics($r, 0, $courierSettings);
        $rows[] = [
            'carrier' => $m['carrier'],
            'county' => $m['county'],
            'city' => shoptop_cr_norm($m['city']),
            'fin' => $m['fin'],
            'known' => $m['known'],
            'delivered' => $m['delivered'],
            'otd' => $m['otd'],
            'returned' => $m['returned'],
            'refused' => $m['refused'],
            'wd' => $m['wd'],
            'cost' => $m['cost'],
        ];
    }
    return $rows;
}

/** Statistici pe zonă: localitate (≥ min) → județ (≥ min) → „șansă nouă”. */
function shoptop_cr_zone_stats(array $history, string $countyCode, string $cityNorm, array $settings, array $carriers): array
{
    $minLoc = max(1, (int) ($settings['min_awb_localitate'] ?? 5));
    $minJud = max(1, (int) ($settings['min_awb_judet'] ?? 5));
    $allReturns = ($settings['retur_mod'] ?? 'innoship') === 'toate';
    $out = [];
    foreach (array_keys($carriers) as $c) {
        $loc = [];
        $jud = [];
        foreach ($history as $h) {
            if ($h['carrier'] !== $c || $h['county'] !== $countyCode || $countyCode === '') {
                continue;
            }
            $jud[] = $h;
            if ($cityNorm !== '' && $h['city'] === $cityNorm) {
                $loc[] = $h;
            }
        }
        $rows = null;
        $level = 'nou';
        if ($cityNorm !== '' && count($loc) >= $minLoc) {
            $rows = $loc;
            $level = 'localitate';
        } elseif (count($jud) >= $minJud) {
            $rows = $jud;
            $level = 'judet';
        }
        if ($rows === null) {
            $out[$c] = [
                'level' => $level, 'n' => max(count($loc), count($jud)), 'delivered' => 0, 'finalized' => 0,
                'zile' => null, 'retur' => null, 'laTimp' => null, 'cost' => null,
            ];
            continue;
        }
        $n = count($rows);
        $fin = 0;
        $otdBase = 0;
        $otd = 0;
        $ret = 0;
        $wdSum = 0;
        $wdN = 0;
        $costSum = 0.0;
        $costN = 0;
        $delivered = 0;
        foreach ($rows as $h) {
            if ($h['fin']) {
                $fin++;
            }
            if ($h['delivered']) {
                $delivered++;
            }
            if ($h['fin'] && $h['known']) {
                $otdBase++;
                if ($h['otd']) {
                    $otd++;
                }
            }
            if ($h['returned'] || ($allReturns && $h['refused'])) {
                $ret++;
            }
            if ($h['delivered'] && $h['wd'] !== null) {
                $wdSum += $h['wd'];
                $wdN++;
            }
            if ($h['cost'] !== null) {
                $costSum += $h['cost'];
                $costN++;
            }
        }
        $out[$c] = [
            'level' => $level,
            'n' => $n,
            'delivered' => $delivered,
            'finalized' => $fin,
            'zile' => $wdN > 0 ? round($wdSum / $wdN, 2) : null,
            'retur' => round($ret / $n * 100, 1),
            'laTimp' => $otdBase > 0 ? round($otd / $otdBase * 100, 1) : null,
            'cost' => $costN > 0 ? round($costSum / $costN, 2) : null,
        ];
    }
    return $out;
}

/**
 * Clasamentul curierilor pentru o expediere (spec 5.1–5.6).
 *
 * @param array $input {kg, cod, saturday, opening}
 * @param array $costs curier => total cu TVA (null = fără preț)
 * @param array $todayCounts curier => AWB-uri emise azi
 */
function shoptop_cr_rank(array $input, array $zone, array $costs, array $settings, array $carriers, array $todayCounts): array
{
    $w = [
        'timp' => (float) ($settings['pondere_timp'] ?? 20),
        'retur' => (float) ($settings['pondere_retur'] ?? 90),
        'laTimp' => (float) ($settings['pondere_la_timp'] ?? 90),
        'cost' => (float) ($settings['pondere_cost'] ?? 50),
    ];
    $prag = (float) ($settings['prag_preferat'] ?? 90);
    $devPct = (float) ($settings['deviatie_pret'] ?? 13);
    $devFix = (float) ($settings['deviatie_pret_fix'] ?? 0);
    $satOptional = !empty($settings['sambata_optional']);
    $openOptional = !empty($settings['deschidere_optional']);
    $kg = (float) ($input['kg'] ?? 1);
    $cod = (float) ($input['cod'] ?? 0);

    $validCosts = array_filter($costs, static fn ($v) => $v !== null && $v > 0);
    $costMin = $validCosts === [] ? null : min($validCosts);
    $levelLabels = [0 => 'preferință manuală', 1 => 'preferat', 2 => 'normal', 3 => 'scump', 9 => 'descalificat'];

    $rows = [];
    foreach ($carriers as $c => $cs) {
        $reasons = [];
        $disq = [];
        $z = $zone[$c] ?? ['level' => 'nou', 'n' => 0, 'zile' => null, 'retur' => null, 'laTimp' => null, 'cost' => null, 'delivered' => 0, 'finalized' => 0];
        $services = is_array($cs['services'] ?? null) ? $cs['services'] : [];

        if ((int) ($cs['active'] ?? 1) !== 1) {
            $disq[] = 'curier dezactivat';
        }
        if ($cs['weight_min'] !== null && $kg < (float) $cs['weight_min']) {
            $disq[] = sprintf('sub greutatea minimă (%s kg)', rtrim(rtrim((string) $cs['weight_min'], '0'), '.'));
        }
        if ($cs['weight_max'] !== null && $kg > (float) $cs['weight_max']) {
            $disq[] = sprintf('peste greutatea maximă (%s kg)', rtrim(rtrim((string) $cs['weight_max'], '0'), '.'));
        }
        if ($cs['daily_limit'] !== null && (int) $cs['daily_limit'] > 0 && (int) ($todayCounts[$c] ?? 0) >= (int) $cs['daily_limit']) {
            $disq[] = sprintf('limita zilnică atinsă (%d/%d)', (int) ($todayCounts[$c] ?? 0), (int) $cs['daily_limit']);
        }
        if ($cod > 0 && array_key_exists('ramburs', $services) && (int) $services['ramburs'] !== 1) {
            $disq[] = 'nu oferă ramburs';
        }
        if (!empty($input['saturday']) && !$satOptional && (int) ($services['sambata'] ?? 0) !== 1) {
            $disq[] = 'nu livrează sâmbăta';
        }
        if (!empty($input['opening']) && !$openOptional && (int) ($services['deschidere_colet'] ?? 0) !== 1) {
            $disq[] = 'nu oferă deschidere colet';
        }
        $cost = $costs[$c] ?? null;
        if (array_key_exists($c, $costs) && $cost === null) {
            $reasons[] = 'fără preț (estimare indisponibilă)';
        }

        $new = $z['level'] === 'nou';
        if ($new) {
            $sTimp = 100.0;
            $sRetur = 100.0;
            $sLaTimp = 100.0;
            $reasons[] = $z['n'] > 0
                ? sprintf('doar %d AWB în zonă, sub minimul de %d — șansă nouă', $z['n'], (int) ($settings['min_awb_judet'] ?? 5))
                : 'fără istoric în zonă — șansă nouă';
        } else {
            $sTimp = $z['zile'] !== null ? 100 / max(1, (int) round($z['zile'])) : 100.0;
            $sRetur = max(0.0, 100 - 3 * (float) ($z['retur'] ?? 0));
            $sLaTimp = $z['laTimp'] !== null ? (float) $z['laTimp'] : 100.0;
            $reasons[] = sprintf(
                '%d AWB în %s, %d livrate, %s%% înapoiate, %s%% la timp',
                $z['n'],
                $z['level'] === 'localitate' ? 'localitate' : 'județ',
                $z['delivered'],
                number_format((float) ($z['retur'] ?? 0), 1, ',', ''),
                $z['laTimp'] === null ? '?' : number_format((float) $z['laTimp'], 1, ',', '')
            );
        }
        if ($cost === null || $cost <= 0 || $costMin === null) {
            $sCost = 50.0;
        } else {
            $sCost = min(100.0, $costMin / $cost * 100);
            $reasons[] = 'preț estimat ' . number_format((float) $cost, 2, ',', '') . ' lei cu TVA';
        }
        $score = $w['timp'] * $sTimp / 100 + $w['retur'] * $sRetur / 100 + $w['laTimp'] * $sLaTimp / 100 + $w['cost'] * $sCost / 100;

        $type = (string) ($cs['priority_type'] ?? 'normal');
        $expensive = $cost !== null && $costMin !== null && $cost > $costMin * (1 + $devPct / 100) + $devFix;
        if ($disq !== []) {
            $level = 9;
            $score = 0.0;
        } elseif ($type === 'preferat' && $sLaTimp >= $prag && !$expensive) {
            $level = 1;
            $reasons[] = 'preferat eligibil';
        } elseif ($type === 'scump' || ($type !== 'preferat' && $expensive)) {
            $level = 3;
            if ($expensive) {
                $reasons[] = sprintf('peste toleranța de preț (%s%% + %s lei)', number_format($devPct, 0, ',', ''), number_format($devFix, 2, ',', ''));
            }
        } else {
            $level = 2;
            if ($type === 'preferat') {
                $reasons[] = $sLaTimp < $prag
                    ? sprintf('preferat, dar sub pragul de %s%% la timp', number_format($prag, 0, ',', ''))
                    : 'preferat, dar peste toleranța de preț';
            }
        }

        $rows[] = [
            'carrier' => $c,
            'name' => (string) ($cs['name'] ?? $c),
            'level' => $level,
            'levelLabel' => $levelLabels[$level],
            'priority' => (int) ($cs['priority'] ?? 99),
            'priorityType' => $type,
            'zone' => $z,
            'cost' => $cost,
            'sub' => ['timp' => round($sTimp, 1), 'retur' => round($sRetur, 1), 'laTimp' => round($sLaTimp, 1), 'cost' => round($sCost, 1)],
            'score' => round($score, 1),
            'scoreMax' => array_sum($w),
            'reasons' => array_merge($disq, $reasons),
            'disqualified' => $disq !== [],
        ];
    }
    usort($rows, static function ($a, $b) {
        return [$a['level'], -$a['score'], $a['priority']] <=> [$b['level'], -$b['score'], $b['priority']];
    });
    $recommended = null;
    foreach ($rows as $r) {
        if ($r['level'] < 9) {
            $recommended = $r['carrier'];
            break;
        }
    }
    return ['recommended' => $recommended, 'ranking' => $rows, 'costMin' => $costMin, 'weights' => $w];
}

function shoptop_cr_today_counts(PDO $pdo): array
{
    $out = [];
    $rows = $pdo->query(
        "SELECT carrier, COUNT(*) AS n FROM courier_shipments WHERE kind = 'delivery' AND DATE(awb_at) = CURDATE() GROUP BY carrier"
    )->fetchAll();
    foreach ($rows as $r) {
        $out[(string) $r['carrier']] = (int) $r['n'];
    }
    return $out;
}

function shoptop_cr_simulate(PDO $pdo, array $input): array
{
    $settings = shoptop_routing_settings($pdo);
    $carriers = shoptop_courier_settings($pdo);
    $rates = shoptop_cr_rates($pdo);
    $history = shoptop_cr_history($pdo, $settings, $carriers);
    $countyCode = shoptop_cr_county_code((string) ($input['county'] ?? ''));
    $cityNorm = shoptop_cr_norm((string) ($input['city'] ?? ''));
    $zone = shoptop_cr_zone_stats($history, $countyCode, $cityNorm, $settings, $carriers);
    $kg = max(0.1, (float) ($input['kg'] ?? 1));
    $parcels = max(1, (int) ($input['parcels'] ?? 1));
    $cod = max(0.0, (float) ($input['cod'] ?? 0));
    $costs = [];
    $estimates = [];
    foreach (array_keys($carriers) as $c) {
        $e = shoptop_cr_estimate($rates, $c, $kg, $parcels, $cod, !empty($input['opening']), !empty($input['saturday']));
        $costs[$c] = $e['total'];
        $estimates[$c] = $e;
    }
    $rank = shoptop_cr_rank(
        ['kg' => $kg, 'cod' => $cod, 'saturday' => !empty($input['saturday']), 'opening' => !empty($input['opening'])],
        $zone,
        $costs,
        $settings,
        $carriers,
        shoptop_cr_today_counts($pdo)
    );
    $rank['county'] = $countyCode;
    $rank['countyName'] = SHOPTOP_COUNTIES[$countyCode] ?? '';
    $rank['city'] = $cityNorm;
    $rank['historyRows'] = count($history);
    $rank['estimates'] = $estimates;
    return $rank;
}

/** Ultimele N zile: curierul folosit vs. curierul pe care l-ar fi recomandat motorul (cu istoricul de azi). */
function shoptop_cr_backtest(PDO $pdo, int $days): array
{
    $settings = shoptop_routing_settings($pdo);
    $carriers = shoptop_courier_settings($pdo);
    $rates = shoptop_cr_rates($pdo);
    $history = shoptop_cr_history($pdo, $settings, $carriers);
    $stmt = $pdo->prepare(
        "SELECT carrier, county, city, weight_kg, parcels, cod_amount, cost
         FROM courier_shipments
         WHERE kind = 'delivery' AND status <> 'anulat' AND awb_at >= DATE_SUB(NOW(), INTERVAL :d DAY)"
    );
    $stmt->bindValue('d', max(1, $days), PDO::PARAM_INT);
    $stmt->execute();
    $actual = [];
    $estimated = [];
    $same = 0;
    $n = 0;
    $actualCost = 0.0;
    $actualCostN = 0;
    $estCost = 0.0;
    $estCostN = 0;
    $zoneCache = [];
    $levels = ['localitate' => 0, 'judet' => 0, 'nou' => 0];
    foreach (array_keys($carriers) as $c) {
        $actual[$c] = 0;
        $estimated[$c] = 0;
    }
    while (($r = $stmt->fetch()) !== false) {
        $n++;
        $c = (string) $r['carrier'];
        $actual[$c] = ($actual[$c] ?? 0) + 1;
        $countyCode = shoptop_cr_county_code((string) $r['county']);
        $cityNorm = shoptop_cr_norm((string) $r['city']);
        $zk = $countyCode . '|' . $cityNorm;
        if (!isset($zoneCache[$zk])) {
            $zoneCache[$zk] = shoptop_cr_zone_stats($history, $countyCode, $cityNorm, $settings, $carriers);
        }
        $zone = $zoneCache[$zk];
        $kg = max(0.1, (float) $r['weight_kg']);
        $cod = (float) $r['cod_amount'];
        $costs = [];
        foreach (array_keys($carriers) as $cc) {
            $costs[$cc] = shoptop_cr_estimate($rates, $cc, $kg, max(1, (int) $r['parcels']), $cod, false, false)['total'];
        }
        $rank = shoptop_cr_rank(['kg' => $kg, 'cod' => $cod], $zone, $costs, $settings, $carriers, []);
        $rec = $rank['recommended'];
        if ($rec !== null) {
            $estimated[$rec] = ($estimated[$rec] ?? 0) + 1;
            $estCost += $costs[$rec];
            $estCostN++;
            $zl = $zone[$rec]['level'] ?? 'nou';
            $levels[$zl] = ($levels[$zl] ?? 0) + 1;
        }
        if ($rec === $c) {
            $same++;
        }
        if ($r['cost'] !== null) {
            $actualCost += (float) $r['cost'];
            $actualCostN++;
        }
    }
    return [
        'days' => $days,
        'n' => $n,
        'actual' => $actual,
        'estimated' => $estimated,
        'agreementPct' => $n > 0 ? round($same / $n * 100, 1) : null,
        'actualAvgCost' => $actualCostN > 0 ? round($actualCost / $actualCostN, 2) : null,
        'estimatedAvgCost' => $estCostN > 0 ? round($estCost / $estCostN, 2) : null,
        'zoneLevels' => $levels,
        'historyRows' => count($history),
    ];
}

/* ---------------------------------------------------------------------------
 * Salvare setări
 * ------------------------------------------------------------------------- */

function shoptop_cr_save_routing(PDO $pdo, array $settings): array
{
    $allowed = [
        'pondere_timp' => 'int', 'pondere_retur' => 'int', 'pondere_la_timp' => 'int', 'pondere_cost' => 'int',
        'zile_istoric' => 'int', 'min_awb_localitate' => 'int', 'min_awb_judet' => 'int', 'prag_preferat' => 'int',
        'deviatie_pret' => 'float', 'deviatie_pret_fix' => 'float', 'sambata_optional' => 'bool', 'deschidere_optional' => 'bool',
        'retur_mod' => 'enum', 'ora_cutoff' => 'int', 'sync_interval_min' => 'int',
    ];
    $saved = [];
    foreach ($settings as $k => $v) {
        if (!isset($allowed[$k])) {
            continue;
        }
        switch ($allowed[$k]) {
            case 'int':
                if (!is_numeric($v)) {
                    shoptop_json_error("Valoare invalidă pentru $k.", 400);
                }
                $v = (string) max(0, (int) $v);
                break;
            case 'float':
                if (!is_numeric($v)) {
                    shoptop_json_error("Valoare invalidă pentru $k.", 400);
                }
                $v = (string) max(0.0, round((float) $v, 2));
                break;
            case 'bool':
                $v = !empty($v) && $v !== '0' ? '1' : '0';
                break;
            default:
                $v = $v === 'toate' ? 'toate' : 'innoship';
                break;
        }
        shoptop_routing_setting_set($pdo, (string) $k, (string) $v);
        $saved[$k] = $v;
    }
    return $saved;
}

function shoptop_cr_save_couriers(PDO $pdo, array $couriers): int
{
    $stmt = $pdo->prepare(
        'UPDATE courier_settings SET active = :active, priority_type = :ptype, priority = :priority, sla_days = :sla,
                weight_min = :wmin, weight_max = :wmax, daily_limit = :dlimit, services = :services
         WHERE carrier = :carrier'
    );
    $n = 0;
    $num = static fn ($v) => ($v === null || $v === '' ? null : (is_numeric($v) ? (float) $v : null));
    foreach ($couriers as $c) {
        if (!is_array($c) || !in_array($c['carrier'] ?? '', ['dpd', 'fan-courier'], true)) {
            continue;
        }
        $ptype = in_array($c['priority_type'] ?? '', ['preferat', 'normal', 'scump'], true) ? $c['priority_type'] : 'normal';
        $services = is_array($c['services'] ?? null) ? $c['services'] : [];
        $limit = $c['daily_limit'] ?? null;
        $stmt->execute([
            'active' => !empty($c['active']) ? 1 : 0,
            'ptype' => $ptype,
            'priority' => max(1, (int) ($c['priority'] ?? 1)),
            'sla' => max(1, min(10, (int) ($c['sla_days'] ?? 1))),
            'wmin' => $num($c['weight_min'] ?? null),
            'wmax' => $num($c['weight_max'] ?? null),
            'dlimit' => ($limit === null || $limit === '') ? null : max(0, (int) $limit),
            'services' => json_encode([
                'ramburs' => !empty($services['ramburs']) ? 1 : 0,
                'sambata' => !empty($services['sambata']) ? 1 : 0,
                'deschidere_colet' => !empty($services['deschidere_colet']) ? 1 : 0,
            ]),
            'carrier' => $c['carrier'],
        ]);
        $n++;
    }
    return $n;
}

function shoptop_cr_save_rates(PDO $pdo, string $carrier, array $rates): array
{
    if (!in_array($carrier, ['dpd', 'fan-courier'], true)) {
        shoptop_json_error('Curier necunoscut.', 400);
    }
    $clean = [];
    foreach (shoptop_cr_rate_fields($carrier) as $f) {
        $k = $f['key'];
        if (!array_key_exists($k, $rates)) {
            continue;
        }
        $v = $rates[$k];
        if ($v === null || $v === '') {
            $clean[$k] = null;
        } elseif (is_numeric($v)) {
            $clean[$k] = round((float) $v, 2);
        } else {
            shoptop_json_error('Valoare invalidă pentru ' . $f['label'] . '.', 400);
        }
    }
    shoptop_routing_setting_set($pdo, 'rates_' . $carrier, (string) json_encode($clean));
    return $clean;
}

/* ---------------------------------------------------------------------------
 * Router
 * ------------------------------------------------------------------------- */

$shoptopCrDirect = realpath((string) ($_SERVER['SCRIPT_FILENAME'] ?? '')) === realpath(__FILE__);
if (!$shoptopCrDirect) {
    return;
}

shoptop_send_cors();
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

shoptop_require_admin();
$pdo = shoptop_pdo();
if (!shoptop_cs_available($pdo)) {
    shoptop_json_error('Tabelele de rutare lipsesc. Ruleaza sql/migrate-courier-shipments(-server).sql.', 409);
}
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    header('Cache-Control: no-store');
    if (isset($_GET['dashboard'])) {
        $days = (int) ($_GET['days'] ?? 30);
        $carrier = trim((string) ($_GET['carrier'] ?? ''));
        $sla = max(0, min(10, (int) ($_GET['sla'] ?? 0)));
        shoptop_json_response(shoptop_cr_dashboard($pdo, $days, $carrier, $sla));
    }
    if (isset($_GET['routing'])) {
        $settings = shoptop_routing_settings($pdo);
        unset($settings['last_sync_at']);
        foreach (array_keys($settings) as $k) {
            if (str_starts_with((string) $k, 'rates_')) {
                unset($settings[$k]);
            }
        }
        $courierSettings = shoptop_courier_settings($pdo);
        $history = shoptop_cr_history($pdo, $settings, $courierSettings);
        $coverage = [];
        foreach ($history as $h) {
            $coverage[$h['carrier']] = ($coverage[$h['carrier']] ?? 0) + 1;
        }
        shoptop_json_response([
            'settings' => $settings,
            'couriers' => array_values($courierSettings),
            'todayCounts' => shoptop_cr_today_counts($pdo),
            'historyRows' => count($history),
            'historyByCarrier' => $coverage,
            'counties' => SHOPTOP_COUNTIES,
        ]);
    }
    if (isset($_GET['rates'])) {
        shoptop_json_response(shoptop_cr_rates_report($pdo, max(1, (int) ($_GET['days'] ?? 30))));
    }
    shoptop_json_error('Parametru lipsă (dashboard / routing / rates).', 400);
}

if ($method === 'POST') {
    $body = shoptop_read_json_body();
    $action = is_array($body) ? trim((string) ($body['action'] ?? '')) : '';
    if ($action === 'saveRouting') {
        $saved = shoptop_cr_save_routing($pdo, is_array($body['settings'] ?? null) ? $body['settings'] : []);
        shoptop_json_response(['ok' => true, 'saved' => $saved]);
    }
    if ($action === 'saveCouriers') {
        $n = shoptop_cr_save_couriers($pdo, is_array($body['couriers'] ?? null) ? $body['couriers'] : []);
        shoptop_json_response(['ok' => true, 'updated' => $n, 'couriers' => array_values(shoptop_courier_settings($pdo))]);
    }
    if ($action === 'saveRates') {
        $clean = shoptop_cr_save_rates($pdo, (string) ($body['carrier'] ?? ''), is_array($body['rates'] ?? null) ? $body['rates'] : []);
        shoptop_json_response(['ok' => true, 'rates' => $clean, 'report' => shoptop_cr_rates_report($pdo, max(1, (int) ($body['days'] ?? 30)))]);
    }
    if ($action === 'simulate') {
        shoptop_json_response(shoptop_cr_simulate($pdo, is_array($body) ? $body : []));
    }
    if ($action === 'backtest') {
        shoptop_json_response(shoptop_cr_backtest($pdo, max(1, min(365, (int) ($body['days'] ?? 30)))));
    }
    shoptop_json_error('Actiune necunoscuta.', 400);
}

shoptop_json_error('Metoda HTTP nu este suportata.', 405);
