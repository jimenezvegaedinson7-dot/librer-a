-- ============================================================
-- MIGRACIÓN 007: CAMPOS DE UBICACIÓN Y AGENCIA EN VENTAS
-- ============================================================
-- Agrega las columnas necesarias para el envío estructurado.
-- SEGURO: ALTER TABLE ADD COLUMN, no borra datos.
-- ============================================================

ALTER TABLE ventas
    ADD COLUMN IF NOT EXISTS id_distrito INT NULL,
    ADD COLUMN IF NOT EXISTS id_agencia INT NULL;

ALTER TABLE ventas
    ADD INDEX IF NOT EXISTS idx_ventas_id_distrito (id_distrito);