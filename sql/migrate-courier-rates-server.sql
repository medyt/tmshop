-- Tarifele din contracte (fără TVA) salvate în admin → Curieri → Tarife curieri.
-- Fan Courier: contract nr. 2730/23.06.2026 (Standard). DPD: anexa 5.001–10.000 expedieri/lună (door to door).
-- Indexul de combustibil și taxa de forță de muncă NU sunt setate aici (se completează din admin sau rămân din config.php).
-- Rulează pe baza vbpnetmf_shoptop (phpMyAdmin). Necesită tabela routing_settings (migrarea 17).

INSERT INTO `routing_settings` (`setting_key`, `setting_value`) VALUES
  ('rates_fan-courier', '{"base_under_3kg":10,"base_kg":3,"extra_kg":0.85,"extra_kg_over_30":3.5,"extra_parcel":0,"cod_fee":1,"obpd_open":1,"saturday_fee":7,"vat_percent":19}'),
  ('rates_dpd', '{"door_to_door_under_3kg":8.7,"extra_kg_under_30":1.33,"extra_kg_over_30":1.97,"extra_parcel":1.07,"cod_cash":1,"obpd_open":1.6,"saturday_fee":0,"vat_percent":19}')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);
