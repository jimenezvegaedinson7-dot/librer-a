-- MIGRACIÓN 035: textos del anuncio en video
-- La portada muestra el video junto a una etiqueta, el título, una
-- descripción y un botón. Todos se editan desde el panel (Anuncios).
-- Son opcionales: un anuncio sin ellos muestra textos por defecto.
ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS etiqueta VARCHAR(80) NULL;
ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS descripcion VARCHAR(400) NULL;
ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS boton_texto VARCHAR(40) NULL;
ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS boton_enlace VARCHAR(200) NULL;
