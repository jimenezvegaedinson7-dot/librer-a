import client from '../../lib/api/client';

export async function obtenerHistorial(limite) {
    const res = await client.get('/historial');
    const registros = Array.isArray(res?.data) ? res.data : [];
    if (typeof limite === 'number' && limite > 0) {
        return registros.slice(0, limite);
    }
    return registros;
}
