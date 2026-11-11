<?php

/**
 * Aplica descrierile din scripts/landing/content/<id>.html in baza locala si
 * genereaza sql/update-landing-descriptions-server.sql pentru server (phpMyAdmin).
 *
 * Rulare: php scripts/landing/apply.php            (scrie in DB + genereaza SQL)
 *         php scripts/landing/apply.php --sql-only (doar fisierul SQL)
 */

declare(strict_types=1);

$root = dirname(__DIR__, 2);
$sqlOnly = in_array('--sql-only', $argv, true);
$config = require $root . '/server/api/config.php';
$db = $config['db'];

$pdo = new PDO(
    sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $db['host'], $db['name']),
    $db['user'],
    $db['pass'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
);

$files = glob(__DIR__ . '/content/*.html') ?: [];
sort($files);

// --only=A024,A005 limiteaza rularea la cateva produse (SQL-ul generat le contine doar pe ele).
foreach ($argv as $arg) {
    if (str_starts_with($arg, '--only=')) {
        $only = array_filter(explode(',', substr($arg, 7)));
        $files = array_values(array_filter(
            $files,
            static fn (string $f): bool => in_array(basename($f, '.html'), $only, true),
        ));
    }
}

$sql = "-- Descrieri produse in format landing (.lpd). Generat de scripts/landing/apply.php\n"
    . "-- Inainte de rulare: fa backup la tabela products si urca pozele din\n"
    . "-- server/api/uploads/landing/ in shoptop-api/uploads/landing/ pe server.\n"
    . "SET NAMES utf8mb4;\n\n";

$update = $pdo->prepare('UPDATE products SET description = :d WHERE id = :id');
$exists = $pdo->prepare('SELECT COUNT(*) FROM products WHERE id = :id');
$problems = 0;

foreach ($files as $file) {
    $id = basename($file, '.html');
    $html = trim((string) file_get_contents($file));

    if (!str_starts_with($html, '<div class="lpd">')) {
        fwrite(STDERR, "$id: nu incepe cu <div class=\"lpd\"> — sarit\n");
        $problems++;
        continue;
    }
    if (preg_match('/style=|<script|data:image/i', $html)) {
        fwrite(STDERR, "$id: contine style/script/base64 — sarit\n");
        $problems++;
        continue;
    }
    preg_match_all('#src="/shoptop-api/uploads/landing/([^"]+)"#', $html, $m);
    foreach ($m[1] as $img) {
        if (!is_file($root . '/server/api/uploads/landing/' . $img)) {
            fwrite(STDERR, "$id: lipseste poza $img\n");
            $problems++;
        }
    }

    $exists->execute(['id' => $id]);
    if ((int) $exists->fetchColumn() === 0) {
        fwrite(STDERR, "$id: produsul nu exista in baza locala\n");
        $problems++;
    } elseif (!$sqlOnly) {
        $update->execute(['d' => $html, 'id' => $id]);
    }

    $sql .= sprintf(
        "UPDATE products SET description = %s WHERE id = %s;\n\n",
        $pdo->quote($html),
        $pdo->quote($id),
    );
    printf("%s  %d KB, %d poze\n", $id, (int) ceil(strlen($html) / 1024), count($m[1]));
}

$out = $root . '/sql/update-landing-descriptions-server.sql';
file_put_contents($out, $sql);
printf(
    "%d descrieri%s. SQL: %s. Probleme: %d\n",
    count($files),
    $sqlOnly ? '' : ' aplicate local',
    $out,
    $problems,
);
exit($problems > 0 ? 1 : 0);
