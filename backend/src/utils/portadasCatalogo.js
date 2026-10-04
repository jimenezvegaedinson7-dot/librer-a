const { portadas, referencias } = require('../config/portadasCatalogo.json');

// Estas imágenes ya se publican en Vercel. La app necesita la URL absoluta:
// /portadas/... no existe en Render y null no permite que Flutter la muestre.
const ORIGEN_PORTADAS = 'https://librer-a-zeta.vercel.app';

function conPortadaCatalogo(libro) {
    if (!libro) return libro;
    const isbn = String(libro.isbn || '').replace(/[-\s]/g, '');
    const archivo = Object.hasOwn(portadas, isbn) ? portadas[isbn] : null;
    const registrada = typeof libro.portada === 'string' && libro.portada.trim()
        ? libro.portada : null;
    const respaldo = archivo ? `${ORIGEN_PORTADAS}${archivo}` : null;
    const referencia = !registrada && Object.hasOwn(referencias, isbn) ? referencias[isbn] : null;
    // Solo serialización: no mutar la fila de BD ni usar este helper al guardar.
    return {
        ...libro,
        portada: registrada || respaldo,
        portada_registrada: registrada,
        portada_respaldo: respaldo,
        portada_es_referencia: Boolean(referencia),
        portada_edicion_referencia: referencia ? {
            isbn: referencia.isbnEdicion,
            edicion: referencia.edicion,
        } : null,
    };
}
module.exports = { conPortadaCatalogo };
