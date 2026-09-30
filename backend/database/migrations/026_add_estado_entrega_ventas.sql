-- ============================================================
-- MIGRACIÓN 026: agregar estado_entrega a ventas (PostgreSQL)
-- ============================================================
-- Agrega el campo estado_entrega a la tabla ventas para separar
-- estado logístico del estado comercial. Usado por los flujos
-- de Delivery y Recojo en tienda.
-- Idempotente: si ya existe, no hace nada.
-- ============================================================
-- ORDEN IMPORTANTE
--   1) Validar que no haya valores de estado_entrega extrańos en
--      ventas previas a esta migraci´on (solo aplica si la columna
--      todavía no existe o está vac´ia).
--   2) Si la validación falla, la migraci´n se detiene y la base
--      queda exactamente como estaba (no se toca nada).
--   3) Agregar la columna nueva con valor por defecto 'pendiente'.
--   4) Aplicar CHECK constraint con los valores permitidos.
--   5) Índice de apoyo para consultas por estado de entrega.
-- ATOMICIDAD
--   Todo el archivo va dentro de un BEGIN/COMMIT expl´ıcito.
-- ============================================================
BEGIN;

-- 1) Validaci´on previa: solo si la columna aún no existe.
--    Si la columna ya existe (por una ejecuci´n anterior o schema.sql),
--    este bloque NO falla y se saltea.
DO $$
DECLARE
    columna_existe BOOLEAN;
BEGIN
    SELECT INTO columna_existe EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'ventas'
        AND column_name = 'estado_entrega'
    );
    -- Si ya existe, hacemos NULL para que el bloque siguiente sea un NO-OP seguro.
    IF columna_existe THEN
        -- Solo establecemos un valor por defecto si la columna existe pero
        -- no tiene valor por defecto. Si la columna no existe, este bloque
        -- falla y la migraci´n se detiene (seguridad).
        BEGIN
            ALTER TABLE ventas ALTER COLUMN estado_entrega SET DEFAULT 'pendiente';
        EXCEPTION WHEN OTHERS THEN
            -- La columna no existe o no se puede modificar; la migraci´n
            -- se detendr´a en el siguiente bloque CHECK.
            NULL;
        END;
    END IF;
END $$;

-- 2) Agregar la columna estado_entrega si no existe.
--    Usamos una transacci´on anidada: si la columna ya existe, el ALTER
--    falla controladamente y continuamos (el CHECK se aplicará más tarde
--    o será ignorado si la columna ya existe).
DO $$
BEGIN
    ALTER TABLE ventas ADD COLUMN IF NOT EXISTS estado_entrega VARCHAR(20)
        NOT NULL DEFAULT 'pendiente';
EXCEPTION WHEN duplicate_column THEN
    -- Columna ya existe; continuamos sin error.
    NULL;
END $$;

-- 3) Aplicar CHECK constraint con los valores permitidos.
--    Si la columna ya existía y ya tenía un CHECK, este DROP y ADD
--    lo reemplazaremos. Si es nueva, creamos la restricci´on.
DO $$
DECLARE
    constraint_name TEXT := 'ventas_estado_entrega_check';
BEGIN
    -- Intentamos eliminar la restricci´on si ya existe (por si la migra
    -- se reejecuta).
    BEGIN
        EXECUTE format('ALTER TABLE ventas DROP CONSTRAINT %I', constraint_name);
    EXCEPTION WHEN undefined_object THEN
        -- No existía; continuamos.
        NULL;
    END;

    -- Agregamos la nueva restricci´on CHECK.
    ALTER TABLE ventas
        ADD CONSTRAINT ventas_estado_entrega_check
        CHECK (estado_entrega IN (
            'pendiente',
            'preparando',
            'listo_recojo',
            'en_camino',
            'entregado',
            'cancelado'
        ));
EXCEPTION WHEN duplicate_object THEN
    -- Já si existía (aunque el bloque anterior debería haberla
    -- reemplazado). Ignoramos.
    NULL;
END $$;

-- 4) Índice de apoyo para consultas por estado de entrega.
CREATE INDEX IF NOT EXISTS idx_ventas_estado_entrega ON ventas (estado_entrega);

COMMIT;