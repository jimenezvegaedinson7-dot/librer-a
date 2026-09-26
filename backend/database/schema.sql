-- ============================================================
-- SCHEMA COMPLETO DE LA BASE DE DATOS
-- Librería — Backend (Express + PostgreSQL)
-- ============================================================
-- Reconstruye TODA la base desde los modelos y las migraciones
-- 001 a 019. Este archivo NO se ejecuta automáticamente: se usa
-- para reproducir la BD desde cero.
--
--   psql -h localhost -U postgres -d libreria_db -f database/schema.sql
--
-- Orden de creación respetando las dependencias por FK.
-- ============================================================

-- Extensión para UUID si se necesita
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USUARIOS (migraciones 001 y 002)
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    apellido VARCHAR(80) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    telefono VARCHAR(20) NULL,
    foto_perfil VARCHAR(255) NULL,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'cliente' CHECK (rol IN ('cliente', 'administrador')),
    estado SMALLINT NOT NULL DEFAULT 1,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    two_factor_enabled SMALLINT NOT NULL DEFAULT 0,
    two_factor_secret TEXT NULL,
    email_verification_code VARCHAR(255) NULL,
    email_verification_expires TIMESTAMP NULL,
    email_verified_at TIMESTAMP NULL,
    fecha_eliminacion TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (email);

-- ============================================================
-- CATEGORÍAS
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias (
    id_categoria SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255) NULL,
    estado SMALLINT NOT NULL DEFAULT 1,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- AUTORES
-- ============================================================
CREATE TABLE IF NOT EXISTS autores (
    id_autor SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    apellido VARCHAR(80) NOT NULL,
    nacionalidad VARCHAR(80) NULL,
    biografia TEXT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado SMALLINT NOT NULL DEFAULT 1
);

-- ============================================================
-- UBICACIONES DE LIMA + AGENCIAS COURIER (migración 006)
-- (antes que ventas por las FKs)
-- ============================================================
CREATE TABLE IF NOT EXISTS provincias_lima (
    id_provincia SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    orden INT NOT NULL DEFAULT 99
);

CREATE TABLE IF NOT EXISTS distritos_lima (
    id_distrito SERIAL PRIMARY KEY,
    id_provincia INT NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    tarifa_envio NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    UNIQUE (id_provincia, nombre),
    CONSTRAINT fk_distrito_provincia
        FOREIGN KEY (id_provincia)
        REFERENCES provincias_lima (id_provincia)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_distritos_provincia ON distritos_lima (id_provincia);

CREATE TABLE IF NOT EXISTS agencias_courier (
    id_agencia SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    tarifa_base NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    descripcion VARCHAR(255) NULL,
    estado SMALLINT NOT NULL DEFAULT 1
);

-- ============================================================
-- LIBROS
-- ============================================================
CREATE TABLE IF NOT EXISTS libros (
    id_libro SERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    isbn VARCHAR(20) NULL UNIQUE,
    descripcion TEXT NULL,
    precio NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    stock INT NOT NULL DEFAULT 0,
    portada VARCHAR(255) NULL,
    id_autor INT NOT NULL,
    id_categoria INT NOT NULL,
    estado SMALLINT NOT NULL DEFAULT 1,
    CONSTRAINT fk_libros_autor
        FOREIGN KEY (id_autor)
        REFERENCES autores (id_autor),
    CONSTRAINT fk_libros_categoria
        FOREIGN KEY (id_categoria)
        REFERENCES categorias (id_categoria)
);

CREATE INDEX IF NOT EXISTS idx_libros_autor ON libros (id_autor);
CREATE INDEX IF NOT EXISTS idx_libros_categoria ON libros (id_categoria);

-- ============================================================
-- INVENTARIO
-- ============================================================
CREATE TABLE IF NOT EXISTS inventario (
    id_inventario SERIAL PRIMARY KEY,
    id_libro INT NOT NULL UNIQUE,
    stock INT NOT NULL DEFAULT 0,
    stock_minimo INT NOT NULL DEFAULT 5,
    ubicacion VARCHAR(100) NULL,
    ultima_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inventario_libro
        FOREIGN KEY (id_libro)
        REFERENCES libros (id_libro)
);

-- ============================================================
-- MOVIMIENTOS DE INVENTARIO / KARDEX (migración 015)
-- ============================================================
CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id_movimiento SERIAL PRIMARY KEY,
    id_libro INT NOT NULL,
    id_usuario INT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'salida')),
    motivo VARCHAR(100) NOT NULL DEFAULT 'ajuste',
    cantidad INT NOT NULL,
    stock_resultante INT NOT NULL,
    fecha_movimiento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mov_libro_fecha ON movimientos_inventario (id_libro, fecha_movimiento);

