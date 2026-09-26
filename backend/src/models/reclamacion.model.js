const pool = require('../config/database');
const {
    PLAZO_RECLAMO_DIAS_HABILES,
    hoyEnPeru,
    sumarDiasHabiles
} = require('../utils/diasHabiles');

// ========================================
// LIBRO DE RECLAMACIONES
// ----------------------------------------
// Hoja con número correlativo por año, plazo de respuesta de 15 días
// hábiles y conservación permanente (no se eliminan desde el sistema).
// ========================================

const CAMPOS = `
    id_reclamacion, anio, correlativo, tipo,
    consumidor_nombre, consumidor_tipo_documento, consumidor_documento,
    consumidor_domicilio, consumidor_telefono, consumidor_email,
    es_menor, apoderado_nombre,
    bien_tipo, bien_descripcion, monto_reclamado, id_venta,
    detalle, pedido, estado, respuesta, fecha_respuesta,
    id_usuario_respuesta, id_usuario, fecha_registro, fecha_limite
`;

const numeroHoja = (fila) =>
    `${String(fila.correlativo).padStart(6, '0')}-${fila.anio}`;

const normalizar = (fila) =>
    fila
        ? {
            ...fila,
            numero: numeroHoja(fila),
            monto_reclamado:
                fila.monto_reclamado === null || fila.monto_reclamado === undefined
                    ? null
                    : Number(fila.monto_reclamado),
            fecha_limite:
                fila.fecha_limite instanceof Date
                    ? `${fila.fecha_limite.getFullYear()}-${String(fila.fecha_limite.getMonth() + 1).padStart(2, '0')}-${String(fila.fecha_limite.getDate()).padStart(2, '0')}`
                    : String(fila.fecha_limite || '').slice(0, 10)
        }
        : null;

// Registra una hoja nueva con su correlativo del año (serializado).
const crear = async (datos) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const hoy = hoyEnPeru();
        const anio = hoy.getUTCFullYear();
        const fechaLimite = sumarDiasHabiles(hoy, PLAZO_RECLAMO_DIAS_HABILES);

        await connection.query(
            'SELECT pg_advisory_xact_lock(hashtext(?))',
            [`reclamaciones:${anio}`]
        );

        const [[{ siguiente }]] = await connection.query(`
            SELECT COALESCE(MAX(correlativo), 0) + 1 AS siguiente
            FROM reclamaciones
            WHERE anio = ?
        `, [anio]);

        const [filas] = await connection.query(`
            INSERT INTO reclamaciones (
                anio, correlativo, tipo,
                consumidor_nombre, consumidor_tipo_documento, consumidor_documento,
                consumidor_domicilio, consumidor_telefono, consumidor_email,
                es_menor, apoderado_nombre,
                bien_tipo, bien_descripcion, monto_reclamado, id_venta,
                detalle, pedido, id_usuario, fecha_limite
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING ${CAMPOS}
        `, [
            anio,
            Number(siguiente),
            datos.tipo,
            datos.consumidor_nombre,
            datos.consumidor_tipo_documento,
            datos.consumidor_documento,
            datos.consumidor_domicilio,
            datos.consumidor_telefono || null,
            datos.consumidor_email,
            Boolean(datos.es_menor),
            datos.apoderado_nombre || null,
            datos.bien_tipo,
            datos.bien_descripcion,
            datos.monto_reclamado ?? null,
            datos.id_venta || null,
            datos.detalle,
            datos.pedido,
            datos.id_usuario || null,
            fechaLimite
        ]);

        await connection.commit();
        return normalizar(filas[0]);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const listar = async ({ estado, q } = {}) => {
    const condiciones = [];
    const valores = [];

    if (estado === 'pendiente' || estado === 'respondido') {
        condiciones.push('estado = ?');
        valores.push(estado);
    } else if (estado === 'vencido') {
        condiciones.push(`estado = 'pendiente' AND fecha_limite < (NOW() AT TIME ZONE 'America/Lima')::date`);
    }

    if (q && String(q).trim()) {
        const texto = `%${String(q).trim()}%`;
        condiciones.push(`(
            consumidor_nombre ILIKE ? OR
            consumidor_documento LIKE ? OR
            consumidor_email ILIKE ? OR
            CAST(correlativo AS TEXT) LIKE ?
        )`);
        valores.push(texto, texto, texto, texto);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const [filas] = await pool.query(`
        SELECT ${CAMPOS}
        FROM reclamaciones
        ${where}
        ORDER BY (estado = 'pendiente') DESC, fecha_limite ASC, id_reclamacion DESC
        LIMIT 500
    `, valores);

    return filas.map(normalizar);
};

const resumen = async () => {
    const [[fila]] = await pool.query(`
        SELECT
            COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END), 0) AS pendientes,
            COALESCE(SUM(CASE WHEN estado = 'pendiente'
                AND fecha_limite < (NOW() AT TIME ZONE 'America/Lima')::date THEN 1 ELSE 0 END), 0) AS vencidos,
            COALESCE(SUM(CASE WHEN estado = 'pendiente'
                AND fecha_limite >= (NOW() AT TIME ZONE 'America/Lima')::date
                AND fecha_limite <= (NOW() AT TIME ZONE 'America/Lima')::date + 3 THEN 1 ELSE 0 END), 0) AS por_vencer
        FROM reclamaciones
    `);
    return {
        total: Number(fila.total || 0),
        pendientes: Number(fila.pendientes || 0),
        vencidos: Number(fila.vencidos || 0),
        por_vencer: Number(fila.por_vencer || 0)
    };
};

const obtener = async (id) => {
    const [filas] = await pool.query(`
        SELECT ${CAMPOS}
        FROM reclamaciones
        WHERE id_reclamacion = ?
    `, [id]);
    return normalizar(filas[0]);
};

// Registra la respuesta del proveedor (una sola vez: queda en el libro).
const responder = async (id, { respuesta, idUsuario }) => {
    const [filas] = await pool.query(`
        UPDATE reclamaciones
        SET estado = 'respondido',
            respuesta = ?,
            fecha_respuesta = NOW(),
            id_usuario_respuesta = ?
        WHERE id_reclamacion = ?
          AND estado = 'pendiente'
        RETURNING ${CAMPOS}
    `, [respuesta, idUsuario || null, id]);

    if (filas.length === 0) {
        const actual = await obtener(id);
        if (!actual) {
            return null;
        }
        const error = new Error('Esta hoja ya fue respondida');
        error.status = 400;
        throw error;
    }
    return normalizar(filas[0]);
};

module.exports = {
    crear,
    listar,
    resumen,
    obtener,
    responder,
    numeroHoja
};
