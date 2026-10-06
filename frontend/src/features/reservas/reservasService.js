import client from '../../lib/api/client';

function datosDe(res) {
    return Array.isArray(res?.data) ? res.data : [];
}

export async function listarReservas() {
    return datosDe(await client.get('/reservas'));
}

export async function obtenerReserva(id) {
    const res = await client.get(`/reservas/${id}`);
    return res?.data ?? null;
}

export async function actualizarEstadoReserva(id, estado) {
    if (estado !== 'cancelada') throw new Error('Las reservas históricas solo permiten cancelación');
    return client.put(`/reservas/${id}/estado`, { estado });
}
