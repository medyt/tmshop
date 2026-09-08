<?php

declare(strict_types=1);

require_once __DIR__ . '/lib.php';

shoptop_send_cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$pdo = shoptop_pdo();

/**
 * @return array{monthKey:string, facebookAds:float, consumables:float, consulting:float, salaries:float, total:float}
 */
function shoptop_monthly_expenses_response(string $monthKey, array $row = []): array
{
    $facebook = isset($row['facebook_ads']) ? (float) $row['facebook_ads'] : 0.0;
    $consumables = isset($row['consumables']) ? (float) $row['consumables'] : 0.0;
    $consulting = isset($row['consulting']) ? (float) $row['consulting'] : 0.0;
    $salaries = isset($row['salaries']) ? (float) $row['salaries'] : 0.0;

    return [
        'monthKey' => $monthKey,
        'facebookAds' => round($facebook, 2),
        'consumables' => round($consumables, 2),
        'consulting' => round($consulting, 2),
        'salaries' => round($salaries, 2),
        'total' => round($facebook + $consumables + $consulting + $salaries, 2),
    ];
}

function shoptop_valid_month_key(string $monthKey): bool
{
    if (!preg_match('/^\d{4}-\d{2}$/', $monthKey)) {
        return false;
    }
    $year = (int) substr($monthKey, 0, 4);
    $month = (int) substr($monthKey, 5, 2);

    return $year >= 2020 && $year <= 2100 && $month >= 1 && $month <= 12;
}

function shoptop_valid_year(string $yearRaw): ?int
{
    if (!preg_match('/^\d{4}$/', $yearRaw)) {
        return null;
    }
    $year = (int) $yearRaw;

    return $year >= 2020 && $year <= 2100 ? $year : null;
}

function shoptop_monthly_expenses_has_salaries(PDO $pdo): bool
{
    return shoptop_column_exists($pdo, 'monthly_expenses', 'salaries');
}

function shoptop_parse_money(mixed $raw): float
{
    if (is_int($raw) || is_float($raw)) {
        return max(0.0, round((float) $raw, 2));
    }
    if (!is_string($raw)) {
        return 0.0;
    }
    $normalized = str_replace([' ', ','], ['', '.'], trim($raw));
    if ($normalized === '' || !is_numeric($normalized)) {
        return 0.0;
    }

    return max(0.0, round((float) $normalized, 2));
}

if ($method === 'GET') {
    shoptop_require_admin();
    $yearRaw = trim((string) ($_GET['year'] ?? ''));
    $year = shoptop_valid_year($yearRaw);
    $hasSalaries = shoptop_monthly_expenses_has_salaries($pdo);

    if ($year !== null) {
        $select = $hasSalaries
            ? 'month_key, facebook_ads, consumables, consulting, salaries'
            : 'month_key, facebook_ads, consumables, consulting';
        $stmt = $pdo->prepare(
            "SELECT {$select}
             FROM monthly_expenses
             WHERE month_key LIKE :prefix
             ORDER BY month_key ASC"
        );
        $stmt->execute(['prefix' => $yearRaw . '-%']);
        $rows = $stmt->fetchAll();
        $byMonth = [];
        if (is_array($rows)) {
            foreach ($rows as $row) {
                if (!is_array($row)) {
                    continue;
                }
                $key = (string) ($row['month_key'] ?? '');
                if ($key !== '') {
                    $byMonth[$key] = $row;
                }
            }
        }

        $months = [];
        for ($m = 1; $m <= 12; $m++) {
            $monthKey = sprintf('%04d-%02d', $year, $m);
            $months[] = shoptop_monthly_expenses_response(
                $monthKey,
                $byMonth[$monthKey] ?? []
            );
        }

        shoptop_json_response([
            'year' => (string) $year,
            'months' => $months,
        ]);
    }

    $monthKey = trim((string) ($_GET['month'] ?? ''));
    if (!shoptop_valid_month_key($monthKey)) {
        shoptop_json_error('Luna este invalida. Foloseste formatul YYYY-MM sau parametrul year.', 400);
    }

    $select = $hasSalaries
        ? 'month_key, facebook_ads, consumables, consulting, salaries'
        : 'month_key, facebook_ads, consumables, consulting';
    $stmt = $pdo->prepare(
        "SELECT {$select}
         FROM monthly_expenses WHERE month_key = :month_key LIMIT 1"
    );
    $stmt->execute(['month_key' => $monthKey]);
    $row = $stmt->fetch();
    shoptop_json_response(
        shoptop_monthly_expenses_response($monthKey, is_array($row) ? $row : [])
    );
}

if ($method === 'POST') {
    shoptop_require_admin();
    $body = shoptop_read_json_body();
    if (!is_array($body)) {
        shoptop_json_error('Corpul cererii trebuie sa fie un obiect JSON.', 400);
    }

    $monthKey = trim((string) ($body['monthKey'] ?? $body['month'] ?? ''));
    if (!shoptop_valid_month_key($monthKey)) {
        shoptop_json_error('Luna este invalida. Foloseste formatul YYYY-MM.', 400);
    }

    $facebook = shoptop_parse_money($body['facebookAds'] ?? 0);
    $consumables = shoptop_parse_money($body['consumables'] ?? 0);
    $consulting = shoptop_parse_money($body['consulting'] ?? 0);
    $salaries = shoptop_parse_money($body['salaries'] ?? 0);
    $hasSalaries = shoptop_monthly_expenses_has_salaries($pdo);

    if ($hasSalaries) {
        $stmt = $pdo->prepare(
            'INSERT INTO monthly_expenses (month_key, facebook_ads, consumables, consulting, salaries)
             VALUES (:month_key, :facebook_ads, :consumables, :consulting, :salaries)
             ON DUPLICATE KEY UPDATE
                facebook_ads = VALUES(facebook_ads),
                consumables = VALUES(consumables),
                consulting = VALUES(consulting),
                salaries = VALUES(salaries)'
        );
        $stmt->execute([
            'month_key' => $monthKey,
            'facebook_ads' => $facebook,
            'consumables' => $consumables,
            'consulting' => $consulting,
            'salaries' => $salaries,
        ]);
    } else {
        $stmt = $pdo->prepare(
            'INSERT INTO monthly_expenses (month_key, facebook_ads, consumables, consulting)
             VALUES (:month_key, :facebook_ads, :consumables, :consulting)
             ON DUPLICATE KEY UPDATE
                facebook_ads = VALUES(facebook_ads),
                consumables = VALUES(consumables),
                consulting = VALUES(consulting)'
        );
        $stmt->execute([
            'month_key' => $monthKey,
            'facebook_ads' => $facebook,
            'consumables' => $consumables,
            'consulting' => $consulting,
        ]);
    }

    shoptop_json_response(
        shoptop_monthly_expenses_response($monthKey, [
            'facebook_ads' => $facebook,
            'consumables' => $consumables,
            'consulting' => $consulting,
            'salaries' => $hasSalaries ? $salaries : 0.0,
        ])
    );
}

shoptop_json_error('Metoda HTTP nu este suportata.', 405);
