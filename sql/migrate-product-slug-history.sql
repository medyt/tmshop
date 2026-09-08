USE shoptop;

-- Istoric adrese URL (slug) pentru produse.
-- Când adresa unui produs se schimbă, cea veche rămâne aici și redirecționează
-- permanent (301) către cea nouă: reclamele și linkurile indexate rămân valide.
CREATE TABLE IF NOT EXISTS product_slug_history (
  slug VARCHAR(160) NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (slug),
  KEY idx_product_slug_history_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
