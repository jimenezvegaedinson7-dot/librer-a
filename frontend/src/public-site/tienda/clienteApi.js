import env from '../../config/env';
import { recomendacionesDesdeCatalogo } from './recomendacionesLibro';

export const CLAVE_CLIENTE = 'libreria-web-cliente-v1';
export const leer = (clave, respaldo = null) => {
    try { return JSON.parse(localStorage.getItem(clave)) ?? respaldo; } catch { return respaldo; }
};
export const guardar = (clave, datos) => localStorage.setItem(clave, JSON.stringify(datos));

// Sesión exclusiva de clientes. Nunca consulta el token del panel administrativo.
export async function peticionCliente(ruta, { method = 'GET', body, autenticada = true } = {}) {
    const token = autenticada ? leer(CLAVE_CLIENTE)?.token : null;
    const res = await fetch(`${env.apiUrl}${ruta}`, {
        method, headers: { Accept: 'application/json',
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    let json;
    try { json = await res.json(); } catch {
        const error = new Error('El servidor no devolvió una respuesta válida. Inténtalo de nuevo.');
        error.status = res.status;
        throw error;
    }
    if (!res.ok || json.success === false) {
        if (res.status === 401 && autenticada) window.dispatchEvent(new Event('cliente-sesion-expirada'));
        const error = new Error(json.mensaje || 'No se pudo completar la solicitud');
        error.status = res.status;
        throw error;
    }
    return json;
}

export const clienteApi = {
    login: datos => peticionCliente('/auth/login', { method: 'POST', body: datos, autenticada: false }),
    registro: datos => peticionCliente('/auth/registro', { method: 'POST', body: datos, autenticada: false }),
    verificarEmail: datos => peticionCliente('/auth/verificar-email', { method: 'POST', body: datos, autenticada: false }),
    reenviarCodigo: email => peticionCliente('/auth/reenviar-codigo', { method: 'POST', body: {email}, autenticada: false }),
    solicitarReseteo: email => peticionCliente('/auth/solicitar-reseteo', { method: 'POST', body: {email}, autenticada: false }),
    restablecer: datos => peticionCliente('/auth/reestablecer-contrasena', { method: 'POST', body: datos, autenticada: false }),
    verificar2fa: datos => peticionCliente('/auth/2fa/verify-login', { method: 'POST', body: datos, autenticada: false }),
    perfil: () => peticionCliente('/usuarios/perfil'),
    catalogo: () => peticionCliente('/libros', {autenticada: false}),
    asistente: datos => peticionCliente('/asistente', {method:'POST',body:datos,autenticada:false}),
    libro: id => peticionCliente(`/libros/${id}`, {autenticada: false}),
    relacionados: async (id, libro) => {
        try {
            return await peticionCliente(`/libros/${id}/relacionados`, {autenticada:false});
        } catch (error) {
            // Solo compatibilidad con rutas no publicadas. Errores transitorios
            // mantienen el estado de error/reintento, sin pedir otro catalogo.
            if (![404,405].includes(error.status) || !libro) throw error;
            const json = await clienteApi.catalogo();
            if (!Array.isArray(json.data)) throw new Error('No se pudo leer el catálogo para buscar libros relacionados.');
            return {success:true,data:recomendacionesDesdeCatalogo(libro,json.data)};
        }
    },
    autor: id => peticionCliente(`/autores/${id}`, {autenticada:false}),
    favoritos: () => peticionCliente('/favoritos'),
    favorito: id => peticionCliente(`/favoritos/${id}`),
    agregarFavorito: id => peticionCliente(`/favoritos/${id}`, {method:'POST'}),
    quitarFavorito: id => peticionCliente(`/favoritos/${id}`, {method:'DELETE'}),
    zonas: () => peticionCliente('/zonas-delivery'),
    capacidades: () => peticionCliente('/pagos/capacidades', {autenticada:false}),
    crearOrden: datos => peticionCliente('/pagos/crear-orden', {method:'POST',body:{...datos,canal_compra:'web'}}),
    compras: () => peticionCliente('/ventas/mis-ventas'),
    compra: id => peticionCliente(`/ventas/${id}`),
    pagoCompra: id => peticionCliente(`/ventas/${id}/pago`),
    verificarPago: referencia => peticionCliente(`/pagos/${encodeURIComponent(referencia)}`),
};

export function checkoutSeguro(url) {
    const destino = new URL(url, window.location.origin);
    const base = new URL(env.apiUrl, window.location.origin);
    const origenes = [base.origin, 'https://libreria-api-v9h0.onrender.com'];
    if (!['http:', 'https:'].includes(destino.protocol) || !origenes.includes(destino.origin)
        || !destino.pathname.startsWith('/api/pagos/checkout/')) throw new Error('La dirección del pago no es válida');
    return destino.href;
}
