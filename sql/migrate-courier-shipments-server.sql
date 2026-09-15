USE vbpnetmf_shoptop;

-- =============================================================================
-- Etapa 1 rutare curieri: expedieri (o linie per AWB) cu câmpurile derivate din
-- tracking, setările curierilor și setările de rutare. Idempotent.
-- =============================================================================

CREATE TABLE IF NOT EXISTS courier_shipments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind VARCHAR(16) NOT NULL DEFAULT 'delivery',          -- delivery | return
  order_id VARCHAR(64) NOT NULL,
  return_request_id BIGINT UNSIGNED NULL,
  carrier VARCHAR(32) NOT NULL,                           -- dpd | fan-courier
  service VARCHAR(64) NULL,
  awb VARCHAR(64) NOT NULL,
  parcel_id VARCHAR(64) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'awb_emis',         -- awb_emis ridicat in_tranzit in_livrare livrat refuzat retur anulat
  county VARCHAR(100) NULL,
  city VARCHAR(120) NULL,
  parcels INT NOT NULL DEFAULT 1,
  weight_kg DECIMAL(6,2) NOT NULL DEFAULT 1.00,
  cod_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL,                              -- comanda
  awb_at TIMESTAMP NULL,                                  -- emiterea AWB
  picked_up_at TIMESTAMP NULL,
  pickup_estimated TINYINT(1) NOT NULL DEFAULT 0,
  delivered_at TIMESTAMP NULL,
  finalized_at TIMESTAMP NULL,                            -- livrat / retur / refuzat
  promised_days INT NULL,                                 -- termen fixat la alocare (zile lucrătoare)
  transit_days DECIMAL(6,2) NULL,                         -- calendaristice ridicare -> livrare
  working_days INT NULL,                                  -- lucrătoare ridicare -> livrare
  on_time TINYINT(1) NULL,
  picked_on_time TINYINT(1) NULL,
  customer_delay TINYINT(1) NOT NULL DEFAULT 0,
  cost DECIMAL(10,2) NULL,                                -- cu TVA
  cost_source VARCHAR(16) NULL,                           -- api | contract | estimate
  last_event VARCHAR(255) NULL,
  last_event_at TIMESTAMP NULL,
  tracking JSON NULL,
  allocation JSON NULL,
  last_sync_at TIMESTAMP NULL,
  sync_error VARCHAR(255) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_courier_shipments_awb (awb),
  KEY idx_courier_shipments_order (order_id),
  KEY idx_courier_shipments_carrier_awb_at (carrier, awb_at),
  KEY idx_courier_shipments_status (status),
  KEY idx_courier_shipments_zone (carrier, county, city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS courier_settings (
  carrier VARCHAR(32) NOT NULL,
  name VARCHAR(64) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  color VARCHAR(16) NULL,
  priority_type VARCHAR(16) NOT NULL DEFAULT 'normal',    -- preferat | normal | scump
  priority INT NOT NULL DEFAULT 10,
  sla_days INT NOT NULL DEFAULT 1,
  weight_min DECIMAL(6,2) NULL,
  weight_max DECIMAL(6,2) NULL,
  daily_limit INT NULL,
  services JSON NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (carrier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO courier_settings (carrier, name, active, color, priority_type, priority, sla_days, services) VALUES
  ('fan-courier', 'Fan Courier', 1, '#d61f26', 'normal', 1, 1, '{"ramburs":1,"sambata":0,"deschidere_colet":1}'),
  ('dpd', 'DPD', 1, '#dc0032', 'normal', 2, 1, '{"ramburs":1,"sambata":0,"deschidere_colet":1}');

CREATE TABLE IF NOT EXISTS routing_settings (
  setting_key VARCHAR(64) NOT NULL,
  setting_value VARCHAR(255) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO routing_settings (setting_key, setting_value) VALUES
  ('pondere_timp', '20'), ('pondere_retur', '90'), ('pondere_la_timp', '90'), ('pondere_cost', '50'),
  ('zile_istoric', '20'), ('min_awb_localitate', '5'), ('min_awb_judet', '5'),
  ('prag_preferat', '90'), ('deviatie_pret', '13'), ('deviatie_pret_fix', '0'),
  ('sambata_optional', '1'), ('deschidere_optional', '1'), ('retur_mod', 'innoship'), ('ora_cutoff', '15'),
  ('sync_interval_min', '30'), ('sync_batch', '60');
