ALTER TABLE ventas
    ADD COLUMN IF NOT EXISTS idempotencia_clave VARCHAR(64) NULL;

SET @existe_indice = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'ventas'
      AND INDEX_NAME = 'uq_ventas_idempotencia'
);

SET @sql = IF(@existe_indice = 0,
    'ALTER TABLE ventas ADD UNIQUE KEY uq_ventas_idempotencia (idempotencia_clave)',
    'SELECT 1 AS indice_ya_existente'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
