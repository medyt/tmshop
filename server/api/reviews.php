<?php

declare(strict_types=1);

require_once __DIR__ . '/lib.php';

shoptop_send_cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function shoptop_column_exists(PDO $pdo, string $table, string $column): bool
{
    $stmt = $pdo->prepare(
        'SELECT 1
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = :table_name
           AND COLUMN_NAME = :column_name
         LIMIT 1'
    );
    $stmt->execute([
        'table_name' => $table,
        'column_name' => $column,
    ]);
    return (bool) $stmt->fetchColumn();
}

try {
    $pdo = shoptop_pdo();
    $hasImageUrl = shoptop_column_exists($pdo, 'product_reviews', 'image_url');

    if ($method === 'GET') {
        $admin = trim((string) ($_GET['admin'] ?? ''));
        if ($admin === '1') {
            shoptop_require_admin();
            $status = trim((string) ($_GET['status'] ?? 'pending'));
            $where = '';
            if ($status === 'pending') {
                $where = 'WHERE approved = 0';
            } elseif ($status === 'approved') {
                $where = 'WHERE approved = 1';
            }
            $fields = 'id, product_id, author_name, rating, body, approved, created_at';
            if ($hasImageUrl) {
                $fields .= ', image_url';
            }
            $stmt = $pdo->query(
                'SELECT ' . $fields . '
                 FROM product_reviews ' . $where . '
                 ORDER BY created_at DESC
                 LIMIT 200'
            );
            $reviews = [];
            foreach ($stmt->fetchAll() as $row) {
                $reviews[] = [
                    'id' => (int) $row['id'],
                    'productId' => (string) $row['product_id'],
                    'authorName' => (string) $row['author_name'],
                    'rating' => (int) $row['rating'],
                    'body' => (string) $row['body'],
                    'imageUrl' => $hasImageUrl ? (string) ($row['image_url'] ?? '') : null,
                    'approved' => (int) $row['approved'] === 1,
                    'createdAt' => (string) $row['created_at'],
                ];
            }
            shoptop_json_response($reviews);
        }

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

        $fields = 'id, product_id, author_name, rating, body, created_at';
        if ($hasImageUrl) {
            $fields .= ', image_url';
        }
        $stmt = $pdo->prepare(
            'SELECT ' . $fields . '
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
                'imageUrl' => $hasImageUrl ? (string) ($row['image_url'] ?? '') : null,
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

        $action = trim((string) ($body['action'] ?? ''));
        if ($action === 'approve' || $action === 'reject' || $action === 'delete') {
            shoptop_require_admin();
            $reviewId = is_numeric($body['id'] ?? null) ? (int) $body['id'] : 0;
            if ($reviewId <= 0) {
                shoptop_json_error('ID-ul recenziei este invalid.', 400);
            }

            if ($action === 'delete') {
                $stmt = $pdo->prepare('DELETE FROM product_reviews WHERE id = :id');
                $stmt->execute(['id' => $reviewId]);
            } else {
                $approved = $action === 'approve' ? 1 : 0;
                $stmt = $pdo->prepare(
                    'UPDATE product_reviews SET approved = :approved WHERE id = :id'
                );
                $stmt->execute(['approved' => $approved, 'id' => $reviewId]);
            }

            if ($stmt->rowCount() === 0) {
                shoptop_json_error('Recenzia nu a fost gasita.', 404);
            }
            shoptop_json_response(['ok' => true]);
        }

        $productId = trim((string) ($body['productId'] ?? ''));
        $authorName = trim((string) ($body['authorName'] ?? ''));
        $reviewBody = trim((string) ($body['body'] ?? ''));
        $imageUrl = trim((string) ($body['imageUrl'] ?? ''));
        $imageUrl = $hasImageUrl ? shoptop_normalize_image_url($imageUrl) : '';
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

        if ($hasImageUrl) {
            $stmt = $pdo->prepare(
                'INSERT INTO product_reviews (product_id, author_name, rating, body, image_url, approved)
                 VALUES (:product_id, :author_name, :rating, :body, :image_url, 0)'
            );
            $stmt->execute([
                'product_id' => $productId,
                'author_name' => $authorName,
                'rating' => $rating,
                'body' => $reviewBody,
                'image_url' => $imageUrl !== '' ? $imageUrl : null,
            ]);
        } else {
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
        }

        // 200 in loc de 201: unele proxy / gazduiri trateaza altfel raspunsul.
        shoptop_json_response(['ok' => true], 200);
    }

    shoptop_json_error('Metoda HTTP nu este suportata.', 405);
} catch (PDOException $e) {
    error_log('reviews.php PDO: ' . $e->getMessage());
    $state = (string) ($e->errorInfo[0] ?? '');
    $mysqlCode = (int) ($e->errorInfo[1] ?? 0);
    if ($state === '42S02' || $mysqlCode === 1146) {
        shoptop_json_error(
            'Tabela product_reviews lipseste din baza de date. Ruleaza migrarea SQL (migrate-platforma-noua*.sql).',
            503,
        );
    }
    shoptop_json_error('Nu am putut salva recenzia. Incearca mai tarziu.', 500);
}
