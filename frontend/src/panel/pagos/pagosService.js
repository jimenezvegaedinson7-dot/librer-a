import client from '../lib/api/client';

export async function listarPagos(params = {}) {
    const res = await client.get('/pagos', { params });

    // El contrato devuelve { pagos, total, paginas }; también se tolera
    // la forma { success, data } que usa el resto del backend.
    const origen = res?.data && !Array.isArray(res.data) && res.data.pagos ? res.data : res;
    const pagos = Array.isArray(origen?.pagos) ? origen.pagos : Array.isArray(origen) ? origen : [];

    const total = Number(origen?.total ?? pagos.length);
    const porPagina = Number(params.por_pagina || 10);
    const paginas = Math.max(1, Number(origen?.paginas ?? Math.ceil(pagos.length / porPagina)));

    return { pagos, total, paginas };
}