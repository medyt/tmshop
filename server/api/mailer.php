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

/** Link către recenzii pe primul produs real din comandă. */
function shoptop_order_review_url(array $order): string
{
    $config = shoptop_config();
    $site = rtrim((string) ($config['site_url'] ?? 'https://shop-top.ro'), '/');
    $items = is_array($order['items'] ?? null) ? $order['items'] : [];
    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }
        $productId = trim((string) ($item['productId'] ?? $item['product_id'] ?? ''));
        if ($productId === '') {
            continue;
        }
        if (function_exists('shoptop_is_virtual_product_id') && shoptop_is_virtual_product_id($productId)) {
            continue;
        }
        $slug = $productId;
        try {
            $pdo = shoptop_pdo();
            $stmt = $pdo->prepare('SELECT slug FROM products WHERE id = :id LIMIT 1');
            $stmt->execute(['id' => $productId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $fromDb = trim((string) ($row['slug'] ?? ''));
            if ($fromDb !== '') {
                $slug = $fromDb;
            }
        } catch (Throwable $e) {
            /* fallback id */
        }

        return $site . '/produs/' . rawurlencode($slug) . '#product-reviews';
    }

    return '';
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

    $paymentMethod = (string) ($order['paymentMethod'] ?? 'cod');
    $paymentLine = $paymentMethod === 'card'
        ? '<p style="margin:16px 0 0;">Plata cu cardul a fost înregistrată.</p>'
        : '<p style="margin:16px 0 0;">Plata se face ramburs, la livrare.</p>';

    $content = '<p style="margin:0 0 12px;">Bună' . ($name !== '' ? ', ' . $name : '') . '!</p>'
        . '<p style="margin:0 0 12px;">Am primit comanda ta <strong>' . $orderId . '</strong>. O pregătim pentru livrare și revenim cu detalii. Ai primit și un SMS de confirmare pe numărul din comandă.</p>'
        . shoptop_email_items_table($order)
        . $carrier
        . '<p style="margin:0 0 6px;color:#4b5563;">Adresă livrare: ' . $address . '</p>'
        . $paymentLine;

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
            $reviewUrl = shoptop_order_review_url($order);
            $reviewCta = $reviewUrl !== ''
                ? '<p style="margin:16px 0 0;"><a href="'
                    . htmlspecialchars($reviewUrl, ENT_QUOTES, 'UTF-8')
                    . '" style="display:inline-block;background:#166534;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">Lasă o recenzie</a></p>'
                    . '<p style="margin:10px 0 0;color:#4b5563;">Ne ajută pe noi și pe alți clienți dacă spui cum ți s-a părut produsul.</p>'
                : '';
            return [
                'subject' => 'Comanda ' . $orderId . ' a fost livrată',
                'html' => shoptop_email_layout(
                    'Comanda ta a fost livrată',
                    $greeting
                        . '<p style="margin:0 0 12px;">Comanda <strong>' . $orderIdHtml . '</strong> a fost livrată. Îți mulțumim!</p>'
                        . $reviewCta
                        . '<p style="margin:16px 0 0;color:#4b5563;">Dacă ai nevoie de retur, ne poți scrie oricând.</p>'
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

/**
 * Adresa de retur din config (aceeași ca expeditorul de pe AWB).
 */
function shoptop_return_address(): string
{
    $config = shoptop_config();
    $address = trim((string) ($config['return_address'] ?? ''));
    if ($address !== '') {
        return $address;
    }

    return 'Sat Alexandru cel Bun, str. Iaz nr. 1, județul Iași, cod poștal 707591, România';
}

function shoptop_operator_name(): string
{
    $config = shoptop_config();
    $name = trim((string) ($config['operator_name'] ?? ''));

    return $name !== '' ? $name : 'TM SHOP SRL';
}

function shoptop_return_phone(): string
{
    $config = shoptop_config();
    $phone = trim((string) ($config['return_phone'] ?? ''));
    if ($phone !== '') {
        return $phone;
    }

    // Fallback pentru emailul de retur (nu e afișat public pe site).
    return '0757 192 613';
}

/**
 * Email după validarea cererii de retur: adresa de expediere + condiții.
 *
 * @param array{
 *   orderId:string,
 *   customerName?:string,
 *   orderTotal?:float|null,
 *   iban?:string
 * } $returnRequest
 * @return array{subject:string, html:string}
 */
function shoptop_render_return_approved_email(array $returnRequest): array
{
    $orderId = trim((string) ($returnRequest['orderId'] ?? ''));
    $orderIdHtml = htmlspecialchars($orderId, ENT_QUOTES, 'UTF-8');
    $name = htmlspecialchars(trim((string) ($returnRequest['customerName'] ?? '')), ENT_QUOTES, 'UTF-8');
    $greeting = '<p style="margin:0 0 12px;">Bună' . ($name !== '' ? ', ' . $name : '') . '!</p>';
    $addressHtml = htmlspecialchars(shoptop_return_address(), ENT_QUOTES, 'UTF-8');
    $operatorHtml = htmlspecialchars(shoptop_operator_name(), ENT_QUOTES, 'UTF-8');
    $phoneHtml = htmlspecialchars(shoptop_return_phone(), ENT_QUOTES, 'UTF-8');

    $totalBlock = '';
    $orderTotal = $returnRequest['orderTotal'] ?? null;
    $iban = strtoupper(preg_replace('/\s+/', '', trim((string) ($returnRequest['iban'] ?? ''))) ?? '');
    $ibanHtml = $iban !== '' ? htmlspecialchars($iban, ENT_QUOTES, 'UTF-8') : '';

    if (is_numeric($orderTotal) && (float) $orderTotal > 0) {
        $amountHtml = shoptop_email_money((float) $orderTotal);
        $totalBlock = $ibanHtml !== ''
            ? '<p style="margin:0 0 12px;">După ce primim coletul, îți rambursăm <strong>'
                . $amountHtml . '</strong> (suma totală a comenzii) în contul IBAN: <strong>'
                . $ibanHtml . '</strong>.</p>'
            : '<p style="margin:0 0 12px;">După ce primim coletul, îți rambursăm <strong>'
                . $amountHtml . '</strong> (suma totală a comenzii) în contul IBAN din cerere.</p>';
    } else {
        $totalBlock = $ibanHtml !== ''
            ? '<p style="margin:0 0 12px;">După ce primim coletul, îți rambursăm <strong>suma totală a comenzii</strong> în contul IBAN: <strong>'
                . $ibanHtml . '</strong>.</p>'
            : '<p style="margin:0 0 12px;">După ce primim coletul, îți rambursăm <strong>suma totală a comenzii</strong> în contul IBAN din cerere.</p>';
    }

    $content = $greeting
        . '<p style="margin:0 0 12px;">Cererea ta de retur pentru comanda <strong>' . $orderIdHtml
        . '</strong> a fost <strong>validată</strong>.</p>'
        . '<p style="margin:0 0 12px;">Poți trimite coletul cu <strong>orice curier</strong> (recomandăm DPD). Costul transportului este suportat de tine. Pe AWB completează:</p>'
        . '<p style="margin:0 0 16px;padding:12px 14px;background:#f3f4f6;border-radius:8px;line-height:1.5;">'
        . '<strong>Destinatar: ' . $operatorHtml . ' - retur comanda ' . $orderIdHtml . '</strong><br>'
        . 'Telefon destinatar: <strong>' . $phoneHtml . '</strong><br>'
        . $addressHtml . '</p>'
        . $totalBlock
        . '<p style="margin:0 0 12px;padding:12px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;line-height:1.5;color:#7f1d1d;">'
        . '<strong>Atenție:</strong> nu trimite coletul cu plata ramburs sau cu taxele de transport neachitate. '
        . 'Nerespectarea acestei condiții va duce la refuzul returului.'
        . '</p>'
        . '<p style="margin:0;color:#4b5563;">Ambalează produsul în siguranță, împreună cu accesoriile. Menționează numărul comenzii pe colet sau în documentele de expediere.</p>';

    return [
        'subject' => 'Retur validat — comanda ' . $orderId . ' (adresa de expediere)',
        'html' => shoptop_email_layout('Cererea de retur a fost validată', $content),
    ];
}

/**
 * Email după respingerea cererii de retur.
 *
 * @param array{orderId:string, customerName?:string, adminNotes?:string} $returnRequest
 * @return array{subject:string, html:string}
 */
function shoptop_render_return_rejected_email(array $returnRequest): array
{
    $orderId = trim((string) ($returnRequest['orderId'] ?? ''));
    $orderIdHtml = htmlspecialchars($orderId, ENT_QUOTES, 'UTF-8');
    $name = htmlspecialchars(trim((string) ($returnRequest['customerName'] ?? '')), ENT_QUOTES, 'UTF-8');
    $greeting = '<p style="margin:0 0 12px;">Bună' . ($name !== '' ? ', ' . $name : '') . '!</p>';
    $notes = trim((string) ($returnRequest['adminNotes'] ?? ''));
    $notesBlock = $notes !== ''
        ? '<p style="margin:0 0 12px;">Motiv: ' . htmlspecialchars($notes, ENT_QUOTES, 'UTF-8') . '</p>'
        : '';

    $content = $greeting
        . '<p style="margin:0 0 12px;">Cererea ta de retur pentru comanda <strong>' . $orderIdHtml
        . '</strong> nu a putut fi validată.</p>'
        . $notesBlock
        . '<p style="margin:0;color:#4b5563;">Dacă ai întrebări sau crezi că este o eroare, răspunde la acest email.</p>';

    return [
        'subject' => 'Cerere de retur — comanda ' . $orderId,
        'html' => shoptop_email_layout('Cererea de retur nu a fost validată', $content),
    ];
}

/**
 * Email după finalizare: colet primit, rambursare pe IBAN.
 *
 * @param array{
 *   orderId:string,
 *   customerName?:string,
 *   orderTotal?:float|null,
 *   iban?:string
 * } $returnRequest
 * @return array{subject:string, html:string}
 */
function shoptop_render_return_finalized_email(array $returnRequest): array
{
    $orderId = trim((string) ($returnRequest['orderId'] ?? ''));
    $orderIdHtml = htmlspecialchars($orderId, ENT_QUOTES, 'UTF-8');
    $name = htmlspecialchars(trim((string) ($returnRequest['customerName'] ?? '')), ENT_QUOTES, 'UTF-8');
    $greeting = '<p style="margin:0 0 12px;">Bună' . ($name !== '' ? ', ' . $name : '') . '!</p>';

    $totalBlock = '';
    $orderTotal = $returnRequest['orderTotal'] ?? null;
    if (is_numeric($orderTotal) && (float) $orderTotal > 0) {
        $totalBlock = '<p style="margin:0 0 12px;">Îți rambursăm <strong>'
            . shoptop_email_money((float) $orderTotal)
            . '</strong> (suma totală a comenzii).</p>';
    } else {
        $totalBlock = '<p style="margin:0 0 12px;">Îți rambursăm <strong>suma totală a comenzii</strong>.</p>';
    }

    $iban = strtoupper(preg_replace('/\s+/', '', trim((string) ($returnRequest['iban'] ?? ''))) ?? '');
    $ibanBlock = $iban !== ''
        ? '<p style="margin:0 0 12px;">Transferul se face către IBAN: <strong>'
            . htmlspecialchars($iban, ENT_QUOTES, 'UTF-8') . '</strong>.</p>'
        : '<p style="margin:0 0 12px;">Transferul se face către IBAN-ul din cererea de retur.</p>';

    $content = $greeting
        . '<p style="margin:0 0 12px;">Am primit coletul de retur pentru comanda <strong>'
        . $orderIdHtml . '</strong>.</p>'
        . $totalBlock
        . $ibanBlock
        . '<p style="margin:0;color:#4b5563;">Costul transportului de retur rămâne în sarcina ta. Dacă ai nevoie de detalii, răspunde la acest mesaj.</p>';

    return [
        'subject' => 'Retur finalizat — rambursare comanda ' . $orderId,
        'html' => shoptop_email_layout('Am primit returul', $content),
    ];
}

/**
 * Email către client după înregistrare (confirmare adresă / bun venit).
 *
 * @return array{subject:string, html:string}
 */
function shoptop_render_registration_confirmation_email(string $userEmail): array
{
    $config = shoptop_config();
    $siteUrl = rtrim(trim((string) ($config['site_url'] ?? 'https://shop-top.ro')), '/');
    $siteUrlEsc = htmlspecialchars($siteUrl, ENT_QUOTES, 'UTF-8');
    $emailEsc = htmlspecialchars($userEmail, ENT_QUOTES, 'UTF-8');
    $loginPath = htmlspecialchars($siteUrl . '/conectare', ENT_QUOTES, 'UTF-8');
    $brand = htmlspecialchars(shoptop_email_brand(), ENT_QUOTES, 'UTF-8');

    $content = '<p style="margin:0 0 12px;">Bun venit!</p>'
        . '<p style="margin:0 0 12px;">Contul tău la <strong>' . $brand . '</strong> a fost creat cu succes, folosind adresa <strong>' . $emailEsc . '</strong>.</p>'
        . '<p style="margin:0 0 12px;">Te poți conecta oricând:</p>'
        . '<p style="margin:0 0 16px;"><a href="' . $loginPath . '" style="display:inline-block;padding:12px 20px;background:#059669;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">Conectare</a></p>'
        . '<p style="margin:0;color:#6b7280;font-size:14px;">Dacă nu tu ai creat acest cont, ignoră acest mesaj și scrie-ne la adresa din subsol.</p>'
        . '<p style="margin:12px 0 0;color:#6b7280;font-size:13px;">Link direct: <a href="' . $loginPath . '" style="color:#2563eb;">' . $siteUrlEsc . '/conectare</a></p>';

    return [
        'subject' => 'Confirmare înregistrare — ' . shoptop_email_brand(),
        'html' => shoptop_email_layout('Cont creat', $content),
    ];
}

/**
 * Notificare pentru magazin: client nou înregistrat.
 *
 * @return array{subject:string, html:string}
 */
function shoptop_render_registration_admin_email(string $userEmail): array
{
    $emailEsc = htmlspecialchars($userEmail, ENT_QUOTES, 'UTF-8');
    $content = '<p style="margin:0 0 12px;">Un client nou s-a înregistrat pe site.</p>'
        . '<p style="margin:0;"><strong>Email cont:</strong> ' . $emailEsc . '</p>'
        . '<p style="margin:16px 0 0;color:#6b7280;font-size:14px;">Utilizatorii sunt în tabela <code>users</code> (rol <code>customer</code>).</p>';

    return [
        'subject' => '[' . shoptop_email_brand() . '] Înregistrare nouă: ' . $userEmail,
        'html' => shoptop_email_layout('Client nou înregistrat', $content),
    ];
}

/**
 * Email către client cu factura emisă (PDF atașat separat).
 *
 * @return array{subject:string, html:string}
 */
function shoptop_render_invoice_email(
    string $orderId,
    string $customerName,
    string $series,
    string $number
): array {
    $orderIdHtml = htmlspecialchars($orderId, ENT_QUOTES, 'UTF-8');
    $name = htmlspecialchars(trim($customerName), ENT_QUOTES, 'UTF-8');
    $invoiceRef = htmlspecialchars(trim($series) . '/' . trim($number), ENT_QUOTES, 'UTF-8');
    $greeting = '<p style="margin:0 0 12px;">Bună' . ($name !== '' ? ', ' . $name : '') . '!</p>';

    $content = $greeting
        . '<p style="margin:0 0 12px;">Pentru comanda <strong>' . $orderIdHtml . '</strong> am emis factura <strong>'
        . $invoiceRef . '</strong>.</p>'
        . '<p style="margin:0 0 12px;">Găsești PDF-ul facturii atașat acestui email.</p>'
        . '<p style="margin:0;color:#4b5563;">Dacă ai întrebări, răspunde la acest mesaj.</p>';

    return [
        'subject' => 'Factură ' . trim($series) . '/' . trim($number) . ' — comanda ' . $orderId,
        'html' => shoptop_email_layout('Factura ta a fost emisă', $content),
    ];
}

/**
 * @param array{email:string, items: list<array{name:string, url?:string}>} $draft
 * @return array{subject:string, html:string}
 */
function shoptop_render_cart_reminder_email(array $draft): array
{
    $config = shoptop_config();
    $site = rtrim((string) ($config['site_url'] ?? 'https://shop-top.ro'), '/');
    $items = is_array($draft['items'] ?? null) ? $draft['items'] : [];
    $list = '';
    $firstUrl = $site . '/checkout';
    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }
        $name = htmlspecialchars(trim((string) ($item['name'] ?? 'Produs')), ENT_QUOTES, 'UTF-8');
        $url = trim((string) ($item['url'] ?? ''));
        if ($url !== '' && !preg_match('#^https://#i', $url)) {
            $url = $site . (str_starts_with($url, '/') ? $url : '/' . $url);
        }
        if ($url !== '' && $firstUrl === $site . '/checkout') {
            $firstUrl = $url;
        }
        $list .= '<li style="margin:0 0 6px;">' . $name . '</li>';
    }
    if ($list === '') {
        $list = '<li style="margin:0 0 6px;">Produsele din coșul tău</li>';
    }
    $cta = htmlspecialchars($firstUrl, ENT_QUOTES, 'UTF-8');
    $threshold = function_exists('shoptop_shipping_free_over')
        ? shoptop_shipping_free_over()
        : 0.0;
    $freeLine = $threshold > 0
        ? '<p style="margin:0 0 16px;">Livrarea e gratuită de la '
            . htmlspecialchars(number_format($threshold, 0, ',', '.'), ENT_QUOTES, 'UTF-8')
            . ' RON — poți reveni și închide comanda în câteva minute.</p>'
        : '<p style="margin:0 0 16px;">Poți reveni și închide comanda în câteva minute.</p>';
    $content = '<p style="margin:0 0 12px;">Ai lăsat produse în coș și nu ai finalizat comanda.</p>'
        . '<ul style="margin:0 0 16px;padding-left:18px;">' . $list . '</ul>'
        . $freeLine
        . '<p style="margin:0;"><a href="' . $cta . '" style="display:inline-block;background:#166534;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">Continuă comanda</a></p>';

    return [
        'subject' => 'Ți-ai lăsat coșul pe ' . shoptop_email_brand(),
        'html' => shoptop_email_layout('Coșul tău te așteaptă', $content),
    ];
}

