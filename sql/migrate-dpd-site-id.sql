USE shoptop;

ALTER TABLE orders
  MODIFY COLUMN ship_county VARCHAR(64) NULL,
  ADD COLUMN dpd_site_id INT NULL AFTER ship_postal_code;
