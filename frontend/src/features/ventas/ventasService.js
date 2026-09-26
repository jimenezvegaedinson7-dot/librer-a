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

export async function crearVenta(payload) {
    const body = {
        detalles: (payload.detalles || []).map((detalle) => ({
            id_libro: Number(detalle.id_libro),
            cantidad: Number(detalle.cantidad),
        })),
    };

    if (payload.tipo_entrega) {
        body.tipo_entrega = payload.tipo_entrega;
    }
    if (payload.id_distrito) {
        body.id_distrito = Number(payload.id_distrito);
    }
    if (payload.direccion) {
        body.direccion = payload.direccion.trim();
    }
    if (payload.referencia) {
        body.referencia = payload.referencia.trim();
    }
    if (payload.id_agencia) {
        body.id_agencia = Number(payload.id_agencia);
    }
    if (payload.correo_compra) {
        body.correo_compra = payload.correo_compra.trim();
    }
    // Venta de mostrador: se registra ya cobrada.
    for (const campo of ['cliente_nombre', 'cliente_documento', 'cliente_tipo_documento', 'metodo_pago', 'referencia_pago']) {
        if (payload[campo]) {
            body[campo] = payload[campo];
        }
    }

    return client.post('/ventas', body);
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