<?php

/**
 * Scoate pozele base64 din descrierile produselor si le salveaza ca fisiere WebP
 * mici in server/api/uploads/landing/<id>-<n>.webp (max 720px latime).
 * Salveaza si un backup JSON al descrierilor originale.
 *
 * Rulare: php scripts/landing/extract-images.php [cale-backup.json]
 * Nu modifica baza de date.
 */

declare(strict_types=1);

$root = dirname(__DIR__, 2);
$config = require $root . '/server/api/config.php';
$db = $config['db'];

$pdo = new PDO(
    sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $db['host'], $db['name']),
    $db['user'],
    $db['pass'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
);

$outDir = $root . '/server/api/uploads/landing';
if (!is_dir($outDir) && !mkdir($outDir, 0775, true)) {
    fwrite(STDERR, "Nu pot crea $outDir\n");
    exit(1);
}

$backupPath = $argv[1] ?? ($root . '/scripts/landing/descriptions-backup.json');
$maxWidth = 720;

$rows = $pdo->query(
    "SELECT id, name, description FROM products WHERE description LIKE '%data:image/%'",
)->fetchAll(PDO::FETCH_ASSOC);

$backup = [];
foreach ($rows as $row) {
    $id = (string) $row['id'];
    $backup[$id] = $row['description'];
    $safeId = preg_replace('/[^A-Za-z0-9_-]/', '', $id);

    preg_match_all('#src="data:image/[a-z+]+;base64,([^"]+)"#i', (string) $row['description'], $m);
    $n = 0;
    foreach ($m[1] as $b64) {
        $n++;
        $binary = base64_decode($b64, true);
        $img = $binary !== false ? @imagecreatefromstring($binary) : false;
        if ($img === false) {
            fwrite(STDERR, "$id: poza $n nu a putut fi decodata\n");
            continue;
        }
        $w = imagesx($img);
        $h = imagesy($img);
        if ($w > $maxWidth) {
            $scaled = imagescale($img, $maxWidth, (int) round($h * $maxWidth / $w), IMG_BICUBIC);
            if ($scaled !== false) {
                imagedestroy($img);
                $img = $scaled;
            }
        }
        imagepalettetotruecolor($img);
        imagealphablending($img, false);
        imagesavealpha($img, true);
        $dest = sprintf('%s/%s-%d.webp', $outDir, $safeId, $n);
        imagewebp($img, $dest, 80);
        printf(
            "%s-%d.webp  %dx%d -> %dx%d  %d KB -> %d KB\n",
            $safeId,
            $n,
            $w,
            $h,
            imagesx($img),
            imagesy($img),
            (int) round(strlen($binary) / 1024),
            (int) round(filesize($dest) / 1024),
        );
        imagedestroy($img);
    }
}

file_put_contents(
    $backupPath,
    json_encode($backup, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT),
);
printf("Backup descrieri originale: %s (%d produse)\n", $backupPath, count($backup));
