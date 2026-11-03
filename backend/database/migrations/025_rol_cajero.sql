BEGIN;

DO $$
DECLARE
    roles_inesperados TEXT;
BEGIN
    SELECT string_agg(DISTINCT rol::text, ', ' ORDER BY rol::text)
    INTO roles_inesperados
    FROM usuarios
    WHERE rol IS NOT NULL
      AND rol NOT IN ('cliente', 'administrador', 'cajero');

    IF roles_inesperados IS NOT NULL THEN
        RAISE EXCEPTION
            'Migración 025 cancelada: usuarios.rol contiene valores no permitidos: %',
            roles_inesperados;
    END IF;
END $$;

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;

DO $$
DECLARE
    nombre_constraint TEXT;
BEGIN
    FOR nombre_constraint IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'usuarios'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ~ '\mrol\M'
          AND (
              pg_get_constraintdef(oid) LIKE '%cliente%'
              OR pg_get_constraintdef(oid) LIKE '%administrador%'
          )
    LOOP
        EXECUTE format(
            'ALTER TABLE usuarios DROP CONSTRAINT %I',
            nombre_constraint
        );
    END LOOP;
END $$;

ALTER TABLE usuarios
    ADD CONSTRAINT usuarios_rol_check
    CHECK (rol IN ('cliente', 'administrador', 'cajero'));

CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios (rol);

COMMIT;
