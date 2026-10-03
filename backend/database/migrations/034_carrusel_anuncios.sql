-- Carrusel de imágenes independiente de los anuncios de video existentes.
-- Sin imágenes de ejemplo ni cambios en libros, ventas o inventario.
CREATE TABLE IF NOT EXISTS carrusel_anuncios (
    id_imagen SERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    imagen_url VARCHAR(500) NOT NULL,
    imagen_public_id VARCHAR(255) NULL,
    id_libro INT NULL REFERENCES libros(id_libro) ON DELETE SET NULL,
    orden INT NOT NULL DEFAULT 0 CHECK (orden BETWEEN 0 AND 100000),
    estado SMALLINT NOT NULL DEFAULT 1 CHECK (estado IN (0,1)),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_carrusel_visible_orden ON carrusel_anuncios (estado,orden,id_imagen);
