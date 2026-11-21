const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { subirImagen } = require('../src/integrations/cloudinary');

const RAIZ = path.join(__dirname, '..');
const AMPLIADO = path.join(RAIZ, 'database', 'seeds', 'libros-catalogo-ampliado.json');
const BASE = path.join(RAIZ, 'database', 'seeds', 'libros-catalogo.json');
const SALIDA = path.join(RAIZ, 'database', 'seeds', 'libros-reales-catalogo.json');

const OPEN_LIBRARY = 'https://openlibrary.org/search.json';
const PORTADA_OPEN_LIBRARY = (id) => `https://covers.openlibrary.org/b/id/${id}-L.jpg`;
const REINTENTOS = 3;
const CONCURRENCIA = 8;
const TAMANO_LOTE = 200;

const TEMAS = [
    { categoria: 'Animación', subjects: ['Animation', 'Animated films', 'Cartooning'] },
    { categoria: 'Arte', subjects: ['Art', 'Art history', 'Painting'] },
    { categoria: 'Biografía', subjects: ['Biography', 'Biographies', 'Autobiography'] },
    { categoria: 'Ciencia ficción', subjects: ['Science fiction'] },
    { categoria: 'Ciencias', subjects: ['Science', 'Popular science', 'Physics'] },
    { categoria: 'Cuento', subjects: ['Short stories', 'Fiction, short stories'] },
    { categoria: 'Cómic', subjects: ['Comic books', 'Graphic novels'] },
    { categoria: 'Cómic y Manga', subjects: ['Manga', 'Comics and graphic novels'] },
    { categoria: 'Ensayo', subjects: ['Essays'] },
    { categoria: 'Fantasía', subjects: ['Fantasy'] },
    { categoria: 'Ficción', subjects: ['Fiction'] },
    { categoria: 'Historia', subjects: ['History'] },
    { categoria: 'Historietas', subjects: ['Comic books, strips, etc', 'Graphic novels'] },
    { categoria: 'Infantil', subjects: ["Children's literature", 'Juvenile fiction'] },
    { categoria: 'Juvenil', subjects: ['Young adult fiction', 'Teenagers, fiction'] },
    { categoria: 'Misterio / Suspenso', subjects: ['Mystery and detective stories', 'Suspense fiction', 'Thrillers'] },
    { categoria: 'Conocimiento y Cultura', subjects: ['Nonfiction'] },
    { categoria: 'Novela', subjects: ['Novels', 'Fiction'] },
    { categoria: 'Poesía', subjects: ['Poetry'] },
    { categoria: 'Romance', subjects: ['Romance fiction', 'Love stories'] },
    { categoria: 'Terror', subjects: ['Horror', 'Gothic fiction'] }
];

