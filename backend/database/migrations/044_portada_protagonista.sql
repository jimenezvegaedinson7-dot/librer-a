-- Libro protagonista de la portada web (configuración de una sola fila).
-- Solo agrega una tabla; no toca libros, ventas, inventario ni usuarios.
-- Reversión:  DROP TABLE IF EXISTS portada_config;
CREATE TABLE IF NOT EXISTS portada_config (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    -- NULL = modo automático (último libro agregado que cumpla las condiciones).
    id_libro_protagonista INT NULL REFERENCES libros (id_libro) ON DELETE SET NULL,
    actualizado_por INT NULL REFERENCES usuarios (id_usuario) ON DELETE SET NULL,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO portada_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
