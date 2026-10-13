import client from '../../lib/api/client';

// Solo cobertura local. Los distritos/tarifas Lima quedan en el historial.
export async function listarZonasDelivery() {
    const res = await client.get('/zonas-delivery/todos');
    if (!Array.isArray(res?.data)) throw new Error('Respuesta de cobertura no válida');
    return res.data;
}
