import client from '../lib/api/client';

function extraerComprobante(res) {
    if (res?.comprobante) return res.comprobante;
    if (res?.data?.comprobante) return res.data.comprobante;
    if (res?.success && res?.data && !Array.isArray(res.data)) return res.data;
    return res ?? null;
}

export async function listarComprobantes(params = {}) {
    const res = await client.get('/comprobantes', { params });

    const origen = res?.data && !Array.isArray(res.data) && res.data.comprobantes ? res.data : res;
    if (params.id_venta && Number(origen?.filtro_venta) !== Number(params.id_venta)) {
        throw new Error('La API debe actualizarse para consultar los comprobantes de una venta. Puedes consultar el listado general.');
    }
    const comprobantes = Array.isArray(origen?.comprobantes) ? origen.comprobantes : Array.isArray(origen) ? origen : [];

    const total = Number(origen?.total ?? comprobantes.length);
    const porPagina = Number(params.por_pagina || 10);
    const paginas = Math.max(1, Number(origen?.paginas ?? Math.ceil(comprobantes.length / porPagina)));

    return { comprobantes, total, paginas };
}

export async function obtenerComprobante(id) {
    const res = await client.get(`/comprobantes/${id}`);
    return extraerComprobante(res);
}

export async function emitirComprobante(idVenta, opciones = {}) {
    const esObjeto = opciones && typeof opciones === 'object' && !Array.isArray(opciones);
    const tipo = esObjeto ? opciones.tipo || 'boleta' : opciones || 'boleta';

    const body = { tipo };
    if (esObjeto) {
        if (opciones.cliente_tipo_documento) {
            body.cliente_tipo_documento = opciones.cliente_tipo_documento;
        }
        if (opciones.cliente_dni_ruc) {
            body.cliente_dni_ruc = String(opciones.cliente_dni_ruc).trim();
        }
        if (opciones.cliente_nombre) {
            body.cliente_nombre = String(opciones.cliente_nombre).trim();
        }
        if (opciones.cliente_email) {
            body.cliente_email = String(opciones.cliente_email).trim();
        }
    }

    const res = await client.post(`/ventas/${idVenta}/comprobante`, body);
    return extraerComprobante(res);
}

export async function enviarComprobanteEmail(idComprobante) {
    const res = await client.post(`/comprobantes/${idComprobante}/enviar-email`);
    return res?.data || res;
}

export async function obtenerResumen() {
    const res = await client.get('/comprobantes/resumen');

    const origen = res?.data && !Array.isArray(res.data) && res.data.boletas !== undefined ? res.data : res;

    return { boletas: Number(origen?.boletas ?? 0), facturas: Number(origen?.facturas ?? 0), ingresos: Number(origen?.ingresos ?? 0), anulados: Number(origen?.anulados ?? 0) };
}

export async function anularComprobante(idComprobante, { motivo }) {
    const body = { motivo: motivo.trim() };
    const res = await client.post(`/comprobantes/${idComprobante}/anular`, body);
    return extraerComprobante(res);
}
