-- ============================================================
-- MIGRACIÓN 023: CONTROL DE VENTAS, COMPROBANTES E IGV (PostgreSQL)
-- ============================================================
-- Se aplica sola al arrancar el servidor (server.js). Es idempotente:
-- puede ejecutarse muchas veces sin duplicar nada ni borrar datos.
--
--   ventas:
--     - origen: 'app' (pedido PayU), 'panel' (venta de mostrador) o
--       'reserva' (reserva recogida en tienda).
--     - metodo_pago / referencia_pago / fecha_pago: cobro registrado.
--     - cliente_nombre: comprador en ventas de mostrador.
--     - id_reserva: reserva que originó la venta.
--     - estado 'reembolsada' + motivo_reembolso / fecha_reembolso.
--   comprobantes:
--     - op_gravada / op_exonerada: desglose tributario que cuadra con el total.
--     - estado 'emitido' | 'anulado' (anulación con nota de crédito).
--     - numero_sunat / nota_credito_sunat: comprobante electrónico emitido en
--       SUNAT que respalda al comprobante interno.
--     - Un solo comprobante EMITIDO por venta (uno anulado permite reemitir).
--   empresa:
--     - libros_exonerados / exoneracion_libros_hasta (Ley 31053) / tasa_igv.
-- ============================================================

-- ---------- VENTAS ----------
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS origen VARCHAR(20) NOT NULL DEFAULT 'app';
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(20) NULL;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS referencia_pago VARCHAR(100) NULL;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMP NULL;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cliente_nombre VARCHAR(255) NULL;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS id_reserva INT NULL;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS motivo_reembolso VARCHAR(255) NULL;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS fecha_reembolso TIMESTAMP NULL;

-- Ventas antiguas creadas desde el panel (sin orden PayU).
UPDATE ventas
SET origen = 'panel'
WHERE origen = 'app'
  AND external_reference IS NULL
  AND payu_order_id IS NULL
  AND idempotencia_clave IS NULL;

-- Estado 'reembolsada': se recrea el CHECK solo si todavía no lo admite.
DO $$
DECLARE
    r record;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'ventas'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%reembolsada%'
    ) THEN
        FOR r IN
            SELECT conname FROM pg_constraint
            WHERE conrelid = 'ventas'::regclass
              AND contype = 'c'
              AND pg_get_constraintdef(oid) ILIKE '%estado%'
        LOOP
            EXECUTE format('ALTER TABLE ventas DROP CONSTRAINT %I', r.conname);
        END LOOP;
        ALTER TABLE ventas ADD CONSTRAINT ventas_estado_check
            CHECK (estado IN ('pendiente', 'pagada', 'entregada', 'cancelada', 'reembolsada'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ventas_origen ON ventas (origen);
CREATE INDEX IF NOT EXISTS idx_ventas_id_reserva ON ventas (id_reserva);

-- ---------- COMPROBANTES ----------
ALTER TABLE comprobantes ADD COLUMN IF NOT EXISTS op_gravada NUMERIC(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE comprobantes ADD COLUMN IF NOT EXISTS op_exonerada NUMERIC(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE comprobantes ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'emitido';
ALTER TABLE comprobantes ADD COLUMN IF NOT EXISTS numero_sunat VARCHAR(20) NULL;
ALTER TABLE comprobantes ADD COLUMN IF NOT EXISTS nota_credito_sunat VARCHAR(20) NULL;
ALTER TABLE comprobantes ADD COLUMN IF NOT EXISTS motivo_anulacion VARCHAR(255) NULL;
ALTER TABLE comprobantes ADD COLUMN IF NOT EXISTS fecha_anulacion TIMESTAMP NULL;

-- Desglose de los comprobantes ya emitidos (el total no cambia).
UPDATE comprobantes
SET op_gravada = CASE WHEN igv > 0 THEN total - igv ELSE 0 END,
    op_exonerada = CASE WHEN igv > 0 THEN 0 ELSE total END
WHERE op_gravada = 0 AND op_exonerada = 0 AND total > 0;

-- Un solo comprobante emitido por venta: se reemplaza el UNIQUE (id_venta)
-- por un índice parcial, para poder reemitir tras una anulación.
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'comprobantes'::regclass
          AND contype = 'u'
          AND pg_get_constraintdef(oid) = 'UNIQUE (id_venta)'
    LOOP
        EXECUTE format('ALTER TABLE comprobantes DROP CONSTRAINT %I', r.conname);
    END LOOP;
END $$;
DROP INDEX IF EXISTS uq_comprobante_venta;
CREATE UNIQUE INDEX IF NOT EXISTS uq_comprobante_venta_emitido
    ON comprobantes (id_venta)
    WHERE estado = 'emitido';

-- ---------- EMPRESA ----------
ALTER TABLE empresa ADD COLUMN IF NOT EXISTS libros_exonerados SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE empresa ADD COLUMN IF NOT EXISTS exoneracion_libros_hasta DATE NULL DEFAULT '2026-10-17';
ALTER TABLE empresa ADD COLUMN IF NOT EXISTS tasa_igv NUMERIC(5,2) NOT NULL DEFAULT 18.00;
