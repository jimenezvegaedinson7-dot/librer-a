ALTER TABLE ventas
    ADD COLUMN IF NOT EXISTS cliente_documento VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS cliente_tipo_documento VARCHAR(10) NULL;
