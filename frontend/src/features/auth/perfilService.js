import client from '../../lib/api/client';

export async function obtenerPerfil() {
    const res = await client.get('/usuarios/perfil');
    return res?.data ?? null;
}

export async function actualizarPerfil(datos) {
    const res = await client.put('/usuarios/perfil', datos);
    return { datos: res?.data ?? null, mensaje: res?.mensaje ?? 'Perfil actualizado correctamente' };
}

export async function actualizarFoto(archivo) {
    const datos = new FormData();
    datos.append('foto', archivo);
    const res = await client.put('/usuarios/foto', datos);
    return { datos: res?.data ?? null, mensaje: res?.mensaje ?? 'Foto actualizada correctamente' };
}

export async function cambiarPassword(formulario) {
    const res = await client.put('/usuarios/password', formulario);
    return res?.mensaje ?? 'Contraseña actualizada correctamente';
}
