import client from '../../lib/api/client';
import { soportaPromociones, coincidePromocion, errorPromocion, MENSAJE_API_SIN_PROMOCIONES } from './promocion';

function datosDe(res) {
    return Array.isArray(res?.data) ? res.data : [];
}

export async function listarLibros() {
    return datosDe(await client.get('/libros'));
}

export async function obtenerLibro(id) {
    const res = await client.get(`/libros/${id}`);
    return res?.data ?? null;
}

// Los descuentos viajan siempre, aunque estén vacíos. Mandarlos en vacío
// es lo que permite quitar una promoción: si el campo simplemente se
// omitiera, el backend no podría distinguir "no lo toqué" de "borralo".
function agregarDescuentos(datos, formulario) {
    datos.append('descuento_porcentaje', formulario.descuento_porcentaje || '');
    datos.append('precio_oferta', formulario.precio_oferta || '');
    datos.append('descuento_hasta', formulario.descuento_hasta || '');
}

export async function crearLibro(formulario, imagen) {
    // El backend anterior aceptaba el formulario pero omitía la promoción.
    // Comprobar la capacidad antes del POST evita crear un libro incompleto.
    const api = await client.get('');
    if (api?.capacidades?.descuentos_libros !== true) {
        throw errorPromocion(MENSAJE_API_SIN_PROMOCIONES);
    }
    const datos = new FormData();
    datos.append('titulo', formulario.titulo);
    datos.append('isbn', formulario.isbn || '');
    datos.append('descripcion', formulario.descripcion || '');
    datos.append('precio', formulario.precio);
    datos.append('id_autor', formulario.id_autor);
    datos.append('id_categoria', formulario.id_categoria);
    agregarDescuentos(datos, formulario);
    if (imagen) datos.append('portada', imagen);
    const respuesta = await client.post('/libros', datos);
    const guardado = await obtenerLibro(respuesta.id_libro);
    if (!coincidePromocion(guardado, formulario)) {
        throw errorPromocion('El libro se creó, pero el servidor no confirmó la promoción. Revisa su detalle antes de volver a registrarlo.');
    }
    return respuesta;
}

export async function actualizarLibro(id, formulario, imagen) {
    const anterior = await obtenerLibro(id);
    if (!soportaPromociones(anterior)) {
        throw errorPromocion(MENSAJE_API_SIN_PROMOCIONES);
    }
    const datos = new FormData();
    datos.append('titulo', formulario.titulo);
    datos.append('isbn', formulario.isbn || '');
    datos.append('descripcion', formulario.descripcion || '');
    datos.append('precio', formulario.precio);
    datos.append('id_autor', formulario.id_autor);
    datos.append('id_categoria', formulario.id_categoria);
    datos.append('estado', formulario.estado);
    agregarDescuentos(datos, formulario);
    if (imagen) datos.append('portada', imagen);
    const respuesta = await client.put(`/libros/${id}`, datos);
    const guardado = await obtenerLibro(id);
    if (!coincidePromocion(guardado, formulario)) {
        throw errorPromocion('El servidor respondió, pero el descuento no quedó guardado como lo enviaste. Revisa el detalle del libro.');
    }
    return respuesta;
}

export async function eliminarLibro(id, password) {
    return client.delete(`/libros/${id}`, { data: { password } });
}

export async function listarAutores() {
    return datosDe(await client.get('/autores'));
}

export async function listarCategorias() {
    return datosDe(await client.get('/categorias'));
}
