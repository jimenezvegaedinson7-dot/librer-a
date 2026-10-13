-- 042 · Retiro total de Reservas. Se ejecuta por aplicarMigracionesDatos
-- dentro de UNA transacción, con advisory lock y registro migraciones_datos.
-- No borra ni reescribe ventas, pagos, comprobantes o clientes.
-- La tabla vacía queda solo para compatibilidad con migraciones previas.

-- Estabilizar el apartado y sus posibles vínculos antes de calcular stock.
LOCK TABLE reservas IN ACCESS EXCLUSIVE MODE;
LOCK TABLE ventas IN SHARE ROW EXCLUSIVE MODE;

-- El esquema canónico no tiene esta FK. Si una instalación histórica la
-- añadió, quitar SOLO ventas.id_reserva -> reservas.id_reserva, conservando
-- el ID y el origen como marcadores históricos. Nunca usar DROP CASCADE:
-- incluso una FK ON DELETE CASCADE debe quitarse antes de borrar reservas.
DO $$
DECLARE
    fk RECORD;
BEGIN
    FOR fk IN SELECT conrelid, conname, conkey, confkey FROM pg_constraint
        WHERE contype = 'f' AND confrelid = 'reservas'::regclass
    LOOP
        IF fk.conrelid <> 'ventas'::regclass
            OR fk.conkey <> ARRAY[(SELECT attnum FROM pg_attribute
                WHERE attrelid = 'ventas'::regclass AND attname = 'id_reserva')]::smallint[]
            OR fk.confkey <> ARRAY[(SELECT attnum FROM pg_attribute
                WHERE attrelid = 'reservas'::regclass AND attname = 'id_reserva')]::smallint[] THEN
            RAISE EXCEPTION '042: FK entrante no compatible: %.%; purga revertida', fk.conrelid::regclass, fk.conname;
        END IF;
        EXECUTE format('ALTER TABLE ventas DROP CONSTRAINT %I', fk.conname);
    END LOOP;
END $$;

-- Pendiente/confirmada sin venta vinculada mantiene el apartado.
-- Una reserva vinculada a CUALQUIER venta no libera stock aquí: su apartado
-- pudo transferirse al cobro o liberarse al cancelar/devolver esa venta.
-- Completadas/canceladas nunca reingresan stock.
DO $$
DECLARE
    apartado RECORD;
    stock_nuevo INT;
BEGIN
    IF EXISTS (SELECT 1 FROM reservas r WHERE r.estado IN ('pendiente', 'confirmada')
        AND r.cantidad <= 0 AND NOT EXISTS (SELECT 1 FROM ventas v WHERE v.id_reserva = r.id_reserva)) THEN
        RAISE EXCEPTION '042: cantidad de apartado inválida; purga revertida';
    END IF;
    FOR apartado IN SELECT r.id_libro, SUM(r.cantidad)::bigint AS cantidad
        FROM reservas r
        WHERE r.estado IN ('pendiente', 'confirmada')
            AND NOT EXISTS (SELECT 1 FROM ventas v WHERE v.id_reserva = r.id_reserva)
        GROUP BY r.id_libro ORDER BY r.id_libro
    LOOP
        -- El UPDATE bloquea inventario por libro en orden determinista.
        UPDATE inventario SET stock = stock + apartado.cantidad, ultima_actualizacion = NOW()
            WHERE id_libro = apartado.id_libro RETURNING stock INTO stock_nuevo;
        IF NOT FOUND THEN
            RAISE EXCEPTION '042: inventario no encontrado para libro %; purga revertida', apartado.id_libro;
        END IF;
        INSERT INTO movimientos_inventario(id_libro, id_usuario, tipo, motivo, cantidad, stock_resultante)
            VALUES (apartado.id_libro, NULL, 'entrada', 'retiro_reservas_042', apartado.cantidad, stock_nuevo);
    END LOOP;
END $$;

DELETE FROM historial_operaciones WHERE lower(btrim(modulo)) IN ('reserva', 'reservas');
-- Última sentencia: el ejecutor registra el número de reservas eliminadas.
DELETE FROM reservas RETURNING id_reserva;
