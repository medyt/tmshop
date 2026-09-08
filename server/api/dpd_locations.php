<?php

declare(strict_types=1);

require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/dpd.php';

shoptop_send_cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    if ($method === 'POST') {
        shoptop_require_admin();
        $body = shoptop_read_json_body();
        $action = is_array($body) ? trim((string) ($body['action'] ?? '')) : '';
        if ($action !== 'sync') {
            shoptop_json_error('Acțiune invalidă.', 400);
        }
        // Sync CSV e opțional — multe conturi DPD au „Acces interzis” pe dump.
        @set_time_limit(300);
        try {
            $data = shoptop_dpd_sync_nomenclature(true);
            shoptop_json_response([
                'ok' => true,
                'mode' => 'csv',
                'updatedAt' => $data['updatedAt'],
                'counties' => count($data['counties']),
                'localities' => array_sum(array_map('count', $data['localitiesByCounty'])),
            ]);
        } catch (Throwable $e) {
            shoptop_json_error(
                'Sync CSV indisponibil: ' . $e->getMessage()
                . ' Folosește căutarea pe localitate (action=resolve).',
                502
            );
        }
    }

    if ($method !== 'GET') {
        shoptop_json_error('Metoda HTTP nu este suportata.', 405);
    }

    $action = trim((string) ($_GET['action'] ?? 'counties'));
    if ($action === 'countries') {
        $action = 'counties';
    }

    // Rezolvă siteId DPD pentru o localitate (API find — funcționează fără licență CSV).
    if ($action === 'resolve' || $action === 'search') {
        if (!shoptop_dpd_enabled()) {
            shoptop_json_error('DPD nu este configurat pe server.', 503);
        }
        $region = trim((string) ($_GET['region'] ?? $_GET['county'] ?? ''));
        $name = trim((string) ($_GET['name'] ?? $_GET['q'] ?? ''));
        if ($name === '' || mb_strlen($name, 'UTF-8') < 2) {
            shoptop_json_error('Parametrul name/q este obligatoriu (min. 2 caractere).', 400);
        }

        $payload = [
            'countryId' => SHOPTOP_DPD_COUNTRY_RO,
            'name' => $name,
        ];
        if ($region !== '') {
            // DPD: region fără diacritice („Brasov”, nu „Brașov”).
            $regionAscii = strtr(mb_strtolower(trim($region), 'UTF-8'), [
                'ă' => 'a', 'â' => 'a', 'î' => 'i', 'ș' => 's', 'ş' => 's',
                'ț' => 't', 'ţ' => 't',
            ]);
            $payload['region'] = mb_strtoupper(mb_substr($regionAscii, 0, 1, 'UTF-8'), 'UTF-8')
                . mb_substr($regionAscii, 1, null, 'UTF-8');
        }

        $res = shoptop_dpd_request('location/site', $payload);
        $sites = (is_array($res['json'] ?? null) ? ($res['json']['sites'] ?? null) : null);
        if (!$res['ok'] || !is_array($sites) || $sites === []) {
            // Reîncearcă fără region (uneori region DPD diferă de numele județului).
            if (isset($payload['region'])) {
                unset($payload['region']);
                $res = shoptop_dpd_request('location/site', $payload);
                $sites = (is_array($res['json'] ?? null) ? ($res['json']['sites'] ?? null) : null);
            }
        }
        if (!$res['ok'] || !is_array($res['json'])) {
            $err = (string) ($res['error'] ?? 'Nu am putut căuta localitatea în DPD.');
            // Cont fără licență Find Site — UI poate continua pe nume; AWB folosește siteName.
            if (stripos($err, 'Acces interzis') !== false || stripos($err, 'forbidden') !== false) {
                shoptop_json_response([
                    'ok' => true,
                    'soft' => true,
                    'locality' => [
                        'id' => 0,
                        'name' => $name,
                        'postCode' => '',
                        'type' => '',
                        'region' => $region,
                    ],
                    'warning' => 'Contul DPD nu are acces la Find Site. AWB va folosi numele localității.',
                ]);
            }
            shoptop_json_error($err, 502);
        }

        if (!is_array($sites) || $sites === []) {
            shoptop_json_error(
                'Nicio localitate DPD pentru „' . $name . '”'
                . ($region !== '' ? ' / ' . $region : '') . '.',
                404
            );
        }

        // Folosește $sites deja extras (nu din json din nou).
        $res['json']['sites'] = $sites;

        $normalize = static function (string $value): string {
            $value = mb_strtolower(trim($value), 'UTF-8');
            return strtr($value, [
                'ă' => 'a', 'â' => 'a', 'î' => 'i', 'ș' => 's', 'ş' => 's',
                'ț' => 't', 'ţ' => 't',
            ]);
        };
        $want = $normalize($name);
        $best = null;
        $bestScore = -1;
        $list = [];
        foreach ($sites as $site) {
            if (!is_array($site)) {
                continue;
            }
            $id = (int) ($site['id'] ?? 0);
            $siteName = trim((string) ($site['name'] ?? ''));
            if ($id <= 0 || $siteName === '') {
                continue;
            }
            $siteRegion = trim((string) ($site['region'] ?? ''));
            $postCode = trim((string) ($site['postCode'] ?? ''));
            $entry = [
                'id' => $id,
                'name' => $siteName,
                'postCode' => $postCode,
                'type' => trim((string) ($site['type'] ?? '')),
                'region' => $siteRegion,
            ];
            $list[] = $entry;

            $n = $normalize($siteName);
            $score = 0;
            if ($n === $want) {
                $score = 100;
            } elseif (str_starts_with($n, $want)) {
                $score = 70;
            } elseif (str_contains($n, $want)) {
                $score = 40;
            }
            if ($region !== '' && $siteRegion !== '') {
                $rn = $normalize($siteRegion);
                $rr = $normalize($region);
                if ($rn === $rr || str_contains($rn, $rr) || str_contains($rr, $rn)) {
                    $score += 25;
                }
            }
            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $entry;
            }
        }

        if ($action === 'search') {
            shoptop_json_response([
                'query' => $name,
                'region' => $region,
                'localities' => $list,
            ]);
        }

        if ($best === null || $bestScore < 40) {
            shoptop_json_error(
                'Nu am găsit potrivire DPD clară pentru „' . $name . '”. Încearcă alt nume din listă.',
                404
            );
        }
        shoptop_json_response([
            'ok' => true,
            'locality' => $best,
        ]);
    }

    if ($action === 'counties') {
        // UI folosește coduri ISO (BV, AB…). Localitățile vin din cache CSV DPD.
        $cached = shoptop_dpd_ensure_nomenclature(true);
        shoptop_json_response([
            'updatedAt' => $cached['updatedAt'] ?? null,
            'source' => $cached !== null ? 'dpd-cache' : 'static',
            'dpdReady' => $cached !== null,
            'counties' => shoptop_dpd_static_counties(),
        ]);
    }

    if ($action === 'localities') {
        $county = trim((string) ($_GET['county'] ?? ''));
        if ($county === '') {
            shoptop_json_error('Parametrul county este obligatoriu.', 400);
        }
        $cached = shoptop_dpd_ensure_nomenclature(true);
        if ($cached !== null) {
            $list = shoptop_dpd_localities_for_county($cached, $county);
            if ($list !== []) {
                shoptop_json_response([
                    'updatedAt' => $cached['updatedAt'] ?? null,
                    'source' => 'dpd-cache',
                    'county' => mb_strtoupper($county, 'UTF-8'),
                    'localities' => $list,
                ]);
            }
        }
        // Fără cache / județ necunoscut: frontend folosește lista locală + resolve.
        shoptop_json_response([
            'updatedAt' => null,
            'source' => 'resolve',
            'county' => mb_strtoupper($county, 'UTF-8'),
            'localities' => [],
            'hint' => 'Folosește action=resolve&region=...&name=... pentru siteId DPD.',
        ]);
    }

    shoptop_json_error('Acțiune invalidă. Folosește counties, localities, resolve sau search.', 400);
} catch (Throwable $e) {
    shoptop_json_error($e->getMessage(), 502);
}
