<?php

declare(strict_types=1);

require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/mailer.php';

shoptop_send_cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    shoptop_json_error('Metoda nu este permisă.', 405);
}

$body = shoptop_read_json_body();
if (!is_array($body)) {
    shoptop_json_error('Corpul cererii trebuie să fie un obiect JSON.', 400);
}

$name = trim((string) ($body['name'] ?? ''));
$email = trim((string) ($body['email'] ?? ''));
$subjectField = trim((string) ($body['subject'] ?? ''));
$message = trim((string) ($body['message'] ?? ''));

if ($name === '' || mb_strlen($name) > 200) {
    shoptop_json_error('Numele este obligatoriu (max. 200 de caractere).', 400);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    shoptop_json_error('Adresa de email nu este validă.', 400);
}
if ($message === '' || mb_strlen($message) < 10) {
    shoptop_json_error('Mesajul trebuie să aibă cel puțin 10 caractere.', 400);
}
if (mb_strlen($message) > 8000) {
    shoptop_json_error('Mesajul este prea lung (max. 8000 de caractere).', 400);
}
if ($subjectField !== '' && mb_strlen($subjectField) > 200) {
    shoptop_json_error('Subiectul este prea lung (max. 200 de caractere).', 400);
}

$config = shoptop_config();
$contactTo = trim((string) ($config['contact_email'] ?? ''));
if ($contactTo === '') {
    $contactTo = trim((string) ($config['shop_email'] ?? ''));
}
if ($contactTo === '' || !filter_var($contactTo, FILTER_VALIDATE_EMAIL)) {
    shoptop_json_error('Destinatarul emailului nu este configurat pe server.', 503);
}

$mailSubject = $subjectField !== ''
    ? '[Contact] ' . $subjectField
    : '[Contact] Mesaj de la ' . $name;

$esc = static function (string $s): string {
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
};

$html = '<p><strong>De la:</strong> ' . $esc($name) . ' &lt;' . $esc($email) . '&gt;</p>';
if ($subjectField !== '') {
    $html .= '<p><strong>Subiect:</strong> ' . $esc($subjectField) . '</p>';
}
$html .= '<p><strong>Mesaj:</strong></p><p style="white-space:pre-wrap;">' . nl2br($esc($message), false) . '</p>';

$text = "De la: $name <$email>\n";
if ($subjectField !== '') {
    $text .= "Subiect: $subjectField\n";
}
$text .= "\n" . $message;

$emailBody = shoptop_email_layout('Mesaj nou de pe site', $html);

if (!shoptop_send_mail($contactTo, $mailSubject, $emailBody, $text, $email)) {
    shoptop_json_error('Nu am putut trimite mesajul. Încearcă mai târziu.', 502);
}

shoptop_json_response(['ok' => true]);
