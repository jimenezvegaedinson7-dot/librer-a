ALTER TABLE ventas
    ADD INDEX IF NOT EXISTS idx_ventas_external_reference (external_reference);
