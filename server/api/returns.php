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

/**
 * @return array{exists:bool, totalAmount:?float, status:?string, customerEmail:?string}
 */
function shoptop_return_lookup_order(PDO $pdo, string $orderId): array
{
    $orderId = trim($orderId);
    if ($orderId === '') {
        return [
            'exists' => false,
            'totalAmount' => null,
            'status' => null,
            'customerEmail' => null,
        ];
    }

    $stmt = $pdo->prepare(
        'SELECT id, total_amount, status, customer_email
         FROM orders WHERE id = :id LIMIT 1'
    );
    $stmt->execute(['id' => $orderId]);
    $row = $stmt->fetch();
    if (!$row) {
        return [
            'exists' => false,
            'totalAmount' => null,
            'status' => null,
            'customerEmail' => null,
        ];
    }

    return [
        'exists' => true,
        'totalAmount' => isset($row['total_amount']) ? (float) $row['total_amount'] : null,
        'status' => (string) ($row['status'] ?? ''),
        'customerEmail' => isset($row['customer_email']) ? (string) $row['customer_email'] : null,
    ];
}

/**
 * Cerere finalizată (colet + rambursare) → comanda trece pe Returnată.
 */
function shoptop_return_sync_order_on_finalized(PDO $pdo, string $orderId): void
{
    require_once __DIR__ . '/orders.php';
    shoptop_update_order_status($pdo, $orderId, 'returned');
    try {
        shoptop_mark_order_return_received($pdo, $orderId);
    } catch (Throwable $e) {
        error_log('Return finalize return_received ' . $orderId . ': ' . $e->getMessage());
    }
}

/**
 * @param array<string,mixed> $row
 * @return array<string,mixed>
 */
function shoptop_return_row_to_response(array $row, ?array $orderInfo = null): array
{
    $items = null;
    if (!empty($row['items'])) {
        $decoded = json_decode((string) $row['items'], true);
        if (is_array($decoded) || is_string($decoded)) {
            $items = $decoded;
        } else {
            $items = (string) $row['items'];
        }
    }

    $payload = [
        'id' => (int) $row['id'],
        'orderId' => (string) $row['order_id'],
        'customerName' => (string) $row['customer_name'],
        'customerEmail' => (string) $row['customer_email'],
        'customerPhone' => (string) ($row['customer_phone'] ?? ''),
        'items' => $items,
        'reason' => (string) ($row['reason'] ?? ''),
        'iban' => (string) ($row['iban'] ?? ''),
        'status' => (string) $row['status'],
        'adminNotes' => (string) ($row['admin_notes'] ?? ''),
        'createdAt' => (string) $row['created_at'],
        'orderExists' => false,
        'orderTotalAmount' => null,
        'orderStatus' => null,
    ];

    if (is_array($orderInfo)) {
        $payload['orderExists'] = !empty($orderInfo['exists']);
        $payload['orderTotalAmount'] = $orderInfo['totalAmount'] ?? null;
        $payload['orderStatus'] = $orderInfo['status'] ?? null;
    }

    return $payload;
}

/**
 * @param mixed $items
 */
