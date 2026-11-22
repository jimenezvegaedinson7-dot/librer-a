const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ENTRADA = path.join(RAIZ, 'database', 'seeds', 'libros-metadatos-reales.json');
const SALIDA = path.join(RAIZ, 'database', 'seeds', 'libros-metadatos-enriquecidos.json');
const OPEN_LIBRARY = 'https://openlibrary.org/isbn';
const OPEN_LIBRARY_BULK = 'https://openlibrary.org/api/books';
const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json';
const CAMPOS = ['editorial', 'idioma', 'numero_paginas', 'anio_publicacion', 'formato', 'numero_volumen', 'dimensiones'];
const IDIOMAS = {
    spa: 'Español',
    es: 'Español',
    eng: 'Inglés',
    en: 'Inglés',
    fre: 'Francés',
    fr: 'Francés',
    ger: 'Alemán',
    de: 'Alemán',
    ita: 'Italiano',
    it: 'Italiano',
    por: 'Portugués',
    pt: 'Portugués',
    cat: 'Catalán',
    glg: 'Gallego',
    nld: 'Neerlandés',
    rus: 'Ruso',
    jpn: 'Japonés'
};
const FORMATOS = {
    paperback: 'Tapa blanda',
    'trade paperback': 'Tapa blanda',
    'mass market paperback': 'Tapa blanda de bolsillo',
    hardcover: 'Tapa dura',
    hardback: 'Tapa dura',
    'library binding': 'Encuadernación de biblioteca',
    'board book': 'Cartoné',
    ebook: 'Digital',
    'electronic resource': 'Digital',
    audiobook: 'Audiolibro'
};

function dormir(milisegundos) {
    return new Promise((resolver) => setTimeout(resolver, milisegundos));
}

function texto(valor, maximo) {
    if (valor == null) return null;
    const limpio = String(valor).replace(/\s+/g, ' ').trim();
    return limpio && limpio.length <= maximo ? limpio : null;
}

function entero(valor, minimo, maximo) {
    if (valor == null || valor === '') return null;
    const numero = Number(String(valor).trim());
    return Number.isInteger(numero) && numero >= minimo && numero <= maximo ? numero : null;
}

function anio(valor) {
    const coincidencia = String(valor || '').match(/\b(1[5-9]\d{2}|20\d{2}|2100)\b/);
    return coincidencia ? Number(coincidencia[1]) : null;
}

function idioma(valor) {
    const clave = String(valor || '').replace('/languages/', '').trim().toLowerCase();
    return IDIOMAS[clave] || null;
}

function formato(valor) {
    const limpio = texto(valor, 60);
    if (!limpio) return null;
    if (FORMATOS[limpio.toLowerCase()]) return FORMATOS[limpio.toLowerCase()];
    return limpio;
}

function extraerDeBulk(datos) {
    if (!datos || typeof datos !== 'object') return {};
    return {
        editorial: texto(datos.publishers && datos.publishers[0] && datos.publishers[0].name, 200),
        anio_publicacion: anio(datos.publish_date),
        numero_paginas: entero(datos.number_of_pages, 1, 20000)
    };
}

function extraerDeIndividual(datos) {
    if (!datos || typeof datos !== 'object') return {};
    return {
        editorial: texto(datos.publishers && datos.publishers[0], 200),
        idioma: idioma(datos.languages && datos.languages[0]),
        numero_paginas: entero(datos.number_of_pages, 1, 20000),
        anio_publicacion: anio(datos.publish_date),
        formato: formato(datos.physical_format),
        dimensiones: texto(datos.physical_dimensions, 100)
    };
}

function extraerDeBusqueda(datos) {
    if (!datos || !Array.isArray(datos.language) || datos.language.length !== 1) return { idioma: null };
    return { idioma: idioma(datos.language[0]) };
}

