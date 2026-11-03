import client from '../lib/api/client';

function extraerEmpresa(res) {
    if (res?.empresa) return res.empresa;
    if (res?.data?.empresa) return res.data.empresa;
    return res ?? null;
}

export async function obtenerEmpresa() {
    const res = await client.get('/empresa');
    return extraerEmpresa(res);
}

export async function actualizarEmpresa(datos) {
    const res = await client.put('/empresa', datos);
    return extraerEmpresa(res);
}
