-- ============================================================
-- MIGRACIÓN 018: UN COMPROBANTE POR VENTA
-- ============================================================

-- Si hay duplicados históricos no se borra información. El modelo ya
-- serializa la emisión con FOR UPDATE; después de depurar esos registros se
-- puede volver a ejecutar esta migración para crear el índice.
SET @ventas_duplicadas = (
    SELECT COUNT(*)
    FROM (
        SELECT id_venta
        FROM comprobantes
        GROUP BY id_venta
        HAVING COUNT(*) > 1
    ) AS duplicadas
);

SET @existe_indice_anterior = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'comprobantes'
      AND INDEX_NAME = 'uq_comprobante_venta_tipo'
);

SET @sql = IF(
    @ventas_duplicadas = 0 AND @existe_indice_anterior > 0,
    'ALTER TABLE comprobantes DROP INDEX uq_comprobante_venta_tipo',
    'SELECT 1 AS indice_anterior_ausente'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @existe_indice_nuevo = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'comprobantes'
      AND INDEX_NAME = 'uq_comprobante_venta'
);

SET @sql = IF(
    @ventas_duplicadas = 0 AND @existe_indice_nuevo = 0,
    'ALTER TABLE comprobantes ADD UNIQUE KEY uq_comprobante_venta (id_venta)',
    'SELECT 1 AS indice_ya_existente'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
