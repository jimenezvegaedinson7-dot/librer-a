const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const NOMBRE_BACKFILL = '044_backfill_metadatos_bibliograficos.js';
const CAMPOS_ACTUALIZABLES = ['editorial', 'anio_publicacion', 'numero_paginas'];
const NOMBRE_BACKFILL_DRAGON_BALL_Z = '047_backfill_dragon_ball_z.js';
const CAMPOS_DRAGON_BALL_Z = ['editorial', 'idioma', 'numero_paginas', 'anio_publicacion', 'formato', 'numero_volumen', 'dimensiones'];

function leerSemilla(nombre) {
    const ruta = path.join(RAIZ, 'database', 'seeds', nombre);
    if (!fs.existsSync(ruta)) return [];
    const contenido = JSON.parse(fs.readFileSync(ruta, 'utf8'));
    if (Array.isArray(contenido)) return contenido;
    return contenido.registros || contenido.libros || [];
}

function textoValido(valor, maximo) {
    if (valor == null) return null;
    const texto = String(valor).trim();
    return texto && texto.length <= maximo ? texto : null;
}

function enteroValido(valor, minimo, maximo) {
    if (valor == null || valor === '') return null;
    const texto = String(valor).trim();
    if (!/^\d+$/.test(texto)) return null;
    const numero = Number(texto);
    return Number.isInteger(numero) && numero >= minimo && numero <= maximo ? numero : null;
}

function construirActualizaciones() {
    const porIsbn = new Map();

    const agregar = (isbn, valores) => {
        const clave = textoValido(isbn, 20);
        if (!clave) return;
        const limpios = Object.fromEntries(Object.entries(valores).filter(([, valor]) => valor != null));
        if (!Object.keys(limpios).length) return;
        const actuales = porIsbn.get(clave) || {};
        const fusion = { ...actuales };
        for (const [campo, valor] of Object.entries(limpios)) {
            if (fusion[campo] == null) fusion[campo] = valor;
        }
        porIsbn.set(clave, fusion);
    };

    for (const libro of leerSemilla('libros-catalogo.json')) {
        agregar(libro.isbn, {
            editorial: textoValido(libro.editorial, 200),
            anio_publicacion: enteroValido(libro.anio_publicacion, 1000, 2100),
            numero_paginas: enteroValido(libro.paginas, 1, 20000)
        });
    }

    for (const libro of leerSemilla('libros-reales-catalogo.json')) {
        agregar(libro.isbn, { anio_publicacion: enteroValido(libro.anio, 1000, 2100) });
    }

    return [...porIsbn.entries()].map(([isbn, valores]) => ({ isbn, ...valores }));
}

function construirActualizacionesDragonBallZ() {
    return leerSemilla('libros-metadatos-dragon-ball-z.json')
        .map((libro) => ({
            isbn: textoValido(libro.isbn, 20),
            editorial: textoValido(libro.editorial, 200),
            idioma: textoValido(libro.idioma, 60),
            numero_paginas: enteroValido(libro.numero_paginas, 1, 20000),
            anio_publicacion: enteroValido(libro.anio_publicacion, 1000, 2100),
            formato: textoValido(libro.formato, 60),
            numero_volumen: textoValido(libro.numero_volumen, 40),
            dimensiones: textoValido(libro.dimensiones, 100)
        }))
        .filter((registro) => registro.isbn);
}

async function ejecutarDragonBallZ(conexion) {
    let filas = 0;

    for (const registro of construirActualizacionesDragonBallZ()) {
        const parametros = [registro.isbn];
        const asignaciones = [];

        for (const campo of CAMPOS_DRAGON_BALL_Z) {
            if (registro[campo] == null) continue;
            parametros.push(registro[campo]);
            asignaciones.push(`${campo} = COALESCE(${campo}, $${parametros.length})`);
        }

        if (!asignaciones.length) continue;
        const resultado = await conexion.pgQuery(`UPDATE libros SET ${asignaciones.join(', ')} WHERE isbn = $1`, parametros);
        filas += resultado?.rowCount || 0;
    }

    return { rowCount: filas };
}

async function ejecutar(conexion) {
    let filas = 0;

    for (const registro of construirActualizaciones()) {
        const parametros = [registro.isbn];
        const asignaciones = [];

        for (const campo of CAMPOS_ACTUALIZABLES) {
            if (registro[campo] == null) continue;
            parametros.push(registro[campo]);
            asignaciones.push(`${campo} = COALESCE(${campo}, $${parametros.length})`);
        }

        if (!asignaciones.length) continue;
        const resultado = await conexion.pgQuery(`UPDATE libros SET ${asignaciones.join(', ')} WHERE isbn = $1`, parametros);
        filas += resultado?.rowCount || 0;
    }

    return { rowCount: filas };
}

const backfillMetadatosBibliograficos = { nombre: NOMBRE_BACKFILL, ejecutar };
const backfillMetadatosDragonBallZ = { nombre: NOMBRE_BACKFILL_DRAGON_BALL_Z, ejecutar: ejecutarDragonBallZ };

module.exports = {
    backfillMetadatosBibliograficos,
    backfillMetadatosDragonBallZ,
    construirActualizaciones,
    construirActualizacionesDragonBallZ,
    NOMBRE_BACKFILL,
    NOMBRE_BACKFILL_DRAGON_BALL_Z
};
