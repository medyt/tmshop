<?php

declare(strict_types=1);

require_once __DIR__ . '/lib.php';

/**
 * Netopia / MobilPay — integrare clasică cu certificate (.cer / .key).
 * Conturile din Admin → Setări tehnice (Semnătură + chei) folosesc acest flux,
 * nu API v2 cu ApiKey.
 *
 * Docs: https://github.com/mobilpay/PHP_CARD
 */

function shoptop_netopia_settings(): array
{
    $config = shoptop_config();
    $n = is_array($config['netopia'] ?? null) ? $config['netopia'] : [];

    return [
        'sandbox' => (bool) ($n['sandbox'] ?? false),
        'pos_signature' => trim((string) ($n['pos_signature'] ?? '')),
        'public_cert' => trim((string) ($n['public_cert'] ?? '')),
        'private_key' => trim((string) ($n['private_key'] ?? '')),
        'redirect_url' => trim((string) ($n['redirect_url'] ?? '')),
        'notify_url' => trim((string) ($n['notify_url'] ?? '')),
    ];
}

function shoptop_netopia_enabled(): bool
{
    $s = shoptop_netopia_settings();
    return $s['pos_signature'] !== ''
        && $s['public_cert'] !== ''
        && $s['private_key'] !== ''
        && is_readable($s['public_cert'])
        && is_readable($s['private_key']);
}

function shoptop_netopia_gateway_url(bool $sandbox): string
{
    return $sandbox
        ? 'https://sandboxsecure.mobilpay.ro'
        : 'https://secure.mobilpay.ro';
}

function shoptop_netopia_xml_escape(string $value): string
{
    return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
}

/**
 * Construiește XML-ul de plată card (format MobilPay).
 */
function shoptop_netopia_build_order_xml(array $order, array $settings): string
{
    $orderId = shoptop_netopia_xml_escape((string) ($order['id'] ?? ''));
    $signature = shoptop_netopia_xml_escape($settings['pos_signature']);
    $amount = number_format((float) ($order['totalAmount'] ?? 0), 2, '.', '');
    $details = shoptop_netopia_xml_escape('Comanda ' . (string) ($order['id'] ?? ''));
    $confirmUrl = shoptop_netopia_xml_escape($settings['notify_url']);
    $returnBase = $settings['redirect_url'];
    $returnSep = str_contains($returnBase, '?') ? '&' : '?';
    $returnUrl = shoptop_netopia_xml_escape(
        $returnBase . $returnSep . 'orderId=' . rawurlencode((string) ($order['id'] ?? ''))
    );

    $name = trim((string) ($order['customerName'] ?? ''));
    $spacePos = strpos($name, ' ');
    if ($spacePos === false) {
        $firstName = $name !== '' ? $name : 'Client';
        $lastName = $name !== '' ? $name : 'Client';
    } else {
        $firstName = trim(substr($name, 0, $spacePos));
        $lastName = trim(substr($name, $spacePos + 1));
    }
    $firstName = shoptop_netopia_xml_escape($firstName !== '' ? $firstName : 'Client');
    $lastName = shoptop_netopia_xml_escape($lastName !== '' ? $lastName : 'Client');
    $email = shoptop_netopia_xml_escape(trim((string) ($order['customerEmail'] ?? '')));
    $phone = shoptop_netopia_xml_escape(trim((string) ($order['customerPhone'] ?? '')));
    $address = shoptop_netopia_xml_escape(trim((string) ($order['customerAddress'] ?? '')));
    $timestamp = date('YmdHis');

    $billingType = (string) ($order['billingType'] ?? 'person');
    $companyName = trim((string) ($order['companyName'] ?? ''));
    $companyCui = trim((string) ($order['companyCui'] ?? ''));
    if ($billingType === 'company' && $companyName !== '') {
        $billingXml = '<billing type="company">'
            . '<company>' . shoptop_netopia_xml_escape($companyName) . '</company>'
            . ($companyCui !== ''
                ? '<fiscal_code>' . shoptop_netopia_xml_escape($companyCui) . '</fiscal_code>'
                : '')
            . '<email>' . $email . '</email>'
            . '<address>' . $address . '</address>'
            . '<mobile_phone>' . $phone . '</mobile_phone>'
            . '</billing>';
    } else {
        $billingXml = '<billing type="person">'
            . '<first_name>' . $firstName . '</first_name>'
            . '<last_name>' . $lastName . '</last_name>'
            . '<email>' . $email . '</email>'
            . '<address>' . $address . '</address>'
            . '<mobile_phone>' . $phone . '</mobile_phone>'
            . '</billing>';
    }

    return '<?xml version="1.0" encoding="utf-8"?>'
        . '<order type="card" id="' . $orderId . '" timestamp="' . $timestamp . '">'
        . '<signature>' . $signature . '</signature>'
        . '<url>'
        . '<confirm>' . $confirmUrl . '</confirm>'
        . '<return>' . $returnUrl . '</return>'
        . '</url>'
        . '<invoice currency="RON" amount="' . $amount . '">'
        . '<details>' . $details . '</details>'
        . '<contact_info>'
        . $billingXml
        . '</contact_info>'
        . '</invoice>'
        . '<ipn_cipher>aes-256-cbc</ipn_cipher>'
        . '</order>';
}

