ALTER TABLE comprobantes
    ADD COLUMN enviado_por_email BOOLEAN DEFAULT FALSE,
    ADD COLUMN fecha_envio_email TIMESTAMP NULL;
