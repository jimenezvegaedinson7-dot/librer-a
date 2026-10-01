-- Dominio actual: administrador y cliente. Conserva IDs, compras y datos.
-- Las cuentas del rol retirado pasan a cliente INACTIVO; nunca a admin.
-- Migración transaccional e idempotente, para bases de versiones previas.
BEGIN;
LOCK TABLE usuarios IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM usuarios WHERE rol NOT IN ('cliente', 'administrador', 'cajero')) THEN
        RAISE EXCEPTION 'Migración 029 cancelada: existe un rol desconocido';
    END IF;
END $$;

-- Solo sustituye CHECKs del dominio de rol, incluyendo nombres personalizados.
DO $$
DECLARE restriccion TEXT;
BEGIN
    FOR restriccion IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'usuarios'::regclass AND contype = 'c'
          AND pg_get_constraintdef(oid) ~ '\mrol\M'
          AND (pg_get_constraintdef(oid) LIKE '%cliente%' OR pg_get_constraintdef(oid) LIKE '%administrador%')
    LOOP
        EXECUTE format('ALTER TABLE usuarios DROP CONSTRAINT %I', restriccion);
    END LOOP;
END $$;

UPDATE usuarios SET rol = 'cliente', estado = 0 WHERE rol = 'cajero';
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol IN ('cliente', 'administrador'));
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios (rol);
COMMIT;
