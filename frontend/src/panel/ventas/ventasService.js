import client from '../lib/api/client';

function datosDe(res) {
    return Array.isArray(res?.data) ? res.data : [];
}

export async function listarVentas() {
    return datosDe(await client.get('/ventas'));
}

export async function obtenerVenta(id) {
    const res = await client.get(`/ventas/${id}`);
    return res?.venta ?? res?.data ?? null;
}

export async function reembolsarVenta(id, { accion, motivo, devolverStock, referencia, evidencia }) {
    return client.post(`/ventas/${id}/reembolso`, {
        motivo,
        accion,
        devolver_stock: Boolean(devolverStock),
        referencia_reembolso: referencia?.trim() || null,
        evidencia_reembolso: evidencia?.trim() || null
    });
}
