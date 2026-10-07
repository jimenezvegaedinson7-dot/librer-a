-- ============================================================
-- 041 · Backfill: entrega de ventas canceladas
-- ============================================================
-- Migración de DATOS (se aplica una sola vez, ver aplicarMigracionesDatos
-- en src/config/migraciones.js; queda registrada en migraciones_datos).
--
-- Hasta el commit 87ea7f9, cancelar una venta (PayU rechazado o vencido,
-- ventas abandonadas o cambio de estado) dejaba estado_entrega intacto, así
-- que había ventas «cancelada» con la entrega «pendiente», «preparando»…
--
-- Solo cambia estado_entrega a 'cancelado'. No toca ventas entregadas, ni
-- pagos, ni stock, ni historial. Es idempotente: una segunda ejecución no
-- encuentra filas que cumplan la condición. Corre dentro de la transacción
-- que abre el ejecutor de migraciones de datos.
UPDATE ventas
SET estado_entrega = 'cancelado'
WHERE estado = 'cancelada'
  AND estado_entrega IS DISTINCT FROM 'cancelado'
  AND estado_entrega IS DISTINCT FROM 'entregado'
RETURNING id_venta;
