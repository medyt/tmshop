USE vbpnetmf_shoptop;

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(64) NULL,
  supplier_price_a DECIMAL(12, 2) NOT NULL DEFAULT 0,
  supplier_price_b DECIMAL(12, 2) NOT NULL DEFAULT 0,
  cost_supplier ENUM('A', 'B', 'lower') NOT NULL DEFAULT 'lower',
  sale_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  stock_qty INT UNSIGNED NOT NULL DEFAULT 0,
  image_urls JSON NOT NULL,
  description TEXT NULL,
  market_observations JSON NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
