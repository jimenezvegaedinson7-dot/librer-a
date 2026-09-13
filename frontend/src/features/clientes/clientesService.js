import client from '../../lib/api/client';

export async function listarClientes(params = {}) {
    const res = await client.get('/clientes', { params });

    // Contrato: { clientes, total, paginas }; también tolera
    // la forma { success, data: { clientes, total, paginas } }.
    const origen = res?.data && !Array.isArray(res.data) && res.data.clientes ? res.data : res;
    const clientes = Array.isArray(origen?.clientes) ? origen.clientes : Array.isArray(origen) ? origen : [];

    const total = Number(origen?.total ?? clientes.length);
    const porPagina = Number(params.por_pagina || 10);
    const paginas = Math.max(1, Number(origen?.paginas ?? Math.ceil(clientes.length / porPagina)));

    const resumen = {
        total_general: Number(origen?.resumen?.total_general ?? 0),
        con_compras: Number(origen?.resumen?.con_compras ?? 0),
    };

    return { clientes, total, paginas, resumen };
}