// ============================================================
// DATOS DE LA WEB PÚBLICA
// Solo información real. Los enlaces en null no se muestran:
// cuando existan, basta con completar la URL aquí.
// ============================================================

// Carrusel de anuncios en el inicio. Oculto por ahora: en su lugar la
// portada 3D muestra los últimos libros agregados. Para volver a mostrar
// los anuncios basta con ponerlo en true (las imágenes siguen guardadas).
export const MOSTRAR_CARRUSEL_INICIO = false;


export const SITIO = {
    nombre: 'MATIDANA Libros y Cultura',
    url: 'https://libreria.my',
    rutaLoginAdmin: '/admin/login',
    rutaReclamaciones: '/libro-de-reclamaciones',
    enlaces: {
        terminos: null,
        privacidad: null,
        correo: null,
        telefono: null,
        // Redes con su icono. Con url null se muestran como marca pendiente:
        // completa la dirección real para que el enlace funcione.
        redes: [
            { nombre: 'Instagram', url: null },
            { nombre: 'Facebook', url: null },
            { nombre: 'TikTok', url: null },
        ],
    },
};

// Respaldo de los datos legales; se actualizan con GET /api/empresa.
export const DIRECCION_RECOJO = 'Plaza de Armas, Jr. Marañón 161, Pallasca 02835';
export const DELIVERY_CIUDAD = { nombre: 'Ciudad de Pallasca' };
export const LEGAL_RESPALDO = {
    nombreComercial: 'MATIDANA',
    razonSocial: 'FLORES SALINAS SARA',
    ruc: '10447545387',
    direccion: DIRECCION_RECOJO,
};

// Ubicación de la tienda para el mapa (búsqueda pública de Google Maps,
// sin clave de API). Dirección de recojo confirmada por la tienda.
const CONSULTA_TIENDA = DIRECCION_RECOJO;

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

// Título y descripción de cada página (pestaña del navegador y buscadores).
export const PAGINAS = {
    '/': {
        titulo: 'MATIDANA Libros y Cultura · Delivery y recojo en Pallasca',
        descripcion: 'Compra libros en la web o la app de MATIDANA Libros y Cultura, paga en línea con PayU y elige delivery dentro de Pallasca o recojo gratuito.',
    },
    '/catalogo': {
        titulo: 'Catálogo · MATIDANA Libros y Cultura',
        descripcion: 'Libros disponibles en MATIDANA Libros y Cultura, con autor, categoría y precio en soles.',
    },
    '/aplicacion': {
        titulo: 'La aplicación · MATIDANA Libros y Cultura',
        descripcion: 'Busca libros, revisa su ficha, guarda favoritos y paga con PayU desde la app de MATIDANA Libros y Cultura.',
    },
    '/caracteristicas': {
        titulo: 'Características · MATIDANA Libros y Cultura',
        descripcion: 'Delivery con tarifa única dentro de la ciudad de Pallasca, recojo gratuito en Jr. Marañón 161 y pago con PayU.',
    },
    '/nosotros': {
        titulo: 'Nosotros · MATIDANA Libros y Cultura',
        descripcion: 'Librería con tienda frente a la Plaza de Armas de Pallasca, Áncash, catálogo en la app, delivery local y recojo gratuito.',
    },
    '/descargar': {
        titulo: 'Descargar la app · MATIDANA Libros y Cultura',
        descripcion: 'Descarga gratis la app de MATIDANA Libros y Cultura para Android. La versión para iPhone está en preparación.',
    },
    '/cuenta': { titulo: 'Mi cuenta · MATIDANA Libros y Cultura', descripcion: 'Accede a tu cuenta de cliente para comprar libros y consultar tus pedidos.' },
    '/carrito': { titulo: 'Mi carrito · MATIDANA Libros y Cultura', descripcion: 'Revisa tus libros, cantidades y precios antes de comprar.' },
    '/checkout': { titulo: 'Entrega y pago · MATIDANA Libros y Cultura', descripcion: 'Recojo gratuito o delivery en Pallasca. Pago seguro con PayU.' },
    '/mis-compras': { titulo: 'Mis compras · MATIDANA Libros y Cultura', descripcion: 'Consulta tus compras, pagos y estados de entrega.' },
    '/libro': { titulo: 'Detalle del libro · MATIDANA Libros y Cultura', descripcion: 'Consulta el precio, la descripción y el stock real del libro.' },
};
