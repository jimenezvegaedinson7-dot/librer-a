import client from '../../lib/api/client';

function datosDe(res) {
    return Array.isArray(res?.data) ? res.data : [];
}

export async function listarInventario() {
    return datosDe(await client.get('/inventario'));
}

export async function obtenerInventarioLibro(id) {
    const res = await client.get(`/inventario/libro/${id}`);
    return res?.data ?? null;
}

export async function crearInventario(formulario) {
    return client.post('/inventario', {
        id_libro: Number(formulario.id_libro),
        stock: Number(formulario.stock),
        stock_minimo: Number(formulario.stock_minimo),
        ubicacion: formulario.ubicacion.trim(),
    });
}

export async function actualizarInventario(id, formulario) {
    return client.put(`/inventario/libro/${id}`, {
        stock: Number(formulario.stock),
        stock_minimo: Number(formulario.stock_minimo),
        ubicacion: formulario.ubicacion.trim(),
    });
}

export async function listarMovimientos(params = {}) {
    const res = await client.get('/inventario/movimientos', { params });

    // Contrato: { movimientos, total, paginas }; también tolera
    // la forma { success, data: { movimientos, total, paginas } }.
    const origen = res?.data && !Array.isArray(res.data) && res.data.movimientos ? res.data : res;
    const movimientos = Array.isArray(origen?.movimientos)
        ? origen.movimientos
        : Array.isArray(origen)
          ? origen
          : [];

    const total = Number(origen?.total ?? movimientos.length);
    const porPagina = Number(params.por_pagina || 10);
    const paginas = Math.max(1, Number(origen?.paginas ?? Math.ceil(movimientos.length / porPagina)));

    return { movimientos, total, paginas };
}

export { listarLibros } from '../libros/librosService';
