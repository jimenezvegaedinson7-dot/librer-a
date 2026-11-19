export const SITIO = {
    nombre: 'MATIDANA Libros y Cultura',
    url: 'https://libreria.my',
    rutaReclamaciones: '/libro-de-reclamaciones',
    enlaces: {
        terminos: null,
        privacidad: null,
        correo: null,
        telefono: null,

        redes: [
            { nombre: 'Instagram', url: null },
            { nombre: 'Facebook', url: null },
            { nombre: 'TikTok', url: null }
        ]
    }
};

export const DIRECCION_RECOJO = 'Plaza de Armas, Jr. Marañón 161, Pallasca 02835';
export const DELIVERY_CIUDAD = { nombre: 'Ciudad de Pallasca' };
export const LEGAL_RESPALDO = { nombreComercial: 'MATIDANA', razonSocial: 'FLORES SALINAS SARA', ruc: '10447545387', direccion: DIRECCION_RECOJO };

const CONSULTA_TIENDA = DIRECCION_RECOJO;

export const UBICACION_TIENDA = {
    consulta: CONSULTA_TIENDA,
    mapa: `https://maps.google.com/maps?q=${encodeURIComponent(CONSULTA_TIENDA)}&z=17&hl=es&output=embed`,
    comoLlegar: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(CONSULTA_TIENDA)}`
};

export const NAVEGACION = [
    { ruta: '/', texto: 'Inicio' },
    { ruta: '/catalogo', texto: 'Catálogo' },
    { ruta: '/catalogo?ofertas=1', texto: 'Ofertas' },
    { ruta: '/nosotros', texto: 'Nosotros' },
    { ruta: '/descargar', texto: 'Descargar', destacado: true }
];

export const CATEGORIAS_DESTACADAS = [
    'Cómic y Manga',
    'Ficción',
    'Conocimiento y Cultura',
    'Ciencias',
    'Juvenil',
    'Infantil',
    'Animación',
    'Historietas',
    'Cómic',
    'Novela',
    'Fantasía',
    'Poesía',
    'Cuento',
    'Ensayo',
    'Ciencia ficción',
    'Misterio / Suspenso',
    'Terror',
    'Romance',
    'Historia',
    'Biografía',
    'Arte'
];

export const prioridadCategoria = (nombre) => {
    const indice = CATEGORIAS_DESTACADAS.indexOf(nombre);
    return indice === -1 ? CATEGORIAS_DESTACADAS.length : indice;
};

const ETIQUETAS_CORTAS_CATEGORIA = {
    'Conocimiento y Cultura': 'Conocimiento'
};

export const etiquetaCortaCategoria = (nombre) => ETIQUETAS_CORTAS_CATEGORIA[nombre] || nombre;

export const CATEGORIAS_RELACIONADAS = {
    'Cómic y Manga': ['Cómic', 'Historietas', 'Animación', 'Ciencia ficción'],
    Ficción: ['Novela', 'Fantasía', 'Misterio / Suspenso', 'Terror', 'Romance', 'Poesía', 'Cuento'],
    'Conocimiento y Cultura': ['Ciencias', 'Historia', 'Biografía', 'Ensayo', 'Arte'],
    Ciencias: ['Conocimiento y Cultura', 'Ciencia ficción', 'Ficción', 'Historia', 'Biografía'],
    Juvenil: ['Infantil', 'Fantasía', 'Ciencia ficción', 'Cómic y Manga'],
    Infantil: ['Juvenil', 'Animación', 'Cómic y Manga', 'Historietas']
};

export const CATEGORIA_DESTACADA_POR_SECCION = {
    'Cómic y Manga': 'Cómic',
    Ficción: 'Novela',
    'Conocimiento y Cultura': 'Ciencias',
    Ciencias: 'Ciencia ficción',
    Juvenil: 'Infantil',
    Infantil: 'Juvenil'
};

export const BLOQUES_POR_SECCION = {
    'Cómic y Manga': ['nuevos', 'ofertas'],
    Ficción: ['vendidos', 'nuevos'],
    'Conocimiento y Cultura': ['vendidos', 'ofertas'],
    Ciencias: ['nuevos', 'vendidos'],
    Juvenil: ['nuevos', 'stock'],
    Infantil: ['stock', 'nuevos']
};

export const PAGINAS = {
    '/': {
        titulo: 'MATIDANA Libros y Cultura · Delivery y recojo en Pallasca',
        descripcion: 'Compra libros en la web o la app de MATIDANA Libros y Cultura, paga en línea con PayU y elige delivery dentro de Pallasca o recojo gratuito.'
    },
    '/catalogo': { titulo: 'Catálogo · MATIDANA Libros y Cultura', descripcion: 'Libros disponibles en MATIDANA Libros y Cultura, con autor, categoría y precio en soles.' },
    '/buscar': { titulo: 'Buscar libros · MATIDANA Libros y Cultura', descripcion: 'Busca libros por título, autor o categoría en MATIDANA Libros y Cultura.' },
    '/nosotros': {
        titulo: 'Nosotros · MATIDANA Libros y Cultura',
        descripcion: 'Librería con tienda frente a la Plaza de Armas de Pallasca, Áncash, catálogo en la app, delivery local y recojo gratuito.'
    },
    '/descargar': {
        titulo: 'Descargar la app · MATIDANA Libros y Cultura',
        descripcion: 'Descarga gratis la app de MATIDANA Libros y Cultura para Android. La versión para iPhone está en preparación.'
    },
    '/cuenta': { titulo: 'Mi cuenta · MATIDANA Libros y Cultura', descripcion: 'Accede a tu cuenta de cliente para comprar libros y consultar tus pedidos.' },
    '/carrito': { titulo: 'Mi carrito · MATIDANA Libros y Cultura', descripcion: 'Revisa tus libros, cantidades y precios antes de comprar.' },
    '/checkout': { titulo: 'Entrega y pago · MATIDANA Libros y Cultura', descripcion: 'Recojo gratuito o delivery en Pallasca. Pago seguro con PayU.' },
    '/mis-compras': { titulo: 'Mis compras · MATIDANA Libros y Cultura', descripcion: 'Consulta tus compras, pagos y estados de entrega.' },
    '/favoritos': { titulo: 'Mis favoritos · MATIDANA Libros y Cultura', descripcion: 'Consulta tus libros favoritos y abre su ficha para revisar el precio y la disponibilidad.' },
    '/libro-de-reclamaciones': {
        titulo: 'Libro de Reclamaciones · MATIDANA Libros y Cultura',
        descripcion: 'Registra una queja o reclamación sobre tu compra en MATIDANA Libros y Cultura.'
    },
    '/libro': { titulo: 'Detalle del libro · MATIDANA Libros y Cultura', descripcion: 'Consulta el precio, la descripción y el stock real del libro.' }
};
