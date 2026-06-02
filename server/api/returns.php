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

function shoptop_return_row_to_response(array $row): array
{
    $items = null;
    if (!empty($row['items'])) {
        $decoded = json_decode((string) $row['items'], true);
        if (is_array($decoded)) {
            $items = $decoded;
        }
    }

    return [
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
    ];
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
        $rows[] = shoptop_return_row_to_response($row);
    }
    shoptop_json_response($rows);
}

if ($method === 'POST') {
    $body = shoptop_read_json_body();
    if (!is_array($body)) {
        shoptop_json_error('Corpul cererii trebuie sa fie un obiect JSON.', 400);
    }

    $action = trim((string) ($body['action'] ?? ''));
    if ($action === 'updateStatus' || $action === 'delete') {
        shoptop_require_admin();
        $id = is_numeric($body['id'] ?? null) ? (int) $body['id'] : 0;
        if ($id <= 0) {
            shoptop_json_error('ID-ul cererii este invalid.', 400);
        }

        if ($action === 'delete') {
            $stmt = $pdo->prepare('DELETE FROM return_requests WHERE id = :id');
            $stmt->execute(['id' => $id]);
        } else {
            $status = trim((string) ($body['status'] ?? ''));
            if (!in_array($status, ['nou', 'aprobat', 'respins', 'finalizat'], true)) {
                shoptop_json_error('Status invalid.', 400);
            }
            $adminNotes = trim((string) ($body['adminNotes'] ?? ''));
            $stmt = $pdo->prepare(
                'UPDATE return_requests SET status = :status, admin_notes = :admin_notes WHERE id = :id'
            );
            $stmt->execute([
                'status' => $status,
                'admin_notes' => $adminNotes !== '' ? $adminNotes : null,
                'id' => $id,
            ]);
        }

        if ($stmt->rowCount() === 0) {
            shoptop_json_error('Cererea nu a fost gasita.', 404);
        }
        shoptop_json_response(['ok' => true]);
    }

    // Creare cerere de retur (public).
    $orderId = trim((string) ($body['orderId'] ?? ''));
    $customerName = trim((string) ($body['customerName'] ?? ''));
    $customerEmail = trim((string) ($body['customerEmail'] ?? ''));
    $customerPhone = trim((string) ($body['customerPhone'] ?? ''));
    $reason = trim((string) ($body['reason'] ?? ''));
    $iban = trim((string) ($body['iban'] ?? ''));
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

    $itemsJson = null;
    if (is_array($items) && $items !== []) {
        $itemsJson = json_encode($items, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

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
        'iban' => $iban !== '' ? $iban : null,
        'status' => 'nou',
    ]);

    // Notificare email catre magazin (best-effort).
    try {
        require_once __DIR__ . '/mailer.php';
        $config = shoptop_config();
        $shopEmail = trim((string) ($config['shop_email'] ?? ''));
        if ($shopEmail !== '') {
            $content = '<p style="margin:0 0 12px;">Cerere de retur nouă pentru comanda <strong>'
                . htmlspecialchars($orderId, ENT_QUOTES, 'UTF-8') . '</strong>.</p>'
                . '<p style="margin:0 0 6px;">Client: ' . htmlspecialchars($customerName, ENT_QUOTES, 'UTF-8') . '</p>'
                . '<p style="margin:0 0 6px;">Email: ' . htmlspecialchars($customerEmail, ENT_QUOTES, 'UTF-8') . '</p>'
                . '<p style="margin:0 0 6px;">Motiv: ' . htmlspecialchars($reason, ENT_QUOTES, 'UTF-8') . '</p>';
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
