BEGIN;

DO $$
DECLARE
    columna_existe BOOLEAN;
BEGIN
    SELECT INTO columna_existe EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'ventas'
        AND column_name = 'estado_entrega'
    );

    IF columna_existe THEN

        BEGIN
            ALTER TABLE ventas ALTER COLUMN estado_entrega SET DEFAULT 'pendiente';
        EXCEPTION WHEN OTHERS THEN

            NULL;
        END;
    END IF;
END $$;

DO $$
BEGIN
    ALTER TABLE ventas ADD COLUMN IF NOT EXISTS estado_entrega VARCHAR(20)
        NOT NULL DEFAULT 'pendiente';
EXCEPTION WHEN duplicate_column THEN

    NULL;
END $$;

DO $$
DECLARE
    constraint_name TEXT := 'ventas_estado_entrega_check';
BEGIN

    BEGIN
        EXECUTE format('ALTER TABLE ventas DROP CONSTRAINT %I', constraint_name);
    EXCEPTION WHEN undefined_object THEN

        NULL;
    END;

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

    NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_ventas_estado_entrega ON ventas (estado_entrega);

COMMIT;
