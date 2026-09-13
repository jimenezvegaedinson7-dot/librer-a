-- ============================================================
-- MIGRACIÓN 014: ÍNDICES PARA REPORTES / LIMPIEZA
-- ============================================================
-- Acelera las consultas del job de limpieza de ventas abandonadas
-- (estado='pendiente' + fecha antigua) y de reservas vencidas
-- (fecha_vencimiento < NOW() + estado activo).
--
-- MySQL no soporta CREATE INDEX IF NOT EXISTS en versiones viejas;
-- el script de aplicación verifica INFORMATION_SCHEMA.STATISTICS
-- antes de ejecutar y captura 'Duplicate key name' como seguridad.
-- ============================================================

CREATE INDEX idx_ventas_estado_fecha
    ON ventas (estado, fecha_venta);

CREATE INDEX idx_reservas_venc_estado
    ON reservas (fecha_vencimiento, estado);