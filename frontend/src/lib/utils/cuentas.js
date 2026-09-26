// ============================================================
// CUENTAS ELIMINADAS POR SU TITULAR (Ley 29733)
// El backend anonimiza la cuenta: nombre "Usuario eliminado", correo
// técnico eliminado-<id>@cuenta-eliminada.invalid y estado inactivo.
// Ese correo no es real: nunca se muestra ni se usa para enviar nada.
// ============================================================

const DOMINIO_ELIMINADA = '@cuenta-eliminada.invalid';

export function esCorreoDeCuentaEliminada(correo) {
    return String(correo || '').toLowerCase().endsWith(DOMINIO_ELIMINADA);
}

export function esCuentaEliminada(usuario) {
    if (!usuario) return false;
    return Boolean(usuario.fecha_eliminacion) || esCorreoDeCuentaEliminada(usuario.email || usuario.correo_usuario);
}

// Correo apto para mostrar o enviar: vacío si es el correo técnico.
export function correoVisible(correo) {
    return correo && !esCorreoDeCuentaEliminada(correo) ? correo : '';
}
