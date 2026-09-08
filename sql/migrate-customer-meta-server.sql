USE vbpnetmf_shoptop;

-- Date manuale despre clienți (clienții se derivă din comenzi; aici doar
-- notițe interne, blacklist, etichete). Cheia = telefon normalizat sau email.
CREATE TABLE IF NOT EXISTS customer_meta (
  customer_key VARCHAR(190) NOT NULL,
  notes TEXT NULL,
  blacklisted TINYINT(1) NOT NULL DEFAULT 0,
  tags VARCHAR(255) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (customer_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
