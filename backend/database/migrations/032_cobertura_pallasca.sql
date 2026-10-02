-- Cobertura exclusiva de compras nuevas. Sin semillas ni UPDATE del historial.
CREATE TABLE IF NOT EXISTS zonas_delivery_pallasca (
    id_zona SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL CHECK (length(btrim(nombre)) BETWEEN 1 AND 80),
    tarifa NUMERIC(10,2) NOT NULL CHECK (tarifa > 0),
    estado SMALLINT NOT NULL DEFAULT 1 CHECK (estado IN (0, 1))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_zonas_delivery_nombre
    ON zonas_delivery_pallasca (lower(btrim(nombre)));

-- NULL identifica ventas anteriores; nunca se deduce cobertura por fecha o tipo.
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cobertura_entrega VARCHAR(20) NULL;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS id_zona_delivery INT NULL;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS zona_delivery_nombre VARCHAR(80) NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ventas_zona_delivery' AND conrelid = 'ventas'::regclass) THEN
        ALTER TABLE ventas ADD CONSTRAINT fk_ventas_zona_delivery
            FOREIGN KEY (id_zona_delivery) REFERENCES zonas_delivery_pallasca(id_zona);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ventas_cobertura_entrega_check' AND conrelid = 'ventas'::regclass) THEN
        ALTER TABLE ventas ADD CONSTRAINT ventas_cobertura_entrega_check
            CHECK (cobertura_entrega IS NULL OR cobertura_entrega = 'pallasca');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ventas_entrega_pallasca_check' AND conrelid = 'ventas'::regclass) THEN
        ALTER TABLE ventas ADD CONSTRAINT ventas_entrega_pallasca_check CHECK (
            cobertura_entrega IS NULL OR (
                tipo_entrega IS NOT NULL AND id_distrito IS NULL AND id_agencia IS NULL
                AND (
                    (tipo_entrega = 'tienda' AND costo_envio = 0
                        AND id_zona_delivery IS NULL AND zona_delivery_nombre IS NULL
                        AND direccion IS NULL AND referencia IS NULL)
                    OR (tipo_entrega = 'domicilio' AND costo_envio > 0
                        AND id_zona_delivery IS NOT NULL AND zona_delivery_nombre IS NOT NULL
                        AND direccion IS NOT NULL AND length(btrim(direccion)) >= 5)
                )
            )
        );
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_ventas_zona_delivery ON ventas(id_zona_delivery);
