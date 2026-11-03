import portadasCatalogo from '../../../web/tienda/portadasCatalogo.json';
import portadasReferencia from '../../../web/tienda/portadasReferencia.json';
import { construirUrlArchivo } from './url';

const limpiar = (valor) => (typeof valor === 'string' ? valor.trim() : '');

export function portadaPorIsbn(libro) {
    const isbn = String(libro?.isbn || '').replace(/[-\s]/g, '');
    return Object.hasOwn(portadasCatalogo, isbn) ? portadasCatalogo[isbn] : null;
}

export function resolverPortadaLibro(libro) {
    return limpiar(libro?.portada) || portadaPorIsbn(libro);
}

export function urlPortadaLibro(libro) {
    return construirUrlArchivo(resolverPortadaLibro(libro));
}

export function referenciaPortadaLibro(libro, fuente = resolverPortadaLibro(libro)) {
    const isbn = String(libro?.isbn || '').replace(/[-\s]/g, '');
    const referencia = Object.hasOwn(portadasReferencia, isbn) ? portadasReferencia[isbn] : null;
    if (!referencia) return null;
    const url = construirUrlArchivo(fuente);

    const publicada = new URL(referencia.archivo, 'https://librer-a-zeta.vercel.app').href;
    return url === construirUrlArchivo(referencia.archivo) || url === publicada ? referencia : null;
}

export const AVISO_PORTADA_REFERENCIA = 'Portada de referencia · Otra edición';
