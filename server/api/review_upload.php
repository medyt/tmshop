<?php

declare(strict_types=1);

require_once __DIR__ . '/lib.php';

shoptop_send_cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    shoptop_json_error('Metoda HTTP nu este suportata.', 405);
}

// 2MB max (reduce spam/abuz pe shared hosting).
$maxBytes = 2 * 1024 * 1024;

if (!isset($_FILES['image']) || !is_array($_FILES['image'])) {
    shoptop_json_error('Câmpul image este obligatoriu.', 400);
}

$file = $_FILES['image'];
if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    shoptop_json_error('Nu am putut încărca imaginea.', 400);
}

$size = (int) ($file['size'] ?? 0);
if ($size <= 0 || $size > $maxBytes) {
    shoptop_json_error('Imagine prea mare (maxim 2MB).', 400);
}

$tmp = (string) ($file['tmp_name'] ?? '');
if ($tmp === '' || !is_file($tmp)) {
    shoptop_json_error('Fișier invalid.', 400);
}

$info = @getimagesize($tmp);
if (!is_array($info) || empty($info['mime'])) {
    shoptop_json_error('Fișierul nu este o imagine validă.', 400);
}

$mime = (string) $info['mime'];
$ext = match ($mime) {
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    default => '',
};
if ($ext === '') {
    shoptop_json_error('Format imagine nesuportat (JPG/PNG/WEBP).', 400);
}

$dir = __DIR__ . '/uploads/reviews';
if (!is_dir($dir)) {
    @mkdir($dir, 0775, true);
}
if (!is_dir($dir) || !is_writable($dir)) {
    shoptop_json_error('Nu pot salva imaginea pe server.', 500);
}

$name = bin2hex(random_bytes(16)) . '.' . $ext;
$dest = $dir . '/' . $name;
if (!move_uploaded_file($tmp, $dest)) {
    shoptop_json_error('Nu am putut salva imaginea.', 500);
}

// Construiește URL relativ la baza API-ului curent (ex. /shoptop-api).
$apiBase = rtrim(str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? ''))), '/');
$publicPath = ($apiBase !== '' ? $apiBase : '') . '/uploads/reviews/' . $name;

shoptop_json_response([
    'ok' => true,
    'url' => $publicPath,
]);

