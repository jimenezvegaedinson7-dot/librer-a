import client from '../lib/api/client';

export async function listarAnuncios() {
    const res = await client.get('/anuncios/todos');
    return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
}

const TEXTOS = ['etiqueta', 'descripcion', 'boton_texto', 'boton_enlace'];

function cuerpo(datos) {
    const body = new FormData();
    body.append('titulo', datos.titulo ?? '');
    body.append('estado', String(datos.estado ?? 1));
    TEXTOS.forEach((campo) => {
        if (datos[campo] !== undefined) body.append(campo, datos[campo] ?? '');
    });
    if (datos.video) body.append('video', datos.video);
    return body;
}

export async function crearAnuncio(datos) {
    return client.post('/anuncios', cuerpo(datos), { headers: { 'Content-Type': 'multipart/form-data' } });
}

export async function actualizarAnuncio(id, datos) {
    return client.put(`/anuncios/${id}`, cuerpo(datos), { headers: { 'Content-Type': 'multipart/form-data' } });
}

export async function eliminarAnuncio(id, password) {
    return client.delete(`/anuncios/${id}`, { data: { password } });
}