const TRADUCCIONES_TITULO = {
    'Naruto 01': 'Naruto 01',
    'ONE PIECE 1': 'One Piece 1',
    '美少女戦士セーラームーン 1 [Acts 1-5]': 'Sailor Moon 1 [Actos 1-5]',
    'BLEACH―ブリーチ― 1': 'Bleach 1',
    'HUNTER×HUNTER 1': 'Hunter × Hunter 1',
    'ONE PIECE 2': 'One Piece 2',
    'ONE PIECE 4': 'One Piece 4',
    'らんま½ 33': 'Ranma ½ 33',
    'ONE PIECE 3': 'One Piece 3',
    '美少女戦士セーラームーン 2 [Acts 7-11]': 'Sailor Moon 2 [Actos 7-11]',
    'DEATH NOTE アナザーノ': 'Death Note: Another Note',
    'らんま½ 31': 'Ranma ½ 31',
    '黒執事 IV': 'Black Butler IV',
    'ONE PIECE 5': 'One Piece 5',
    'ONE PIECE 14': 'One Piece 14',
    'Berserk Deluxe Volume 1': 'Berserk: Edición Deluxe 1',
    '美少女戦士セーラームーン 4 [Acts 17-21]': 'Sailor Moon 4 [Actos 17-21]',
    '美少女戦士セーラームーン 18': 'Sailor Moon 18',
    '美少女戦士セーラームーン 7 [Acts 31-35]': 'Sailor Moon 7 [Actos 31-35]',
    '君の膵臓をたべたい (light novel)': 'Quiero comerte el páncreas (novela ligera)',
    '美少女戦士セーラームーン 1 [Acts 1-6]': 'Sailor Moon 1 [Actos 1-6]',
    'JOJONIUM 17': 'JoJonium 17',
    'とんがり帽子のアトリエ 1 (Tongari Bōshi no Atelier 1)': 'El taller del sombrero puntiagudo 1',
    '美少女戦士セーラームーン 14 [Acts 39-40]': 'Sailor Moon 14 [Actos 39-40]',
    'ONE PIECE 13': 'One Piece 13',
    'ONE PIECE 18': 'One Piece 18',
    'HUNTER×HUNTER 2': 'Hunter × Hunter 2',
    'ONE PIECE 24': 'One Piece 24',
    'Bleach―ブリーチ― 15': 'Bleach 15',
    'ONE PIECE 16': 'One Piece 16',
    '美少女戦士セーラームーン 3 [Acts 10-12]': 'Sailor Moon 3 [Actos 10-12]',
    '美少女戦士セーラームーン 10 [Acts 45-49]': 'Sailor Moon 10 [Actos 45-49]',
    'ベルセルク 13': 'Berserk 13',
    'ONE PIECE 100': 'One Piece 100',
    'ONE PIECE 37': 'One Piece 37',
    'ONE PIECE 23': 'One Piece 23',
    '美少女戦士セーラームーン 8 [Acts 25-28]': 'Sailor Moon 8 [Actos 25-28]',
    "チーズスイートホーム [Chīzu suīto hōmu/Chi's Sweet Home] (1)": 'La dulce casa de Chi 1',
    'ONE PIECE 38': 'One Piece 38',
    'ポケットモンスターSPECIAL #1': 'Pokémon Special 1',
    'ベルセルク 11': 'Berserk 11',
    'ベルセルク 10': 'Berserk 10',
    'The Art of War': 'El arte de la guerra',
    'Tao te Ching': 'Tao Te Ching',
    "Death's End (The Three-Body Problem Series Book 3)": 'El final de la muerte (El problema de los tres cuerpos 3)',
    'The Dark Forest (The Three-Body Problem Series Book 2)': 'El bosque oscuro (El problema de los tres cuerpos 2)',
    'Nana 1': 'Nana 1',
    'NARUTO秘伝・者の書キャラクタ−オフィシャルデ−タBOOK': 'Naruto: Libro de datos oficial de personajes',
    'BLEACHイラスト集―All Colour But The Black': 'Bleach: Ilustraciones — All Colour But The Black',
    '荒川弘イラスト集 FULLMETAL ALCHEMIST 2': 'Ilustraciones de Hiromu Arakawa: Fullmetal Alchemist 2',
    'ありす19th 1': 'Alice 19th 1',
    'ポケットモンスターSPECIAL 42': 'Pokémon Special 42',
    '東京喰種 10': 'Tokyo Ghoul 10',
    'Πολιτικά (Politiká)': 'Política (Politiká)',
    'Roadside Picnic': 'Picnic junto al camino'
};

const TRADUCCIONES_AUTOR = {
    '岸本斉史': 'Masashi Kishimoto',
    '尾田栄一郎': 'Eiichiro Oda',
    '武内 直子': 'Naoko Takeuchi',
    '冨樫義博': 'Yoshihiro Togashi',
    '高橋留美子': 'Rumiko Takahashi',
    '西尾維新': 'Nisio Isin',
    '三浦建太郎': 'Kentaro Miura',
    '住野よる': 'Yoru Sumino',
    '荒木飛呂彦': 'Hirohiko Araki',
    '白浜鴎 [しらはまかもめ ; Kamome Shirahama]': 'Kamome Shirahama',
    '日下秀憲': 'Hidenori Kusaka',
    '孙武 (Sun Tzu)': 'Sun Tzu',
    '老子': 'Lao-Tsé',
    '刘慈欣': 'Liu Cixin',
    '矢沢あい': 'Ai Yazawa',
    '荒川弘': 'Hiromu Arakawa',
    'Аркадий Стругацкий': 'Arkadi Strugatski',
    'Aristotle': 'Aristóteles'
};

function reemplazarTexto(valor, original, nuevo) {
    return String(valor || '').split(original).join(nuevo);
}

function tieneCjk(valor) {
    return [...String(valor || '')].some((caracter) => {
        const punto = caracter.codePointAt(0);
        return (punto >= 0x3000 && punto <= 0x30ff) || (punto >= 0x3400 && punto <= 0x9fff) || (punto >= 0xf900 && punto <= 0xfaff);
    });
}

