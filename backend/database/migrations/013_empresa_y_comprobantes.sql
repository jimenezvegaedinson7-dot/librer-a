-- ============================================================
-- MIGRACIÓN 013: EMPRESA EMISORA Y COMPROBANTES DE PAGO
-- ============================================================
-- Creada copia EXACTA de las tablas empresa y comprobantes del
-- schema.sql para permitir reproducirlas como migración.
-- SEGURO: CREATE TABLE IF NOT EXISTS + INSERT ... ON DUPLICATE KEY.
--
-- NOTA: si las tablas ya existen en la BD (comprobantes presente),
-- el script de aplicación ejecuta SOLO:
--   ALTER TABLE comprobantes
--       ADD COLUMN IF NOT EXISTS cliente_tipo_documento VARCHAR(10) NULL;
-- ============================================================

-- ============================================================
-- EMPRESA (EMISOR ELECTRÓNICO) — migración 013
-- Configuración del emisor de comprobantes (1 fila, id=1).
-- ============================================================
CREATE TABLE IF NOT EXISTS empresa (
    id INT NOT NULL PRIMARY KEY,
    ruc VARCHAR(11) NOT NULL DEFAULT '',
    razon_social VARCHAR(255) NOT NULL DEFAULT '',
    nombre_comercial VARCHAR(255) NULL,
    tipo_documento VARCHAR(20) NULL,
    documento_identidad VARCHAR(20) NULL,
    direccion VARCHAR(255) NULL,
    sistema_emision VARCHAR(50) NULL,
    emisor_electronico VARCHAR(255) NULL,
    aplica_igv TINYINT(1) NOT NULL DEFAULT 0,
    fecha_inscripcion DATE NULL,
    fecha_inicio DATE NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- COMPROBANTES DE PAGO (BOLETA / FACTURA) — migración 013
-- ============================================================
CREATE TABLE IF NOT EXISTS comprobantes (
    id_comprobante INT AUTO_INCREMENT PRIMARY KEY,
    id_venta INT NOT NULL,
    tipo ENUM('boleta', 'factura') NOT NULL,
    serie VARCHAR(4) NOT NULL,
    numero INT NOT NULL,
    ruc VARCHAR(11) NULL,
    razon_social VARCHAR(255) NULL,
    cliente_nombre VARCHAR(255) NULL,
    cliente_dni_ruc VARCHAR(20) NULL,
    cliente_tipo_documento VARCHAR(10) NULL,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    costo_envio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    igv DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL,
    fecha_emision TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_comprobantes_serie_numero (serie, numero),
    INDEX idx_comprobantes_venta (id_venta),
    CONSTRAINT fk_comprobantes_venta
        FOREIGN KEY (id_venta)
        REFERENCES ventas (id_venta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- DATOS INICIALES: EMPRESA EMISORA (migración 013)
-- ============================================================
INSERT INTO empresa (id, ruc)
VALUES (1, '10447545387')
ON DUPLICATE KEY UPDATE id = VALUES(id);