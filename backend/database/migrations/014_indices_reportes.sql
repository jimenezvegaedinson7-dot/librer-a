CREATE INDEX idx_ventas_estado_fecha
    ON ventas (estado, fecha_venta);

CREATE INDEX idx_reservas_venc_estado
    ON reservas (fecha_vencimiento, estado);