/**
 * Criptează XML-ul cu certificatul public (openssl_seal).
 *
 * @return array{env_key:string,data:string,cipher:string,iv:string}
 */
function shoptop_netopia_encrypt(string $xml, string $publicCertPath): array
{
    $certPem = file_get_contents($publicCertPath);
    if ($certPem === false || trim($certPem) === '') {
        throw new RuntimeException('Nu pot citi certificatul public Netopia.');
    }

    $publicKey = openssl_pkey_get_public($certPem);
    if ($publicKey === false) {
        $publicKey = openssl_pkey_get_public('file://' . $publicCertPath);
    }
    if ($publicKey === false) {
        throw new RuntimeException('Certificatul public Netopia este invalid.');
    }

    $cipher = 'aes-256-cbc';
    $methods = openssl_get_cipher_methods();
    if (!in_array($cipher, $methods, true) && in_array(strtoupper($cipher), $methods, true)) {
        $cipher = strtoupper($cipher);
    }
    if (!in_array($cipher, $methods, true) && !in_array(strtoupper($cipher), $methods, true)) {
        throw new RuntimeException('Cipher aes-256-cbc indisponibil pe server.');
    }

    $encData = '';
    $envKeys = [];
    $iv = '';
    $ok = openssl_seal($xml, $encData, $envKeys, [$publicKey], $cipher, $iv);
    if ($ok === false || empty($envKeys[0])) {
        $err = '';
        while (($line = openssl_error_string()) !== false) {
            $err .= $line . ' ';
        }
        throw new RuntimeException('Criptare Netopia eșuată: ' . trim($err));
    }

    return [
        'env_key' => base64_encode($envKeys[0]),
        'data' => base64_encode($encData),
        'cipher' => $cipher,
        'iv' => $iv !== '' ? base64_encode($iv) : '',
    ];
}

/**
 * Decriptează payload-ul IPN cu cheia privată.
 */
function shoptop_netopia_decrypt(
    string $envKeyB64,
    string $dataB64,
    string $privateKeyPath,
    string $cipher = 'aes-256-cbc',
    ?string $ivB64 = null,
): string {
    $keyPem = file_get_contents($privateKeyPath);
    if ($keyPem === false || trim($keyPem) === '') {
        throw new RuntimeException('Nu pot citi cheia privată Netopia.');
    }

    $privateKey = openssl_pkey_get_private($keyPem);
    if ($privateKey === false) {
        $privateKey = openssl_pkey_get_private('file://' . $privateKeyPath);
    }
    if ($privateKey === false) {
        throw new RuntimeException('Cheia privată Netopia este invalidă.');
    }

    $srcData = base64_decode($dataB64, true);
    $srcEnvKey = base64_decode($envKeyB64, true);
    if ($srcData === false || $srcEnvKey === false) {
        throw new RuntimeException('Payload IPN Netopia invalid (base64).');
    }

    $cipher = $cipher !== '' ? $cipher : 'aes-256-cbc';
    $data = '';
    if ($ivB64 !== null && $ivB64 !== '') {
        $srcIv = base64_decode($ivB64, true);
        if ($srcIv === false) {
            throw new RuntimeException('IV IPN Netopia invalid.');
        }
        $ok = openssl_open($srcData, $data, $srcEnvKey, $privateKey, $cipher, $srcIv);
    } else {
        $ok = openssl_open($srcData, $data, $srcEnvKey, $privateKey, $cipher);
    }

    if ($ok === false || $data === '') {
        throw new RuntimeException('Decriptare IPN Netopia eșuată.');
    }

    return $data;
}

