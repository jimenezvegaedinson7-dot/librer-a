-- ============================================================
-- MIGRACIÓN 017: COMPROBANTES Y FACTURACIÓN
-- ============================================================
-- Objetivos:
--   1) Agregar cliente_email a comprobantes (snapshot del
--      comprador para facturas con identidad del comprador).
--   2) Agregar UNIQUE uq_comprobante_venta_tipo (id_venta, tipo)
--      para impedir la doble emisión del mismo comprobante sobre
--      la misma venta (refuerza el chequeo en comprobante.model).
--
-- SEGURO E IDEMPOTENTE (ejecutable 2 veces sin error):
--   - La columna se agrega con ADD COLUMN IF NOT EXISTS.
--   - El índice UNIQUE se crea con guard: MySQL/MariaDB no
--     soportan ADD CONSTRAINT ... IF NOT EXISTS, por eso se
--     verifica primero con INFORMATION_SCHEMA.STATISTICS vía
--     una sentencia preparada.
-- ============================================================

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