<?php

declare(strict_types=1);

require_once __DIR__ . '/lib.php';

/**
 * Client Netopia Payments API v2 (plata cu cardul).
 * Documentatie: https://doc.netopia-payments.com (Start payment / IPN).
 */

function shoptop_netopia_settings(): array
{
    $config = shoptop_config();
    $n = is_array($config['netopia'] ?? null) ? $config['netopia'] : [];

    return [
        'sandbox' => (bool) ($n['sandbox'] ?? true),
        'api_key' => trim((string) ($n['api_key'] ?? '')),
        'pos_signature' => trim((string) ($n['pos_signature'] ?? '')),
        'redirect_url' => trim((string) ($n['redirect_url'] ?? '')),
        'notify_url' => trim((string) ($n['notify_url'] ?? '')),
    ];
}

function shoptop_netopia_enabled(): bool
{
    $s = shoptop_netopia_settings();
    return $s['api_key'] !== '' && $s['pos_signature'] !== '';
}

function shoptop_netopia_base_url(bool $sandbox): string
{
    return $sandbox
        ? 'https://secure.sandbox.netopia-payments.com'
        : 'https://secure.netopia-payments.com';
}

/**
 * Porneste o plata. Returneaza URL-ul catre care redirectam clientul,
 * sau null daca a esuat (eroarea e logata).
 */
function shoptop_netopia_start_payment(array $order): ?string
{
    $s = shoptop_netopia_settings();
    if (!shoptop_netopia_enabled()) {
        return null;
    }

    $name = trim((string) ($order['customerName'] ?? ''));
    $spacePos = strpos($name, ' ');
    if ($spacePos === false) {
        $firstName = $name !== '' ? $name : 'Client';
        $lastName = $name !== '' ? $name : 'Client';
    } else {
        $firstName = trim(substr($name, 0, $spacePos));
        $lastName = trim(substr($name, $spacePos + 1));
    }

    $billing = [
        'email' => (string) ($order['customerEmail'] ?? ''),
        'phone' => (string) ($order['customerPhone'] ?? ''),
        'firstName' => $firstName !== '' ? $firstName : 'Client',
        'lastName' => $lastName !== '' ? $lastName : 'Client',
        'city' => 'Bucuresti',
        'country' => 642, // Romania (cod numeric ISO)
        'countryName' => 'Romania',
        'state' => 'Bucuresti',
        'postalCode' => '000000',
        'details' => (string) ($order['customerAddress'] ?? ''),
    ];

    $payload = [
        'config' => [
            'notifyUrl' => $s['notify_url'],
            'redirectUrl' => $s['redirect_url'],
            'language' => 'ro',
        ],
        'payment' => [
            'options' => ['installments' => 0, 'bonus' => 0],
            'instrument' => ['type' => 'card'],
        ],
        'order' => [
            'ntpID' => '',
            'posSignature' => $s['pos_signature'],
            'dateTime' => date('c'),
            'description' => 'Comanda ' . (string) ($order['id'] ?? ''),
            'orderID' => (string) ($order['id'] ?? ''),
            'amount' => round((float) ($order['totalAmount'] ?? 0), 2),
            'currency' => 'RON',
            'billing' => $billing,
            'shipping' => $billing,
            'installments' => ['selected' => 0, 'available' => [0]],
            'data' => [],
        ],
    ];

    try {
        $ch = curl_init(shoptop_netopia_base_url($s['sandbox']) . '/payment/card/start');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: ' . $s['api_key'],
                'Content-Type: application/json',
                'Accept: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            CURLOPT_TIMEOUT => 30,
        ]);
        $raw = curl_exec($ch);
        if ($raw === false) {
            $err = curl_error($ch);
            curl_close($ch);
            throw new RuntimeException('transport: ' . $err);
        }
        curl_close($ch);

        $decoded = json_decode((string) $raw, true);
        if (!is_array($decoded)) {
            throw new RuntimeException('raspuns invalid: ' . substr((string) $raw, 0, 200));
        }

        $errorCode = $decoded['error']['code'] ?? null;
        if ($errorCode !== null && (string) $errorCode !== '0' && (string) $errorCode !== '00') {
            // Codul "00" / "0" inseamna OK la Netopia v2; restul pot fi 3DS pending sau eroare.
            // Daca exista totusi un paymentURL, continuam (3DS redirect).
        }

        $paymentUrl = $decoded['payment']['paymentURL']
            ?? ($decoded['customerAction']['url'] ?? null);

        if (is_string($paymentUrl) && $paymentUrl !== '') {
            return $paymentUrl;
        }

        throw new RuntimeException(
            'fara paymentURL: ' . (string) ($decoded['error']['message'] ?? 'necunoscut')
        );
    } catch (Throwable $e) {
        error_log('Netopia start ' . (string) ($order['id'] ?? '') . ': ' . $e->getMessage());
        return null;
    }
}
