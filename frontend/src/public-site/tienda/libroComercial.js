import { resolverPortadaLibro } from '../../lib/utils/portadasLibro';

export function libroComercial(l) {
    const oferta = Number(l.descuento_vigente) === 1 && Number.isFinite(Number(l.precio_final)) && Number(l.precio_final)>0;
    return {
        id: Number(l.id_libro), titulo: l.titulo, autor: l.autor || '', categoria: l.categoria || '',
        idAutor: Number(l.id_autor) || null, idCategoria: Number(l.id_categoria) || null,
        isbn: l.isbn || '', estado: Number(l.estado),
        precio: Number(l.precio), precioFinal: oferta ? Number(l.precio_final) : Number(l.precio),
        descuento: oferta ? Number(l.descuento_porcentaje_efectivo) || 0 : 0,
        portada: resolverPortadaLibro(l),
        sinopsis: l.sinopsis || l.descripcion || '',
        disponible: Number(l.estado) === 1 && Number(l.stock) > 0,
        stock: Math.max(0, Number(l.stock) || 0), esNuevo: Number(l.es_nuevo) === 1,
        masVendido: Number(l.mas_vendido) === 1,
    };
}
export const listaLibros = json => (Array.isArray(json) ? json : json.data || json.libros || [])
    .filter(l => Number(l.estado) === 1).map(libroComercial);
export const centimos = valor => Math.round(Number(valor || 0) * 100);
