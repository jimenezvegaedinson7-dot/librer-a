import { resolverPortadaLibro } from '../../compartido/utils/portadasLibro';

function fichaEdicion(valor, titulo) {
    const texto = valor == null ? '' : String(valor);
    if (!texto.trim()) return { resumen: '', edicion: '' };
    const sinFuente = texto.replace(/\s*Datos bibliográficos verificados en Open Library\.?\s*$/i, '');
    const tituloSeguro = String(titulo || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patron = new RegExp(`^\\s*Edición en español de\\s+[«"“]?${tituloSeguro}[»"”]?\\s+publicada por\\s+(.+?)(?:\\s+en\\s+(\\d{4}))?\\s+\\(([^)]+)\\)\\.?\\s*$`, 'i');
    const partes = sinFuente.match(patron);
    if (!partes) return { resumen: sinFuente, edicion: '' };
    const editorial = partes[1].trim().replace(/\s+/g, ' ');
    const anio = partes[2] ? ` · ${partes[2]}` : '';
    const detalle = partes[3]
        .replace(/paginación no registrada en la fuente/i, 'paginación no registrada')
        .replace(/páginas?/i, 'páginas')
        .trim();
    const edicion = `${editorial}${anio} · ${detalle}`;
    return { resumen: edicion, edicion };
}

export function libroComercial(l) {
    const oferta = Number(l.descuento_vigente) === 1 && Number.isFinite(Number(l.precio_final)) && Number(l.precio_final) > 0;
    const ficha = fichaEdicion(l.sinopsis || l.descripcion, l.titulo);
    return {
        id: Number(l.id_libro),
        titulo: l.titulo,
        autor: l.autor || '',
        categoria: l.categoria || '',
        idAutor: Number(l.id_autor) || null,
        idCategoria: Number(l.id_categoria) || null,
        isbn: l.isbn || '',
        estado: Number(l.estado),
        precio: Number(l.precio),
        precioFinal: oferta ? Number(l.precio_final) : Number(l.precio),
        descuento: oferta ? Number(l.descuento_porcentaje_efectivo) || 0 : 0,
        portada: resolverPortadaLibro(l),
        sinopsis: ficha.resumen,
        edicion: ficha.edicion,
        disponible: Number(l.estado) === 1 && Number(l.stock) > 0,
        stock: Math.max(0, Number(l.stock) || 0),
        esNuevo: Number(l.es_nuevo) === 1,
        masVendido: Number(l.mas_vendido) === 1,
        creadoEn: l.creado_en || null
    };
}

export const listaLibros = (json) => (Array.isArray(json) ? json : json.data || json.libros || []).filter((l) => Number(l.estado) === 1).map(libroComercial);

export function autoresConMasLibros(libros) {
    const grupos = new Map();
    for (const libro of libros) {
        const nombre = String(libro.autor || '').trim();
        if (!nombre) continue;
        if (!grupos.has(nombre)) grupos.set(nombre, 0);
        grupos.set(nombre, grupos.get(nombre) + 1);
    }
    return [...grupos]
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es'))
        .slice(0, 6);
}

export function datosSerieDe(titulo) {
    const original = String(titulo || '').trim();
    const sinParentesis = original.replace(/\s*[[(（][^\])）]*[\])）]\s*$/u, ' ').trim();
    const sinVolumen = sinParentesis.replace(/[,\s]*(?:Vol\.?|Volumen|Volume|Tomo|Parte|N[°º]|#)\s*\d+.*$/iu, '').trim();
    const nombre = sinVolumen.replace(/[,\s]*\d+(?:[.,]\d+)*\s*$/u, '').replace(/\s+/gu, ' ').trim();
    return { nombre, tieneMarca: nombre !== original };
}

export function seriesDe(libros) {
    const grupos = new Map();
    for (const libro of libros) {
        const { nombre, tieneMarca } = datosSerieDe(libro.titulo);
        if (!tieneMarca || !nombre || nombre.length < 3 || nombre.length > 48) continue;
        const clave = nombre.toLocaleLowerCase('es');
        if (!grupos.has(clave)) grupos.set(clave, { nombre, cantidad: 0, libros: [] });
        const grupo = grupos.get(clave);
        grupo.cantidad += 1;
        grupo.libros.push(libro);
    }
    return [...grupos.values()]
        .filter((serie) => serie.cantidad > 1)
        .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es'))
        .slice(0, 10);
}

export const centimos = (valor) => Math.round(Number(valor || 0) * 100);
