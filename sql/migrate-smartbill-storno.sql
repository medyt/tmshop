USE shoptop;

ALTER TABLE orders
  ADD COLUMN invoice_storno_series VARCHAR(32) NULL AFTER invoice_error,
  ADD COLUMN invoice_storno_number VARCHAR(32) NULL AFTER invoice_storno_series,
  ADD COLUMN invoice_storno_at TIMESTAMP NULL AFTER invoice_storno_number;