-- ============================================================
-- RESERVAS (índice de vencimiento de la migración 014)
-- ============================================================
CREATE TABLE IF NOT EXISTS reservas (
    id_reserva SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_libro INT NOT NULL,
    cantidad INT NOT NULL,
    fecha_reserva TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento TIMESTAMP NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'completada', 'cancelada')),
    CONSTRAINT fk_reservas_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario),
    CONSTRAINT fk_reservas_libro
        FOREIGN KEY (id_libro)
        REFERENCES libros (id_libro)
);

CREATE INDEX IF NOT EXISTS idx_reservas_usuario ON reservas (id_usuario);
CREATE INDEX IF NOT EXISTS idx_reservas_libro ON reservas (id_libro);
CREATE INDEX IF NOT EXISTS idx_reservas_venc_estado ON reservas (fecha_vencimiento, estado);

-- ============================================================
-- VENTAS (migraciones 003, 004, 005, 007, 008, 011, 012, 014,
-- índice estado/fecha, y 016 idempotencia_clave)
-- ============================================================
CREATE TABLE IF NOT EXISTS ventas (
    id_venta SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    fecha_venta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    costo_envio NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    tipo_entrega VARCHAR(20) NULL,
    direccion VARCHAR(255) NULL,
    referencia VARCHAR(255) NULL,
    correo_compra VARCHAR(255) NULL,
    external_reference VARCHAR(64) NULL,
    payu_order_id VARCHAR(64) NULL,
    payu_payment_id VARCHAR(64) NULL,
    payu_payment_status VARCHAR(25) NULL,
    payu_payer_email VARCHAR(255) NULL,
    id_distrito INT NULL,
    id_agencia INT NULL,
    idempotencia_clave VARCHAR(64) NULL,
    cliente_documento VARCHAR(20) NULL,
    cliente_tipo_documento VARCHAR(10) NULL,
    origen VARCHAR(20) NOT NULL DEFAULT 'app',
    metodo_pago VARCHAR(20) NULL,
    referencia_pago VARCHAR(100) NULL,
    fecha_pago TIMESTAMP NULL,
    cliente_nombre VARCHAR(255) NULL,
    id_reserva INT NULL,
    motivo_reembolso VARCHAR(255) NULL,
    fecha_reembolso TIMESTAMP NULL,
    CONSTRAINT ventas_estado_check
        CHECK (estado IN ('pendiente', 'pagada', 'entregada', 'cancelada', 'reembolsada')),
    CONSTRAINT fk_ventas_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario),
    CONSTRAINT fk_ventas_distrito
        FOREIGN KEY (id_distrito)
        REFERENCES distritos_lima (id_distrito),
    CONSTRAINT fk_ventas_agencia
        FOREIGN KEY (id_agencia)
        REFERENCES agencias_courier (id_agencia)
);

