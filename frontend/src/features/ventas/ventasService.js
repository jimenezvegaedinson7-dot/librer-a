import client from '../../lib/api/client';

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

// Reembolso de una venta pagada o entregada: devuelve el stock y anula
// su comprobante emitido.
export async function reembolsarVenta(id, { motivo, devolverStock }) {
    return client.post(`/ventas/${id}/reembolso`, {
        motivo,
        devolver_stock: Boolean(devolverStock),
    });
}

export async function cambiarEstadoVenta(id, estado) {
    return client.put(`/ventas/${id}/estado`, { estado });
}

export { listarLibros } from '../libros/librosService';