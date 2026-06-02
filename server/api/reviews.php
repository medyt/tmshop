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

if ($method === 'GET') {
    $productId = trim((string) ($_GET['productId'] ?? ''));
    $summary = trim((string) ($_GET['summary'] ?? ''));

    if ($productId === '' && $summary === '1') {
        $stmt = $pdo->query(
            'SELECT product_id, AVG(rating) AS average_rating, COUNT(*) AS review_count
             FROM product_reviews
             WHERE approved = 1
             GROUP BY product_id'
        );
        $summaries = [];
        foreach ($stmt->fetchAll() as $row) {
            $summaries[] = [
                'productId' => (string) $row['product_id'],
                'averageRating' => round((float) $row['average_rating'], 1),
                'reviewCount' => (int) $row['review_count'],
            ];
        }
        shoptop_json_response($summaries);
    }

    if ($productId === '') {
        shoptop_json_error('Parametrul productId este obligatoriu.', 400);
    }

    $stmt = $pdo->prepare(
        'SELECT id, product_id, author_name, rating, body, created_at
         FROM product_reviews
         WHERE product_id = :product_id AND approved = 1
         ORDER BY created_at DESC
         LIMIT 50'
    );
    $stmt->execute(['product_id' => $productId]);
    $reviews = [];
    foreach ($stmt->fetchAll() as $row) {
        $reviews[] = [
            'id' => (int) $row['id'],
            'productId' => (string) $row['product_id'],
            'authorName' => (string) $row['author_name'],
            'rating' => (int) $row['rating'],
            'body' => (string) $row['body'],
            'createdAt' => (string) $row['created_at'],
        ];
    }
    shoptop_json_response($reviews);
}

if ($method === 'POST') {
    $body = shoptop_read_json_body();
    if (!is_array($body)) {
        shoptop_json_error('Corpul cererii trebuie sa fie un obiect JSON.', 400);
    }

    $productId = trim((string) ($body['productId'] ?? ''));
    $authorName = trim((string) ($body['authorName'] ?? ''));
    $reviewBody = trim((string) ($body['body'] ?? ''));
    $rating = is_numeric($body['rating'] ?? null)
        ? (int) floor((float) $body['rating'])
        : 0;

    if ($productId === '' || $authorName === '' || $reviewBody === '') {
        shoptop_json_error('Produsul, numele si recenzia sunt obligatorii.', 400);
    }
    if ($rating < 1 || $rating > 5) {
        shoptop_json_error('Rating-ul trebuie sa fie intre 1 si 5.', 400);
    }

    $productStmt = $pdo->prepare('SELECT id FROM products WHERE id = :id LIMIT 1');
    $productStmt->execute(['id' => $productId]);
    if (!$productStmt->fetch()) {
        shoptop_json_error('Produsul nu a fost gasit.', 404);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO product_reviews (product_id, author_name, rating, body, approved)
         VALUES (:product_id, :author_name, :rating, :body, 0)'
    );
    $stmt->execute([
        'product_id' => $productId,
        'author_name' => $authorName,
        'rating' => $rating,
        'body' => $reviewBody,
    ]);

    shoptop_json_response(['ok' => true], 201);
}

shoptop_json_error('Metoda HTTP nu este suportata.', 405);
