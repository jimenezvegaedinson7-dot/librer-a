-- ============================================================
-- MIGRACIÓN 028: coherencia entre ventas.tipo_entrega y estado_entrega
-- ============================================================
-- Por qué
--   La API ya impedía mover un pedido a 'listo_recojo' si el envío era a
--   domicilio (o a 'en_camino' si era recojo en tienda). Pero esa regla
--   vivía solo en el backend: un UPDATE directo por SQL, un script de
--   carga o una corrección manual podían dejar un pedido en un estado
--   que el flujo real nunca produce, y el panel se quedaba sin una
--   acción posible que ofrecer al administrador.
--
-- Qué hace
--   1) Informa qué combinaciones incoherentes hay hoy, sin cambiar nada.
--   2) Corrige solo esas filas. El estado se ajusta al tipo, nunca al
--      revés: si el tipo dice 'domicilio', el pedido no puede quedar
--      'listo_recojo'. Se lleva al estado equivalente del punto anterior
--      del flujo ('en_camino' <-> 'preparando'), que sigue siendo un
--      estado alcanzable y con salida, en vez de inventar uno.
--   3) Agrega el CHECK que impide volver a aparecer la incoherencia.
--
-- Por qué es segura con datos viejos
--   - No se borra ni se descarta ninguna fila.
--   - Solo se toca `estado_entrega` de filas que la combinación
--     anterior hacía imposibles, y se documenta cuántas fueron.
--   - Las ventas legacy con `tipo_entrega IS NULL` quedan fuera de la
--     regla: no hay forma de saber qué ruta seguían, y aún menos
--     inventarles una. Siguen admitiendo cualquier estado.
--   - Todo el archivo va en BEGIN/COMMIT: si el CHECK agregado
--     rechazara algo, se revierte la transacción completa.
-- Idempotente: se puede reejecutar sin efectos.
-- ============================================================
BEGIN;

-- 1) Diagnóstico previo (solo informativo).
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

-- 2) Corregir la incoherencia ajustando el estado al tipo.
UPDATE ventas
SET estado_entrega = 'en_camino'
WHERE tipo_entrega = 'domicilio'
  AND estado_entrega = 'listo_recojo';

UPDATE ventas
SET estado_entrega = 'preparando'
WHERE tipo_entrega = 'tienda'
  AND estado_entrega = 'en_camino';

-- 3) Restricción en la base, igual que el resto de dominios del esquema.
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
