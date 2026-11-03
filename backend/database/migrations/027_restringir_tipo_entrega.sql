BEGIN;

DO $$
DECLARE
    fuera_de_dominio INT;
BEGIN
    SELECT count(*) INTO fuera_de_dominio
    FROM ventas
    WHERE tipo_entrega IS NOT NULL
      AND tipo_entrega NOT IN ('domicilio', 'tienda');

    IF fuera_de_dominio > 0 THEN
        RAISE NOTICE '027: % venta(s) con tipo_entrega fuera de dominio; se normalizan a ''tienda''.', fuera_de_dominio;
    END IF;
END $$;

UPDATE ventas
SET tipo_entrega = 'tienda'
WHERE tipo_entrega IS NOT NULL
  AND tipo_entrega NOT IN ('domicilio', 'tienda');

DO $$
BEGIN
    BEGIN
        ALTER TABLE ventas DROP CONSTRAINT ventas_tipo_entrega_check;
    EXCEPTION WHEN undefined_object THEN
        NULL;
    END;

    ALTER TABLE ventas
        ADD CONSTRAINT ventas_tipo_entrega_check
        CHECK (
            tipo_entrega IS NULL
            OR tipo_entrega IN ('domicilio', 'tienda')
        );
END $$;

COMMIT;
