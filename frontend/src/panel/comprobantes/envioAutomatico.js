const CLAVE = 'comprobantes-envio-automatico';

export function envioAutomaticoActivo() {
    try {
        return localStorage.getItem(CLAVE) === '1';
    } catch {
        return false;
    }
}

export function guardarEnvioAutomatico(activo) {
    try {
        localStorage.setItem(CLAVE, activo ? '1' : '0');
    } catch {}
}
