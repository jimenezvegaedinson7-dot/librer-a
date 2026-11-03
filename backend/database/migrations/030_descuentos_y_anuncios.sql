BEGIN;

ALTER TABLE libros
    ADD COLUMN IF NOT EXISTS descuento_porcentaje SMALLINT NULL,
    ADD COLUMN IF NOT EXISTS precio_oferta NUMERIC(10,2) NULL,
    ADD COLUMN IF NOT EXISTS descuento_hasta DATE NULL;

DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'libros'::regclass
          AND conname = 'libros_descuento_porcentaje_check'
    ) THEN
        ALTER TABLE libros DROP CONSTRAINT libros_descuento_porcentaje_check;
    END IF;
END $$;

ALTER TABLE libros
    ADD CONSTRAINT libros_descuento_porcentaje_check
    CHECK (descuento_porcentaje IS NULL OR descuento_porcentaje BETWEEN 1 AND 99);

DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'libros'::regclass
          AND conname = 'libros_precio_oferta_check'
    ) THEN
        ALTER TABLE libros DROP CONSTRAINT libros_precio_oferta_check;
    END IF;
END $$;

ALTER TABLE libros
    ADD CONSTRAINT libros_precio_oferta_check
    CHECK (
        precio_oferta IS NULL
        OR (precio_oferta >= 0 AND precio_oferta <= precio)
    );

CREATE INDEX IF NOT EXISTS idx_libros_descuento ON libros (descuento_porcentaje);

CREATE TABLE IF NOT EXISTS anuncios (
    id_anuncio SERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    video_url VARCHAR(500) NOT NULL,
    video_public_id VARCHAR(255) NULL,
    poster_url VARCHAR(500) NULL,
    estado SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT anuncios_estado_check CHECK (estado IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_anuncios_estado ON anuncios (estado, id_anuncio DESC);

DROP TRIGGER IF EXISTS update_anuncios_updated_at ON anuncios;
CREATE TRIGGER update_anuncios_updated_at
BEFORE UPDATE ON anuncios
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMIT;
