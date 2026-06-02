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
    $user = shoptop_current_user();
    if ($user === null) {
        shoptop_json_error('Neautentificat.', 401);
    }
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
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 3600,
            $params['path'],
            $params['domain'] ?? '',
            (bool) $params['secure'],
            (bool) $params['httponly']
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

    shoptop_start_session();
    $_SESSION['user_id'] = (string) $row['id'];
    $_SESSION['user_role'] = (string) $row['role'];
    shoptop_json_response(shoptop_user_to_response($row), 201);
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

    shoptop_start_session();
    $_SESSION['user_id'] = (string) $row['id'];
    $_SESSION['user_role'] = (string) $row['role'];
    shoptop_json_response(shoptop_user_to_response($row));
}

shoptop_json_error('Actiune necunoscuta.', 400);
