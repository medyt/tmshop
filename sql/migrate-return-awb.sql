USE shoptop;

-- AWB de ridicare a coletului de retur (curierul ridică de la client și livrează la magazin).
-- Idempotent: poate fi rulat de mai multe ori.
DELIMITER $$
DROP PROCEDURE IF EXISTS shoptop_add_column $$
CREATE PROCEDURE shoptop_add_column(IN tbl VARCHAR(64), IN col VARCHAR(64), IN ddl TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN ', ddl);
    PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END $$
DELIMITER ;

CALL shoptop_add_column('return_requests', 'return_awb_number', "return_awb_number VARCHAR(64) NULL AFTER admin_notes");
CALL shoptop_add_column('return_requests', 'return_awb_carrier', "return_awb_carrier VARCHAR(32) NULL AFTER return_awb_number");
CALL shoptop_add_column('return_requests', 'return_awb_parcel_id', "return_awb_parcel_id VARCHAR(64) NULL AFTER return_awb_carrier");
CALL shoptop_add_column('return_requests', 'return_awb_issued_at', "return_awb_issued_at TIMESTAMP NULL AFTER return_awb_parcel_id");

DROP PROCEDURE IF EXISTS shoptop_add_column;
