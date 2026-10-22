const pool = require('../config/database');
const libroModel = require('./libro.model');

// ============================================================
// PORTADA WEB: LIBRO PROTAGONISTA
// ============================================================
// Prioridad: 1) libro elegido por el administrador (si sigue activo y con
// portada), 2) último libro agregado según creado_en, 3) ninguno.
// creado_en es la fecha real de alta (migración 031); los libros antiguos
// sin fecha quedan detrás y, entre ellos, id_libro solo desempata.
// ============================================================

const tienePortada = (libro) => {
    if (typeof libro?.portada !== 'string' || !libro.portada.trim()) return false;
    try { return ['http:', 'https:'].includes(new URL(libro.portada.trim(), 'https://portadas.local').protocol); }
    catch { return false; }
};
const esElegible = (libro) => Boolean(libro) && Number(libro.estado) === 1
    && typeof libro.titulo === 'string' && libro.titulo.trim() !== ''
    && Number.isFinite(Number(libro.precio)) && Number(libro.precio) > 0;

const obtenerConfig = async () => {
    const [rows] = await pool.query(
        'SELECT id_libro_protagonista, actualizado_en FROM portada_config WHERE id = 1'
    );
    return rows[0] || { id_libro_protagonista: null, actualizado_en: null };
};

const guardarProtagonista = async (idLibro, idUsuario) => {
    await pool.query(
        `INSERT INTO portada_config (id, id_libro_protagonista, actualizado_por, actualizado_en)
         VALUES (1, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
            id_libro_protagonista = EXCLUDED.id_libro_protagonista,
            actualizado_por = EXCLUDED.actualizado_por,
            actualizado_en = EXCLUDED.actualizado_en`,
        [idLibro, idUsuario]
    );
};

// No se elige un libro sin portada para rellenar una escena ficticia.
const ultimoAgregado = async () => {
    const [rows] = await pool.query(`
        SELECT id_libro
        FROM libros
        WHERE estado = 1 AND precio > 0 AND btrim(titulo) <> ''
          AND portada IS NOT NULL AND btrim(portada) <> ''
          AND (btrim(portada) ~* '^https?://' OR btrim(portada) !~ '^[A-Za-z][A-Za-z0-9+.-]*:')
        ORDER BY creado_en DESC NULLS LAST,
                 id_libro DESC
        LIMIT 1
    `);
    return rows[0] ? libroModel.obtenerPorId(rows[0].id_libro) : null;
};

const resolverProtagonista = async ({ automatico = false } = {}) => {
    const config = automatico ? {} : await obtenerConfig();
    const idManual = config.id_libro_protagonista ? Number(config.id_libro_protagonista) : null;
    if (idManual) {
        const manual = await libroModel.obtenerPorId(idManual);
        if (esElegible(manual) && tienePortada(manual)) {
            return { modo: 'manual', id_libro_manual: idManual, libro: manual };
        }
    }
    const reciente = await ultimoAgregado();
    if (esElegible(reciente) && tienePortada(reciente)) {
        return { modo: 'automatico', id_libro_manual: idManual, libro: reciente };
    }
    return { modo: 'ninguno', id_libro_manual: idManual, libro: null };
};

module.exports = { obtenerConfig, guardarProtagonista, resolverProtagonista, tienePortada, esElegible };
