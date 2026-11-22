const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const NOMBRE_BACKFILL = '044_backfill_metadatos_bibliograficos.js';
const CAMPOS_ACTUALIZABLES = ['editorial', 'anio_publicacion', 'numero_paginas'];
const NOMBRE_BACKFILL_DRAGON_BALL_Z = '047_backfill_dragon_ball_z.js';
const CAMPOS_DRAGON_BALL_Z = ['editorial', 'idioma', 'numero_paginas', 'anio_publicacion', 'formato', 'numero_volumen', 'dimensiones'];
const NOMBRE_BACKFILL_REALES_TODOS = '048_backfill_metadatos_reales_todos.js';
const CAMPOS_REALES_TODOS = CAMPOS_DRAGON_BALL_Z;
const NOMBRE_BACKFILL_ENRIQUECIDOS = '049_backfill_metadatos_enriquecidos.js';
const CAMPOS_ENRIQUECIDOS = CAMPOS_DRAGON_BALL_Z;

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

function construirActualizacionesReales() {
    return leerSemilla('libros-metadatos-reales.json')
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
        .filter((registro) => registro.isbn && CAMPOS_REALES_TODOS.some((campo) => registro[campo] != null));
}

function construirActualizacionesEnriquecidos() {
    const porIsbn = new Map();
    for (const libro of leerSemilla('libros-metadatos-enriquecidos.json')) {
        const registro = {
            isbn: textoValido(libro.isbn, 20),
            editorial: textoValido(libro.editorial, 200),
            idioma: textoValido(libro.idioma, 60),
            numero_paginas: enteroValido(libro.numero_paginas, 1, 20000),
            anio_publicacion: enteroValido(libro.anio_publicacion, 1000, 2100),
            formato: textoValido(libro.formato, 60),
            numero_volumen: textoValido(libro.numero_volumen, 40),
            dimensiones: textoValido(libro.dimensiones, 100)
        };
        if (!registro.isbn || !CAMPOS_ENRIQUECIDOS.some((campo) => registro[campo] != null)) continue;
        const actual = porIsbn.get(registro.isbn) || {};
        for (const campo of CAMPOS_ENRIQUECIDOS) {
            if (actual[campo] == null && registro[campo] != null) actual[campo] = registro[campo];
        }
        porIsbn.set(registro.isbn, actual);
    }
    return [...porIsbn.entries()].map(([isbn, valores]) => ({ isbn, ...valores }));
}

async function ejecutarConActualizaciones(conexion, actualizaciones, campos) {
    let filas = 0;

    for (const registro of actualizaciones) {
        const parametros = [registro.isbn];
        const asignaciones = [];

        for (const campo of campos) {
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

async function ejecutarDragonBallZ(conexion) {
    return ejecutarConActualizaciones(conexion, construirActualizacionesDragonBallZ(), CAMPOS_DRAGON_BALL_Z);
}

async function ejecutarRealesTodos(conexion) {
    return ejecutarConActualizaciones(conexion, construirActualizacionesReales(), CAMPOS_REALES_TODOS);
}

async function ejecutarEnriquecidos(conexion) {
    return ejecutarConActualizaciones(conexion, construirActualizacionesEnriquecidos(), CAMPOS_ENRIQUECIDOS);
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
const backfillMetadatosRealesTodos = { nombre: NOMBRE_BACKFILL_REALES_TODOS, ejecutar: ejecutarRealesTodos };
const backfillMetadatosEnriquecidos = { nombre: NOMBRE_BACKFILL_ENRIQUECIDOS, ejecutar: ejecutarEnriquecidos };

module.exports = {
    backfillMetadatosBibliograficos,
    backfillMetadatosDragonBallZ,
    backfillMetadatosRealesTodos,
    backfillMetadatosEnriquecidos,
    construirActualizaciones,
    construirActualizacionesDragonBallZ,
    construirActualizacionesReales,
    construirActualizacionesEnriquecidos,
    NOMBRE_BACKFILL,
    NOMBRE_BACKFILL_DRAGON_BALL_Z,
    NOMBRE_BACKFILL_REALES_TODOS,
    NOMBRE_BACKFILL_ENRIQUECIDOS
};
