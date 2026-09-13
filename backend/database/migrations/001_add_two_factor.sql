-- ============================================================
-- MIGRACIÓN 001: AGREGAR CAMPOS DE 2FA A LA TABLA usuarios
-- ============================================================
-- EJECUCIÓN:
--   1. Abre MySQL (workbench / consola / phpMyAdmin)
--   2. Ejecuta este archivo en la base libreria_db
--
--   Ejemplo por consola:
--     mysql -u root -p libreria_db < database/migrations/001_add_two_factor.sql
--
-- NOTA: Es SEGURO (ALTER TABLE ADD COLUMN).
-- NO elimina ni reinicia datos. NO usa DROP/TRUNCATE.
-- ============================================================

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS two_factor_secret TEXT NULL;
