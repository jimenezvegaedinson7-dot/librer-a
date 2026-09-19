-- ============================================================
-- MIGRACIÓN 020: FAVORITOS / LISTA DE DESEOS
-- ============================================================
-- Tabla de favoritos del cliente (lista de deseos).
--
-- SEGURO E IDEMPOTENTE (ejecutable 2 veces sin error):
--   - CREATE TABLE IF NOT EXISTS.
--   - Índices con IF NOT EXISTS.
--   - La PK (id_usuario, id_libro) impide duplicados; agregar dos veces el
--     mismo libro es un no-op.
-- ============================================================

CREATE TABLE IF NOT EXISTS favoritos (
    id_usuario INT NOT NULL,
    id_libro   INT NOT NULL,
    fecha      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_usuario, id_libro),
    CONSTRAINT fk_favoritos_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE,
    CONSTRAINT fk_favoritos_libro
        FOREIGN KEY (id_libro) REFERENCES libros(id_libro)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_favoritos_usuario
    ON favoritos (id_usuario);

CREATE INDEX IF NOT EXISTS idx_favoritos_libro
    ON favoritos (id_libro);