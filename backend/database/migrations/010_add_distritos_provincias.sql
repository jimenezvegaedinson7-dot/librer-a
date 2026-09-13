-- ============================================================
-- MIGRACIÓN 010: DISTRITOS DEL RESTO DE PROVINCIAS DE LIMA
-- ============================================================
-- Completa distritos_lima con los distritos de Barranca,
-- Cajatambo, Canta, Cañete, Huaral, Huarochirí, Huaura, Oyón
-- y Yauyos, con sus tarifas de envío a domicilio.
-- SEGURO: INSERT IGNORE (no duplica), UPDATE solo tarifas.
-- ============================================================

-- Barranca (id 2)
INSERT IGNORE INTO distritos_lima (id_provincia, nombre) VALUES
(2, 'Barranca'),
(2, 'Paramonga'),
(2, 'Pativilca'),
(2, 'Supe'),
(2, 'Supe Puerto');

-- Cajatambo (id 3)
INSERT IGNORE INTO distritos_lima (id_provincia, nombre) VALUES
(3, 'Cajatambo'),
(3, 'Copa'),
(3, 'Gorgor'),
(3, 'Huancapón'),
(3, 'Manás');

-- Canta (id 4)
INSERT IGNORE INTO distritos_lima (id_provincia, nombre) VALUES
(4, 'Canta'),
(4, 'Arahuay'),
(4, 'Huamantanga'),
(4, 'Huaros'),
(4, 'Lachaqui'),
(4, 'San Buenaventura'),
(4, 'Santa Rosa de Quives');

-- Cañete (id 5)
INSERT IGNORE INTO distritos_lima (id_provincia, nombre) VALUES
(5, 'San Vicente de Cañete'),
(5, 'Asia'),
(5, 'Calango'),
(5, 'Cerro Azul'),
(5, 'Chilca'),
(5, 'Coayllo'),
(5, 'Imperial'),
(5, 'Lunahuaná'),
(5, 'Mala'),
(5, 'Nuevo Imperial'),
(5, 'Pacarán'),
(5, 'Quilmaná'),
(5, 'San Antonio'),
(5, 'San Luis'),
(5, 'Santa Cruz de Flores'),
(5, 'Zúñiga');

-- Huaral (id 6)
INSERT IGNORE INTO distritos_lima (id_provincia, nombre) VALUES
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
(6, 'Veintisiete de Noviembre');

-- Huarochirí (id 7)
INSERT IGNORE INTO distritos_lima (id_provincia, nombre) VALUES
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
(7, 'Santa Cruz de Cocachacra'),
(7, 'Santa Eulalia'),
(7, 'Santiago de Anchucaya'),
(7, 'Santiago de Tuna'),
(7, 'Santo Domingo de los Olleros'),
(7, 'Surco');

-- Huaura (id 8)
INSERT IGNORE INTO distritos_lima (id_provincia, nombre) VALUES
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
(8, 'Vegueta');

-- Oyón (id 9)
INSERT IGNORE INTO distritos_lima (id_provincia, nombre) VALUES
(9, 'Oyón'),
(9, 'Andajes'),
(9, 'Caujul'),
(9, 'Cochamarca'),
(9, 'Naván'),
(9, 'Pachangara');

-- Yauyos (id 10)
INSERT IGNORE INTO distritos_lima (id_provincia, nombre) VALUES
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
(10, 'Vitis');

-- ------------------------------------------------------------------
-- TARIFAS DE ENVÍO POR PROVINCIA (resto de Lima)
-- Costeras (Barranca, Cañete, Huaral, Huaura): S/ 15.00
-- Sierra cercana (Canta, Huarochirí): S/ 18.00
-- Sierra lejana (Cajatambo, Oyón, Yauyos): S/ 20.00
-- ------------------------------------------------------------------
UPDATE distritos_lima SET tarifa_envio = 15.00
WHERE id_provincia IN (2, 5, 6, 8);

UPDATE distritos_lima SET tarifa_envio = 18.00
WHERE id_provincia IN (4, 7);

UPDATE distritos_lima SET tarifa_envio = 20.00
WHERE id_provincia IN (3, 9, 10);