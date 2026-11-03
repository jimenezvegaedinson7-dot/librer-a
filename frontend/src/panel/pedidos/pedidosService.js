import client from '../lib/api/client';

function datosDe(res) {
    if (!Array.isArray(res?.data)) throw new Error('Respuesta de pedidos no válida');
    return res.data;
}

export async function listarPedidos() {
    return datosDe(await client.get('/pedidos'));
}

export async function obtenerPedido(id) {
    const res = await client.get(`/pedidos/${id}`);
    return res?.data ?? null;
}

export async function cambiarEstadoPedido(id, estado, { confirmado = false, estadoAnterior } = {}) {
    return client.put(`/pedidos/${id}/estado`, {
        estado,
        ...(confirmado ? { confirmado: true } : {}),
        ...(estadoAnterior !== undefined ? { estado_anterior: estadoAnterior } : {})
    });
}