CREATE INDEX IF NOT EXISTS idx_ventas_usuario ON ventas (id_usuario);
CREATE INDEX IF NOT EXISTS idx_ventas_external_reference ON ventas (external_reference);
CREATE INDEX IF NOT EXISTS idx_ventas_payu_order_id ON ventas (payu_order_id);
CREATE INDEX IF NOT EXISTS idx_ventas_id_distrito ON ventas (id_distrito);
CREATE INDEX IF NOT EXISTS idx_ventas_id_agencia ON ventas (id_agencia);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ventas_usuario_idempotencia ON ventas (id_usuario, idempotencia_clave) WHERE idempotencia_clave IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ventas_estado_fecha ON ventas (estado, fecha_venta);

-- ============================================================
-- DETALLE DE VENTA
-- ============================================================
CREATE TABLE IF NOT EXISTS detalle_venta (
    id_detalle SERIAL PRIMARY KEY,
    id_venta INT NOT NULL,
    id_libro INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    CONSTRAINT fk_detalle_venta
        FOREIGN KEY (id_venta)
        REFERENCES ventas (id_venta)
        ON DELETE CASCADE,
    CONSTRAINT fk_detalle_libro
        FOREIGN KEY (id_libro)
        REFERENCES libros (id_libro)
);

CREATE INDEX IF NOT EXISTS idx_detalle_venta ON detalle_venta (id_venta);
CREATE INDEX IF NOT EXISTS idx_detalle_libro ON detalle_venta (id_libro);

-- ============================================================
-- HISTORIAL DE OPERACIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS historial_operaciones (
    id_historial SERIAL PRIMARY KEY,
    id_usuario INT NULL,
    tipo_operacion VARCHAR(20) NOT NULL DEFAULT 'CREAR',
    modulo VARCHAR(50) NOT NULL,
    descripcion TEXT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_historial_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario)
);

CREATE INDEX IF NOT EXISTS idx_historial_usuario ON historial_operaciones (id_usuario);

