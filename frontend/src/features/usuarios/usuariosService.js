import client from '../../lib/api/client';

export async function listarUsuarios(detalles = true) {
    const res = await client.get('/usuarios', { params: { detalles } });
    return Array.isArray(res?.data) ? res.data : [];
}

export async function actualizarUsuario(id, datos) {
    return client.patch(`/usuarios/${id}`, datos);
}