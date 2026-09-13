-- ============================================================
-- MIGRACIÓN 012: REFERENCIA DE ENTREGA EN VENTAS
-- ============================================================
-- Guarda una referencia opcional de la dirección de entrega
-- (p.ej. "Departamento 301, torre A") en ventas.
-- SEGURO: ALTER TABLE ADD COLUMN, no borra datos.
-- ============================================================

ALTER TABLE ventas
    ADD COLUMN IF NOT EXISTS referencia VARCHAR(255) NULL;