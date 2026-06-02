<?php

declare(strict_types=1);

require_once __DIR__ . '/lib.php';

/**
 * Mailer fara dependinte externe (fara Composer/PHPMailer).
 * Daca exista config 'smtp' cu host+user, trimite prin SMTP (STARTTLS/SSL + AUTH LOGIN).
 * Altfel revine la functia mail() ca fallback. Trimite multipart/alternative (text + HTML).
 */

function shoptop_smtp_settings(): array
{
    $config = shoptop_config();
    $smtp = is_array($config['smtp'] ?? null) ? $config['smtp'] : [];

    $fromEmail = trim((string) ($smtp['from_email'] ?? ''));
    if ($fromEmail === '') {
        $fromEmail = trim((string) ($config['shop_email'] ?? 'contact@shop-top.ro'));
    }

    return [
        'host' => trim((string) ($smtp['host'] ?? '')),
        'port' => (int) ($smtp['port'] ?? 587),
        'secure' => strtolower(trim((string) ($smtp['secure'] ?? 'tls'))),
        'user' => (string) ($smtp['user'] ?? ''),
        'pass' => (string) ($smtp['pass'] ?? ''),
        'from_email' => $fromEmail,
        'from_name' => trim((string) ($smtp['from_name'] ?? 'ShopTop')),
    ];
}

function shoptop_mime_encode_header(string $value): string
{
    if (preg_match('/[\x80-\xFF]/', $value)) {
        return '=?UTF-8?B?' . base64_encode($value) . '?=';
    }

    return $value;
}

function shoptop_build_mime_message(
    string $fromHeader,
    string $to,
    string $subject,
    string $html,
    string $text,
    ?string $replyTo = null
): string {
    $boundary = '=_shoptop_' . bin2hex(random_bytes(10));

    $headers = [];
    $headers[] = 'Date: ' . date('r');
    $headers[] = 'From: ' . $fromHeader;
    $replyTo = $replyTo !== null ? trim($replyTo) : '';
    if ($replyTo !== '' && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
        $headers[] = 'Reply-To: ' . $replyTo;
    }
    $headers[] = 'To: ' . $to;
    $headers[] = 'Subject: ' . shoptop_mime_encode_header($subject);
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'Content-Type: multipart/alternative; boundary="' . $boundary . '"';

    $body = '--' . $boundary . "\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($text)) . "\r\n"
        . '--' . $boundary . "\r\n"
        . "Content-Type: text/html; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($html)) . "\r\n"
        . '--' . $boundary . "--\r\n";

    return implode("\r\n", $headers) . "\r\n\r\n" . $body;
}

function shoptop_smtp_deliver(
    array $smtp,
    string $to,
    string $subject,
    string $html,
    string $text,
    ?string $replyTo = null
): bool
{
    $host = $smtp['host'];
    $port = $smtp['port'] > 0 ? $smtp['port'] : 587;
    $secure = $smtp['secure'];
    $timeout = 20;

    $transport = $secure === 'ssl' ? 'ssl://' . $host : $host;
    $fp = @fsockopen($transport, $port, $errno, $errstr, $timeout);
    if (!$fp) {
        error_log("SMTP connect failed ($errno): $errstr");
        return false;
    }
    stream_set_timeout($fp, $timeout);

    $read = static function () use ($fp): string {
        $data = '';
        while (($line = fgets($fp, 515)) !== false) {
            $data .= $line;
            if (strlen($line) < 4 || $line[3] === ' ') {
                break;
            }
        }
        return $data;
    };
    $expect = static function (string $resp, array $codes): bool {
        return in_array((int) substr($resp, 0, 3), $codes, true);
    };
    $cmd = static function (string $line) use ($fp, $read): string {
        fwrite($fp, $line . "\r\n");
        return $read();
    };

    $ehloHost = (string) ($_SERVER['SERVER_NAME'] ?? 'localhost');

    try {
        if (!$expect($read(), [220])) {
            return false;
        }
        if (!$expect($cmd('EHLO ' . $ehloHost), [250])) {
            return false;
        }

        if ($secure === 'tls') {
            if (!$expect($cmd('STARTTLS'), [220])) {
                return false;
            }
            $crypto = STREAM_CRYPTO_METHOD_TLS_CLIENT;
            if (defined('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT')) {
                $crypto |= STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
            }
            if (!stream_socket_enable_crypto($fp, true, $crypto)) {
                return false;
            }
            if (!$expect($cmd('EHLO ' . $ehloHost), [250])) {
                return false;
            }
        }

        if ($smtp['user'] !== '') {
            if (!$expect($cmd('AUTH LOGIN'), [334])) {
                return false;
            }
            if (!$expect($cmd(base64_encode($smtp['user'])), [334])) {
                return false;
            }
            if (!$expect($cmd(base64_encode($smtp['pass'])), [235])) {
                return false;
            }
        }

        if (!$expect($cmd('MAIL FROM:<' . $smtp['from_email'] . '>'), [250])) {
            return false;
        }
        if (!$expect($cmd('RCPT TO:<' . $to . '>'), [250, 251])) {
            return false;
        }
        if (!$expect($cmd('DATA'), [354])) {
            return false;
        }

        $fromHeader = $smtp['from_name'] !== ''
            ? shoptop_mime_encode_header($smtp['from_name']) . ' <' . $smtp['from_email'] . '>'
            : $smtp['from_email'];

        $message = shoptop_build_mime_message($fromHeader, $to, $subject, $html, $text, $replyTo);
        // Dot-stuffing pentru linii care incep cu punct.
        $message = preg_replace('/^\./m', '..', $message);

        fwrite($fp, $message . "\r\n.\r\n");
        if (!$expect($read(), [250])) {
            return false;
        }

        $cmd('QUIT');
    } finally {
        fclose($fp);
    }

    return true;
}

