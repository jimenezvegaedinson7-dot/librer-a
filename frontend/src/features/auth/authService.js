import client from '../../lib/api/client';

export async function login({ email, password }) {
    return client.post('/auth/login', { email, password });
}

export async function verificarEmail({ email, codigo }) {
    return client.post('/auth/verificar-email', { email, codigo });
}

export async function reenviarCodigo({ email }) {
    return client.post('/auth/reenviar-codigo', { email });
}

export async function verificarLoginOtp({ two_factor_token, codigo }) {
    return client.post('/auth/2fa/verify-login', { two_factor_token, codigo });
}

export async function setup2fa(password) {
    return client.post('/auth/2fa/setup', { password });
}

export async function confirmar2fa(codigo, setupToken) {
    return client.post('/auth/2fa/confirm', { codigo, setup_token: setupToken });
}

export async function desactivar2fa({ password, codigo }) {
    return client.post('/auth/2fa/disable', { password, codigo });
}

export async function solicitarReseteo({ email }) {
    return client.post('/auth/solicitar-reseteo', { email });
}

export async function restablecerContrasena({ email, codigo, password }) {
    return client.post('/auth/reestablecer-contrasena', { email, codigo, password });
}
