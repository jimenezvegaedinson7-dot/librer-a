import env from '../../compartido/config/env';

const CLAVE = `lds:datos-publicos:v1:${env.apiUrl}`;
const VIGENCIA = 15 * 60 * 1000;
const MAXIMO = 40;
const permitida = (ruta) => /^\/(libros(?:\/\d+(?:\/relacionados)?)?|autores\/\d+|empresa|anuncios(?:\/carrusel)?)$/.test(ruta);

function leerTodo() {
    try {
        const datos = JSON.parse(localStorage.getItem(CLAVE));
        return datos && typeof datos === 'object' && !Array.isArray(datos) ? datos : {};
    } catch { return {}; }
}

export function leerPublico(ruta) {
    if (!permitida(ruta)) return undefined;
    const entrada = leerTodo()[ruta];
    const edad = Date.now() - entrada?.fecha;
    return Number.isFinite(edad) && edad >= 0 && edad < VIGENCIA ? entrada.datos : undefined;
}

export function leerLibroPublico(id) {
    const detalle = leerPublico(`/libros/${id}`)?.data;
    if (detalle) return detalle;
    const json = leerPublico('/libros');
    const libros = Array.isArray(json) ? json : json?.data || json?.libros;
    return Array.isArray(libros) ? libros.find((l) => Number(l.id_libro) === Number(id)) : undefined;
}

export function guardarPublico(ruta, datos) {
    if (!permitida(ruta)) return;
    try {
        const todo = leerTodo();
        delete todo[ruta];
        todo[ruta] = { fecha: Date.now(), datos };
        const entradas = Object.entries(todo).filter(([, v]) => Date.now() - v.fecha < VIGENCIA).slice(-MAXIMO);
        const json = JSON.stringify(Object.fromEntries(entradas));
        if (json.length <= 2 * 1024 * 1024) localStorage.setItem(CLAVE, json);
    } catch { /* La petición de red sigue siendo la fuente de verdad. */ }
}

export function quitarPublico(ruta) {
    try {
        const todo = leerTodo();
        delete todo[ruta];
        localStorage.setItem(CLAVE, JSON.stringify(todo));
    } catch { /* Almacenamiento bloqueado. */ }
}
