UPDATE ventas
SET estado_entrega = 'cancelado'
WHERE estado = 'cancelada'
  AND estado_entrega IS DISTINCT FROM 'cancelado'
  AND estado_entrega IS DISTINCT FROM 'entregado'
RETURNING id_venta;
