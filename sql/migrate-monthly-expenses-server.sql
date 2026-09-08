-- Server: cheltuieli lunare (Facebook, consumabile, consultanță) — fără USE
CREATE TABLE IF NOT EXISTS monthly_expenses (
  month_key CHAR(7) NOT NULL COMMENT 'YYYY-MM',
  facebook_ads DECIMAL(12,2) NOT NULL DEFAULT 0,
  consumables DECIMAL(12,2) NOT NULL DEFAULT 0,
  consulting DECIMAL(12,2) NOT NULL DEFAULT 0,
  salaries DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (month_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
