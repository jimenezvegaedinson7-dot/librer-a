import client from '../../lib/api/client';
import { peticionCliente } from '../../public-site/tienda/clienteApi';

// ============================================================
// LIBRO DE RECLAMACIONES
// POST público; el resto solo administrador.
// ============================================================

export async function registrarReclamacion(hoja) {
    return peticionCliente('/reclamaciones', { method: 'POST', body: hoja, autenticada: false });
}

export async function listarReclamaciones(params = {}) {
    const res = await client.get('/reclamaciones', { params });
    if (!Array.isArray(res?.data)) throw new Error('El servidor no devolvió una lista de reclamaciones válida');
    return { reclamaciones: res.data, total: Number(res.total ?? res.data.length), paginas: Math.max(1, Number(res.paginas ?? 1)) };
}

export async function obtenerResumenReclamaciones() {
    const res = await client.get('/reclamaciones/resumen');
    return res?.data || { total: 0, pendientes: 0, vencidos: 0, por_vencer: 0 };
}

export async function responderReclamacion(id, respuesta) {
    return client.put(`/reclamaciones/${id}/respuesta`, { respuesta });
}

export async function obtenerEmpresaPublica() {
    const res = await client.get('/empresa');
    return res?.empresa || res?.data?.empresa || res?.data || res || {};
}
