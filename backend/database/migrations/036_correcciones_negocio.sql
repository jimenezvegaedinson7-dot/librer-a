-- Solo columnas nuevas; no reescribe documentos ni ventas legacy.
BEGIN;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS pago_revision_motivo VARCHAR(80) NULL;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS pago_revision_fecha TIMESTAMP NULL;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS reembolso_referencia VARCHAR(100) NULL;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS reembolso_evidencia VARCHAR(500) NULL;
ALTER TABLE detalle_venta ADD COLUMN IF NOT EXISTS titulo_snapshot VARCHAR(200) NULL;
ALTER TABLE comprobantes ADD COLUMN IF NOT EXISTS empresa_snapshot JSONB NULL;
ALTER TABLE comprobantes ADD COLUMN IF NOT EXISTS detalle_snapshot JSONB NULL;
COMMIT;
