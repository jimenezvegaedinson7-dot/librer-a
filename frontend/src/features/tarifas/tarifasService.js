import client from '../../lib/api/client';

// ============================================================
// TARIFAS DE ENVÍO A DOMICILIO (solo distritos de Lima)
// La única fuente es PostgreSQL (distritos_lima.tarifa_envio).
// ============================================================

// Distritos de la provincia de Lima con su tarifa actual.
export async function listarDistritosLima() {
    const resProvincias = await client.get('/ubicaciones/provincias');
    const provincias = Array.isArray(resProvincias?.data) ? resProvincias.data : [];
    const lima = provincias.find(
        (p) => String(p.nombre || '').trim().toLowerCase() === 'lima',
    );
    if (!lima) return [];

    const res = await client.get(`/ubicaciones/provincias/${lima.id_provincia}/distritos`);
    return Array.isArray(res?.data) ? res.data : [];
}

// Actualiza solo la tarifa de envío de un distrito de Lima (administrador).
export async function actualizarTarifaDistrito(idDistrito, tarifaEnvio) {
    const res = await client.put(`/ubicaciones/distritos/${idDistrito}`, {
        tarifa_envio: Number(tarifaEnvio),
    });
    return res?.data;
}