-- ============================================================
-- DATOS INICIALES: PROVINCIAS DE LIMA (migración 006)
-- ============================================================
INSERT INTO provincias_lima (nombre, orden) VALUES
('Lima', 1),
('Barranca', 2),
('Cajatambo', 3),
('Canta', 4),
('Cañete', 5),
('Huaral', 6),
('Huarochirí', 7),
('Huaura', 8),
('Oyón', 9),
('Yauyos', 10)
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================
-- DATOS INICIALES: DISTRITOS (migraciones 006 y 010)
-- ============================================================
INSERT INTO distritos_lima (id_provincia, nombre) VALUES
(1, 'Ancón'),
(1, 'Ate'),
(1, 'Barranco'),
(1, 'Breña'),
(1, 'Carabayllo'),
(1, 'Chaclacayo'),
(1, 'Chorrillos'),
(1, 'Cieneguilla'),
(1, 'Comas'),
(1, 'El Agustino'),
(1, 'Independencia'),
(1, 'Jesús María'),
(1, 'La Molina'),
(1, 'La Victoria'),
(1, 'Lima'),
(1, 'Lince'),
(1, 'Los Olivos'),
(1, 'Lurigancho'),
(1, 'Lurín'),
(1, 'Magdalena del Mar'),
(1, 'Miraflores'),
(1, 'Pachacamac'),
(1, 'Pucusana'),
(1, 'Pueblo Libre'),
(1, 'Puente Piedra'),
(1, 'Punta Hermosa'),
(1, 'Punta Negra'),
(1, 'Rímac'),
(1, 'San Bartolo'),
(1, 'San Borja'),
(1, 'San Isidro'),
(1, 'San Juan de Lurigancho'),
(1, 'San Juan de Miraflores'),
(1, 'San Luis'),
(1, 'San Martín de Porres'),
(1, 'San Miguel'),
(1, 'Santa Anita'),
(1, 'Santa María del Mar'),
(1, 'Santa Rosa'),
(1, 'Santiago de Surco'),
(1, 'Surquillo'),
(1, 'Villa El Salvador'),
(1, 'Villa María del Triunfo'),
(2, 'Barranca'),
(2, 'Paramonga'),
(2, 'Pativilca'),
(2, 'Supe'),
(2, 'Supe Puerto'),
(3, 'Cajatambo'),
(3, 'Copa'),
(3, 'Gorgor'),
(3, 'Huancapón'),
(3, 'Manás'),
(4, 'Canta'),
(4, 'Arahuay'),
(4, 'Huamantanga'),
(4, 'Huaros'),
(4, 'Lachaqui'),
(4, 'San Buenaventura'),
(4, 'Santa Rosa de Quives'),
(5, 'San Vicente de Cañete'),
(5, 'Asia'),
(5, 'Calango'),
(5, 'Cerro Azul'),
(5, 'Chilca'),
(5, 'Coayllo'),
(5, 'Imperial'),
(5, 'Mala'),
(5, 'Nuevo Imperial'),
(5, 'Pacarán'),
(5, 'Quilmaná'),
(5, 'San Antonio'),
(5, 'San Luis'),
(5, 'Santa Cruz de Flores'),
(5, 'Zúñiga'),
(6, 'Huaral'),
(6, 'Atavillos Alto'),
(6, 'Atavillos Bajo'),
(6, 'Aucallama'),
(6, 'Chancay'),
(6, 'Ihuarí'),
(6, 'Lampian'),
(6, 'Pacaraos'),
(6, 'San Miguel de Acos'),
(6, 'Santa Cruz de Andamarca'),
(6, 'Sumbilca'),
(6, 'Veintisiete de Noviembre'),
(7, 'Matucana'),
(7, 'Antioquia'),
(7, 'Callahuanca'),
(7, 'Carampoma'),
(7, 'Chicla'),
(7, 'Cuenca'),
(7, 'Huachupampa'),
(7, 'Huanza'),
(7, 'Huarochirí'),
(7, 'Lahuaytambo'),
(7, 'Langa'),
(7, 'Laraos'),
(7, 'Mariatana'),
(7, 'Ricardo Palma'),
(7, 'San Andrés de Tupicocha'),
(7, 'San Antonio de Chaclla'),
(7, 'San Bartolomé'),
(7, 'San Damián'),
(7, 'San Juan de Iris'),
(7, 'San Juan de Tantaranche'),
(7, 'San Lorenzo de Quinti'),
(7, 'San Mateo'),
(7, 'San Mateo de Otao'),
(7, 'San Pedro de Casta'),
(7, 'San Pedro de Huancayre'),
(7, 'Sangallaya'),
(7, 'San Antonio de Chaclla'),
(7, 'San Bartolomé'),
(7, 'San Damián'),
(7, 'San Juan de Iris'),
(7, 'San Juan de Tantaranche'),
(7, 'San Lorenzo de Quinti'),
(7, 'San Mateo'),
(7, 'San Mateo de Otao'),
(7, 'San Pedro de Casta'),
(7, 'San Pedro de Huancayre'),
(7, 'Sangallaya'),
(7, 'San Antonio de Chaclla'),
(7, 'San Bartolomé'),
(7, 'San Damián'),
(7, 'San Juan de Iris'),
(7, 'San Juan de Tantaranche'),
(7, 'San Lorenzo de Quinti'),
(7, 'San Mateo'),
(7, 'San Mateo de Otao'),
(7, 'San Pedro de Casta'),
(7, 'San Pedro de Huancayre'),
(7, 'Sangallaya'),
(7, 'San Antonio de Chaclla'),
(7, 'San Bartolomé'),
(7, 'San Damián'),
(7, 'San Juan de Iris'),
(7, 'San Juan de Tantaranche'),
(7, 'San Lorenzo de Quinti'),
(7, 'San Mateo'),
(7, 'San Mateo de Otao'),
(7, 'San Pedro de Casta'),
(7, 'San Pedro de Huancayre'),
(7, 'Sangallaya'),
(7, 'San Antonio de Chaclla'),
(7, 'San Bartolomé'),
(7, 'San Damián'),
(7, 'San Juan de Iris'),
(7, 'San Juan de Tantaranche'),
(7, 'San Lorenzo de Quinti'),
(7, 'San Mateo'),
(7, 'San Mateo de Otao'),
(7, 'San Pedro de Casta'),
(7, 'San Pedro de Huancayre'),
(7, 'Sangallaya'),
(7, 'San Antonio de Chaclla'),
(7, 'San Bartolomé'),
(7, 'San Damián'),
(7, 'San Juan de Iris'),
(7, 'San Juan de Tantaranche'),
(7, 'San Lorenzo de Quinti'),
(7, 'San Mateo'),
(7, 'San Mateo de Otao'),
(7, 'San Pedro de Casta'),
(7, 'San Pedro de Huancayre'),
(7, 'Sangallaya'),
(8, 'Huacho'),
(8, 'Ámbar'),
(8, 'Caleta de Carquín'),
(8, 'Checras'),
(8, 'Hualmay'),
(8, 'Huaura'),
(8, 'Leoncio Prado'),
(8, 'Paccho'),
(8, 'Santa Leonor'),
(8, 'Santa María'),
(8, 'Sayán'),
(8, 'Vegueta'),
(9, 'Oyón'),
(9, 'Andajes'),
(9, 'Caujul'),
(9, 'Cochamarca'),
(9, 'Naván'),
(9, 'Pachangara'),
(10, 'Yauyos'),
(10, 'Alis'),
(10, 'Ayauca'),
(10, 'Ayaviri'),
(10, 'Azángaro'),
(10, 'Cacra'),
(10, 'Carania'),
(10, 'Catahuasi'),
(10, 'Chocos'),
(10, 'Cochas'),
(10, 'Colonia'),
(10, 'Hongos'),
(10, 'Huampara'),
(10, 'Huancaya'),
(10, 'Huangáscar'),
(10, 'Huantán'),
(10, 'Huañec'),
(10, 'Laraos'),
(10, 'Lincha'),
(10, 'Madeán'),
(10, 'Miraflores'),
(10, 'Omas'),
(10, 'Putinza'),
(10, 'Quinches'),
(10, 'Quinocay'),
(10, 'San Joaquín'),
(10, 'San Pedro de Pilas'),
(10, 'Tanta'),
(10, 'Tauripampa'),
(10, 'Tomas'),
(10, 'Tupe'),
(10, 'Viñac'),
(10, 'Vitis')
ON CONFLICT (id_provincia, nombre) DO NOTHING;

