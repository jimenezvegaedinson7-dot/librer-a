const { portadas, referencias } = require('../config/portadasCatalogo.json');

const ORIGEN_PORTADAS = 'https://librer-a-zeta.vercel.app';

function conPortadaCatalogo(libro) {
    if (!libro) return libro;
    const isbn = String(libro.isbn || '').replace(/[-\s]/g, '');
    const archivo = Object.hasOwn(portadas, isbn) ? portadas[isbn] : null;
    const registrada = typeof libro.portada === 'string' && libro.portada.trim() ? libro.portada : null;
    const respaldo = archivo ? `${ORIGEN_PORTADAS}${archivo}` : null;
    const referencia = !registrada && Object.hasOwn(referencias, isbn) ? referencias[isbn] : null;

    return {
        ...libro,
        portada: registrada || respaldo,
        portada_registrada: registrada,
        portada_respaldo: respaldo,
        portada_es_referencia: Boolean(referencia),
        portada_edicion_referencia: referencia ? { isbn: referencia.isbnEdicion, edicion: referencia.edicion } : null
    };
}

module.exports = { conPortadaCatalogo };
