import client from '../../lib/api/client';

function datosDe(res) {
    return Array.isArray(res?.data) ? res.data : [];
}

export async function listarCategorias() {
    return datosDe(await client.get('/categorias'));
}

export async function obtenerCategoria(id) {
    const res = await client.get(`/categorias/${id}`);
    return res?.data ?? null;
}

export async function crearCategoria(formulario) {
    return client.post('/categorias', {
        nombre: formulario.nombre.trim(),
        descripcion: formulario.descripcion.trim(),
    });
}

export async function actualizarCategoria(id, formulario) {
    return client.put(`/categorias/${id}`, {
        nombre: formulario.nombre.trim(),
        descripcion: formulario.descripcion.trim(),
        estado: formulario.estado,
    });
}

export async function eliminarCategoria(id, password) {
    return client.delete(`/categorias/${id}`, { data: { password } });
}
