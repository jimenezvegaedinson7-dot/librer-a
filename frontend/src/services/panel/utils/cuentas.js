const DOMINIO_ELIMINADA = '@cuenta-eliminada.invalid';

export function esCorreoDeCuentaEliminada(correo) {
    return String(correo || '')
        .toLowerCase()
        .endsWith(DOMINIO_ELIMINADA);
}

export function esCuentaEliminada(usuario) {
    if (!usuario) return false;
    return Boolean(usuario.fecha_eliminacion) || esCorreoDeCuentaEliminada(usuario.email || usuario.correo_usuario);
}

export function correoVisible(correo) {
    return correo && !esCorreoDeCuentaEliminada(correo) ? correo : '';
}
