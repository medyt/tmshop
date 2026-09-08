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

function shoptop_expense_lines_table_exists(PDO $pdo): bool
{
    try {
        $stmt = $pdo->query("SHOW TABLES LIKE 'monthly_expense_lines'");
        return $stmt !== false && $stmt->fetch() !== false;
    } catch (Throwable) {
        return false;
    }
}

function shoptop_expense_lines_column_exists(PDO $pdo, string $table, string $column): bool
{
    try {
        $stmt = $pdo->prepare(
            'SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = :table
               AND COLUMN_NAME = :column
             LIMIT 1'
        );
        $stmt->execute(['table' => $table, 'column' => $column]);

        return (bool) $stmt->fetchColumn();
    } catch (Throwable) {
        return false;
    }
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

function shoptop_valid_expense_category(string $category): bool
{
    static $allowed = [
        'salarii',
        'chirie',
        'utilitati',
        'facebook_ads',
        'consumabile',
        'contabilitate',
        'consultanta',
        'platforma',
        'alte',
    ];

    return in_array($category, $allowed, true);
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

/**
 * @return array<int, array<string, mixed>>
 */
function shoptop_expense_lines_fetch(PDO $pdo, string $monthKey): array
{
    if (!shoptop_expense_lines_table_exists($pdo)) {
        return [];
    }

    $stmt = $pdo->prepare(
        'SELECT id, month_key, category, label, amount, sort_order
         FROM monthly_expense_lines
         WHERE month_key = :month_key
         ORDER BY sort_order ASC, id ASC'
    );
    $stmt->execute(['month_key' => $monthKey]);
    $rows = $stmt->fetchAll();
    if (!is_array($rows)) {
        return [];
    }

    $out = [];
    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }
        $out[] = [
            'id' => (int) ($row['id'] ?? 0),
            'monthKey' => (string) ($row['month_key'] ?? $monthKey),
            'category' => (string) ($row['category'] ?? 'alte'),
            'label' => (string) ($row['label'] ?? ''),
            'amount' => round((float) ($row['amount'] ?? 0), 2),
            'sortOrder' => (int) ($row['sort_order'] ?? 0),
        ];
    }

    return $out;
}

/**
 * Migrează o singură dată din monthly_expenses (sumele sunt tratate ca fără TVA).
 *
 * @return array<int, array<string, mixed>>
 */
function shoptop_expense_lines_legacy_seed(PDO $pdo, string $monthKey): array
{
    try {
        $check = $pdo->query("SHOW TABLES LIKE 'monthly_expenses'");
        if ($check === false || $check->fetch() === false) {
            return [];
        }
    } catch (Throwable) {
        return [];
    }

    $hasSalaries = shoptop_expense_lines_column_exists($pdo, 'monthly_expenses', 'salaries');
    $select = $hasSalaries
        ? 'facebook_ads, consumables, consulting, salaries'
        : 'facebook_ads, consumables, consulting';

    $stmt = $pdo->prepare(
        "SELECT {$select} FROM monthly_expenses WHERE month_key = :month_key LIMIT 1"
    );
    $stmt->execute(['month_key' => $monthKey]);
    $row = $stmt->fetch();
    if (!is_array($row)) {
        return [];
    }

    $legacy = [
        ['facebook_ads', 'Facebook Ads', (float) ($row['facebook_ads'] ?? 0)],
        ['consumabile', 'Consumabile', (float) ($row['consumables'] ?? 0)],
        ['consultanta', 'Consultanță', (float) ($row['consulting'] ?? 0)],
    ];
    if ($hasSalaries) {
        $legacy[] = ['salarii', 'Salarii', (float) ($row['salaries'] ?? 0)];
    }

    $lines = [];
    $sort = 0;
    foreach ($legacy as [$category, $label, $amount]) {
        if ($amount <= 0) {
            continue;
        }
        $lines[] = [
            'monthKey' => $monthKey,
            'category' => $category,
            'label' => $label,
            'amount' => round($amount, 2),
            'sortOrder' => $sort++,
        ];
    }

    return $lines;
}

/**
 * @param array<int, array<string, mixed>> $lines
 */
function shoptop_expense_lines_save(PDO $pdo, string $monthKey, array $lines): array
{
    if (!shoptop_expense_lines_table_exists($pdo)) {
        throw new RuntimeException('Tabelul monthly_expense_lines lipseste. Ruleaza migrarea SQL.');
    }

    $pdo->beginTransaction();
    try {
        $del = $pdo->prepare('DELETE FROM monthly_expense_lines WHERE month_key = :month_key');
        $del->execute(['month_key' => $monthKey]);

        $ins = $pdo->prepare(
            'INSERT INTO monthly_expense_lines (month_key, category, label, amount, sort_order)
             VALUES (:month_key, :category, :label, :amount, :sort_order)'
        );

        $sort = 0;
        foreach ($lines as $line) {
            if (!is_array($line)) {
                continue;
            }
            $category = trim((string) ($line['category'] ?? 'alte'));
            if (!shoptop_valid_expense_category($category)) {
                $category = 'alte';
            }
            $amount = shoptop_parse_money($line['amount'] ?? 0);
            if ($amount <= 0) {
                continue;
            }
            $ins->execute([
                'month_key' => $monthKey,
                'category' => $category,
                'label' => trim((string) ($line['label'] ?? '')),
                'amount' => $amount,
                'sort_order' => (int) ($line['sortOrder'] ?? $sort++),
            ]);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    return shoptop_expense_lines_fetch($pdo, $monthKey);
}

if ($method === 'GET') {
    shoptop_require_admin();
    $monthKey = trim((string) ($_GET['month'] ?? ''));
    if (!shoptop_valid_month_key($monthKey)) {
        shoptop_json_error('Luna este invalida. Foloseste formatul YYYY-MM.', 400);
    }

    $lines = shoptop_expense_lines_fetch($pdo, $monthKey);
    if ($lines === []) {
        $legacy = shoptop_expense_lines_legacy_seed($pdo, $monthKey);
        if ($legacy !== []) {
            $lines = shoptop_expense_lines_save($pdo, $monthKey, $legacy);
        }
    }

    $total = 0.0;
    foreach ($lines as $line) {
        $total += (float) ($line['amount'] ?? 0);
    }

    shoptop_json_response([
        'monthKey' => $monthKey,
        'lines' => $lines,
        'total' => round($total, 2),
    ]);
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

    $rawLines = $body['lines'] ?? [];
    if (!is_array($rawLines)) {
        shoptop_json_error('Campul lines trebuie sa fie un array.', 400);
    }

    try {
        $saved = shoptop_expense_lines_save($pdo, $monthKey, $rawLines);
    } catch (RuntimeException $e) {
        shoptop_json_error($e->getMessage(), 500);
    }

    $total = 0.0;
    foreach ($saved as $line) {
        $total += (float) ($line['amount'] ?? 0);
    }

    shoptop_json_response([
        'monthKey' => $monthKey,
        'lines' => $saved,
        'total' => round($total, 2),
    ]);
}

shoptop_json_error('Metoda HTTP nu este suportata.', 405);
