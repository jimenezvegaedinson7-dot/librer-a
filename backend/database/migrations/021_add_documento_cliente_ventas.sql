-- 021: Agregar campos de documento del cliente a ventas
-- Permite guardar el DNI/RUC del comprador al momento de la compra
-- para usarlo automaticamente al emitir boleta/factura.

ALTER TABLE ventas
    ADD COLUMN IF NOT EXISTS cliente_documento VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS cliente_tipo_documento VARCHAR(10) NULL;
