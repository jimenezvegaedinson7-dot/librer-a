const pool = require('../config/database');

const CAMPOS_PERMITIDOS = [
    'ruc',
    'razon_social',
    'nombre_comercial',
    'tipo_documento',
    'documento_identidad',
    'direccion',
    'sistema_emision',
    'emisor_electronico',
    'aplica_igv',
    'fecha_inscripcion',
    'fecha_inicio',
    'libros_exonerados',
    'exoneracion_libros_hasta',
    'tasa_igv'
];

const CAMPOS_SELECT =
    'id, ruc, razon_social, nombre_comercial, ' +
    'tipo_documento, documento_identidad, direccion, ' +
    'sistema_emision, emisor_electronico, aplica_igv, ' +
    'fecha_inscripcion, fecha_inicio, ' +
    'libros_exonerados, exoneracion_libros_hasta, tasa_igv, ' +
    'created_at, updated_at';

const obtenerEmpresa = async () => {
    const [filas] = await pool.query(`SELECT ${CAMPOS_SELECT} FROM empresa WHERE id = 1 LIMIT 1`);

    if (filas.length > 0) {
        return filas[0];
    }

    await pool.query(`INSERT INTO empresa (id, ruc) VALUES (1, '') ON CONFLICT (id) DO NOTHING`);

    const [creada] = await pool.query(`SELECT ${CAMPOS_SELECT} FROM empresa WHERE id = 1 LIMIT 1`);

    return creada[0] || null;
};

const actualizarEmpresa = async (campos = {}) => {
    const asignaciones = [];
    const valores = [];

    for (const campo of CAMPOS_PERMITIDOS) {
        if (campos[campo] !== undefined) {
            asignaciones.push(`${campo} = ?`);
            valores.push(campos[campo]);
        }
    }

    if (asignaciones.length === 0) {
        return obtenerEmpresa();
    }

    asignaciones.push('updated_at = NOW()');

    await pool.query(`UPDATE empresa SET ${asignaciones.join(', ')} WHERE id = 1`, valores);

    return obtenerEmpresa();
};

module.exports = { obtenerEmpresa, actualizarEmpresa };
