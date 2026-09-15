-- Varianta locală (baza `shoptop`) a lui migrate-courier-rates-server.sql.
USE `shoptop`;

INSERT INTO `routing_settings` (`setting_key`, `setting_value`) VALUES
  ('rates_fan-courier', '{"base_under_3kg":10,"base_kg":3,"extra_kg":0.85,"extra_kg_over_30":3.5,"extra_parcel":0,"cod_fee":1,"obpd_open":1,"saturday_fee":7,"vat_percent":19}'),
  ('rates_dpd', '{"door_to_door_under_3kg":8.7,"extra_kg_under_30":1.33,"extra_kg_over_30":1.97,"extra_parcel":1.07,"cod_cash":1,"obpd_open":1.6,"saturday_fee":0,"vat_percent":19}')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);
