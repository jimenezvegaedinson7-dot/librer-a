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

export async function setup2fa() {
    return client.post('/auth/2fa/setup');
}

export async function confirmar2fa(codigo) {
    return client.post('/auth/2fa/confirm', { codigo });
}

export async function desactivar2fa({ password, codigo }) {
    return client.post('/auth/2fa/disable', { password, codigo });
}
