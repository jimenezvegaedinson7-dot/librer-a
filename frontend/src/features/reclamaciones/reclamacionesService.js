import client from '../../lib/api/client';

// ============================================================
// LIBRO DE RECLAMACIONES
// POST público; el resto solo administrador.
// ============================================================

export async function registrarReclamacion(hoja) {
    return client.post('/reclamaciones', hoja);
}

export async function listarReclamaciones(params = {}) {
    const res = await client.get('/reclamaciones', { params });
    return Array.isArray(res?.data) ? res.data : [];
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
