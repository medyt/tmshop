USE shoptop;

ALTER TABLE monthly_expenses
  ADD COLUMN salaries DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER consulting;
