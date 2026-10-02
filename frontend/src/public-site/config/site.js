// ============================================================
// DATOS DE LA WEB PÚBLICA
// Solo información real. Los enlaces en null no se muestran:
// cuando existan, basta con completar la URL aquí.
// ============================================================

export const SITIO = {
    nombre: 'Librería del Saber',
    url: 'https://librer-a-zeta.vercel.app',
    rutaLoginAdmin: '/admin/login',
    rutaReclamaciones: '/libro-de-reclamaciones',
    enlaces: {
        terminos: null,
        privacidad: null,
        correo: null,
        telefono: null,
        redes: [],
    },
};

// Respaldo de los datos legales; se actualizan con GET /api/empresa.
export const LEGAL_RESPALDO = {
    nombreComercial: 'MATIDANA',
    razonSocial: 'FLORES SALINAS SARA',
    ruc: '10447545387',
    direccion: 'Jr. Plaza de Armas s/n, frente a la Plaza Principal, Pallasca, Áncash, Perú',
};

// Ubicación de la tienda para el mapa (búsqueda pública de Google Maps,
// sin clave de API). Se busca la Plaza de Armas de Pallasca porque la
// dirección es "s/n, frente a la Plaza Principal".
const CONSULTA_TIENDA = 'Plaza de Armas, Pallasca, Áncash, Perú';

export const UBICACION_TIENDA = {
    consulta: CONSULTA_TIENDA,
    mapa: `https://maps.google.com/maps?q=${encodeURIComponent(CONSULTA_TIENDA)}&z=17&hl=es&output=embed`,
    comoLlegar: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(CONSULTA_TIENDA)}`,
};

// Menú principal: cada entrada es una página propia.
export const NAVEGACION = [
    { ruta: '/', texto: 'Inicio' },
    { ruta: '/catalogo', texto: 'Catálogo' },
    { ruta: '/nosotros', texto: 'Nosotros' },
    { ruta: '/caracteristicas', texto: 'Características' },
    { ruta: '/aplicacion', texto: 'Aplicación' },
    { ruta: '/descargar', texto: 'Descargar', destacado: true },
];

// Avisos de la barra superior (hechos reales del servicio).
export const AVISOS = [
    { texto: 'Delivery dentro de Pallasca' },
    { texto: 'Recojo sin costo en Pallasca' },
    { texto: 'Pago en línea seguro con PayU' },
];

// Título y descripción de cada página (pestaña del navegador y buscadores).
export const PAGINAS = {
    '/': {
        titulo: 'Librería del Saber · Delivery y recojo en Pallasca',
        descripcion: 'Explora el catálogo de Librería del Saber en la app, paga en línea con PayU y recibe tus libros con delivery dentro de Pallasca o recógelos sin costo.',
    },
    '/catalogo': {
        titulo: 'Catálogo · Librería del Saber',
        descripcion: 'Libros disponibles en Librería del Saber, con autor, categoría y precio en soles.',
    },
    '/aplicacion': {
        titulo: 'La aplicación · Librería del Saber',
        descripcion: 'Busca libros, revisa su ficha, guarda favoritos, reserva y paga con PayU desde la app de Librería del Saber.',
    },
    '/caracteristicas': {
        titulo: 'Características · Librería del Saber',
        descripcion: 'Delivery dentro de Pallasca con tarifa por zona, recojo sin costo en Pallasca, pago con PayU y reservas desde la app.',
    },
    '/nosotros': {
        titulo: 'Nosotros · Librería del Saber',
        descripcion: 'Librería con tienda frente a la Plaza de Armas de Pallasca, Áncash, catálogo en la app, delivery local y recojo gratuito.',
    },
    '/descargar': {
        titulo: 'Descargar la app · Librería del Saber',
        descripcion: 'Descarga gratis la app de Librería del Saber para Android. La versión para iPhone está en preparación.',
    },
};
