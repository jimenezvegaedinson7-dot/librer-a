-- Una sola cobertura para compras nuevas. No modifica ventas, pagos, stock,
-- comprobantes ni las zonas antiguas referenciadas por compras existentes.
INSERT INTO zonas_delivery_pallasca(nombre, tarifa, estado)
VALUES ('Ciudad de Pallasca', 5.00, 1)
ON CONFLICT (lower(btrim(nombre))) DO UPDATE
SET nombre = EXCLUDED.nombre, tarifa = EXCLUDED.tarifa, estado = EXCLUDED.estado
WHERE zonas_delivery_pallasca.nombre IS DISTINCT FROM EXCLUDED.nombre
   OR zonas_delivery_pallasca.tarifa IS DISTINCT FROM EXCLUDED.tarifa
   OR zonas_delivery_pallasca.estado IS DISTINCT FROM EXCLUDED.estado;