function combinar(libro, bulk, individual, idiomaBusqueda = null) {
    const fuentesCampo = {};
    const resultado = { isbn: libro.isbn, titulo: libro.titulo };
    for (const campo of CAMPOS) {
        const semilla = texto(libro[campo], campo === 'editorial' ? 200 : campo === 'dimensiones' ? 100 : 60);
        const semillaNumerica = ['numero_paginas', 'anio_publicacion'].includes(campo) ? entero(libro[campo], 1, campo === 'anio_publicacion' ? 2100 : 20000) : null;
        const propio = semillaNumerica || semilla;
        if (propio != null) {
            resultado[campo] = propio;
            fuentesCampo[campo] = 'semilla';
            continue;
        }
        const candidatos = [
            ['openlibrary_edicion', individual && individual[campo]],
            ['openlibrary_obra', campo === 'idioma' ? idiomaBusqueda : null],
            ['openlibrary_isbn', bulk && bulk[campo]]
        ];
        const encontrado = candidatos.find(([, valor]) => valor != null && String(valor).trim());
        if (encontrado) {
            resultado[campo] = encontrado[1];
            fuentesCampo[campo] = encontrado[0];
        } else {
            resultado[campo] = null;
        }
    }
    const fuentes = new Set(Array.isArray(libro.fuentes) ? libro.fuentes : []);
    for (const nombre of Object.values(fuentesCampo)) {
        if (nombre !== 'semilla') fuentes.add(nombre);
    }
    resultado.fuentes = [...fuentes];
    resultado.fuentes_campo = fuentesCampo;
    return resultado;
}

async function pedirJson(url, intentos = 3) {
    for (let intento = 1; intento <= intentos; intento += 1) {
        const control = new AbortController();
        const temporizador = setTimeout(() => control.abort(), 15000);
        try {
            const respuesta = await fetch(url, { headers: { 'User-Agent': 'MATIDANA-FichaTecnica/1.0' }, signal: control.signal });
            if (respuesta.status === 404) return null;
            if (respuesta.status === 429 || respuesta.status >= 500) {
                if (intento === intentos) return null;
                await dormir(700 * intento * intento);
                continue;
            }
            if (!respuesta.ok) return null;
            return await respuesta.json();
        } catch {
            if (intento === intentos) return null;
            await dormir(500 * intento);
        } finally {
            clearTimeout(temporizador);
        }
    }
    return null;
}

function grupos(lista, tamano) {
    const resultado = [];
    for (let i = 0; i < lista.length; i += tamano) resultado.push(lista.slice(i, i + tamano));
    return resultado;
}

async function buscarIdiomas(libros) {
    const encontrados = new Map();
    for (const [indice, grupo] of grupos(libros, 25).entries()) {
        const consulta = grupo.map((libro) => `isbn:${libro.isbn}`).join(' OR ');
        const url = `${OPEN_LIBRARY_SEARCH}?q=${encodeURIComponent(consulta)}&fields=isbn,language&limit=100`;
        const datos = await pedirJson(url);
        if (datos && Array.isArray(datos.docs)) {
            const isbns = new Set(grupo.map((libro) => libro.isbn));
            for (const documento of datos.docs) {
                const valor = extraerDeBusqueda(documento).idioma;
                if (!valor) continue;
                for (const isbn of Array.isArray(documento.isbn) ? documento.isbn : []) {
                    if (isbns.has(isbn)) encontrados.set(isbn, valor);
                }
            }
        }
        console.log(`busqueda ${indice + 1}: ${encontrados.size} idiomas verificados`);
        await dormir(200);
    }
    return encontrados;
}

function obtenerOpciones(argv) {
    const opciones = { limite: null, desde: 0, soloIdioma: false, concurrencia: 5, pausa: 120, salida: SALIDA };
    for (let i = 0; i < argv.length; i += 1) {
        const bandera = argv[i];
        if (bandera === '--limite') opciones.limite = Number(argv[i += 1]);
        else if (bandera === '--desde') opciones.desde = Number(argv[i += 1]);
        else if (bandera === '--solo-idioma') opciones.soloIdioma = true;
        else if (bandera === '--concurrencia') opciones.concurrencia = Number(argv[i += 1]);
        else if (bandera === '--pausa') opciones.pausa = Number(argv[i += 1]);
        else if (bandera === '--salida') opciones.salida = path.resolve(argv[i += 1]);
        else throw new Error(`Argumento desconocido: ${bandera}`);
    }
    if (opciones.limite != null && (!Number.isInteger(opciones.limite) || opciones.limite < 1)) throw new Error('--limite debe ser un entero positivo');
    if (!Number.isInteger(opciones.desde) || opciones.desde < 0) throw new Error('--desde debe ser un entero positivo');
    if (!Number.isInteger(opciones.concurrencia) || opciones.concurrencia < 1 || opciones.concurrencia > 10) throw new Error('--concurrencia debe estar entre 1 y 10');
    if (!Number.isInteger(opciones.pausa) || opciones.pausa < 0) throw new Error('--pausa debe ser un entero positivo');
    return opciones;
}

