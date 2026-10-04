-- Revoca tokens anteriores cuando cambia la contraseña, sin rotar claves JWT
-- ni invalidar inicialmente sesiones de cuentas que no cambiaron contraseña.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS sesion_version INTEGER NOT NULL DEFAULT 0;