/**
 * Trimite un email HTML (cu alternativa text). Returneaza true daca a fost predat.
 */
function shoptop_send_mail(
    string $to,
    string $subject,
    string $html,
    ?string $text = null,
    ?string $replyTo = null
): bool {
    $to = trim($to);
    if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
        return false;
    }

    if ($text === null || $text === '') {
        $text = trim(preg_replace('/\s+/', ' ', strip_tags($html)) ?? '');
    }

    $smtp = shoptop_smtp_settings();

    if ($smtp['host'] !== '' && $smtp['user'] !== '') {
        if (shoptop_smtp_deliver($smtp, $to, $subject, $html, $text, $replyTo)) {
            return true;
        }
        error_log('SMTP delivery failed, fallback to mail() for ' . $to);
    }

    // Fallback mail()
    $fromHeader = $smtp['from_name'] !== ''
        ? shoptop_mime_encode_header($smtp['from_name']) . ' <' . $smtp['from_email'] . '>'
        : $smtp['from_email'];

    $boundary = '=_shoptop_' . bin2hex(random_bytes(10));
    $headers = [
        'From: ' . $fromHeader,
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
    ];
    $replyToTrim = $replyTo !== null ? trim($replyTo) : '';
    if ($replyToTrim !== '' && filter_var($replyToTrim, FILTER_VALIDATE_EMAIL)) {
        $headers[] = 'Reply-To: ' . $replyToTrim;
    }
    $body = '--' . $boundary . "\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($text)) . "\r\n"
        . '--' . $boundary . "\r\n"
        . "Content-Type: text/html; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($html)) . "\r\n"
        . '--' . $boundary . "--\r\n";

    return @mail(
        $to,
        '=?UTF-8?B?' . base64_encode($subject) . '?=',
        $body,
        implode("\r\n", $headers)
    );
}

// -----------------------------------------------------------------------------
// Sabloane HTML
// -----------------------------------------------------------------------------

function shoptop_email_brand(): string
{
    return 'ShopTop';
}

function shoptop_email_money(float $value): string
{
    return number_format($value, 2, ',', '.') . ' RON';
}

function shoptop_email_layout(string $heading, string $contentHtml): string
{
    $brand = htmlspecialchars(shoptop_email_brand(), ENT_QUOTES, 'UTF-8');
    $config = shoptop_config();
    $siteUrl = htmlspecialchars(trim((string) ($config['site_url'] ?? 'https://shop-top.ro')), ENT_QUOTES, 'UTF-8');
    $shopEmail = htmlspecialchars(trim((string) ($config['shop_email'] ?? 'contact@shop-top.ro')), ENT_QUOTES, 'UTF-8');
    $year = date('Y');
    $headingHtml = htmlspecialchars($heading, ENT_QUOTES, 'UTF-8');

    return <<<HTML
<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2430;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6e8ec;">
        <tr><td style="background:#111827;padding:20px 28px;">
          <a href="$siteUrl" style="color:#ffffff;font-size:20px;font-weight:bold;text-decoration:none;">$brand</a>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">$headingHtml</h1>
          $contentHtml
        </td></tr>
        <tr><td style="padding:20px 28px;background:#f9fafb;border-top:1px solid #e6e8ec;font-size:12px;color:#6b7280;">
          <p style="margin:0 0 4px;">Ai întrebări? Scrie-ne la <a href="mailto:$shopEmail" style="color:#2563eb;">$shopEmail</a>.</p>
          <p style="margin:0;">&copy; $year $brand. Toate drepturile rezervate.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;
}

