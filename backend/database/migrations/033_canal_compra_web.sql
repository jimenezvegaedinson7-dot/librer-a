-- Identifica nuevas compras web sin reinterpretar ni actualizar el historial.
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS canal_compra VARCHAR(10) NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ventas_canal_compra_check' AND conrelid = 'ventas'::regclass) THEN
        ALTER TABLE ventas ADD CONSTRAINT ventas_canal_compra_check
            CHECK (canal_compra IS NULL OR canal_compra IN ('app', 'web'));
    END IF;
END $$;
