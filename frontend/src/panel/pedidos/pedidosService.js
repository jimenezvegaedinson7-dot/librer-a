import client from '../lib/api/client';

// ============================================================
// API DE PEDIDOS (logística)
// ============================================================
// Un pedido es una venta ecommerce con logística: nace en la APP,
// se cobra por PayU y se entrega a domicilio o se recoge en tienda.
//
// El backend expone /api/pedidos sobre la tabla ventas porque el
// estado logístico (estado_entrega) vive en la misma fila que la
// venta. Aquí NO se consulta /api/ventas para no duplicar el módulo
// de Ventas: /api/pedidos trae los campos de entrega (dirección,
// distrito, tipo_entrega, estado_entrega) y el resto de la venta.
//
// NO existe creación de pedidos: un pedido lo crea el pago de PayU.
// Este módulo solo consulta y mueve el estado logístico.
// ============================================================

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

// Avanza logística sin cobrar nuevamente ni cambiar un pago a "entregado";
// cancelar sin pago cierra la compra y libera stock. Una compra pagada
// conserva dinero/existencias hasta la devolución separada desde Ventas.
export async function cambiarEstadoPedido(id, estado, { confirmado = false, estadoAnterior } = {}) {
    return client.put(`/pedidos/${id}/estado`, { estado,
        ...(confirmado ? { confirmado: true } : {}),
        ...(estadoAnterior !== undefined ? { estado_anterior: estadoAnterior } : {}) });
}
