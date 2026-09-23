// Preferencia "envío automático": al emitir un comprobante desde Ventas se
// envía por correo sin pasos extra. Se guarda en este navegador.
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
    } catch {
        // Sin almacenamiento: la opción vuelve a apagarse al recargar.
    }
}
