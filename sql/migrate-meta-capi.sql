USE shoptop;

CREATE TABLE IF NOT EXISTS order_meta_attribution (
  order_id VARCHAR(64) NOT NULL,
  fbp VARCHAR(128) NULL,
  fbc VARCHAR(255) NULL,
  event_source_url VARCHAR(512) NULL,
  user_agent VARCHAR(512) NULL,
  client_ip VARCHAR(64) NULL,
  PRIMARY KEY (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