-- ============================================================
-- DATOS INICIALES: AGENCIAS COURIER (migración 006)
-- ============================================================
INSERT INTO agencias_courier (nombre, tarifa_base, descripcion, estado) VALUES
('Olva Courier', 12.00, 'Envío a agencia Olva', 1),
('Shalom', 10.00, 'Envío a agencia Shalom', 1),
('Shalom Moto', 15.00, 'Envío exprés urbano', 1)
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================
-- TARIFAS DE ENVÍO A DOMICILIO (migraciones 008 y 010)
-- ============================================================

-- Zona A (centro / este próximo): S/ 6.00
UPDATE distritos_lima SET tarifa_envio = 6.00 WHERE nombre IN (
    'Barranco', 'Breña', 'Jesús María', 'La Victoria', 'Lima',
    'Lince', 'Magdalena del Mar', 'Miraflores', 'Pueblo Libre',
    'Rímac', 'San Borja', 'San Isidro', 'San Luis', 'San Miguel',
    'Santiago de Surco', 'Surquillo'
);

-- Zona B (conos y cercanías): S/ 9.00
UPDATE distritos_lima SET tarifa_envio = 9.00 WHERE nombre IN (
    'Ate', 'Carabayllo', 'Comas', 'El Agustino', 'Independencia',
    'La Molina', 'Los Olivos', 'Lurigancho', 'Pachacamac',
    'San Juan de Lurigancho', 'San Juan de Miraflores',
    'San Martín de Porres', 'Santa Anita', 'Villa El Salvador',
    'Villa María del Triunfo'
);

