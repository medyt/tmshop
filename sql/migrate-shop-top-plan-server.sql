-- Rulează pe serverul de producție (fără USE shoptop).

ALTER TABLE orders
  ADD COLUMN access_token VARCHAR(64) NULL AFTER id,
  ADD COLUMN user_id VARCHAR(64) NULL AFTER access_token,
  ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'new' AFTER total_amount,
  ADD KEY idx_orders_user_id (user_id),
  ADD KEY idx_orders_access_token (access_token);

UPDATE orders
SET access_token = LOWER(CONCAT(
  SUBSTRING(MD5(CONCAT(id, '-', created_at)), 1, 16),
  SUBSTRING(MD5(CONCAT(created_at, '-', id)), 1, 16)
))
WHERE access_token IS NULL OR access_token = '';

ALTER TABLE products
  ADD COLUMN slug VARCHAR(160) NULL AFTER name,
  ADD COLUMN category VARCHAR(120) NULL AFTER slug,
  ADD UNIQUE KEY uq_products_slug (slug);

CREATE TABLE IF NOT EXISTS product_reviews (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id VARCHAR(64) NOT NULL,
  author_name VARCHAR(120) NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  image_url VARCHAR(1024) NULL,
  approved TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_product_reviews_product (product_id),
  KEY idx_product_reviews_approved (approved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
