USE shoptop;

-- Facturare SmartBill + date facturare PF/PJ
ALTER TABLE orders
  ADD COLUMN billing_type VARCHAR(16) NOT NULL DEFAULT 'person' AFTER customer_notes,
  ADD COLUMN company_name VARCHAR(255) NULL AFTER billing_type,
  ADD COLUMN company_cui VARCHAR(32) NULL AFTER company_name,
  ADD COLUMN company_reg_com VARCHAR(64) NULL AFTER company_cui,
  ADD COLUMN invoice_series VARCHAR(32) NULL AFTER awb_issued_at,
  ADD COLUMN invoice_number VARCHAR(32) NULL AFTER invoice_series,
  ADD COLUMN invoice_url VARCHAR(512) NULL AFTER invoice_number,
  ADD COLUMN invoice_issued_at TIMESTAMP NULL AFTER invoice_url,
  ADD COLUMN invoice_error VARCHAR(512) NULL AFTER invoice_issued_at;

