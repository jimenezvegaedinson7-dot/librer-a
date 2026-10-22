import client from '../lib/api/client';

// Solo cobertura local. Los distritos/tarifas Lima quedan en el historial.
export async function listarZonasDelivery() {
    const res = await client.get('/zonas-delivery/todos');
    if (!Array.isArray(res?.data)) throw new Error('Respuesta de cobertura no válida');
    return res.data;
}

export async function actualizarTarifaDelivery(id, tarifa, tarifaAnterior) {
    const res = await client.put(`/zonas-delivery/${id}`, { tarifa, tarifa_anterior: tarifaAnterior });
    if (!res?.data || Number(res.data.tarifa) !== tarifa) throw new Error('El servidor no confirmó la tarifa solicitada. Actualiza para consultar el valor vigente.');
    return res.data;
}
