-- ============================================================
-- MIGRACIÓN 024: LIBRO DE RECLAMACIONES Y ELIMINACIÓN DE CUENTAS
-- (PostgreSQL). Se aplica sola al arrancar el servidor; idempotente.
-- ============================================================
--
-- Libro de Reclamaciones virtual (Código de Protección y Defensa del
-- Consumidor, Ley 29571; D.S. 011-2011-PCM y D.S. 101-2022-PCM):
--   - Hoja con número correlativo por año (000001-2026).
--   - Datos del proveedor, del consumidor, del bien y del reclamo/queja.
--   - Respuesta del proveedor en un plazo no mayor a 15 días hábiles.
--   - Se conserva al menos 2 años (no se elimina desde el sistema).
--
-- Eliminación de cuenta (Ley 29733, derecho de cancelación): los datos
-- personales se anonimizan; las ventas se conservan por obligación
-- tributaria.
-- ============================================================

CREATE TABLE IF NOT EXISTS reclamaciones (
    id_reclamacion SERIAL PRIMARY KEY,
    anio INT NOT NULL,
    correlativo INT NOT NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('reclamo', 'queja')),
    consumidor_nombre VARCHAR(160) NOT NULL,
    consumidor_tipo_documento VARCHAR(10) NOT NULL,
    consumidor_documento VARCHAR(20) NOT NULL,
    consumidor_domicilio VARCHAR(255) NOT NULL,
    consumidor_telefono VARCHAR(20) NULL,
    consumidor_email VARCHAR(255) NOT NULL,
    es_menor BOOLEAN NOT NULL DEFAULT FALSE,
    apoderado_nombre VARCHAR(160) NULL,
    bien_tipo VARCHAR(10) NOT NULL CHECK (bien_tipo IN ('producto', 'servicio')),
    bien_descripcion VARCHAR(255) NOT NULL,
    monto_reclamado NUMERIC(10,2) NULL,
    id_venta INT NULL,
    detalle TEXT NOT NULL,
    pedido TEXT NOT NULL,
    estado VARCHAR(15) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'respondido')),
    respuesta TEXT NULL,
    fecha_respuesta TIMESTAMP NULL,
    id_usuario_respuesta INT NULL,
    id_usuario INT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_limite DATE NOT NULL,
    UNIQUE (anio, correlativo)
);

CREATE INDEX IF NOT EXISTS idx_reclamaciones_estado ON reclamaciones (estado, fecha_limite);

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fecha_eliminacion TIMESTAMP NULL;
