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

export async function actualizarEstadoReserva(id, estado) {
    return client.put(`/reservas/${id}/estado`, { estado });
}

export async function listarLibrosActivos() {
    const lista = await listarLibros();
    return lista.filter((libro) => Number(libro.estado) === 1);
}
