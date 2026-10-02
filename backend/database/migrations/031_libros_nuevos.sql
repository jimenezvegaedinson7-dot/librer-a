-- No se inventa la antigüedad de los libros existentes.
BEGIN;
ALTER TABLE libros ADD COLUMN IF NOT EXISTS creado_en TIMESTAMPTZ NULL;
ALTER TABLE libros ALTER COLUMN creado_en SET DEFAULT CURRENT_TIMESTAMP;
COMMIT;
