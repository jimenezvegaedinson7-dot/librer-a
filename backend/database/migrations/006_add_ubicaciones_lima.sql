-- ============================================================
-- MIGRACIÓN 006: UBICACIONES DE LIMA + AGENCIAS COURIER
-- ============================================================
-- Tablas de provincias y distritos de Lima (solo Lima).
-- Tabla de agencias courier (Olva, Shalom, etc.) para envios.
-- SEGURO: CREATE TABLE IF NOT EXISTS + INSERT IGNORE (no duplica ni borra).
-- ============================================================

-- ------------------------------------------------------------------
-- PROVINCIAS DE LIMA
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS provincias_lima (
    id_provincia INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    orden INT NOT NULL DEFAULT 99
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO provincias_lima (nombre, orden) VALUES
('Lima', 1),
('Barranca', 2),
('Cajatambo', 3),
('Canta', 4),
('Cañete', 5),
('Huaral', 6),
('Huarochirí', 7),
('Huaura', 8),
('Oyón', 9),
('Yauyos', 10);

-- ------------------------------------------------------------------
-- DISTRITOS DE LIMA PROVINCIA (la más populosa)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS distritos_lima (
    id_distrito INT AUTO_INCREMENT PRIMARY KEY,
    id_provincia INT NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    FOREIGN KEY (id_provincia) REFERENCES provincias_lima (id_provincia)
        ON DELETE CASCADE,
    UNIQUE KEY uq_distrito_provincia (id_provincia, nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Lima (id 1)
INSERT IGNORE INTO distritos_lima (id_provincia, nombre) VALUES
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
(1, 'Villa María del Triunfo');

-- ------------------------------------------------------------------
-- AGENCIAS COURIER
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agencias_courier (
    id_agencia INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    tarifa_base DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    descripcion VARCHAR(255) NULL,
    estado TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO agencias_courier (nombre, tarifa_base, descripcion, estado) VALUES
('Olva Courier', 12.00, 'Envío a agencia Olva', 1),
('Shalom', 10.00, 'Envío a agencia Shalom', 1),
('Shalom Moto', 15.00, 'Envío exprés urbano', 1);