function escribir(salida, registros) {
    fs.writeFileSync(salida, `${JSON.stringify({ generado: new Date().toISOString(), total: registros.length, registros }, null, 2)}\n`);
}

function resumen(registros) {
    return CAMPOS.map((campo) => `${campo}=${registros.filter((libro) => libro[campo] != null).length}`).join(' ');
}

async function main() {
    const opciones = obtenerOpciones(process.argv.slice(2));

    if (opciones.soloIdioma) {
        const existente = JSON.parse(fs.readFileSync(opciones.salida, 'utf8'));
        const registros = Array.isArray(existente.registros) ? existente.registros : [];
        const pendientes = registros.filter((libro) => !libro.idioma);
        const idiomas = await buscarIdiomas(pendientes);
        let cambios = 0;
        for (const libro of registros) {
            const valor = idiomas.get(libro.isbn);
            if (!valor || libro.idioma) continue;
            libro.idioma = valor;
            libro.fuentes_campo = { ...(libro.fuentes_campo || {}), idioma: 'openlibrary_obra' };
            libro.fuentes = [...new Set([...(Array.isArray(libro.fuentes) ? libro.fuentes : []), 'openlibrary_obra'])];
            cambios += 1;
        }
        escribir(opciones.salida, registros);
        console.log(`idioma ${cambios}/${pendientes.length}: ${resumen(registros)}`);
        return;
    }

    const semilla = JSON.parse(fs.readFileSync(ENTRADA, 'utf8'));
    const fin = opciones.limite ? Math.min(opciones.limite, semilla.length) : semilla.length;
    if (opciones.desde >= fin) throw new Error('--desde debe ser menor que el total a procesar');

    let previos = [];
    if (opciones.desde > 0) {
        const existente = JSON.parse(fs.readFileSync(opciones.salida, 'utf8'));
        previos = Array.isArray(existente.registros) ? existente.registros : [];
        if (previos.length < opciones.desde) throw new Error(`El archivo de salida solo tiene ${previos.length} registros; se necesitan ${opciones.desde}`);
        previos = previos.slice(0, opciones.desde);
    }

    const seleccion = semilla.slice(opciones.desde, fin);
    const bulk = new Map();

    for (const [indice, grupo] of grupos(seleccion, 40).entries()) {
        const bibkeys = grupo.map((libro) => `ISBN:${libro.isbn}`).join(',');
        const url = `${OPEN_LIBRARY_BULK}?bibkeys=${encodeURIComponent(bibkeys)}&jscmd=data&format=json`;
        const datos = await pedirJson(url);
        if (datos) {
            for (const [clave, valor] of Object.entries(datos)) {
                const isbn = clave.replace(/^ISBN:/, '');
                bulk.set(isbn, extraerDeBulk(valor));
            }
        }
        console.log(`bulk ${indice + 1}: ${bulk.size} ISBN con datos`);
        await dormir(200);
    }

    const idiomas = await buscarIdiomas(seleccion);
    const resultados = new Array(seleccion.length);
    const guardar = () => escribir(opciones.salida, [...previos, ...resultados.filter(Boolean)]);
    let cursor = 0;
    async function trabajador() {
        while (cursor < seleccion.length) {
            const indice = cursor;
            cursor += 1;
            const libro = seleccion[indice];
            const individual = await pedirJson(`${OPEN_LIBRARY}/${encodeURIComponent(libro.isbn)}.json`);
            resultados[indice] = combinar(libro, bulk.get(libro.isbn), individual, idiomas.get(libro.isbn));
            const completados = resultados.filter(Boolean).length;
            if (completados % 100 === 0) {
                guardar();
                console.log(`individual ${opciones.desde + completados}/${fin}: ${resumen([...previos, ...resultados.filter(Boolean)])}`);
            }
            await dormir(opciones.pausa);
        }
    }

    await Promise.all(Array.from({ length: opciones.concurrencia }, trabajador));
    guardar();
    const todos = [...previos, ...resultados.filter(Boolean)];
    console.log(`listo ${todos.length}: ${resumen(todos)}`);
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
}

module.exports = { CAMPOS, anio, combinar, entero, extraerDeBulk, extraerDeBusqueda, extraerDeIndividual, formato, idioma, texto };