/**
 * @return array{url:?string,method:?string,fields:?array<string,string>,error:?string}
 */
function shoptop_netopia_start_payment_result(array $order): array
{
    $s = shoptop_netopia_settings();
    if (!shoptop_netopia_enabled()) {
        return [
            'url' => null,
            'method' => null,
            'fields' => null,
            'error' => 'Netopia nu este configurată: lipsește semnătura POS sau certificatele (.cer / .key).',
        ];
    }

    $email = trim((string) ($order['customerEmail'] ?? ''));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return [
            'url' => null,
            'method' => null,
            'fields' => null,
            'error' => 'Pentru plata cu cardul este necesar un email valid.',
        ];
    }

    if ($s['notify_url'] === '' || $s['redirect_url'] === '') {
        return [
            'url' => null,
            'method' => null,
            'fields' => null,
            'error' => 'Lipsește notify_url sau redirect_url în config Netopia.',
        ];
    }

    try {
        $xml = shoptop_netopia_build_order_xml($order, $s);
        $fields = shoptop_netopia_encrypt($xml, $s['public_cert']);
        return [
            'url' => shoptop_netopia_gateway_url($s['sandbox']),
            'method' => 'POST',
            'fields' => $fields,
            'error' => null,
        ];
    } catch (Throwable $e) {
        error_log('Netopia start ' . (string) ($order['id'] ?? '') . ': ' . $e->getMessage());
        return [
            'url' => null,
            'method' => null,
            'fields' => null,
            'error' => $e->getMessage(),
        ];
    }
}

/** @deprecated folosește shoptop_netopia_start_payment_result */
function shoptop_netopia_start_payment(array $order): ?string
{
    $result = shoptop_netopia_start_payment_result($order);
    return $result['url'];
}

/**
 * Parsează XML-ul IPN și returnează statusul comenzii.
 *
 * @return array{orderId:string,action:string,errorCode:int,errorMessage:string,rrn:string}
 */
function shoptop_netopia_parse_ipn_xml(string $xml): array
{
    $doc = new DOMDocument();
    if (@$doc->loadXML($xml) !== true) {
        throw new RuntimeException('XML IPN invalid.');
    }

    $orders = $doc->getElementsByTagName('order');
    if ($orders->length < 1) {
        throw new RuntimeException('XML IPN fără order.');
    }
    $orderElem = $orders->item(0);
    $orderId = trim((string) $orderElem->getAttribute('id'));

    $action = '';
    $errorCode = 0;
    $errorMessage = '';
    $rrn = '';

    $mobilpayNodes = $doc->getElementsByTagName('mobilpay');
    if ($mobilpayNodes->length >= 1) {
        $m = $mobilpayNodes->item(0);
        $actionNodes = $m->getElementsByTagName('action');
        if ($actionNodes->length >= 1) {
            $action = trim((string) $actionNodes->item(0)->nodeValue);
        }
        $rrnNodes = $m->getElementsByTagName('rrn');
        if ($rrnNodes->length >= 1) {
            $rrn = trim((string) $rrnNodes->item(0)->nodeValue);
        }
        $errorNodes = $m->getElementsByTagName('error');
        if ($errorNodes->length >= 1) {
            $err = $errorNodes->item(0);
            $errorCode = (int) $err->getAttribute('code');
            $errorMessage = trim((string) $err->nodeValue);
        }
    }

    return [
        'orderId' => $orderId,
        'action' => $action,
        'errorCode' => $errorCode,
        'errorMessage' => $errorMessage,
        'rrn' => $rrn,
    ];
}

function shoptop_netopia_ipn_xml_response(
    int $errorCode,
    string $errorMessage,
    int $errorType = 0,
): never {
    header('Content-Type: application/xml; charset=utf-8');
    echo '<?xml version="1.0" encoding="utf-8"?>' . "\n";
    if ($errorCode === 0) {
        echo '<crc>' . htmlspecialchars($errorMessage, ENT_XML1 | ENT_QUOTES, 'UTF-8') . '</crc>';
    } else {
        echo '<crc error_type="' . $errorType . '" error_code="' . $errorCode . '">'
            . htmlspecialchars($errorMessage, ENT_XML1 | ENT_QUOTES, 'UTF-8')
            . '</crc>';
    }
    exit;
}
