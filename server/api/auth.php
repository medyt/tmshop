<?php

declare(strict_types=1);

require_once __DIR__ . '/lib.php';

shoptop_send_cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    // 200 + null când nu ești logat — evită zgomotul 401 în consolă la fiecare PageView.
    // shoptop_current_user() eliberează deja lock-ul de sesiune.
    $user = shoptop_current_user();
    shoptop_json_response($user);
}

if ($method !== 'POST') {
    shoptop_json_error('Metoda HTTP nu este suportata.', 405);
}

$body = shoptop_read_json_body();
if (!is_array($body)) {
    shoptop_json_error('Corpul cererii trebuie sa fie un obiect JSON.', 400);
}

$action = $body['action'] ?? '';
if (!is_string($action) || trim($action) === '') {
    shoptop_json_error('Campul action este obligatoriu.', 400);
}

$action = trim($action);

if ($action === 'logout') {
    shoptop_start_session();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        setcookie(
            session_name(),
            '',
            shoptop_session_cookie_options(time() - 3600)
        );
    }
    session_destroy();
    shoptop_json_response(['ok' => true]);
}

$email = shoptop_normalize_email((string) ($body['email'] ?? ''));
$password = (string) ($body['password'] ?? '');

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    shoptop_json_error('Email invalid.', 400);
}

if (strlen($password) < 8) {
    shoptop_json_error('Parola trebuie sa aiba cel putin 8 caractere.', 400);
}

$pdo = shoptop_pdo();

if ($action === 'register') {
    $stmt = $pdo->prepare(
        'INSERT INTO users (id, email, password_hash, role) VALUES (:id, :email, :password_hash, :role)'
    );
    try {
        $stmt->execute([
            'id' => shoptop_user_id(),
            'email' => $email,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'role' => 'customer',
        ]);
    } catch (PDOException $e) {
        if ((int) $e->getCode() === 23000) {
            shoptop_json_error('Exista deja un cont cu acest email.', 409);
        }
        throw $e;
    }

    $userStmt = $pdo->prepare(
        'SELECT id, email, role FROM users WHERE email = :email LIMIT 1'
    );
    $userStmt->execute(['email' => $email]);
    $row = $userStmt->fetch();
    if (!$row) {
        shoptop_json_error('Contul nu a putut fi creat.', 500);
    }

    shoptop_establish_user_session((string) $row['id'], (string) $row['role']);

    require_once __DIR__ . '/mailer.php';
    $customerEmail = (string) $row['email'];
    $confirmRendered = shoptop_render_registration_confirmation_email($customerEmail);
    $mailToUser = shoptop_send_mail(
        $customerEmail,
        $confirmRendered['subject'],
        $confirmRendered['html']
    );
    if (!$mailToUser) {
        error_log('shoptop: registration confirmation email failed for ' . $customerEmail);
    }

    $shopTo = trim((string) (shoptop_config()['shop_email'] ?? ''));
    if ($shopTo !== '' && strcasecmp($shopTo, $customerEmail) !== 0) {
        $adminRendered = shoptop_render_registration_admin_email($customerEmail);
        if (!shoptop_send_mail($shopTo, $adminRendered['subject'], $adminRendered['html'])) {
            error_log('shoptop: registration admin notify failed for ' . $customerEmail);
        }
    }

    $payload = shoptop_user_to_response($row);
    $payload['confirmationEmailSent'] = $mailToUser;
    shoptop_json_response($payload, 201);
}

if ($action === 'login') {
    $stmt = $pdo->prepare(
        'SELECT id, email, role, password_hash FROM users WHERE email = :email LIMIT 1'
    );
    $stmt->execute(['email' => $email]);
    $row = $stmt->fetch();
    if (
        !$row
        || !password_verify($password, (string) $row['password_hash'])
    ) {
        shoptop_json_error('Email sau parola incorecte.', 401);
    }

    shoptop_establish_user_session((string) $row['id'], (string) $row['role']);
    shoptop_json_response(shoptop_user_to_response($row));
}

shoptop_json_error('Actiune necunoscuta.', 400);
