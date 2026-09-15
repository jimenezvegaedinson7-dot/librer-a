// ============================================================
// MIGRAR IMÁGENES LOCALES A CLOUDINARY
// ============================================================
// Recorre los libros y usuarios cuya imagen aún apunta a
// /uploads/... en disco, sube el archivo a Cloudinary y
// actualiza la URL en la base de datos.
//
// Uso (desde backend/):
//   node scripts/migrarImagenesCloudinary.js
//
// Requiere CLOUDINARY_* y DATABASE_URL en el entorno/.env.
// ============================================================

const path = require('path');
const fs = require('fs');

require('dotenv').config({
    path: path.join(__dirname, '../.env')
});

const pool = require('../src/config/database');
const {
    subirImagen,
    configurado
} = require('../src/utils/cloudinary');

const BACKEND_ROOT = path.join(__dirname, '..');

const resolverRutaLocal = (rutaPublica) =>
    path.join(
        BACKEND_ROOT,
        rutaPublica.replace(/^\/+/, '')
    );

const carpetaCloudinary = (rutaPublica) =>
    rutaPublica.includes('/perfiles/')
        ? 'libreria/perfiles'
        : 'libreria/portadas';

const migrar = async () => {
    if (!configurado) {
        console.error(
            'Faltan credenciales CLOUDINARY_*. Abortando.'
        );
        process.exit(1);
    }

    const resultados = {
        migradas: 0,
        faltantes: [],
        errores: []
    };

    // ========================================
    // LIBROS (PORTADAS)
    // ========================================
    const [libros] = await pool.query(
        "SELECT id_libro, titulo, portada FROM libros WHERE portada LIKE '/uploads/%'"
    );

    for (const libro of libros) {
        const local = resolverRutaLocal(
            libro.portada
        );

        if (!fs.existsSync(local)) {
            resultados.faltantes.push(
                `libro #${libro.id_libro} "${libro.titulo}": ${libro.portada}`
            );
            continue;
        }

        try {
            const buffer = fs.readFileSync(local);

            const { url } = await subirImagen(
                buffer,
                {
                    carpeta: carpetaCloudinary(
                        libro.portada
                    )
                }
            );

            await pool.query(
                'UPDATE libros SET portada = ? WHERE id_libro = ?',
                [url, libro.id_libro]
            );

            resultados.migradas += 1;
            console.log(
                `OK  libro #${libro.id_libro} -> ${url}`
            );
        } catch (error) {
            resultados.errores.push(
                `libro #${libro.id_libro}: ${error.message}`
            );
        }
    }

    // ========================================
    // USUARIOS (FOTOS DE PERFIL)
    // ========================================
    const [usuarios] = await pool.query(
        "SELECT id_usuario, nombre, foto_perfil FROM usuarios WHERE foto_perfil LIKE '/uploads/%'"
    );

    for (const usuario of usuarios) {
        const local = resolverRutaLocal(
            usuario.foto_perfil
        );

        if (!fs.existsSync(local)) {
            resultados.faltantes.push(
                `usuario #${usuario.id_usuario} "${usuario.nombre}": ${usuario.foto_perfil}`
            );
            continue;
        }

        try {
            const buffer = fs.readFileSync(local);

            const { url } = await subirImagen(
                buffer,
                {
                    carpeta: carpetaCloudinary(
                        usuario.foto_perfil
                    )
                }
            );

            await pool.query(
                'UPDATE usuarios SET foto_perfil = ? WHERE id_usuario = ?',
                [url, usuario.id_usuario]
            );

            resultados.migradas += 1;
            console.log(
                `OK  usuario #${usuario.id_usuario} -> ${url}`
            );
        } catch (error) {
            resultados.errores.push(
                `usuario #${usuario.id_usuario}: ${error.message}`
            );
        }
    }

    // ========================================
    // RESUMEN
    // ========================================
    console.log('\n===== RESUMEN =====');
    console.log('Migradas:', resultados.migradas);

    if (resultados.faltantes.length) {
        console.log(
            '\nArchivos no encontrados en disco (hay que re-subirlos):'
        );
        resultados.faltantes.forEach((f) =>
            console.log('  -', f)
        );
    }

    if (resultados.errores.length) {
        console.log('\nErrores:');
        resultados.errores.forEach((e) =>
            console.log('  -', e)
        );
    }

    process.exit(0);
};

migrar().catch((error) => {
    console.error('Error fatal:', error.message);
    process.exit(1);
});