function shoptop_return_encode_items($items): ?string
{
    if (is_array($items) && $items !== []) {
        return json_encode($items, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    if (is_string($items)) {
        $trimmed = trim($items);
        if ($trimmed !== '') {
            return json_encode($trimmed, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
    }

    return null;
}

/** Normalizează IBAN: fără spații, majuscule. */
function shoptop_normalize_iban(string $raw): string
{
    return strtoupper(preg_replace('/\s+/', '', trim($raw)) ?? '');
}

/**
 * Validare IBAN românesc (RO, 24 caractere) + checksum MOD-97 (ISO 13616).
 */
function shoptop_is_valid_ro_iban(string $raw): bool
{
    $iban = shoptop_normalize_iban($raw);
    if (!preg_match('/^RO\d{2}[A-Z]{4}[A-Z0-9]{16}$/', $iban)) {
        return false;
    }

    $rearranged = substr($iban, 4) . substr($iban, 0, 4);
    $expanded = '';
    $len = strlen($rearranged);
    for ($i = 0; $i < $len; $i++) {
        $ch = $rearranged[$i];
        $ord = ord($ch);
        if ($ord >= 65 && $ord <= 90) {
            $expanded .= (string) ($ord - 55);
        } else {
            $expanded .= $ch;
        }
    }

    $remainder = 0;
    $expLen = strlen($expanded);
    for ($i = 0; $i < $expLen; $i++) {
        $remainder = ($remainder * 10 + (int) $expanded[$i]) % 97;
    }

    return $remainder === 1;
}

/**
 * @param array<string,mixed> $returnRow
 * @param array{exists:bool, totalAmount:?float, status:?string, customerEmail:?string} $orderInfo
 */
function shoptop_return_notify_customer(string $newStatus, array $returnRow, array $orderInfo): void
{
    $email = trim((string) ($returnRow['customer_email'] ?? ''));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return;
    }

    require_once __DIR__ . '/mailer.php';

    $payload = [
        'orderId' => (string) ($returnRow['order_id'] ?? ''),
        'customerName' => (string) ($returnRow['customer_name'] ?? ''),
        'iban' => (string) ($returnRow['iban'] ?? ''),
        'adminNotes' => (string) ($returnRow['admin_notes'] ?? ''),
        'orderTotal' => $orderInfo['totalAmount'] ?? null,
    ];

    $rendered = null;
    if ($newStatus === 'aprobat') {
        $rendered = shoptop_render_return_approved_email($payload);
    } elseif ($newStatus === 'respins') {
        $rendered = shoptop_render_return_rejected_email($payload);
    } elseif ($newStatus === 'finalizat') {
        $rendered = shoptop_render_return_finalized_email($payload);
    }

    if ($rendered === null) {
        return;
    }

    shoptop_send_mail($email, $rendered['subject'], $rendered['html']);
}

if ($method === 'GET') {
    shoptop_require_admin();
    $status = trim((string) ($_GET['status'] ?? 'all'));
    $allowed = ['nou', 'aprobat', 'respins', 'finalizat'];
    $where = '';
    $params = [];
    if (in_array($status, $allowed, true)) {
        $where = 'WHERE status = :status';
        $params['status'] = $status;
    }

    $stmt = $pdo->prepare(
        'SELECT id, order_id, customer_name, customer_email, customer_phone, items, reason,
                iban, status, admin_notes, created_at
         FROM return_requests ' . $where . '
         ORDER BY created_at DESC
         LIMIT 200'
    );
    $stmt->execute($params);
    $rows = [];
    foreach ($stmt->fetchAll() as $row) {
        $orderInfo = shoptop_return_lookup_order($pdo, (string) $row['order_id']);
        $rows[] = shoptop_return_row_to_response($row, $orderInfo);
    }
    shoptop_json_response($rows);
}

if ($method === 'POST') {
    $body = shoptop_read_json_body();
    if (!is_array($body)) {
        shoptop_json_error('Corpul cererii trebuie sa fie un obiect JSON.', 400);
    }

    $action = trim((string) ($body['action'] ?? ''));
    if ($action === 'updateStatus' || $action === 'update' || $action === 'delete') {
        shoptop_require_admin();
        $id = is_numeric($body['id'] ?? null) ? (int) $body['id'] : 0;
        if ($id <= 0) {
            shoptop_json_error('ID-ul cererii este invalid.', 400);
        }

        $existingStmt = $pdo->prepare(
            'SELECT id, order_id, customer_name, customer_email, customer_phone, items, reason,
                    iban, status, admin_notes, created_at
             FROM return_requests WHERE id = :id LIMIT 1'
        );
        $existingStmt->execute(['id' => $id]);
        $existing = $existingStmt->fetch();
        if (!$existing) {
            shoptop_json_error('Cererea nu a fost gasita.', 404);
        }

        if ($action === 'delete') {
            $stmt = $pdo->prepare('DELETE FROM return_requests WHERE id = :id');
            $stmt->execute(['id' => $id]);
            shoptop_json_response(['ok' => true]);
        }

        $prevStatus = (string) ($existing['status'] ?? 'nou');
        $orderId = trim((string) ($body['orderId'] ?? $existing['order_id']));
        $status = trim((string) ($body['status'] ?? $prevStatus));
        if (!in_array($status, ['nou', 'aprobat', 'respins', 'finalizat'], true)) {
            shoptop_json_error('Status invalid.', 400);
        }

        $adminNotes = array_key_exists('adminNotes', $body)
            ? trim((string) $body['adminNotes'])
            : trim((string) ($existing['admin_notes'] ?? ''));

        $customerName = $action === 'update' && array_key_exists('customerName', $body)
            ? trim((string) $body['customerName'])
            : (string) $existing['customer_name'];
        $customerEmail = $action === 'update' && array_key_exists('customerEmail', $body)
            ? trim((string) $body['customerEmail'])
            : (string) $existing['customer_email'];
        $customerPhone = $action === 'update' && array_key_exists('customerPhone', $body)
            ? trim((string) $body['customerPhone'])
            : (string) ($existing['customer_phone'] ?? '');
        $reason = $action === 'update' && array_key_exists('reason', $body)
            ? trim((string) $body['reason'])
            : (string) ($existing['reason'] ?? '');
        $iban = $action === 'update' && array_key_exists('iban', $body)
            ? shoptop_normalize_iban((string) $body['iban'])
            : shoptop_normalize_iban((string) ($existing['iban'] ?? ''));

        if ($orderId === '') {
            shoptop_json_error('Numarul comenzii este obligatoriu.', 400);
        }
        if ($customerName === '' || $customerEmail === '') {
            shoptop_json_error('Numele si emailul clientului sunt obligatorii.', 400);
        }
        if (!filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
            shoptop_json_error('Adresa de email nu este valida.', 400);
        }
        if ($iban === '' || !shoptop_is_valid_ro_iban($iban)) {
            shoptop_json_error('IBAN-ul pentru rambursare este obligatoriu si trebuie sa fie un IBAN romanesc valid.', 400);
        }

        $orderInfo = shoptop_return_lookup_order($pdo, $orderId);
        if (in_array($status, ['aprobat', 'finalizat'], true) && !$orderInfo['exists']) {
            shoptop_json_error(
                'Cererea nu poate fi validata: nu exista o comanda cu numarul „' . $orderId . '”.',
                400
            );
        }

        $itemsJson = (string) ($existing['items'] ?? '');
        if ($action === 'update' && array_key_exists('items', $body)) {
            $encoded = shoptop_return_encode_items($body['items']);
            $itemsJson = $encoded ?? '';
        }

        $stmt = $pdo->prepare(
            'UPDATE return_requests SET
                order_id = :order_id,
                customer_name = :customer_name,
                customer_email = :customer_email,
                customer_phone = :customer_phone,
                items = :items,
                reason = :reason,
                iban = :iban,
                status = :status,
                admin_notes = :admin_notes
             WHERE id = :id'
        );
        $stmt->execute([
            'order_id' => $orderId,
            'customer_name' => $customerName,
            'customer_email' => $customerEmail,
            'customer_phone' => $customerPhone !== '' ? $customerPhone : null,
            'items' => $itemsJson !== '' ? $itemsJson : null,
            'reason' => $reason !== '' ? $reason : null,
            'iban' => $iban,
            'status' => $status,
            'admin_notes' => $adminNotes !== '' ? $adminNotes : null,
            'id' => $id,
        ]);

        $notifyStatuses = ['aprobat', 'respins', 'finalizat'];
        $forceNotify = !empty($body['notifyCustomer']);
        $shouldNotify = in_array($status, $notifyStatuses, true)
            && ($forceNotify || $status !== $prevStatus);
        $emailSent = false;
        $emailError = null;
        $orderWarning = null;
        if ($status === 'finalizat' && !empty($orderInfo['exists'])) {
            try {
                shoptop_return_sync_order_on_finalized($pdo, $orderId);
                $orderInfo = shoptop_return_lookup_order($pdo, $orderId);
            } catch (Throwable $e) {
                error_log('Return finalize order status ' . $orderId . ': ' . $e->getMessage());
                $orderWarning = 'Cererea a fost finalizată, dar comanda nu a putut fi marcată ca returnată.';
            }
        }
        if ($shouldNotify) {
            try {
                $notifyRow = [
                    'order_id' => $orderId,
                    'customer_name' => $customerName,
                    'customer_email' => $customerEmail,
                    'iban' => $iban,
                    'admin_notes' => $adminNotes,
                ];
                shoptop_return_notify_customer($status, $notifyRow, $orderInfo);
                $emailSent = true;
            } catch (Throwable $e) {
                error_log('Return customer email failed: ' . $e->getMessage());
                $emailError = 'Statusul a fost salvat, dar emailul catre client a esuat.';
            }
        }

        $freshStmt = $pdo->prepare(
            'SELECT id, order_id, customer_name, customer_email, customer_phone, items, reason,
                    iban, status, admin_notes, created_at
             FROM return_requests WHERE id = :id LIMIT 1'
        );
        $freshStmt->execute(['id' => $id]);
        $fresh = $freshStmt->fetch();
        $response = [
            'ok' => true,
            'emailSent' => $emailSent,
            'return' => shoptop_return_row_to_response(
                is_array($fresh) ? $fresh : $existing,
                $orderInfo
            ),
        ];
        if ($emailError !== null && $orderWarning !== null) {
            $response['emailWarning'] = $emailError . ' ' . $orderWarning;
        } elseif ($emailError !== null) {
            $response['emailWarning'] = $emailError;
        } elseif ($orderWarning !== null) {
            $response['emailWarning'] = $orderWarning;
        }
        shoptop_json_response($response);
    }

    // Creare cerere de retur (public).
    $orderId = trim((string) ($body['orderId'] ?? ''));
    $customerName = trim((string) ($body['customerName'] ?? ''));
    $customerEmail = trim((string) ($body['customerEmail'] ?? ''));
    $customerPhone = trim((string) ($body['customerPhone'] ?? ''));
    $reason = trim((string) ($body['reason'] ?? ''));
    $iban = shoptop_normalize_iban((string) ($body['iban'] ?? ''));
    $items = $body['items'] ?? null;

    if ($orderId === '' || $customerName === '' || $customerEmail === '') {
        shoptop_json_error('Numarul comenzii, numele si emailul sunt obligatorii.', 400);
    }
    if (!filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
        shoptop_json_error('Adresa de email nu este valida.', 400);
    }
    if ($reason === '') {
        shoptop_json_error('Te rugam sa specifici motivul returului.', 400);
    }
    if ($iban === '' || !shoptop_is_valid_ro_iban($iban)) {
        shoptop_json_error('IBAN-ul pentru rambursare este obligatoriu si trebuie sa fie un IBAN romanesc valid (ex. RO49AAAA1B31007593840000).', 400);
    }

    $itemsJson = shoptop_return_encode_items($items);

    $stmt = $pdo->prepare(
        'INSERT INTO return_requests
            (order_id, customer_name, customer_email, customer_phone, items, reason, iban, status)
         VALUES
            (:order_id, :customer_name, :customer_email, :customer_phone, :items, :reason, :iban, :status)'
    );
    $stmt->execute([
        'order_id' => $orderId,
        'customer_name' => $customerName,
        'customer_email' => $customerEmail,
        'customer_phone' => $customerPhone !== '' ? $customerPhone : null,
        'items' => $itemsJson,
        'reason' => $reason,
        'iban' => $iban,
        'status' => 'nou',
    ]);

    // Notificare email catre magazin (best-effort).
    try {
        require_once __DIR__ . '/mailer.php';
        $config = shoptop_config();
        $shopEmail = trim((string) ($config['shop_email'] ?? ''));
        if ($shopEmail !== '') {
            $orderInfo = shoptop_return_lookup_order($pdo, $orderId);
            $orderHint = $orderInfo['exists']
                ? 'Comanda exista in sistem (total '
                    . number_format((float) ($orderInfo['totalAmount'] ?? 0), 2, ',', '.')
                    . ' RON).'
                : 'Atentie: nu am gasit o comanda cu acest numar — verifica manual.';
            $content = '<p style="margin:0 0 12px;">Cerere de retur nouă pentru comanda <strong>'
                . htmlspecialchars($orderId, ENT_QUOTES, 'UTF-8') . '</strong>.</p>'
                . '<p style="margin:0 0 6px;">Client: ' . htmlspecialchars($customerName, ENT_QUOTES, 'UTF-8') . '</p>'
                . '<p style="margin:0 0 6px;">Email: ' . htmlspecialchars($customerEmail, ENT_QUOTES, 'UTF-8') . '</p>'
                . '<p style="margin:0 0 6px;">Motiv: ' . htmlspecialchars($reason, ENT_QUOTES, 'UTF-8') . '</p>'
                . '<p style="margin:12px 0 0;color:#4b5563;">' . htmlspecialchars($orderHint, ENT_QUOTES, 'UTF-8') . '</p>'
                . '<p style="margin:8px 0 0;color:#4b5563;">Validează cererea din Admin → Retururi. La validare se trimite automat adresa de retur pe emailul clientului.</p>';
            shoptop_send_mail(
                $shopEmail,
                'Cerere retur - comanda ' . $orderId,
                shoptop_email_layout('Cerere de retur', $content)
            );
        }
    } catch (Throwable $e) {
        error_log('Return notify email failed: ' . $e->getMessage());
    }

    shoptop_json_response(['ok' => true], 201);
}

shoptop_json_error('Metoda HTTP nu este suportata.', 405);