function traducirRegistro(registro) {
    const tituloOriginal = registro.titulo;
    const autorOriginal = registro.autor;
    const titulo = TRADUCCIONES_TITULO[tituloOriginal] || tituloOriginal;
    const autor = TRADUCCIONES_AUTOR[autorOriginal] || autorOriginal;
    if (titulo !== tituloOriginal) {
        registro.descripcion = reemplazarTexto(registro.descripcion, tituloOriginal, titulo);
        registro.titulo = titulo;
    }
    if (autor !== autorOriginal) {
        registro.descripcion = reemplazarTexto(registro.descripcion, autorOriginal, autor);
        registro.autor = autor;
        const { nombre, apellido } = dividirAutor(autor);
        registro.nombre = nombre;
        registro.apellido = apellido;
    }
    return registro;
}

function validarSinCjk(registros) {
    const pendientes = registros.filter((registro) =>
        ['titulo', 'autor', 'nombre', 'apellido', 'descripcion'].some((campo) => tieneCjk(registro[campo]))
    );
    if (pendientes.length) {
        throw new Error(`Quedan ${pendientes.length} registro(s) con caracteres CJK sin traducir`);
    }
}

function leerJson(ruta) {
    const datos = JSON.parse(fs.readFileSync(ruta, 'utf8'));
    return Array.isArray(datos) ? datos : datos.libros || datos.registros || [];
}

