import env from '../../../compartido/config/env';

// Solo información pública del protagonista y de los cinco libros animados.
// No se reutiliza en el catálogo, carrito ni checkout. La API se revalida siempre.
const CLAVE = `lds:portada-animacion:v1:${env.apiUrl}`;
const VIGENCIA_MS = 15 * 60 * 1000;
const CAMPOS = ['id_libro', 'id_autor', 'id_categoria', 'titulo', 'autor', 'categoria', 'isbn', 'estado', 'mas_vendido', 'es_nuevo',
    'precio', 'precio_final', 'descuento_vigente', 'descuento_porcentaje_efectivo',
    'stock', 'portada', 'sinopsis', 'descripcion', 'creado_en'];

function leerCache() {
    try {
        const datos = JSON.parse(localStorage.getItem(CLAVE));
        return datos && typeof datos === 'object' ? datos : {};
    } catch { return {}; }
}

function leerParte(nombre) {
    const parte = leerCache()[nombre];
    const edad = Date.now() - parte?.fecha;
    return Number.isFinite(edad) && edad >= 0 && edad < VIGENCIA_MS ? parte.valor : undefined;
}

function guardarParte(nombre, valor) {
    try {
        const datos = leerCache();
        datos[nombre] = { fecha: Date.now(), valor };
        const json = JSON.stringify(datos);
        if (json.length <= 64000) localStorage.setItem(CLAVE, json);
    } catch { /* La animación funciona también con almacenamiento bloqueado. */ }
}

export function leerProtagonista() {
    return leerParte('protagonista');
}

export function guardarProtagonista(libro) {
    const publico = libro ? Object.fromEntries(CAMPOS.filter((c) => Object.hasOwn(libro, c)).map((c) => [c, libro[c]])) : null;
    guardarParte('protagonista', publico);
}

export function leerRecientes() {
    const libros = leerParte('recientes');
    return Array.isArray(libros) ? libros.slice(0, 5).filter((l) => l && typeof l === 'object' && Number.isFinite(l.stock)) : [];
}

export function guardarRecientes(libros) {
    guardarParte('recientes', libros.slice(0, 5).map((l) => ({
        id: l.id, titulo: l.titulo, autor: l.autor, portada: l.portada,
        estado: l.estado, precio: l.precio, precioFinal: l.precioFinal,
        descuento: l.descuento, creadoEn: l.creadoEn, stock: l.stock, disponible: l.disponible,
        idAutor: l.idAutor, idCategoria: l.idCategoria, categoria: l.categoria,
        isbn: l.isbn, sinopsis: l.sinopsis, esNuevo: l.esNuevo, masVendido: l.masVendido,
    })));
}
