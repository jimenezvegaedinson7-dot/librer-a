-- ============================================================
-- MIGRACIÓN 008: COSTO DE ENVÍO
-- ============================================================
-- - distritos_lima.tarifa_envio: costo de entrega a domicilio
--   por distrito (solo Lima).
-- - ventas.costo_envio: costo de envío cobrado en cada venta,
--   para auditoría (0 en envío a tienda).
-- - agencias_courier.tarifa_base ya existía (migración 006).
-- SEGURO: IF NOT EXISTS / UPDATE solo, no borra datos.
-- ============================================================

ALTER TABLE distritos_lima
    ADD COLUMN IF NOT EXISTS tarifa_envio DECIMAL(10,2) NOT NULL DEFAULT 0.00;

ALTER TABLE ventas
    ADD COLUMN IF NOT EXISTS costo_envio DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- ------------------------------------------------------------------
-- TARIFAS DE ENVÍO A DOMICILIO POR DISTRITO (Lima)
-- Zona A (centro / este próximo): S/ 6.00
-- Zona B (conos y cercanías): S/ 9.00
-- Zona C (extremos / playas / sierra): S/ 12.00
-- ------------------------------------------------------------------
UPDATE distritos_lima SET tarifa_envio = 6.00 WHERE nombre IN (
    'Barranco', 'Breña', 'Jesús María', 'La Victoria', 'Lima',
    'Lince', 'Magdalena del Mar', 'Miraflores', 'Pueblo Libre',
    'Rímac', 'San Borja', 'San Isidro', 'San Luis', 'San Miguel',
    'Santiago de Surco', 'Surquillo'
);

UPDATE distritos_lima SET tarifa_envio = 9.00 WHERE nombre IN (
    'Ate', 'Carabayllo', 'Comas', 'El Agustino', 'Independencia',
    'La Molina', 'Los Olivos', 'Lurigancho', 'Pachacamac',
    'San Juan de Lurigancho', 'San Juan de Miraflores',
    'San Martín de Porres', 'Santa Anita', 'Villa El Salvador',
    'Villa María del Triunfo'
);

UPDATE distritos_lima SET tarifa_envio = 12.00 WHERE nombre IN (
    'Ancón', 'Chaclacayo', 'Chorrillos', 'Cieneguilla', 'Lurín',
    'Pucusana', 'Puente Piedra', 'Punta Hermosa', 'Punta Negra',
    'San Bartolo', 'Santa María del Mar', 'Santa Rosa'
);