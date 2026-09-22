-- Migration 022: Add email sent tracking to comprobantes
ALTER TABLE comprobantes
    ADD COLUMN enviado_por_email BOOLEAN DEFAULT FALSE,
    ADD COLUMN fecha_envio_email TIMESTAMP NULL;
