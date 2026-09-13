import client from '../../lib/api/client';

function datosDe(res) {
    return Array.isArray(res?.data) ? res.data : [];
}

export async function listarAutores() {
    return datosDe(await client.get('/autores'));
}

export async function obtenerAutor(id) {
    const res = await client.get(`/autores/${id}`);
    return res?.data ?? null;
}

export async function crearAutor(formulario) {
    return client.post('/autores', {
        nombre: formulario.nombre.trim(),
        apellido: formulario.apellido.trim(),
        nacionalidad: formulario.nacionalidad.trim(),
        biografia: formulario.biografia.trim(),
    });
}

export async function actualizarAutor(id, formulario) {
    return client.put(`/autores/${id}`, {
        nombre: formulario.nombre.trim(),
        apellido: formulario.apellido.trim(),
        nacionalidad: formulario.nacionalidad.trim(),
        biografia: formulario.biografia.trim(),
        estado: formulario.estado,
    });
}

export async function eliminarAutor(id, password) {
    return client.delete(`/autores/${id}`, { data: { password } });
}