function limpiar(valor) {
    return String(valor ?? '')
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizar(valor) {
    return limpiar(valor)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function claveAutor(valor) {
    return limpiar(valor)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[\p{P}\p{S}]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function dormir(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function convertirIsbn13(valor) {
    const bruto = String(valor ?? '').replace(/[^0-9X]/gi, '').toUpperCase();
    if (bruto.length !== 10 && bruto.length !== 13) return null;
    const base = bruto.length === 10 ? `978${bruto.slice(0, 9)}` : bruto;
    if (!/^\d{13}$/.test(base)) return null;
    let suma = 0;
    for (let i = 0; i < 12; i++) suma += Number(base[i]) * (i % 2 === 0 ? 1 : 3);
    const digito = (10 - (suma % 10)) % 10;
    return digito === Number(base[12]) ? base : null;
}

function dividirAutor(autor) {
    const partes = limpiar(autor).split(' ').filter(Boolean);
    if (partes.length < 2) return { nombre: (partes[0] || 'Autor').slice(0, 80), apellido: '-' };
    return {
        nombre: partes.slice(0, -1).join(' ').slice(0, 80),
        apellido: partes[partes.length - 1].slice(0, 80)
    };
}

function parsearArgumentos(argv) {
    const opciones = { modo: null, forzar: false, limite: null, confirmar: false, dryRun: false };
    const modo = argv[2];
    if (modo !== 'generar' && modo !== 'aplicar') throw new Error('Uso: node reemplazarCatalogoLibrosReales.js generar|aplicar [opciones]');
    opciones.modo = modo;
    for (let i = 3; i < argv.length; i++) {
        switch (argv[i]) {
            case '--forzar':
                opciones.forzar = true;
                break;
            case '--confirmar':
            case '--yes':
            case '-y':
                opciones.confirmar = true;
                break;
            case '--dry-run':
                opciones.dryRun = true;
                break;
            case '--limite':
                opciones.limite = Number(argv[++i]);
                break;
            default:
                throw new Error(`Argumento desconocido: ${argv[i]}`);
        }
    }
    if (opciones.limite != null && (!Number.isInteger(opciones.limite) || opciones.limite < 1)) {
        throw new Error('--limite debe ser un entero positivo');
    }
    return opciones;
}

function guardar(registros) {
    const traducidos = registros.map(traducirRegistro);
    validarSinCjk(traducidos);
    const contenido = {
        generado: new Date().toISOString(),
        total: traducidos.length,
        registros: traducidos
    };
    fs.writeFileSync(SALIDA, `${JSON.stringify(contenido, null, 2)}\n`);
}

function candidatoDe(doc, categoria) {
    if (!doc || !doc.cover_i || !Array.isArray(doc.isbn) || doc.isbn.length === 0) return null;
    const titulo = limpiar(doc.title);
    const autor = limpiar(doc.author_name && doc.author_name[0]) || 'Autor desconocido';
    const isbn = doc.isbn.map(convertirIsbn13).find(Boolean);
    if (!titulo || !isbn || normalizar(titulo).length < 2) return null;
    const textoInicial = doc.first_sentence && typeof doc.first_sentence === 'object' ? doc.first_sentence.value : doc.first_sentence;
    const descripcion =
        limpiar(textoInicial).slice(0, 450) || `${titulo} de ${autor}. Obra registrada en el catálogo de MATIDANA.`;
    const { nombre, apellido } = dividirAutor(autor);
    return {
        titulo: titulo.slice(0, 200),
        autor: autor.slice(0, 160),
        nombre,
        apellido,
        isbn,
        categoria,
        descripcion,
        anio: doc.first_publish_year || null,
        coverId: doc.cover_i,
        fuente: 'Open Library'
    };
}

async function buscarOpenLibrary(subject, offset, idioma) {
    const consulta = idioma ? `subject:"${subject}" language:${idioma}` : `subject:"${subject}"`;
    const url = `${OPEN_LIBRARY}?q=${encodeURIComponent(consulta)}&limit=100&offset=${offset}&fields=key,title,author_name,isbn,cover_i,first_publish_year,first_sentence`;
    for (let intento = 1; intento <= REINTENTOS; intento++) {
        try {
            const respuesta = await fetch(url, { headers: { 'User-Agent': 'MATIDANA-Catalogo/1.0' } });
            if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
            const datos = await respuesta.json();
            return Array.isArray(datos.docs) ? datos.docs : [];
        } catch (error) {
            if (intento === REINTENTOS) throw new Error(`Open Library ${consulta} offset ${offset}: ${error.message}`);
            await dormir(intentos * 800);
        }
    }
    return [];
}

async function recolectar(categoria, cantidad, isbnUsados, obraUsadas) {
    const tema = TEMAS.find((item) => item.categoria === categoria);
    if (!tema) throw new Error(`Sin temas configurados para ${categoria}`);

    const seleccionados = [];
    for (const subject of tema.subjects) {
        for (const idioma of ['spa', null]) {
            for (let offset = 0; offset <= 900 && seleccionados.length < cantidad; offset += 100) {
                const docs = await buscarOpenLibrary(subject, offset, idioma);
                if (docs.length === 0) break;
                for (const doc of docs) {
                    const candidato = candidatoDe(doc, categoria);
                    if (!candidato) continue;
                    const claveObra = `${normalizar(candidato.titulo)}|${normalizar(candidato.autor)}`;
                    if (isbnUsados.has(candidato.isbn) || obraUsadas.has(claveObra)) continue;
                    isbnUsados.add(candidato.isbn);
                    obraUsadas.add(claveObra);
                    seleccionados.push(candidato);
                    if (seleccionados.length === cantidad) break;
                }
                await dormir(250);
            }
            if (seleccionados.length === cantidad) break;
        }
        if (seleccionados.length === cantidad) break;
    }

    if (seleccionados.length < cantidad) {
        throw new Error(`${categoria}: solo ${seleccionados.length}/${cantidad} libros con portada y ISBN`);
    }
    return seleccionados;
}

async function descargarYSubir(candidato) {
    const url = PORTADA_OPEN_LIBRARY(candidato.coverId);
    for (let intento = 1; intento <= REINTENTOS; intento++) {
        try {
            const respuesta = await fetch(url, { headers: { 'User-Agent': 'MATIDANA-Catalogo/1.0' } });
            if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
            const tipo = respuesta.headers.get('content-type') || '';
            if (!tipo.includes('image/')) throw new Error(`Content-Type ${tipo}`);
            const buffer = Buffer.from(await respuesta.arrayBuffer());
            if (buffer.length < 500) throw new Error('Imagen demasiado pequeña');
            const subida = await subirImagen(buffer, {
                publicId: `portadas-libros-reales/${candidato.isbn}`,
                nombre: `${candidato.isbn}.jpg`,
                mimeType: 'image/jpeg'
            });
            return { ...candidato, portada: subida.url, fuentePortada: url };
        } catch (error) {
            if (intento === REINTENTOS) throw new Error(`${candidato.isbn}: ${error.message}`);
            await dormir(intentos * 1000);
        }
    }
    throw new Error(`No se pudo subir ${candidato.isbn}`);
}

async function generar(opciones) {
    const ampliado = leerJson(AMPLIADO);
    const base = leerJson(BASE);

    const isbnUsados = new Set();
    const obraUsadas = new Set();
    for (const libro of [...base, ...ampliado]) {
        const isbn = convertirIsbn13(libro.isbn);
        if (isbn) isbnUsados.add(isbn);
        obraUsadas.add(`${normalizar(libro.titulo)}|${normalizar(libro.autor || libro.autorNombre || '')}`);
    }

    const registros = [];
    if (fs.existsSync(SALIDA) && !opciones.forzar) {
        const anterior = JSON.parse(fs.readFileSync(SALIDA, 'utf8'));
        for (const anteriorRegistro of anterior.registros || []) {
            const registro = traducirRegistro(anteriorRegistro);
            registros.push(registro);
            isbnUsados.add(registro.isbn);
            obraUsadas.add(`${normalizar(registro.titulo)}|${claveAutor(registro.autor)}`);
        }
    }

    const hechos = new Set(registros.map((registro) => registro.isbn_original));
    const pendientesPorCategoria = new Map();
    for (const libro of ampliado) {
        if (hechos.has(libro.isbn)) continue;
        if (!pendientesPorCategoria.has(libro.categoria)) pendientesPorCategoria.set(libro.categoria, []);
        pendientesPorCategoria.get(libro.categoria).push(libro);
    }

    const pendientes = [];
    for (const [categoria, libros] of pendientesPorCategoria) {
        for (const libro of libros) pendientes.push({ isbn_original: libro.isbn, categoria });
    }
    const objetivo = opciones.limite ? pendientes.slice(0, opciones.limite) : pendientes;

    console.log(`Registros ya generados: ${registros.length}`);
    console.log(`Registros pendientes: ${objetivo.length}`);

    const asignados = [];
    for (const [categoria, libros] of pendientesPorCategoria) {
        const cantidad = libros.filter((libro) => objetivo.some((item) => item.isbn_original === libro.isbn)).length;
        if (cantidad === 0) continue;
        const candidatos = await recolectar(categoria, cantidad, isbnUsados, obraUsadas);
        const librosCategoria = libros.filter((libro) => objetivo.some((item) => item.isbn_original === libro.isbn));
        librosCategoria.forEach((libro, indice) => {
            asignados.push({ isbn_original: libro.isbn, ...candidatos[indice] });
        });
        console.log(`Metadatos ${categoria}: ${cantidad}`);
    }

    for (let inicio = 0; inicio < asignados.length; inicio += CONCURRENCIA) {
        const grupo = asignados.slice(inicio, inicio + CONCURRENCIA);
        const subidos = await Promise.all(grupo.map((registro) => descargarYSubir(registro)));
        registros.push(...subidos);
        guardar(registros);
        const procesados = Math.min(inicio + CONCURRENCIA, asignados.length);
        if (procesados % 100 === 0 || procesados === asignados.length) console.log(`Portadas ${procesados}/${asignados.length}`);
    }

    console.log(`Listo: ${registros.length} registro(s) en ${SALIDA}`);
}

async function aplicar(opciones) {
    if (!fs.existsSync(SALIDA)) throw new Error(`No existe ${SALIDA}; ejecuta primero el modo generar`);
    const contenido = JSON.parse(fs.readFileSync(SALIDA, 'utf8'));
    const registros = (contenido.registros || []).map(traducirRegistro);
    validarSinCjk(registros);
    if (registros.length !== 2019) throw new Error(`Se esperaban 2019 registros reales; hay ${registros.length}`);

    const { Pool } = require('pg');
    const databaseUrl = process.env.DATABASE_URL;
    const pool = new Pool(
        databaseUrl
            ? { connectionString: databaseUrl, ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }, max: 5 }
            : { connectionString: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`, max: 5 }
    );

    try {
        const originales = registros.map((registro) => registro.isbn_original);
        const reales = registros.map((registro) => registro.isbn);
        const actuales = (await pool.query('SELECT isbn FROM libros WHERE isbn = ANY($1::varchar[]) OR isbn = ANY($2::varchar[])', [originales, reales])).rows;
        const presentes = new Set(actuales.map((fila) => fila.isbn));
        const pendientes = registros.filter((registro) => presentes.has(registro.isbn_original) || presentes.has(registro.isbn));
        const yaAplicados = registros.length - pendientes.length;

        const categorias = (await pool.query('SELECT id_categoria, nombre FROM categorias')).rows;
        const mapaCategorias = new Map(categorias.map((fila) => [normalizar(fila.nombre), fila.id_categoria]));
        const autoresExistentes = (await pool.query('SELECT id_autor, nombre, apellido FROM autores')).rows;
        const mapaAutores = new Map(autoresExistentes.map((fila) => [claveAutor(`${fila.nombre} ${fila.apellido}`), fila.id_autor]));

        console.log(`Registros ya aplicados: ${yaAplicados}`);
        console.log(`Registros a aplicar: ${pendientes.length}`);
        if (opciones.dryRun || !opciones.confirmar) {
            console.log(opciones.dryRun ? 'DRY-RUN: sin cambios.' : 'Usa --confirmar para aplicar los cambios.');
            return;
        }

        const nombresNuevos = new Map();
        for (const registro of pendientes) {
            const clave = claveAutor(registro.autor);
            if (!mapaAutores.has(clave) && !nombresNuevos.has(clave)) {
                const { nombre, apellido } = dividirAutor(registro.autor);
                nombresNuevos.set(clave, { nombre, apellido });
            }
        }
        const autoresNuevos = [...nombresNuevos.entries()].map(([clave, autor]) => ({ clave, ...autor }));
        for (let inicio = 0; inicio < autoresNuevos.length; inicio += TAMANO_LOTE) {
            const lote = autoresNuevos.slice(inicio, inicio + TAMANO_LOTE);
            const respuesta = await pool.query(
                `INSERT INTO autores (nombre, apellido, estado)
                 SELECT u.nombre, u.apellido, 1
                 FROM unnest($1::varchar[], $2::varchar[]) AS u(nombre, apellido)
                 RETURNING id_autor, nombre, apellido`,
                [lote.map((autor) => autor.nombre), lote.map((autor) => autor.apellido)]
            );
            for (const fila of respuesta.rows) {
                mapaAutores.set(claveAutor(`${fila.nombre} ${fila.apellido}`), fila.id_autor);
            }
        }
        console.log(`Autores creados: ${nombresNuevos.size}`);

        const filas = pendientes.map((registro) => ({
            isbn_original: registro.isbn_original,
            isbn: registro.isbn,
            titulo: registro.titulo,
            descripcion: registro.descripcion,
            portada: registro.portada,
            id_autor: mapaAutores.get(claveAutor(registro.autor)),
            id_categoria: mapaCategorias.get(normalizar(registro.categoria))
        }));
        const invalidas = filas.filter((fila) => !fila.id_autor || !fila.id_categoria);
        if (invalidas.length > 0) throw new Error(`${invalidas.length} fila(s) sin autor o categoría válida`);

        let aplicadas = 0;
        for (let inicio = 0; inicio < filas.length; inicio += TAMANO_LOTE) {
            const lote = filas.slice(inicio, inicio + TAMANO_LOTE);
            await pool.query(
                `UPDATE libros l
                 SET isbn = u.isbn,
                     titulo = u.titulo,
                     descripcion = u.descripcion,
                     portada = u.portada,
                     id_autor = u.id_autor,
                     id_categoria = u.id_categoria
                 FROM unnest(
                     $1::varchar[], $2::varchar[], $3::varchar[], $4::text[], $5::varchar[], $6::int[], $7::int[]
                 ) AS u(isbn_original, isbn, titulo, descripcion, portada, id_autor, id_categoria)
                 WHERE l.isbn = u.isbn_original OR l.isbn = u.isbn`,
                [
                    lote.map((fila) => fila.isbn_original),
                    lote.map((fila) => fila.isbn),
                    lote.map((fila) => fila.titulo),
                    lote.map((fila) => fila.descripcion),
                    lote.map((fila) => fila.portada),
                    lote.map((fila) => fila.id_autor),
                    lote.map((fila) => fila.id_categoria)
                ]
            );
            aplicadas += lote.length;
        }

        const resumen = (
            await pool.query(
                `SELECT COUNT(*)::int AS total,
                        COUNT(*) FILTER (WHERE isbn LIKE '6000%')::int AS sinteticos,
                        COUNT(*) FILTER (WHERE portada IS NULL OR btrim(portada) = '')::int AS sin_portada
                 FROM libros WHERE estado = 1`
            )
        ).rows[0];
        console.log(`Libros actualizados: ${aplicadas}`);
        console.log('Resumen:', JSON.stringify(resumen));
    } finally {
        await pool.end();
    }
}

async function main() {
    const opciones = parsearArgumentos(process.argv);
    if (opciones.modo === 'generar') await generar(opciones);
    else await aplicar(opciones);
}

if (require.main === module) {
    main().catch((error) => {
        console.error('Error:', error.message);
        process.exitCode = 1;
    });
}

module.exports = { traducirRegistro, validarSinCjk, tieneCjk };
