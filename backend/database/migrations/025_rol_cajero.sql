-- ============================================================
-- MIGRACIÓN 025: ROL "CAJERO" (PostgreSQL)
-- Idempotente. Pensada para aplicarse sola al arrancar el servidor.
-- ============================================================
-- El rol vive en usuarios.rol como VARCHAR(20) con una restricción
-- CHECK en línea (nombre automático: usuarios_rol_check) que en las
-- bases antiguas solo admite 'cliente' y 'administrador'. Insertar
-- 'cajero' falla en la base, por eso hay que reemplazar el CHECK.
--
-- Esta migración SOLO amplía el dominio de valores del rol:
--   - No crea, no modifica y no elimina usuarios.
--   - No convierte administradores en cajeros ni clientes en cajeros.
--   - No toca ninguna otra columna, tabla ni dato.
-- Los roles existentes siguen funcionando exactamente igual.
--
-- ORDEN IMPORTANTE
--   1) Primero se VALIDA que no haya roles fuera del dominio nuevo.
--   2) Solo si la validación pasa se toca el esquema.
-- Si hay un rol inesperado, la migración se detiene antes de borrar
-- ninguna restricción, así que la base queda exactamente como estaba.
--
-- ATOMICIDAD
--   Todo el archivo va dentro de un BEGIN/COMMIT explícito, no solo de
--   la transacción implícita de un pool.query().
-- ============================================================

-- ------------------------------------------------------------
-- 1) Todo lo que sigue va dentro de una transacción explícita,
--    no solo de la implícita de un pool.query(). Así la migración
--    es atómica aunque se ejecute sentencia por sentencia (por
--    ejemplo "psql -f 025_rol_cajero.sql"), donde cada sentencia
--    se confirmaría por separado.
--
--    Por eso NO se usa CREATE INDEX CONCURRENTLY: no se permite
--    dentro de un bloque transaccional.
-- ------------------------------------------------------------
BEGIN;

-- 2) VALIDACIÓN PREVIA. Solo lee; no modifica nada.
--    Si alguna fila tuviera un valor de rol fuera de los tres
--    permitidos, se aborta aquí, antes de tocar el esquema, y toda
--    la transacción se deshace: la base queda como estaba.
--    (rol es NOT NULL, así que no hay valores NULL que salvar).
-- ------------------------------------------------------------
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

-- 3) Quitar la restricción antigua si existe con ese nombre (caso
--    normal: base vieja creada con el CHECK de dos roles, o base
--    nueva de schema.sql).
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;

-- 4) Por si el CHECK se creó con otro nombre (una base donde alguien
--    lo agregó después por separado), se eliminan las CHECK de la
--    tabla que sean el dominio de valores del rol.
--    Se mira pg_get_constraintdef() y NO el nombre: así no se toca por
--    error un CHECK de otra columna. Además se exige que la definición
--    mencione 'cliente' o 'administrador', que es lo que delata a esta
--    restricción y evita arrastrar cualquier otra.
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

-- 5) Restricción nueva con los tres roles.
ALTER TABLE usuarios
    ADD CONSTRAINT usuarios_rol_check
    CHECK (rol IN ('cliente', 'administrador', 'cajero'));

-- 6) Índice de apoyo para filtrar por rol en el panel de Usuarios.
--    IF NOT EXISTS: en una base creada desde schema.sql ya existe y
--    esto no hace nada; en la segunda ejecución tampoco lo duplica.
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios (rol);

COMMIT;
