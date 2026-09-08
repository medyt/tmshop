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

shoptop_require_admin();

$maxBytes = 5 * 1024 * 1024;
$allowed = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif',
];

/**
 * @return array{0:string,1:string} [binary, ext]
 */
function shoptop_product_upload_from_file(array $file, int $maxBytes, array $allowed): array
{
    $err = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($err !== UPLOAD_ERR_OK) {
        $hint = match ($err) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Imagine prea mare pentru limitele PHP (upload_max_filesize).',
            UPLOAD_ERR_PARTIAL => 'Upload incomplet. Reincearca.',
            UPLOAD_ERR_NO_FILE => 'Niciun fisier primit.',
            default => 'Nu am putut incarca imaginea (cod ' . $err . ').',
        };
        shoptop_json_error($hint, 400);
    }

    $size = (int) ($file['size'] ?? 0);
    if ($size <= 0 || $size > $maxBytes) {
        shoptop_json_error('Imagine prea mare (maxim 5MB).', 400);
    }

    $tmp = (string) ($file['tmp_name'] ?? '');
    if ($tmp === '' || !is_file($tmp)) {
        shoptop_json_error('Fisier invalid.', 400);
    }

    $info = @getimagesize($tmp);
    if (!is_array($info) || empty($info['mime'])) {
        shoptop_json_error('Fisierul nu este o imagine valida.', 400);
    }

    $mime = (string) $info['mime'];
    if (!isset($allowed[$mime])) {
        shoptop_json_error('Format imagine nesuportat (JPG/PNG/WEBP/GIF).', 400);
    }

    $binary = file_get_contents($tmp);
    if ($binary === false || $binary === '') {
        shoptop_json_error('Nu am putut citi imaginea.', 400);
    }

    return [$binary, $allowed[$mime]];
}

/**
 * @return array{0:string,1:string} [binary, ext]
 */
function shoptop_product_upload_from_data_url(string $dataUrl, int $maxBytes, array $allowed): array
{
    if (!preg_match('#^data:(image/(?:jpeg|jpg|png|webp|gif));base64,(.+)$#is', trim($dataUrl), $m)) {
        shoptop_json_error('dataUrl invalid. Astept data:image/...;base64,...', 400);
    }

    $mime = strtolower($m[1]);
    if ($mime === 'image/jpg') {
        $mime = 'image/jpeg';
    }
    if (!isset($allowed[$mime])) {
        shoptop_json_error('Format imagine nesuportat (JPG/PNG/WEBP/GIF).', 400);
    }

    $binary = base64_decode($m[2], true);
    if ($binary === false || $binary === '') {
        shoptop_json_error('Nu am putut decoda imaginea.', 400);
    }

    if (strlen($binary) > $maxBytes) {
        shoptop_json_error('Imagine prea mare (maxim 5MB).', 400);
    }

    $info = @getimagesizefromstring($binary);
    if (!is_array($info) || empty($info['mime'])) {
        shoptop_json_error('Fisierul nu este o imagine valida.', 400);
    }

    return [$binary, $allowed[$mime]];
}

function shoptop_product_upload_ensure_dir(string $dir): void
{
    if (!is_dir($dir)) {
        $ok = @mkdir($dir, 0775, true);
        if (!$ok && !is_dir($dir)) {
            shoptop_json_error(
                'Lipseste folderul uploads/products pe server. Creeaza-l in File Manager (permisiuni 755 sau 775) langa product_upload.php.',
                500
            );
        }
    }

    // Unele host-uri raporteaza is_writable=false desi scrierea merge — test real.
    $probe = $dir . DIRECTORY_SEPARATOR . '.write_probe_' . bin2hex(random_bytes(4));
    $written = @file_put_contents($probe, 'ok');
    if ($written === false) {
        shoptop_json_error(
            'Folderul uploads/products nu este scriabil. In cPanel: click dreapta pe uploads/products → Permissions → 755 sau 775.',
            500
        );
    }
    @unlink($probe);
}

$binary = '';
$ext = '';

$contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);

if (isset($_FILES['image']) && is_array($_FILES['image'])) {
    [$binary, $ext] = shoptop_product_upload_from_file($_FILES['image'], $maxBytes, $allowed);
} else {
    $raw = file_get_contents('php://input');
    if (($raw === false || $raw === '') && $contentLength > 0) {
        shoptop_json_error(
            'Cererea a fost respinsa de PHP (prea mare). Mareste post_max_size in hosting sau foloseste o imagine mai mica.',
            413
        );
    }
    if ($raw === false || $raw === '') {
        shoptop_json_error('Trimite fisierul (multipart image) sau JSON cu dataUrl.', 400);
    }
    $body = json_decode($raw, true);
    if (!is_array($body)) {
        shoptop_json_error('JSON invalid pentru upload.', 400);
    }
    $dataUrl = trim((string) ($body['dataUrl'] ?? ''));
    if ($dataUrl === '') {
        shoptop_json_error('Campul dataUrl este obligatoriu.', 400);
    }
    [$binary, $ext] = shoptop_product_upload_from_data_url($dataUrl, $maxBytes, $allowed);
}

$dir = __DIR__ . '/uploads/products';
shoptop_product_upload_ensure_dir($dir);

$name = bin2hex(random_bytes(16)) . '.' . $ext;
$dest = $dir . DIRECTORY_SEPARATOR . $name;
if (@file_put_contents($dest, $binary) === false) {
    shoptop_json_error('Nu am putut salva imaginea pe disc.', 500);
}

$apiBase = rtrim(str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? ''))), '/');
$publicPath = ($apiBase !== '' ? $apiBase : '') . '/uploads/products/' . $name;

shoptop_json_response([
    'ok' => true,
    'url' => $publicPath,
]);
