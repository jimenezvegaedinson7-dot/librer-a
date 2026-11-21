const STOPWORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'con', 'sin', 'por', 'para', 'en', 'al', 'a', 'lo', 'que', 'cual', 'como', 'libro', 'libros', 'busco', 'quiero', 'necesito', 'algo', 'sobre', 'según', 'segun']);

function normalizar(valor) {
    return String(valor ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/['’]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

function fueraDeAlcance(valor) {
    const texto = normalizar(valor);
    return ['ignora instrucciones', 'olvida instrucciones', 'prompt', 'system prompt', 'api key', 'contraseña', 'password', 'drop table', 'delete from', 'update libros', 'tabla usuarios', 'datos administrativos'].some((frag) => texto.includes(normalizar(frag)));
}

function palabrasFaceta(valor) {
    return normalizar(valor).split(' ').filter((p) => p.length > 2 && !STOPWORDS.has(p));
}

function coincideFaceta(valor, texto) {
    const partes = palabrasFaceta(valor);
    if (!partes.length) return false;
    const exacta = (parte) => new RegExp(`(^| )${parte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`).test(texto);
    if (partes.every(exacta)) return true;
    const ultima = partes[partes.length - 1];
    return partes.some((parte) => parte.length >= 5 && exacta(parte)) || (ultima.length >= 4 && exacta(ultima));
}

function extraerIsbn(consulta) {
    const encontrado = String(consulta || '').match(/(?:97[89][\s-]?)?\d(?:[\s-]?\d){9,12}[\dXx]/);
    if (!encontrado) return '';
    const limpio = encontrado[0].replace(/[^0-9Xx]/g, '').toUpperCase();
    return limpio.length >= 10 && limpio.length <= 17 ? limpio : '';
}

function precio(texto, patrones) {
    for (const patron of patrones) {
        const coincidencia = texto.match(patron);
        if (coincidencia) return Number(coincidencia[1].replace(',', '.'));
    }
    return 0;
}

function interpretarLocal({ consulta, tipo = 'todos', categoria = '', facetas = {} }) {
    const texto = normalizar(consulta);
    const autores = (facetas.autores || []).filter((a) => coincideFaceta(a.nombre, texto)).map((a) => a.id);
    const categorias = (facetas.categorias || []).filter((c) => coincideFaceta(c.nombre, texto)).map((c) => c.id);
    const palabras = texto.split(' ').filter((p) => p.length > 2 && !STOPWORDS.has(p) && !/^\d+$/.test(p)).slice(0, 6);
    const entre = texto.match(/entre\s*(\d+(?:[.,]\d+)?)\s*y\s*(\d+(?:[.,]\d+)?)/);
    let minimo = entre ? Number(entre[1].replace(',', '.')) : 0;
    let maximo = entre ? Number(entre[2].replace(',', '.')) : 0;
    if (!minimo) minimo = precio(texto, [/desde\s*(\d+(?:[.,]\d+)?)/, /(?:mas de|más de|sobre|minimo|mínimo)\s*(\d+(?:[.,]\d+)?)/]);
    if (!maximo) maximo = precio(texto, [/hasta\s*(\d+(?:[.,]\d+)?)/, /(?:menos de|bajo|por debajo de|maximo|máximo)\s*(\d+(?:[.,]\d+)?)/]);
    const orden = /barat|economin|menor precio/.test(texto) ? 'precio_asc' : /car|premium|mayor precio/.test(texto) ? 'precio_desc' : 'relevancia';
    let categoriaForzada = null;
    const categoriaNormalizada = normalizar(categoria);
    if (categoriaNormalizada) {
        const encontrada = (facetas.categorias || []).find((c) => normalizar(c.nombre).includes(categoriaNormalizada) || categoriaNormalizada.includes(normalizar(c.nombre)));
        if (encontrada) categoriaForzada = encontrada.id;
    }
    const plan = {
        autores: autores.slice(0, 2),
        categorias: categoriaForzada ? [categoriaForzada] : categorias.slice(0, 2),
        palabras,
        isbn: extraerIsbn(consulta),
        minimo,
        maximo,
        orden,
        stock: 'disponible',
        oferta: /oferta|descuento|rebajad|promocion|promoción/.test(texto)
    };
    return validarPlan(plan, facetas, { tipo, categoria });
}

function validarPlan(plan, facetas = {}, { tipo = 'todos', categoria = '' } = {}) {
    const entrada = plan && typeof plan === 'object' ? plan : {};
    const autoresValidos = new Set((facetas.autores || []).map((a) => Number(a.id)).filter(Number.isInteger));
    const categoriasValidas = new Set((facetas.categorias || []).map((c) => Number(c.id)).filter(Number.isInteger));
    const lista = (valor, permitidos) => (Array.isArray(valor) ? valor.map(Number).filter((id) => Number.isInteger(id) && permitidos.has(id)).slice(0, 3) : []);
    const numero = (valor) => {
        const n = Number(valor);
        return Number.isFinite(n) && n > 0 && n <= 1000000 ? Math.round(n * 100) / 100 : 0;
    };
    const palabras = Array.isArray(entrada.palabras)
        ? entrada.palabras.map((p) => normalizar(p).replace(/[^a-z0-9 ]/g, '').trim()).filter((p) => p.length > 2 && !STOPWORDS.has(p)).slice(0, 6)
        : [];
    const ordenes = ['relevancia', 'precio_asc', 'precio_desc'];
    const validado = {
        autores: lista(entrada.autores, autoresValidos),
        categorias: lista(entrada.categorias, categoriasValidas),
        palabras: [...new Set(palabras)],
        isbn: extraerIsbn(entrada.isbn),
        minimo: numero(entrada.minimo),
        maximo: numero(entrada.maximo),
        orden: ordenes.includes(entrada.orden) ? entrada.orden : 'relevancia',
        stock: entrada.stock === 'disponible' ? 'disponible' : null,
        oferta: entrada.oferta === true
    };
    const categoriaNormalizada = normalizar(categoria);
    if (categoriaNormalizada) {
        const encontrada = (facetas.categorias || []).find((c) => normalizar(c.nombre).includes(categoriaNormalizada) || categoriaNormalizada.includes(normalizar(c.nombre)));
        if (encontrada) validado.categorias = [encontrada.id];
    }
    if (tipo === 'autor') {
        validado.categorias = [];
        validado.isbn = '';
        validado.palabras = [];
    } else if (tipo === 'isbn') {
        validado.autores = [];
        validado.categorias = [];
        validado.palabras = [];
    } else if (tipo === 'titulo') {
        validado.autores = [];
        validado.categorias = [];
        validado.isbn = '';
    } else if (tipo === 'categoria') {
        validado.autores = [];
        validado.isbn = '';
        validado.palabras = [];
    }
    return validado;
}

module.exports = { normalizar, fueraDeAlcance, extraerIsbn, interpretarLocal, validarPlan };
