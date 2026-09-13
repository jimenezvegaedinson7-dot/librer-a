import client from '../../lib/api/client';

// ============================================================
// UBICACIONES (LIMA)
// El backend expone provincias y distritos por provincia.
// ============================================================

export async function listarProvincias() {
    const res = await client.get('/ubicaciones/provincias');
    return Array.isArray(res?.data) ? res.data : [];
}

export async function listarDistritos(idProvincia) {
    const res = await client.get(`/ubicaciones/provincias/${idProvincia}/distritos`);
    return Array.isArray(res?.data) ? res.data : [];
}

// Conveniencia para el selector de ventas: toma la primera provincia
// (Lima Metropolitana) y devuelve sus distritos con tarifa de envío.
export async function listarDistritosParaEnvio() {
    const provincias = await listarProvincias();
    if (provincias.length === 0) return [];
    return listarDistritos(provincias[0].id_provincia);
}