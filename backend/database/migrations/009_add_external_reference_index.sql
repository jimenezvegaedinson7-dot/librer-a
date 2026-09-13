-- ============================================================
-- MIGRACIÓN 009: ÍNDICE external_reference EN VENTAS
-- ============================================================
-- El webhook de Mercado Pago y GET /pagos/:orderId localizan la
-- venta por external_reference. Se indexa para consultas rápidas.
-- SEGURO: ADD INDEX IF NOT EXISTS, no borra datos.
-- ============================================================

ALTER TABLE ventas
    ADD INDEX IF NOT EXISTS idx_ventas_external_reference (external_reference);