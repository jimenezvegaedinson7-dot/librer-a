import client from '../../lib/api/client';

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

export async function crearLibro(formulario, imagen) {
    const datos = new FormData();
    datos.append('titulo', formulario.titulo);
    datos.append('isbn', formulario.isbn || '');
    datos.append('descripcion', formulario.descripcion || '');
    datos.append('precio', formulario.precio);
    datos.append('id_autor', formulario.id_autor);
    datos.append('id_categoria', formulario.id_categoria);
    if (imagen) datos.append('portada', imagen);
    return client.post('/libros', datos);
}

export async function actualizarLibro(id, formulario, imagen) {
    const datos = new FormData();
    datos.append('titulo', formulario.titulo);
    datos.append('isbn', formulario.isbn || '');
    datos.append('descripcion', formulario.descripcion || '');
    datos.append('precio', formulario.precio);
    datos.append('id_autor', formulario.id_autor);
    datos.append('id_categoria', formulario.id_categoria);
    datos.append('estado', formulario.estado);
    if (imagen) datos.append('portada', imagen);
    return client.put(`/libros/${id}`, datos);
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