-- Zona C (extremos / playas / sierra): S/ 12.00
UPDATE distritos_lima SET tarifa_envio = 12.00 WHERE nombre IN (
    'Ancón', 'Chaclacayo', 'Chorrillos', 'Cieneguilla', 'Lurín',
    'Pucusana', 'Puente Piedra', 'Punta Hermosa', 'Punta Negra',
    'San Bartolo', 'Santa María del Mar', 'Santa Rosa'
);

-- Costeras (Barranca, Cañete, Huaral, Huaura): S/ 15.00
UPDATE distritos_lima SET tarifa_envio = 15.00
WHERE id_provincia IN (2, 5, 6, 8);

-- Sierra cercana (Canta, Huarochirí): S/ 18.00
UPDATE distritos_lima SET tarifa_envio = 18.00
WHERE id_provincia IN (4, 7);

-- Sierra lejana (Cajatambo, Oyón, Yauyos): S/ 20.00
UPDATE distritos_lima SET tarifa_envio = 20.00
WHERE id_provincia IN (3, 9, 10);

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
    aplica_igv SMALLINT NOT NULL DEFAULT 0,
    -- Ley 31053: venta de libros exonerada del IGV hasta esta fecha.
    libros_exonerados SMALLINT NOT NULL DEFAULT 1,
    exoneracion_libros_hasta DATE NULL DEFAULT '2026-10-17',
    tasa_igv NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    fecha_inscripcion DATE NULL,
    fecha_inicio DATE NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_empresa_updated_at ON empresa;
CREATE TRIGGER update_empresa_updated_at
    BEFORE UPDATE ON empresa
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- COMPROBANTES DE PAGO (BOLETA / FACTURA) — migraciones 013 y 017
-- (017: cliente_email; 018: un comprobante por venta)
-- ============================================================
CREATE TABLE IF NOT EXISTS comprobantes (
    id_comprobante SERIAL PRIMARY KEY,
    id_venta INT NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('boleta', 'factura')),
    serie VARCHAR(4) NOT NULL,
    numero INT NOT NULL,
    ruc VARCHAR(11) NULL,
    razon_social VARCHAR(255) NULL,
    cliente_nombre VARCHAR(255) NULL,
    cliente_email VARCHAR(255) NULL,
    cliente_dni_ruc VARCHAR(20) NULL,
    cliente_tipo_documento VARCHAR(10) NULL,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    costo_envio NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    igv NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10,2) NOT NULL,
    op_gravada NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    op_exonerada NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    fecha_emision TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    enviado_por_email BOOLEAN DEFAULT FALSE,
    fecha_envio_email TIMESTAMP NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'emitido',
    numero_sunat VARCHAR(20) NULL,
    nota_credito_sunat VARCHAR(20) NULL,
    motivo_anulacion VARCHAR(255) NULL,
    fecha_anulacion TIMESTAMP NULL,
    UNIQUE (serie, numero),
    CONSTRAINT fk_comprobantes_venta
        FOREIGN KEY (id_venta)
        REFERENCES ventas (id_venta)
);

CREATE INDEX IF NOT EXISTS idx_comprobantes_venta ON comprobantes (id_venta);
-- Un solo comprobante emitido por venta (uno anulado permite reemitir).
CREATE UNIQUE INDEX IF NOT EXISTS uq_comprobante_venta_emitido
    ON comprobantes (id_venta)
    WHERE estado = 'emitido';

-- ============================================================
-- DATOS INICIALES: EMPRESA EMISORA (migración 013)
-- ============================================================
INSERT INTO empresa (id, ruc)
VALUES (1, '10447545387')
ON CONFLICT (id) DO UPDATE SET ruc = EXCLUDED.ruc;

-- ============================================================
-- LIBRO DE RECLAMACIONES (migración 024)
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
