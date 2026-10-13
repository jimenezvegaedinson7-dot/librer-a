const pool = require('../config/database');
const { validarId } = require('../utils/validaciones');
const { ENTREGA_PALLASCA } = require('../utils/entregaPallasca');

const listar = async (soloActivas = true) => {
    const [rows] = await pool.query(`
        SELECT id_zona, nombre, tarifa, estado FROM zonas_delivery_pallasca
        WHERE lower(btrim(nombre)) = lower(?) ${soloActivas ? 'AND estado = 1' : ''}
        ORDER BY nombre ASC
    `, [ENTREGA_PALLASCA.nombre]);
    return rows.map(zona => ({ ...zona, tarifa: ENTREGA_PALLASCA.tarifa, tarifa_fija: true }));
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
        SELECT id_zona, nombre, estado FROM zonas_delivery_pallasca
        WHERE lower(btrim(nombre)) = lower(?) AND estado = 1 ${bloquear ? 'FOR SHARE' : ''}
    `, [ENTREGA_PALLASCA.nombre]);
    return rows[0] ? { ...rows[0], nombre: ENTREGA_PALLASCA.nombre, tarifa: ENTREGA_PALLASCA.tarifa } : null;
};
module.exports = { listar, obtenerPorId, crear, actualizar, resolverDeliveryCiudad };
