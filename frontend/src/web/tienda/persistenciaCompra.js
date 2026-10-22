import { clienteApi, checkoutSeguro, exigirSesion, guardar, leer } from './clienteApi';
import { estadoCarrito } from './carritoCompra';

export const claveCarrito = id => `libreria-web-carrito-${id || 'invitado'}`;
export const claveIntento = id => `libreria-web-intento-${id || 'invitado'}`;
export const leerCarrito = id => estadoCarrito(leer(claveCarrito(id), []));

export function conExclusionCliente(id, accion, compra = true) {
    if (navigator.locks?.request) return navigator.locks.request(`libreria-web-operacion-${id || 'invitado'}`, accion);
    // localStorage no ofrece compare-and-swap. No usamos un lease con caducidad
    // que permitiría dos POST si una pestaña se suspende durante el envío.
    if (compra) return Promise.reject(new Error('Este navegador no permite coordinar una compra segura entre pestañas. Abre tu cuenta en un navegador actualizado para continuar. Tu carrito y tu solicitud se conservan.'));
    return Promise.resolve().then(accion);
}

export function leerIntento(id) {
    const clave = claveIntento(id);
    const intento = leer(clave);
    if (localStorage.getItem(clave) !== null && (!intento?.cuerpo?.idempotencia_clave || !Array.isArray(intento.cuerpo.items))) {
        throw new Error('No se pudo leer tu solicitud anterior. Conservamos el intento para evitar crear un pedido duplicado.');
    }
    if (intento?.id_usuario && Number(intento.id_usuario) !== Number(id)) throw new Error('La solicitud anterior pertenece a otra cuenta.');
    return intento;
}

// Se llama dentro del bloqueo del propietario, tanto desde checkout como
// desde Mis compras. Un replay nunca modifica artículos ni genera otra clave.
export async function enviarIntento(intento, sesion) {
    exigirSesion(sesion);
    const clave = claveIntento(sesion.usuario.id_usuario);
    const enviado = {...intento,id_usuario:sesion.usuario.id_usuario,envios:(intento.envios || 0) + 1};
    guardar(clave,enviado);
    try {
        const json = await clienteApi.crearOrden(enviado.cuerpo,sesion);
        exigirSesion(sesion);
        if (!json.data?.id_venta) throw new Error('No se pudo recuperar la compra. Reintenta con la misma solicitud.');
        const orden = {...json.data};
        if (orden.checkout_url) orden.checkout_url = checkoutSeguro(orden.checkout_url);
        const recuperado = {...enviado,orden};
        guardar(clave,recuperado);
        return recuperado;
    } catch (error) {
        // Únicamente una validación rechazada en el primer envío permite
        // corregir y crear un intento nuevo. 401/429/red/5xx son recuperables.
        if ([400,422].includes(error.status) && enviado.envios === 1 && !intento.orden) localStorage.removeItem(clave);
        throw error;
    }
}
