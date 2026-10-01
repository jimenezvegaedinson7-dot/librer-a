-- MIGRACIÓN 030: descuentos en libros y anuncios en video
-- Qué hace:
--   1) Añade a libros los datos de una promoción: porcentaje de descuento,
--      precio de oferta y fecha límite. Los tres son opcionales: un libro
--      sin descuento no cambia de comportamiento.
--   2) Crea la tabla anuncios, donde el panel guarda los videos de
--      publicidad de la web pública.
-- Por qué es segura con datos viejos:
--   Todas las columnas nuevas admiten NULL y el precio de oferta se
--   valida contra el precio de lista solo cuando se informa. Ningún
--   libro existente empieza a mostrar un precio que no se pidió.
-- Migración transaccional e idempotente, para bases de versiones previas.
BEGIN;

-- ============================================================
-- DESCUENTOS EN LIBROS
-- ============================================================
-- descuento_porcentaje: 1 a 99. Con 100 el libro es gratis, por eso
-- se corta en 99: un descuento del 100% casi siempre es un error de
-- captura y ademas rompe el calculo de IGV.
-- precio_oferta: precio final tras el descuento. Es opcional y sirve
-- para cuando la promocion no es un porcentaje plano (por ejemplo
-- 2x1 o un monto fijo en soles).
ALTER TABLE libros
    ADD COLUMN IF NOT EXISTS descuento_porcentaje SMALLINT NULL,
    ADD COLUMN IF NOT EXISTS precio_oferta NUMERIC(10,2) NULL,
    ADD COLUMN IF NOT EXISTS descuento_hasta DATE NULL;

-- Los constraints se sueltan por conname y no buscando el texto de la
-- definición. Al buscar con LIKE, añadir el constraint de precio_oferta
-- contra precio hacia que el bloque siguiente lo confundiera con el suyo
-- propio y dropeara el equivocado.
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

-- La oferta nunca puede ser mas cara que el precio de lista: un
-- "descuento" que encarece el libro es un dato mal capturado. El
-- controlador ya lo rechaza, y aqui se cierra la puerta para que un
-- UPDATE directo en SQL, un script o una futura importacion no puedan
-- dejar una oferta que la UI terminaria mostrando como descuento sin
-- haber rebajado nada.
--
-- Es seguro añadirlo en esta misma migracion: las columnas son nuevas,
-- asi que todavia no hay filas que lo puedan incumplir.
ALTER TABLE libros
    ADD CONSTRAINT libros_precio_oferta_check
    CHECK (
        precio_oferta IS NULL
        OR (precio_oferta >= 0 AND precio_oferta <= precio)
    );

CREATE INDEX IF NOT EXISTS idx_libros_descuento ON libros (descuento_porcentaje);

-- ============================================================
-- ANUNCIOS EN VIDEO (WEB PÚBLICA)
-- ============================================================
-- El panel sube aquí los videos de publicidad. La web pública lee
-- el anuncio activo por GET /api/anuncios.
--
-- video_url y video_public_id guardan la copia de Cloudinary.
-- public_id se conserva para poder borrar el archivo anterior al
-- reemplazarlo, que si no se queda ocupando espacio y cuota para siempre.
--
-- estado: 1 visible en la web, 0 oculto sin borrarlo. Ocultar es
-- preferible a borrar cuando una promo termina: reactivarla es un
-- click y no obliga a volver a subir el archivo.
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
