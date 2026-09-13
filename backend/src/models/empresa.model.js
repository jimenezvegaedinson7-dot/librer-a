const pool = require('../config/database');

// ========================================
// COLUMNAS EDITABLES DE LA TABLA EMPRESA
// (whitelist: solo estos campos se actualizan)
// ========================================
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
    'fecha_inicio'
];

const CAMPOS_SELECT =
    'id, ruc, razon_social, nombre_comercial, ' +
    'tipo_documento, documento_identidad, direccion, ' +
    'sistema_emision, emisor_electronico, aplica_igv, ' +
    'fecha_inscripcion, fecha_inicio, created_at, updated_at';

// ========================================
// OBTENER EMPRESA (EMISOR)
// Si no existe, crea la fila id=1 (ruc vacío) y la devuelve.
// ========================================
const obtenerEmpresa = async () => {
    const [filas] = await pool.query(`
        SELECT ${CAMPOS_SELECT}
        FROM empresa
        WHERE id = 1
        LIMIT 1
    `);

    if (filas.length > 0) {
        return filas[0];
    }

    // ========================================
    // CREAR FILA POR DEFECTO (id=1, ruc='')
    // INSERT IGNORE: idempotente ante concurrencia.
    // ========================================
    await pool.query(`
        INSERT IGNORE INTO empresa (id, ruc)
        VALUES (1, '')
    `);

    const [creada] = await pool.query(`
        SELECT ${CAMPOS_SELECT}
        FROM empresa
        WHERE id = 1
        LIMIT 1
    `);

    return creada[0] || null;
};

// ========================================
// ACTUALIZAR EMPRESA
// Solo aplica los campos permitidos (whitelist) que vengan
// definidos en `campos`. Actualiza updated_at y devuelve
// la fila actualizada.
// ========================================
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

    await pool.query(`
        UPDATE empresa
        SET ${asignaciones.join(', ')}
        WHERE id = 1
    `, valores);

    return obtenerEmpresa();
};

// ========================================
// EXPORTAR MODELO
// ========================================
module.exports = {
    obtenerEmpresa,
    actualizarEmpresa
};