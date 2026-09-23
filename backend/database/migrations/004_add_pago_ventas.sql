-- ============================================================
-- MIGRACIÓN 004: INFORMACIÓN DE PAGO EN VENTAS (PASARELA DE PAGO, histórica)
-- ============================================================
-- EJECUCIÓN:
--   1. Abre MySQL (workbench / consola / phpMyAdmin)
--   2. Ejecuta este archivo en la base libreria_db
--
--   Ejemplo por consola:
--     mysql -u root -p libreria_db < database/migrations/004_add_pago_ventas.sql
--
-- NOTA: Es SEGURO (ALTER TABLE ADD COLUMN).
-- NO elimina ni reinicia datos. NO usa DROP/TRUNCATE.
-- ============================================================

-- ID de la preferencia generada en la pasarela (para localizar el pago).
ALTER TABLE ventas
    ADD COLUMN IF NOT EXISTS mp_preference_id VARCHAR(64) NULL;

-- ID del pago aprobado en la pasarela (se llena cuando el webhook confirma).
ALTER TABLE ventas
    ADD COLUMN IF NOT EXISTS mp_payment_id BIGINT NULL;

-- Estado del pago en la pasarela: pending / approved / rejected / cancelled.
ALTER TABLE ventas
    ADD COLUMN IF NOT EXISTS mp_payment_status VARCHAR(25) NULL;

-- Correo del comprador en la pasarela (puede diferir del de la cuenta).
ALTER TABLE ventas
    ADD COLUMN IF NOT EXISTS mp_payer_email VARCHAR(255) NULL;

-- (el índice se crea en la sección siguiente con ADD INDEX)