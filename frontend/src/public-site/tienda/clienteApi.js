import env from '../../config/env';
import { recomendacionesDesdeCatalogo } from './recomendacionesLibro';

export const CLAVE_CLIENTE = 'libreria-web-cliente-v1';
export const leer = (clave, respaldo = null) => {
    try { return JSON.parse(localStorage.getItem(clave)) ?? respaldo; } catch { return respaldo; }
};
export const guardar = (clave, datos) => localStorage.setItem(clave, JSON.stringify(datos));

export const firmaSesion = sesion => sesion ? `${sesion.usuario?.id_usuario}:${sesion.generacion || ''}:${sesion.token}` : 'invitado';
export function exigirSesion(sesion) {
    if (!sesion?.token || sesion.usuario?.rol !== 'cliente' || firmaSesion(sesion) !== firmaSesion(leer(CLAVE_CLIENTE))) {
        const error = new Error('La cuenta cambió en otra pestaña. Revisa tu sesión antes de continuar.');
        error.name = 'SesionCambiada';
        throw error;
    }
    return sesion;
}

// Sesión exclusiva de clientes. Nunca consulta el token del panel administrativo.
export async function peticionCliente(ruta, { method = 'GET', body, autenticada = true, sesion = leer(CLAVE_CLIENTE) } = {}) {
    const credencial = ruta.startsWith('/auth/');
    if (autenticada) exigirSesion(sesion);
    const comprobar = () => {
        if (autenticada) exigirSesion(sesion);
        else if (credencial && firmaSesion(sesion) !== firmaSesion(leer(CLAVE_CLIENTE))) {
            const error = new Error('La sesión cambió mientras ingresabas. Revisa la cuenta actual.');
            error.name = 'SesionCambiada'; throw error;
        }
    };
    const control = new AbortController();
    const limite = setTimeout(() => control.abort(), 120000);
    let res;
    try { res = await fetch(`${env.apiUrl}${ruta}`, {
        signal: control.signal,
        method, headers: { Accept: 'application/json',
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...(autenticada ? { Authorization: `Bearer ${sesion.token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    }); } catch (error) { comprobar(); throw error; }
    finally { clearTimeout(limite); }
    comprobar();
    let json;
    try { json = await res.json(); } catch {
        const error = new Error('El servidor no devolvió una respuesta válida. Inténtalo de nuevo.');
        error.status = res.status;
        throw error;
    }
    comprobar();
    if (!res.ok || json.success === false) {
        if (res.status === 401 && autenticada && !credencial) window.dispatchEvent(new CustomEvent('cliente-sesion-expirada', {detail: firmaSesion(sesion)}));
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
    verificarReseteo: datos => peticionCliente('/auth/verificar-reseteo', { method: 'POST', body: datos, autenticada: false }),
    restablecer: datos => peticionCliente('/auth/reestablecer-contrasena', { method: 'POST', body: datos, autenticada: false }),
    verificar2fa: datos => peticionCliente('/auth/2fa/verify-login', { method: 'POST', body: datos, autenticada: false }),
    perfil: sesion => peticionCliente('/usuarios/perfil', {sesion}),
    actualizarPerfil: (sesion, datos) => peticionCliente('/usuarios/perfil', {method:'PUT', body:datos, sesion}),
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
    favoritos: sesion => peticionCliente('/favoritos', {sesion}),
    // Memoria del asistente: lo que aprendió de este cliente.
    memoriaAsistente: sesion => peticionCliente('/asistente/memoria', {sesion}),
    guardarMemoriaAsistente: (datos, sesion) => peticionCliente('/asistente/memoria', {method:'PUT',body:{datos},sesion}),
    borrarMemoriaAsistente: sesion => peticionCliente('/asistente/memoria', {method:'DELETE',sesion}),
    favorito: (id, sesion) => peticionCliente(`/favoritos/${id}`, {sesion}),
    agregarFavorito: (id, sesion) => peticionCliente(`/favoritos/${id}`, {method:'POST',sesion}),
    quitarFavorito: (id, sesion) => peticionCliente(`/favoritos/${id}`, {method:'DELETE',sesion}),
    zonas: sesion => peticionCliente('/zonas-delivery', {sesion}),
    capacidades: () => peticionCliente('/pagos/capacidades', {autenticada:false}),
    crearOrden: (datos, sesion) => peticionCliente('/pagos/crear-orden', {method:'POST',body:{...datos,canal_compra:'web'},sesion}),
    compras: sesion => peticionCliente('/ventas/mis-ventas', {sesion}),
    compra: (id, sesion) => peticionCliente(`/ventas/${id}`, {sesion}),
    pagoCompra: (id, sesion) => peticionCliente(`/ventas/${id}/pago`, {sesion}),
    verificarPago: (referencia, sesion) => peticionCliente(`/pagos/${encodeURIComponent(referencia)}`, {sesion}),
};

export function checkoutSeguro(url) {
    const destino = new URL(url, window.location.origin);
    const base = new URL(env.apiUrl, window.location.origin);
    const origenes = [base.origin, 'https://libreria-api-v9h0.onrender.com'];
    if (!['http:', 'https:'].includes(destino.protocol) || !origenes.includes(destino.origin)
        || !destino.pathname.startsWith('/api/pagos/checkout/')) throw new Error('La dirección del pago no es válida');
    return destino.href;
}
