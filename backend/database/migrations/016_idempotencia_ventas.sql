-- ============================================================
-- MIGRACIÓN 016: IDEMPOTENCIA DE ÓRDENES DE PAGO
-- ============================================================
-- Agrega idempotencia_clave a ventas + UNIQUE para evitar el
-- doble descuento de stock cuando el cliente reintenta
-- POST /api/pagos/crear-orden con la misma clave.
--
-- SEGURO E IDEMPOTENTE (ejecutable 2 veces sin error):
--   - La columna se agrega con ADD COLUMN IF NOT EXISTS.
--   - El índice UNIQUE se crea con guard: MySQL/MariaDB no
--     soportan ADD CONSTRAINT ... IF NOT EXISTS, por eso se
--     verifica primero con INFORMATION_SCHEMA.STATISTICS vía
--     una sentencia preparada.
-- ============================================================

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