USE vbpnetmf_shoptop;

ALTER TABLE orders
  ADD COLUMN ship_county VARCHAR(16) NULL AFTER customer_address,
  ADD COLUMN ship_county_name VARCHAR(100) NULL AFTER ship_county,
  ADD COLUMN ship_city VARCHAR(120) NULL AFTER ship_county_name,
  ADD COLUMN ship_street VARCHAR(200) NULL AFTER ship_city,
  ADD COLUMN ship_street_number VARCHAR(32) NULL AFTER ship_street,
  ADD COLUMN ship_address_extra VARCHAR(255) NULL AFTER ship_street_number,
  ADD COLUMN ship_postal_code VARCHAR(16) NULL AFTER ship_address_extra,
  ADD COLUMN dpd_parcel_id VARCHAR(64) NULL AFTER awb_issued_at,
  MODIFY COLUMN awb_number VARCHAR(64) NULL;
