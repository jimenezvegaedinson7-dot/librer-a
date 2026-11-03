BEGIN;

DO $$
DECLARE
    incoherentes INT;
BEGIN
    SELECT count(*) INTO incoherentes
    FROM ventas
    WHERE tipo_entrega IS NOT NULL
      AND (
          (tipo_entrega = 'domicilio' AND estado_entrega = 'listo_recojo')
       OR (tipo_entrega = 'tienda'    AND estado_entrega = 'en_camino')
      );

    IF incoherentes > 0 THEN
        RAISE NOTICE '028: % venta(s) con tipo/estado incoherente; se ajustan al estado equivalente de su tipo.', incoherentes;
    END IF;
END $$;

UPDATE ventas
SET estado_entrega = 'en_camino'
WHERE tipo_entrega = 'domicilio'
  AND estado_entrega = 'listo_recojo';

UPDATE ventas
SET estado_entrega = 'preparando'
WHERE tipo_entrega = 'tienda'
  AND estado_entrega = 'en_camino';

DO $$
BEGIN
    BEGIN
        ALTER TABLE ventas DROP CONSTRAINT ventas_tipo_estado_entrega_check;
    EXCEPTION WHEN undefined_object THEN
        NULL;
    END;

    ALTER TABLE ventas
        ADD CONSTRAINT ventas_tipo_estado_entrega_check
        CHECK (
            tipo_entrega IS NULL
            OR (tipo_entrega = 'domicilio'
                AND estado_entrega IN ('pendiente', 'preparando', 'en_camino', 'entregado', 'cancelado'))
            OR (tipo_entrega = 'tienda'
                AND estado_entrega IN ('pendiente', 'preparando', 'listo_recojo', 'entregado', 'cancelado'))
        );
END $$;

COMMIT;
