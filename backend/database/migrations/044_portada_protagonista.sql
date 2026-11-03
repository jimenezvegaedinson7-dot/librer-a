CREATE TABLE IF NOT EXISTS portada_config (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),

    id_libro_protagonista INT NULL REFERENCES libros (id_libro) ON DELETE SET NULL,
    actualizado_por INT NULL REFERENCES usuarios (id_usuario) ON DELETE SET NULL,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO portada_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