function shoptop_email_items_table(array $order): string
{
    $rows = '';
    foreach ($order['items'] as $item) {
        $name = htmlspecialchars((string) $item['productName'], ENT_QUOTES, 'UTF-8');
        $qty = (int) $item['quantity'];
        $line = shoptop_email_money((float) $item['lineTotal']);
        $rows .= '<tr>'
            . '<td style="padding:8px 0;border-bottom:1px solid #eef0f3;">' . $name . ' &times; ' . $qty . '</td>'
            . '<td align="right" style="padding:8px 0;border-bottom:1px solid #eef0f3;white-space:nowrap;">' . $line . '</td>'
            . '</tr>';
    }

    $total = shoptop_email_money((float) $order['totalAmount']);

    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:16px 0;">'
        . $rows
        . '<tr><td style="padding:12px 0 0;font-weight:bold;">Total</td>'
        . '<td align="right" style="padding:12px 0 0;font-weight:bold;white-space:nowrap;">' . $total . '</td></tr>'
        . '</table>';
}

/** @return array{subject:string, html:string} */
function shoptop_render_order_confirmation_email(array $order): array
{
    $orderId = htmlspecialchars((string) $order['id'], ENT_QUOTES, 'UTF-8');
    $name = htmlspecialchars((string) ($order['customerName'] ?? ''), ENT_QUOTES, 'UTF-8');
    $address = htmlspecialchars((string) ($order['customerAddress'] ?? ''), ENT_QUOTES, 'UTF-8');

    $carrier = '';
    if (!empty($order['deliveryCarrier'])) {
        $carrierLabel = $order['deliveryCarrier'] === 'dpd' ? 'DPD' : 'Fan Courier';
        $carrier = '<p style="margin:0 0 6px;color:#4b5563;">Curier: <strong>' . $carrierLabel . '</strong></p>';
    }

    $content = '<p style="margin:0 0 12px;">Bună' . ($name !== '' ? ', ' . $name : '') . '!</p>'
        . '<p style="margin:0 0 12px;">Am primit comanda ta <strong>' . $orderId . '</strong>. O pregătim pentru livrare și revenim cu detalii.</p>'
        . shoptop_email_items_table($order)
        . $carrier
        . '<p style="margin:0 0 6px;color:#4b5563;">Adresă livrare: ' . $address . '</p>'
        . '<p style="margin:16px 0 0;">Plata se face la livrare, dacă nu ai ales plata online.</p>';

    return [
        'subject' => 'Confirmare comandă ' . (string) $order['id'],
        'html' => shoptop_email_layout('Comanda ta a fost înregistrată', $content),
    ];
}

/** @return array{subject:string, html:string}|null Null daca statusul nu are email dedicat. */
function shoptop_render_order_status_email(array $order, string $status): ?array
{
    $orderId = (string) $order['id'];
    $orderIdHtml = htmlspecialchars($orderId, ENT_QUOTES, 'UTF-8');
    $name = htmlspecialchars((string) ($order['customerName'] ?? ''), ENT_QUOTES, 'UTF-8');
    $greeting = '<p style="margin:0 0 12px;">Bună' . ($name !== '' ? ', ' . $name : '') . '!</p>';

    $awb = '';
    if (!empty($order['awbNumber'])) {
        $awb = '<p style="margin:0 0 12px;">Număr AWB: <strong>'
            . htmlspecialchars((string) $order['awbNumber'], ENT_QUOTES, 'UTF-8')
            . '</strong></p>';
    }

    switch ($status) {
        case 'confirmed':
            return [
                'subject' => 'Comanda ' . $orderId . ' este confirmată',
                'html' => shoptop_email_layout(
                    'Comanda ta este confirmată',
                    $greeting
                        . '<p style="margin:0 0 12px;">Comanda <strong>' . $orderIdHtml . '</strong> a fost confirmată și intră în pregătire.</p>'
                        . shoptop_email_items_table($order)
                ),
            ];
        case 'shipped':
            return [
                'subject' => 'Comanda ' . $orderId . ' a fost expediată',
                'html' => shoptop_email_layout(
                    'Comanda ta a fost expediată',
                    $greeting
                        . '<p style="margin:0 0 12px;">Comanda <strong>' . $orderIdHtml . '</strong> a plecat către tine prin curier.</p>'
                        . $awb
                ),
            ];
        case 'delivered':
            return [
                'subject' => 'Comanda ' . $orderId . ' a fost livrată',
                'html' => shoptop_email_layout(
                    'Comanda ta a fost livrată',
                    $greeting
                        . '<p style="margin:0 0 12px;">Comanda <strong>' . $orderIdHtml . '</strong> a fost livrată. Îți mulțumim!</p>'
                        . '<p style="margin:0;color:#4b5563;">Dacă ai nevoie de retur, ne poți scrie oricând.</p>'
                ),
            ];
        case 'cancelled':
            return [
                'subject' => 'Comanda ' . $orderId . ' a fost anulată',
                'html' => shoptop_email_layout(
                    'Comanda ta a fost anulată',
                    $greeting
                        . '<p style="margin:0 0 12px;">Comanda <strong>' . $orderIdHtml . '</strong> a fost anulată. Dacă este o eroare, răspunde la acest email.</p>'
                ),
            ];
        default:
            return null;
    }
}
