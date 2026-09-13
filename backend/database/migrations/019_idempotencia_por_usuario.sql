-- ============================================================
-- MIGRACIÓN 019: IDEMPOTENCIA POR USUARIO
-- ============================================================

SET @existe_indice_global = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'ventas'
      AND INDEX_NAME = 'uq_ventas_idempotencia'
);

SET @sql = IF(@existe_indice_global > 0,
    'ALTER TABLE ventas DROP INDEX uq_ventas_idempotencia',
    'SELECT 1 AS indice_global_ausente'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @existe_indice_usuario = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'ventas'
      AND INDEX_NAME = 'uq_ventas_usuario_idempotencia'
);

SET @sql = IF(@existe_indice_usuario = 0,
    'ALTER TABLE ventas ADD UNIQUE KEY uq_ventas_usuario_idempotencia (id_usuario, idempotencia_clave)',
    'SELECT 1 AS indice_usuario_ya_existente'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
