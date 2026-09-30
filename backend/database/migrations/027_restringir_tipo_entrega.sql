-- ============================================================
-- MIGRACIÓN 027: restringir ventas.tipo_entrega a los tipos válidos
-- ============================================================
-- Por qué
--   La creación de pedidos normaliza el tipo a 'domicilio' o 'tienda',
--   pero la columna no lo exigía. Con eso, un pedido podía quedar con un
--   tipo que el panel no sabe enrutar (por ejemplo 'agencia', que la app
--   ya no ofrece) y quedarse sin forma de avanzar: el backend no encontraba
--   la ruta correcta y el frontend no pintaba botón de siguiente paso.
--
-- Qué hace
--   1) Informa qué valores hay hoy fuera del dominio, sin cambiar nada.
--   2) Normaliza a 'tienda' solo los valores que la propia app ya
--      rechazaba al crear el pedido ('agencia' y cualquier otro).
--   3) Agrega el CHECK que la app siempre respetó.
--
-- Por qué es segura con datos viejos
--   Se normaliza, no se borra: ninguna fila se elimina ni se pierde
--   información de negocio. Solo se homogeniza un campo que la aplicación
--   nunca podía escribir. Si el CHECK agregado rechazara algo, la
--   transacción completa se revierte y la base queda como estaba
--   (todo el archivo va dentro de un BEGIN/COMMIT explícito).
-- Idempotente: se puede reejecutar sin efectos.
-- ============================================================
BEGIN;

-- 1) Diagnóstico previo: qué se va a normalizar (solo informativo).
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

-- 2) Normalizar los valores que la app ya rechazaba al crear el pedido.
--    NULL se deja intacto: es "sin tipo definido", no un tipo inválido,
--    y el CHECK lo admite.
UPDATE ventas
SET tipo_entrega = 'tienda'
WHERE tipo_entrega IS NOT NULL
  AND tipo_entrega NOT IN ('domicilio', 'tienda');

-- 3) Restricción en la base, igual que el resto de dominios del esquema.
--    Para instalaciones con historial ya validado, VALIDATE deja además
--    garantir que las filas existentes cumplen la regla.
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
