import env from '../../../../models/config/compartido/env';

export const LIBROS_RECIENTES = 16;

const CLAVE = `lds:carrusel-orbite:v3:${env.apiUrl}`;
const VIGENCIA_MS = 15 * 60 * 1000;

function leerCache() {
    try {
        const datos = JSON.parse(localStorage.getItem(CLAVE));
        return datos && typeof datos === 'object' ? datos : {};
    } catch {
        return {};
    }
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
    } catch {}
}

export function leerRecientes() {
    const libros = leerParte('recientes');
    return Array.isArray(libros) ? libros.slice(0, LIBROS_RECIENTES).filter((l) => l && typeof l === 'object' && Number.isFinite(l.stock)) : [];
}

export function guardarRecientes(libros) {
    guardarParte(
        'recientes',
        libros
            .slice(0, LIBROS_RECIENTES)
            .map((l) => ({
                id: l.id,
                titulo: l.titulo,
                autor: l.autor,
                portada: l.portada,
                estado: l.estado,
                precio: l.precio,
                precioFinal: l.precioFinal,
                descuento: l.descuento,
                creadoEn: l.creadoEn,
                stock: l.stock,
                disponible: l.disponible,
                idAutor: l.idAutor,
                idCategoria: l.idCategoria,
                categoria: l.categoria,
                isbn: l.isbn,
                sinopsis: l.sinopsis,
                esNuevo: l.esNuevo,
                masVendido: l.masVendido
            }))
    );
}
