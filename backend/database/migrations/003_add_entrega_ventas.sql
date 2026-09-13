-- ============================================================
-- MIGRACIÓN 003: TIPO DE ENTREGA Y DIRECCIÓN EN VENTAS
-- ============================================================
-- EJECUCIÓN:
--   1. Abre MySQL (workbench / consola / phpMyAdmin)
--   2. Ejecuta este archivo en la base libreria_db
--
--   Ejemplo por consola:
--     mysql -u root -p libreria_db < database/migrations/003_add_entrega_ventas.sql
--
-- NOTA: Es SEGURO (ALTER TABLE ADD COLUMN).
-- NO elimina ni reinicia datos. NO usa DROP/TRUNCATE.
-- ============================================================

-- Tipo de entrega: 'domicilio' (envío a casa) o 'tienda' (recoger en tienda).
ALTER TABLE ventas
    ADD COLUMN IF NOT EXISTS tipo_entrega VARCHAR(20) NULL;

-- Dirección de envío (solo cuando tipo_entrega = 'domicilio').
ALTER TABLE ventas
    ADD COLUMN IF NOT EXISTS direccion VARCHAR(255) NULL;

-- Correo al que se envía el boleto/factura de la compra.
ALTER TABLE ventas
    ADD COLUMN IF NOT EXISTS correo_compra VARCHAR(255) NULL;
