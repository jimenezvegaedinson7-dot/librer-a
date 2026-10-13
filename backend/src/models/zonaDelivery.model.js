const pool = require('../config/database');
const { validarId } = require('../utils/validaciones');
const { ENTREGA_PALLASCA, importeTarifa } = require('../utils/entregaPallasca');

const listar = async (soloActivas = true) => {
    const [rows] = await pool.query(`
        SELECT id_zona, nombre, tarifa, estado FROM zonas_delivery_pallasca
        WHERE lower(btrim(nombre)) = lower(?) ${soloActivas ? 'AND estado = 1' : ''}
        ORDER BY nombre ASC
    `, [ENTREGA_PALLASCA.nombre]);
    return rows.map(zona => ({ ...zona, tarifa: Number(zona.tarifa), tarifa_fija: true }));
};

// El checkout toma el bloqueo dentro de su transacción: ni tarifa ni estado
// pueden cambiar entre la validación y el guardado definitivo de la venta.
const obtenerPorId = async (id, connection = pool, bloquear = false) => {
    const [rows] = await connection.query(`
        SELECT id_zona, nombre, tarifa, estado FROM zonas_delivery_pallasca
        WHERE id_zona = ? ${bloquear ? 'FOR SHARE' : ''}
    `, [id]);
    return rows[0] || null;
};

const crear = async ({ nombre, tarifa, estado }) => {
    const [rows] = await pool.query(`
        INSERT INTO zonas_delivery_pallasca(nombre, tarifa, estado)
        VALUES (?, ?, ?) RETURNING id_zona, nombre, tarifa, estado
    `, [nombre, tarifa, estado]);
    return rows[0];
};

const actualizar = async (id, { nombre, tarifa, estado }) => {
    const [rows] = await pool.query(`
        UPDATE zonas_delivery_pallasca SET nombre = ?, tarifa = ?, estado = ?
        WHERE id_zona = ? RETURNING id_zona, nombre, tarifa, estado
    `, [nombre, tarifa, estado, id]);
    return rows[0] || null;
};

// Un cliente publicado puede enviar su zona antigua activa. Se valida la
// referencia, pero la compra NUEVA toma cobertura/importe únicos de la ciudad.
// Los reintentos de una venta existente se resuelven antes de este cálculo.
const resolverDeliveryCiudad = async (idZona, connection = pool, bloquear = false) => {
    if (idZona !== undefined && idZona !== null) {
        const id = validarId(idZona);
        const anterior = id ? await obtenerPorId(id, connection, bloquear) : null;
        if (!anterior || Number(anterior.estado) !== 1) return null;
    }
    const [rows] = await connection.query(`
        SELECT id_zona, nombre, tarifa, estado FROM zonas_delivery_pallasca
        WHERE lower(btrim(nombre)) = lower(?) AND estado = 1 ${bloquear ? 'FOR SHARE' : ''}
    `, [ENTREGA_PALLASCA.nombre]);
    return rows[0] ? { ...rows[0], nombre: ENTREGA_PALLASCA.nombre, tarifa: Number(rows[0].tarifa) } : null;
};

const actualizarTarifaCiudad = async (id, tarifa, tarifaAnterior, idUsuario) => {
    const importe = importeTarifa(tarifa), esperado = importeTarifa(tarifaAnterior);
    if (importe === null || esperado === null) throw Object.assign(new Error('La tarifa debe ser positiva y tener hasta dos decimales'), { status: 400 });
    const conexion = await pool.getConnection();
    try {
        await conexion.beginTransaction();
        const [filas] = await conexion.query('SELECT id_zona,nombre,tarifa,estado FROM zonas_delivery_pallasca WHERE id_zona=? FOR UPDATE', [id]);
        const zona = filas[0];
        if (!zona) throw Object.assign(new Error('Cobertura no encontrada'), { status: 404 });
        if (zona.nombre !== ENTREGA_PALLASCA.nombre || Number(zona.estado) !== 1) {
            throw Object.assign(new Error('Solo se modifica la tarifa de la cobertura activa Ciudad de Pallasca'), { status: 409 });
        }
        // FOR UPDATE debe preceder a la comparación: dos operadores no pisan
        // una tarifa que cambió desde que abrieron el formulario.
        const anterior = Number(zona.tarifa);
        if (anterior !== esperado) throw Object.assign(new Error('La tarifa fue modificada por otro administrador. Actualiza el formulario antes de guardar.'), { status: 409 });
        if (importe === anterior) { await conexion.commit(); return { ...zona, tarifa: anterior, tarifa_fija: true, sin_cambios: true }; }
        const [rows] = await conexion.query('UPDATE zonas_delivery_pallasca SET tarifa=? WHERE id_zona=? RETURNING id_zona,nombre,tarifa,estado', [importe, id]);
        await conexion.query(`INSERT INTO historial_operaciones(id_usuario,tipo_operacion,modulo,descripcion)
            VALUES (?,'ACTUALIZAR','tarifas_envio',?)`, [idUsuario, `Tarifa única de delivery en Ciudad de Pallasca: S/ ${anterior.toFixed(2)} → S/ ${importe.toFixed(2)}. Aplicación: pedidos nuevos.`]);
        await conexion.commit();
        return { ...rows[0], tarifa: importe, tarifa_fija: true };
    } catch (error) { await conexion.rollback(); throw error; }
    finally { conexion.release(); }
};
module.exports = { listar, obtenerPorId, crear, actualizar, resolverDeliveryCiudad, actualizarTarifaCiudad };
