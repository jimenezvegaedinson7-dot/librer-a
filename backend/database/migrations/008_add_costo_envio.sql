ALTER TABLE distritos_lima
    ADD COLUMN IF NOT EXISTS tarifa_envio DECIMAL(10,2) NOT NULL DEFAULT 0.00;

ALTER TABLE ventas
    ADD COLUMN IF NOT EXISTS costo_envio DECIMAL(10,2) NOT NULL DEFAULT 0.00;

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
