-- Solo amplía el contrato. No reescribe ni elimina ventas históricas.
BEGIN;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS estado_reembolso VARCHAR(30) NULL;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS fecha_solicitud_reembolso TIMESTAMP NULL;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS reembolso_solicitado_por INT NULL;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS reembolso_confirmado_por INT NULL;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ventas_estado_reembolso_check') THEN
        ALTER TABLE ventas ADD CONSTRAINT ventas_estado_reembolso_check
            CHECK (estado_reembolso IS NULL OR estado_reembolso IN ('pendiente_verificacion','confirmado'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ventas_reembolso_confirmado_check') THEN
        ALTER TABLE ventas ADD CONSTRAINT ventas_reembolso_confirmado_check CHECK (
            estado_reembolso IS DISTINCT FROM 'confirmado' OR (
                estado='reembolsada' AND fecha_reembolso IS NOT NULL AND reembolso_confirmado_por IS NOT NULL
                AND reembolso_referencia IS NOT NULL AND length(btrim(reembolso_referencia))>=3
                AND reembolso_evidencia IS NOT NULL AND length(btrim(reembolso_evidencia))>=10));
    END IF;
END $$;
COMMIT;
