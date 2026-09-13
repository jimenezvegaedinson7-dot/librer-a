import client from '../../lib/api/client';

export async function listarAgencias() {
    const res = await client.get('/agencias');
    return Array.isArray(res?.data) ? res.data : [];
}

export async function listarAgenciasActivas() {
    const res = await client.get('/agencias/activas');
    return Array.isArray(res?.data) ? res.data : [];
}

export async function obtenerAgencia(id) {
    const res = await client.get(`/agencias/${id}`);
    return res?.data ?? null;
}

export async function crearAgencia(formulario) {
    return client.post('/agencias', {
        nombre: formulario.nombre.trim(),
        tarifa_base: Number(formulario.tarifa_base),
        descripcion: formulario.descripcion.trim() || null,
    });
}

export async function actualizarAgencia(id, formulario) {
    return client.put(`/agencias/${id}`, {
        nombre: formulario.nombre.trim(),
        tarifa_base: Number(formulario.tarifa_base),
        descripcion: formulario.descripcion.trim() || null,
        estado: formulario.estado,
    });
}