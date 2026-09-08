USE shoptop;

ALTER TABLE orders
  ADD COLUMN courier_cost_total DECIMAL(10, 2) NULL AFTER return_received,
  ADD COLUMN courier_cost_net DECIMAL(10, 2) NULL AFTER courier_cost_total,
  ADD COLUMN courier_cost_vat DECIMAL(10, 2) NULL AFTER courier_cost_net,
  ADD COLUMN courier_cost_details JSON NULL AFTER courier_cost_vat,
  ADD COLUMN courier_cost_source ENUM('api', 'contract') NULL AFTER courier_cost_details,
  ADD COLUMN courier_cost_at TIMESTAMP NULL AFTER courier_cost_source;
