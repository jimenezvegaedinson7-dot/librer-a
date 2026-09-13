-- ============================================================
-- MIGRACIÓN 002: VERIFICACIÓN DE EMAIL EN EL REGISTRO
-- ============================================================
-- EJECUCIÓN:
--   1. Abre MySQL (workbench / consola / phpMyAdmin)
--   2. Ejecuta este archivo en la base libreria_db
--
--   Ejemplo por consola:
--     mysql -u root -p libreria_db < database/migrations/002_add_email_verification.sql
--
-- NOTA: Es SEGURO (ALTER TABLE ADD COLUMN).
-- NO elimina ni reinicia datos. NO usa DROP/TRUNCATE.
-- ============================================================

-- Código de verificación de 6 dígitos (se guarda su hash por seguridad).
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS email_verification_code VARCHAR(255) NULL;

-- Fecha/hora hasta la que es válido el código.
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS email_verification_expires DATETIME NULL;

-- Marca cuándo se verificó el correo (NULL = aún no verificado).
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS email_verified_at DATETIME NULL;
