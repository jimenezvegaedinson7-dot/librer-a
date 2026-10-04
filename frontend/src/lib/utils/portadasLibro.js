import portadasCatalogo from '../../public-site/tienda/portadasCatalogo.json';
import portadasReferencia from '../../public-site/tienda/portadasReferencia.json';
import { construirUrlArchivo } from './url';

const limpiar = valor => typeof valor==='string'?valor.trim():'';
export function portadaPorIsbn(libro){
    const isbn=String(libro?.isbn || '').replace(/[-\s]/g,'');
    return portadasCatalogo[isbn] || null;
}
// Una portada registrada siempre tiene prioridad. La imagen por ISBN es
// solo respaldo de visualización: nunca cambia el registro ni el formulario.
export function resolverPortadaLibro(libro){return limpiar(libro?.portada) || portadaPorIsbn(libro);}
export function urlPortadaLibro(libro){return construirUrlArchivo(resolverPortadaLibro(libro));}

// La etiqueta describe la imagen realmente mostrada, no solo el ISBN.
// Una imagen registrada o un preview nuevos no heredan la condición de referencia.
export function referenciaPortadaLibro(libro,fuente=resolverPortadaLibro(libro)){
    const isbn=String(libro?.isbn || '').replace(/[-\s]/g,'');
    const referencia=portadasReferencia[isbn];
    if(!referencia)return null;
    const url=construirUrlArchivo(fuente);
    // La API entrega la URL pública también a Flutter y a los previews web.
    const publicada=new URL(referencia.archivo,'https://librer-a-zeta.vercel.app').href;
    return url===construirUrlArchivo(referencia.archivo) || url===publicada?referencia:null;
}
export const AVISO_PORTADA_REFERENCIA='Portada de referencia · Otra edición';
