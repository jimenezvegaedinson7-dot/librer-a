import client from '../../lib/api/client';

// ============================================================
// ANUNCIOS EN VIDEO DE LA WEB PÚBLICA
// El GET público lo usa la portada; el resto, el panel.
// ============================================================

export async function listarAnuncios() {
    const res = await client.get('/anuncios/todos');
    return Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
}

export async function obtenerAnuncioActivo() {
    const res = await client.get('/anuncios');
    return res?.anuncio || res?.data?.anuncio || null;
}

// multipart: si se manda FormData hay que dejar que el navegador ponga
// el boundary, por eso el tercer argumento en vez de dejar que lo
// detecte el interceptor a partir del tipo de archivo.
export async function crearAnuncio(datos) {
    const body = new FormData();
    body.append('titulo', datos.titulo ?? '');
    body.append('estado', String(datos.estado ?? 1));
    if (datos.video) body.append('video', datos.video);

    return client.post('/anuncios', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
}

export async function actualizarAnuncio(id, datos) {
    const body = new FormData();
    body.append('titulo', datos.titulo ?? '');
    body.append('estado', String(datos.estado ?? 1));
    if (datos.video) body.append('video', datos.video);

    return client.put(`/anuncios/${id}`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
}

export async function eliminarAnuncio(id, password) {
    return client.delete(`/anuncios/${id}`, { data: { password } });
}
