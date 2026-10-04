// ============================================================
// MIGRACIONES INCREMENTALES AL ARRANQUE (PostgreSQL)
// ============================================================
// Estrategia del proyecto:
//
//   INSTALACIÓN NUEVA   -> database/schema.sql (esquema canónico
//                          completo). No requiere migraciones.
//   ACTUALIZACIÓN       -> se aplican aquí las migraciones
//     (producción)        incrementales de la lista MIGRACIONES.
//   TEST                -> no se autoejecuta nada. La base de
//                          pruebas se crea desde schema.sql.
//
// IMPORTANTE
//   Solo se autoejecutan migraciones escritas en dialecto PostgreSQL
//   y declaradas explícitamente en MIGRACIONES. Los archivos
//   006-022 son heredados de MySQL (AUTO_INCREMENT, MODIFY COLUMN,
//   INSERT IGNORE, variables @) y NO se ejecutan jamás de forma
//   automática: fallarían contra PostgreSQL. Si alguna vez hacen
//   falta, deben reescribirse a PostgreSQL y añadirse a la lista.
//
//   Todas las migraciones de la lista son idempotentes: se pueden
//   ejecutar muchas veces sin duplicar nada ni borrar datos.
// ============================================================

const fs = require('fs');
const path = require('path');

// Rutas absolutas desde la raíz del backend.
const MIGRACIONES_DIR = path.join(
    __dirname,
    '..',
    '..',
    'database',
    'migrations'
);

// Sentencias de esquema que se garantizan en cada arranque.
const SENTENCIAS_BASE = [
    {
        nombre: 'favoritos',
        sql: `
            CREATE TABLE IF NOT EXISTS favoritos (
                id_usuario INT NOT NULL,
                id_libro   INT NOT NULL,
                fecha      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id_usuario, id_libro),
                CONSTRAINT fk_favoritos_usuario
                    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
                    ON DELETE CASCADE,
                CONSTRAINT fk_favoritos_libro
                    FOREIGN KEY (id_libro) REFERENCES libros(id_libro)
                    ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_favoritos_usuario ON favoritos (id_usuario);
            CREATE INDEX IF NOT EXISTS idx_favoritos_libro ON favoritos (id_libro);
        `
    },
    {
        nombre: 'ventas.cliente_documento',
        sql: `
            ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cliente_documento VARCHAR(20) NULL;
            ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cliente_tipo_documento VARCHAR(10) NULL;
        `
    },
    {
        nombre: 'comprobantes.envio_email',
        sql: `
            ALTER TABLE comprobantes ADD COLUMN IF NOT EXISTS enviado_por_email BOOLEAN DEFAULT FALSE;
            ALTER TABLE comprobantes ADD COLUMN IF NOT EXISTS fecha_envio_email TIMESTAMP NULL;
        `
    }
];

// Migraciones incrementales, en orden. PostgreSQL únicamente.
const MIGRACIONES = [
    '023_control_ventas.sql',
    '024_reclamaciones_y_cuentas.sql',
    '026_add_estado_entrega_ventas.sql',
    '027_restringir_tipo_entrega.sql',
    '028_coherencia_tipo_estado_entrega.sql',
    '029_retirar_rol_obsoleto.sql',
    '030_descuentos_y_anuncios.sql',
    '031_libros_nuevos.sql',
    '032_cobertura_pallasca.sql',
    '033_canal_compra_web.sql',
    '034_carrusel_anuncios.sql',
    '035_textos_anuncio.sql',
    '036_correcciones_negocio.sql',
    '037_administracion.sql',
    '038_version_sesion.sql'
];

// En producción un fallo de migración debe detener el arranque:
// seguir sirviendo tráfico contra un esquema incompleto es peor que
// no arrancar. En desarrollo solo se avisa, para no bloquear el
// trabajo local por un detalle de esquema.
function esFalloFatal() {
    return process.env.NODE_ENV === 'production';
}

// Un error de PostgreSQL puede llegar con message vacío (por ejemplo
// cuando lo que falla es la conexión o una sentencia multi-consulta).
// Sin code/detail el diagnóstico en producción sería imposible, así que
// se reconstruye un mensaje utilizable a partir de lo que sí exista.
function describirError(error) {
    if (!error) {
        return 'error desconocido';
    }

    const partes = [];

    if (error.message) {
        partes.push(error.message);
    }

    if (error.code) {
        partes.push(`(código ${error.code})`);
    }

    if (error.detail) {
        partes.push(`detalle: ${error.detail}`);
    }

    if (error.hint) {
        partes.push(`sugerencia: ${error.hint}`);
    }

    if (partes.length === 0) {
        // Último recurso: al menos el tipo de fallo.
        partes.push(error.name || 'Error');
    }

    return partes.join(' | ');
}

async function aplicarMigraciones(pool) {
    const entorno = process.env.NODE_ENV || 'development';
    const pasos = [
        ...SENTENCIAS_BASE.map((s) => ({ nombre: s.nombre, sql: s.sql })),
        ...MIGRACIONES.map((archivo) => ({
            nombre: archivo,
            sql: fs.readFileSync(path.join(MIGRACIONES_DIR, archivo), 'utf8')
        }))
    ];

    console.log(
        `[bootstrap] Aplicando ${pasos.length} pasos de esquema (${entorno})...`
    );

    for (const paso of pasos) {
        try {
            await pool.query(paso.sql);
            console.log(`[bootstrap] OK ${paso.nombre}`);
        } catch (error) {
            const motivo = describirError(error);

            console.error(
                `[bootstrap] ERROR ${paso.nombre}: ${motivo}`
            );

            if (esFalloFatal()) {
                throw new Error(
                    `Migración "${paso.nombre}" falló en producción. ` +
                    'No se arranca el servidor para no operar con un esquema ' +
                    `incompleto. Detalle: ${motivo}`
                );
            }
        }
    }

    console.log('[bootstrap] Esquema verificado.');
}

module.exports = {
    aplicarMigraciones,
    describirError,
    MIGRACIONES,
    SENTENCIAS_BASE
};
