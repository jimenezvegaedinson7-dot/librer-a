const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = require('../src/config/database');
const { subirImagen } = require('../src/integrations/cloudinary');
const { portadas } = require('../src/config/portadasCatalogo.json');

const CONCURRENCIA = 6;
const TAMANO_LOTE = 100;
const PREFIJO_PUBLIC_ID = 'portadas-libros';

const COLORES = [
    ['#14213d', '#457b9d', '#fca311'],
    ['#1b263b', '#5e60ce', '#ffd166'],
    ['#2d132c', '#801336', '#ee4540'],
    ['#0b3d2e', '#2a9d8f', '#e9c46a'],
    ['#3d2c5a', '#7b2cbf', '#f72585'],
    ['#3f2b1d', '#a68a64', '#e9c46a'],
    ['#102a43', '#486581', '#f4a261'],
    ['#1d2b64', '#f8cdda', '#ffb703'],
    ['#2b2d42', '#8d99ae', '#ef233c'],
    ['#264653', '#2a9d8f', '#e76f51']
];

function parsearArgumentos(argv) {
    const opciones = { dryRun: false, confirmar: false, limite: null };
    for (let i = 2; i < argv.length; i++) {
        switch (argv[i]) {
            case '--dry-run':
                opciones.dryRun = true;
                break;
            case '--confirmar':
            case '--yes':
            case '-y':
                opciones.confirmar = true;
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

function escaparXml(valor) {
    const mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
    return String(valor ?? '').replace(/[&<>"']/g, (caracter) => mapa[caracter]);
}

function colorPara(texto) {
    const valor = String(texto || '');
    let hash = 0;
    for (const caracter of valor) hash = (hash * 31 + caracter.charCodeAt(0)) >>> 0;
    return COLORES[hash % COLORES.length];
}

function limpiarTitulo(titulo) {
    return String(titulo || '').replace(/\s*\([^()]*\)\s*$/, '').trim();
}

function dividirLineas(texto, maximo) {
    const palabras = String(texto || '').trim().split(/\s+/).filter(Boolean);
    const lineas = [];
    let actual = '';
    for (const palabra of palabras) {
        const candidata = actual ? `${actual} ${palabra}` : palabra;
        if (candidata.length <= maximo) {
            actual = candidata;
        } else {
            if (actual) lineas.push(actual);
            actual = palabra;
        }
    }
    if (actual) lineas.push(actual);
    return lineas;
}

function generarPortada(libro) {
    const [fondo, acento, brillo] = colorPara(`${libro.categoria}|${libro.titulo}`);
    const autor = `${libro.nombre || ''} ${libro.apellido || ''}`.trim() || 'Autor desconocido';
    const categoria = libro.categoria || 'Catálogo';
    const titulo = dividirLineas(limpiarTitulo(libro.titulo), 22).slice(0, 5);
    const autorLineas = dividirLineas(autor, 26).slice(0, 2);
    const tituloSvg = titulo.map((linea, indice) => `<tspan x="40" y="${205 + indice * 43}">${escaparXml(linea)}</tspan>`).join('');
    const autorSvg = autorLineas.map((linea, indice) => `<tspan x="40" y="${445 + indice * 26}">${escaparXml(linea)}</tspan>`).join('');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
  <defs>
    <linearGradient id="fondo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${fondo}"/>
      <stop offset="1" stop-color="${acento}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="600" fill="url(#fondo)"/>
  <circle cx="340" cy="90" r="105" fill="${brillo}" opacity="0.18"/>
  <circle cx="60" cy="560" r="120" fill="${brillo}" opacity="0.12"/>
  <rect x="24" y="24" width="352" height="552" fill="none" stroke="${brillo}" stroke-opacity="0.55" stroke-width="2"/>
  <text x="40" y="72" fill="${brillo}" font-family="Arial, sans-serif" font-size="15" letter-spacing="5">MATIDANA</text>
  <line x1="40" y1="92" x2="360" y2="92" stroke="${brillo}" stroke-opacity="0.7" stroke-width="2"/>
  <text x="40" y="138" fill="${brillo}" font-family="Arial, sans-serif" font-size="14" letter-spacing="2">${escaparXml(categoria.toUpperCase())}</text>
  <text fill="#ffffff" font-family="Georgia, serif" font-size="34" font-weight="bold">${tituloSvg}</text>
  <line x1="40" y1="410" x2="150" y2="410" stroke="${brillo}" stroke-width="4"/>
  <text fill="#ffffff" font-family="Arial, sans-serif" font-size="18">${autorSvg}</text>
  <text x="40" y="548" fill="#ffffff" fill-opacity="0.75" font-family="Arial, sans-serif" font-size="12" letter-spacing="1">ISBN ${escaparXml(libro.isbn)}</text>
</svg>`;

    return Buffer.from(svg, 'utf8');
}

async function subirConReintento(buffer, libro) {
    let ultimoError = null;
    for (let intento = 1; intento <= 3; intento++) {
        try {
            const isbn = String(libro.isbn).replace(/[^0-9]/g, '');
            const resultado = await subirImagen(buffer, {
                publicId: `${PREFIJO_PUBLIC_ID}/${isbn}`,
                nombre: `${isbn}.svg`,
                mimeType: 'image/svg+xml'
            });
            return { id_libro: libro.id_libro, isbn, url: resultado.url };
        } catch (error) {
            ultimoError = error;
            if (intento < 3) await new Promise((resolve) => setTimeout(resolve, intento * 1200));
        }
    }
    throw new Error(`ISBN ${libro.isbn}: ${ultimoError?.message || 'error al subir'}`);
}

async function main() {
    const opciones = parsearArgumentos(process.argv);

    const [filas] = await pool.query(
        `SELECT l.id_libro, l.isbn, l.titulo, a.nombre, a.apellido, c.nombre AS categoria
         FROM libros l
         JOIN autores a ON a.id_autor = l.id_autor
         JOIN categorias c ON c.id_categoria = l.id_categoria
         WHERE l.estado = 1 AND (l.portada IS NULL OR btrim(l.portada) = '')
         ORDER BY l.id_libro`
    );

    const candidatas = filas.filter((libro) => !Object.hasOwn(portadas, String(libro.isbn || '').replace(/[^0-9]/g, '')));
    const objetivo = opciones.limite ? candidatas.slice(0, opciones.limite) : candidatas;
    console.log(`\n🎨 Portadas sin registrar ni respaldo: ${candidatas.length}`);
    console.log(`🚀 Portadas a procesar: ${objetivo.length}`);
    if (opciones.dryRun) {
        console.log('\n🐞 DRY-RUN: no se subió nada.');
        return;
    }
    if (!opciones.confirmar) {
        console.log('\n⚠️  Usa --confirmar para subir y registrar las portadas.');
        return;
    }

    const lote = [];
    let procesadas = 0;
    for (let inicio = 0; inicio < objetivo.length; inicio += CONCURRENCIA) {
        const grupo = objetivo.slice(inicio, inicio + CONCURRENCIA);
        const resultados = await Promise.all(grupo.map(async (libro) => subirConReintento(generarPortada(libro), libro)));
        lote.push(...resultados);
        procesadas += resultados.length;

        if (lote.length >= TAMANO_LOTE || inicio + CONCURRENCIA >= objetivo.length) {
            await pool.query(
                `UPDATE libros l SET portada = u.url
                 FROM unnest(?::int[], ?::text[]) AS u(id_libro, url)
                 WHERE l.id_libro = u.id_libro`,
                [lote.map((item) => item.id_libro), lote.map((item) => item.url)]
            );
            lote.length = 0;
        }
        if (procesadas % 100 === 0 || procesadas === objetivo.length) console.log(`   ${procesadas}/${objetivo.length}`);
    }

    console.log(`\n✅ ${procesadas} portada(s) subida(s) y registrada(s).`);
}

main()
    .catch((error) => {
        console.error('❌', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });
