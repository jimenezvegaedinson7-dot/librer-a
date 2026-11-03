ALTER TABLE comprobantes
    ADD COLUMN IF NOT EXISTS cliente_email VARCHAR(255) NULL;

SET @existe_indice = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'comprobantes'
      AND INDEX_NAME = 'uq_comprobante_venta_tipo'
);

SET @sql = IF(@existe_indice = 0,
    'ALTER TABLE comprobantes ADD UNIQUE KEY uq_comprobante_venta_tipo (id_venta, tipo)',
    'SELECT 1 AS indice_ya_existente'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
