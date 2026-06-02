-- =============================================================================
-- ShopTop / TM SHOP SRL — migrare consolidata "platforma noua" (SERVER)
-- =============================================================================
-- Ruleaza pe baza de date de productie (selecteaza baza in phpMyAdmin INAINTE,
-- sau adauga manual un USE `nume_baza`; la inceput). FARA `USE shoptop;`.
--
-- Acest fisier este IDEMPOTENT: poate fi rulat de mai multe ori fara erori.
-- Contine TOT ce tine de baza de date pentru:
--   1. Moderarea recenziilor (product_reviews) - livrat in sesiunea curenta
--   2. Atribute pentru feed-uri pe products (ean, brand, google_category, mpn)
--   3. Coloane de plata pe orders (Netopia + BaseLinker)
--   4. Tabel return_requests (sistem retururi)
--
-- Cheile/secretele (Netopia, BaseLinker, SMTP) NU stau in DB, ci in config.php.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Proceduri helper pentru idempotenta (MySQL 8 NU accepta ADD COLUMN IF NOT EXISTS).
-- -----------------------------------------------------------------------------
DELIMITER $$

DROP PROCEDURE IF EXISTS shoptop_add_column $$
CREATE PROCEDURE shoptop_add_column(IN tbl VARCHAR(64), IN col VARCHAR(64), IN ddl TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN ', ddl);
    PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END $$

DROP PROCEDURE IF EXISTS shoptop_add_index $$
CREATE PROCEDURE shoptop_add_index(IN tbl VARCHAR(64), IN idx VARCHAR(64), IN ddl TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD ', ddl);
    PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END $$

DELIMITER ;

-- -----------------------------------------------------------------------------
-- 1. Recenzii produse (moderare admin)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_reviews (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id VARCHAR(64) NOT NULL,
  author_name VARCHAR(120) NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  approved TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_product_reviews_product (product_id),
  KEY idx_product_reviews_approved (approved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Atribute feed pe products (Google / Meta / TikTok)
-- -----------------------------------------------------------------------------
CALL shoptop_add_column('products', 'ean', "ean VARCHAR(64) NULL AFTER sku");
CALL shoptop_add_column('products', 'brand', "brand VARCHAR(120) NULL AFTER ean");
CALL shoptop_add_column('products', 'google_category', "google_category VARCHAR(160) NULL AFTER brand");
CALL shoptop_add_column('products', 'mpn', "mpn VARCHAR(64) NULL AFTER google_category");
-- Mapare catre catalogul BaseLinker (ID-ul produsului din inventory).
CALL shoptop_add_column('products', 'baselinker_product_id', "baselinker_product_id VARCHAR(64) NULL AFTER mpn");

-- -----------------------------------------------------------------------------
-- 3. Coloane de plata pe orders (Netopia + BaseLinker)
-- -----------------------------------------------------------------------------
CALL shoptop_add_column('orders', 'payment_method', "payment_method VARCHAR(16) NOT NULL DEFAULT 'cod' AFTER status");
CALL shoptop_add_column('orders', 'payment_status', "payment_status VARCHAR(16) NOT NULL DEFAULT 'pending' AFTER payment_method");
CALL shoptop_add_column('orders', 'payment_ref', "payment_ref VARCHAR(128) NULL AFTER payment_status");
CALL shoptop_add_column('orders', 'baselinker_order_id', "baselinker_order_id VARCHAR(64) NULL AFTER payment_ref");
CALL shoptop_add_index('orders', 'idx_orders_payment_status', "KEY idx_orders_payment_status (payment_status)");

-- -----------------------------------------------------------------------------
-- 4. Cereri de retur
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS return_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id VARCHAR(64) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NULL,
  items JSON NULL,
  reason TEXT NULL,
  iban VARCHAR(40) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'nou',
  admin_notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_return_requests_order (order_id),
  KEY idx_return_requests_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Curatenie: stergem procedurile helper.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS shoptop_add_column;
DROP PROCEDURE IF EXISTS shoptop_add_index;
