import client from '../../lib/api/client';

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
    return Array.isArray(res?.data) ? res.data : [];
}

export async function listarPedidos() {
    return datosDe(await client.get('/pedidos'));
}

export async function obtenerPedido(id) {
    const res = await client.get(`/pedidos/${id}`);
    return res?.data ?? null;
}

// Filtros opcionales del backend: tipo ('domicilio' | 'tienda') y
// estado (estado de entrega). Se usan para pedir menos filas cuando
// el usuario ya está filtrando en pantalla.
export async function listarPedidosFiltrados({ tipo, estado } = {}) {
    const res = await client.get('/pedidos', { params: { tipo, estado } });
    return datosDe(res);
}

// Avanza el estado LOGÍSTICO del pedido. No vuelve a cobrar, no crea
// una segunda venta y no toca PayU: solo escribe estado_entrega.
export async function cambiarEstadoPedido(id, estado) {
    return client.put(`/pedidos/${id}/estado`, { estado });
}
