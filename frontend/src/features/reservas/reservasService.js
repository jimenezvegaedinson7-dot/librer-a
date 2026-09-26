import client from '../../lib/api/client';

import { listarLibros } from '../libros/librosService';

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

export async function crearReserva(formulario) {
    return client.post('/reservas', {
        id_libro: Number(formulario.id_libro),
        cantidad: Number(formulario.cantidad),
        fecha_vencimiento: formulario.fecha_vencimiento || null,
    });
}

// Al completar (el cliente recogió y pagó) se envía cómo pagó: el
// backend registra la venta ya cobrada.
export async function actualizarEstadoReserva(id, estado, cobro = null) {
    const cuerpo = { estado };
    if (estado === 'completada' && cobro) {
        cuerpo.metodo_pago = cobro.metodo;
        if (cobro.referencia) cuerpo.referencia_pago = cobro.referencia;
    }
    return client.put(`/reservas/${id}/estado`, cuerpo);
}

export async function listarLibrosActivos() {
    const lista = await listarLibros();
    return lista.filter((libro) => Number(libro.estado) === 1);
}
