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

// Textos que acompañan al video en la portada. Solo se envían si llegan:
// pausar un anuncio desde la tabla manda título y estado, y no debe
// borrar lo escrito en el formulario.
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

// multipart: si se manda FormData hay que dejar que el navegador ponga
// el boundary, por eso el tercer argumento en vez de dejar que lo
// detecte el interceptor a partir del tipo de archivo.
export async function crearAnuncio(datos) {
    return client.post('/anuncios', cuerpo(datos), {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
}

export async function actualizarAnuncio(id, datos) {
    return client.put(`/anuncios/${id}`, cuerpo(datos), {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
}

export async function eliminarAnuncio(id, password) {
    return client.delete(`/anuncios/${id}`, { data: { password } });
}
