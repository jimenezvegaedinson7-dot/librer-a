-- ============================================================
-- MIGRACIÓN 005: REFERENCIA EXTERNA DE LA ORDEN EN VENTAS
-- ============================================================
-- Guarda el external_reference con el que se crea la orden en
-- la pasarela de pago (orden_<id_usuario>_<timestamp>). Sirve para
-- localizar la venta cuando llega el webhook de pago/orden.
-- SEGURO: ADD COLUMN, no borra ni reinicia datos.
-- ============================================================

ALTER TABLE ventas
    ADD COLUMN IF NOT EXISTS external_reference VARCHAR(64) NULL;

-- (el índice se crea con CHECK en el script de aplicación para evitar
--  el ADD INDEX IF NOT EXISTS que MySQL no soporta)