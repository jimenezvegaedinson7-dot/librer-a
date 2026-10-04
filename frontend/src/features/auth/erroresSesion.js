const RUTAS_CREDENCIAL = ['/usuarios/password', '/auth/2fa/', '/auth/login'];
const MENSAJES_SESION = ['Token no proporcionado', 'Formato de token inválido', 'Token inválido', 'El token ha expirado', 'Cuenta desactivada'];

export function es401DeCredencial(error) {
    const ruta = String(error.config?.url || '');
    const credencial = RUTAS_CREDENCIAL.some(r => ruta.includes(r)) ||
        (error.config?.method?.toLowerCase() === 'delete' && /^\/(?:libros|autores|categorias|anuncios)\/\d+(?:\?.*)?$/.test(ruta));
    return credencial && !MENSAJES_SESION.includes(error.response?.data?.mensaje);
}
