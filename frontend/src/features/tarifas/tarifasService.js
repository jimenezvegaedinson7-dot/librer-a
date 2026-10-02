import client from '../../lib/api/client';

// Solo cobertura local. Los distritos/tarifas Lima quedan en el historial.
export async function listarZonasDelivery() {
    const res = await client.get('/zonas-delivery/todos');
    return Array.isArray(res?.data) ? res.data : [];
}

export async function guardarZonaDelivery(idZona, datos) {
    const cuerpo = { nombre: datos.nombre.trim(), tarifa: Number(datos.tarifa), estado: Number(datos.estado) };
    const res = idZona
        ? await client.put(`/zonas-delivery/${idZona}`, cuerpo)
        : await client.post('/zonas-delivery', cuerpo);
    return res?.data;
}
