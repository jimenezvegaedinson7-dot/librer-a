import client from '../lib/api/client';

// ============================================================
// LIBRO PROTAGONISTA DE LA PORTADA 3D
// id_libro = null deja la portada en modo automático (último libro agregado).
// ============================================================

export async function obtenerProtagonista() {
    const res = await client.get('/anuncios/protagonista/panel');
    return res?.data ?? null;
}

export async function guardarProtagonista(idLibro) {
    const res = await client.put('/anuncios/protagonista', { id_libro: idLibro });
    return res?.data ?? null;
}
