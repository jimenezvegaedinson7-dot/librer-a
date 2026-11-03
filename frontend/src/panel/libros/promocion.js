export const MENSAJE_API_SIN_PROMOCIONES = 'La API conectada aún no admite descuentos. Actualiza el backend antes de guardar una promoción.';

export function avisoDescuentoLibro(formulario) {
    const precio = Number(formulario.precio);
    const porcentaje = String(formulario.descuento_porcentaje ?? '').trim();
    const oferta = String(formulario.precio_oferta ?? '').trim();
    if (porcentaje && oferta) return 'Usa porcentaje o precio de oferta, no los dos. Borra uno de los dos campos.';
    if (porcentaje && (!Number.isInteger(Number(porcentaje)) || Number(porcentaje) < 1 || Number(porcentaje) > 99)) {
        return 'El porcentaje debe ser un número entero entre 1 y 99.';
    }
    if (oferta && (!Number.isFinite(Number(oferta)) || Number(oferta) <= 0)) return 'El precio de oferta debe ser mayor que 0.';
    if (oferta && Number.isFinite(precio) && precio > 0 && Number(oferta) >= precio) {
        return `El precio de oferta debe ser menor que el precio normal (S/ ${precio.toFixed(2)}).`;
    }
    if ((porcentaje || oferta) && (!Number.isFinite(precio) || precio <= 0)) return 'Primero indica el precio normal del libro.';
    return '';
}

export function soportaPromociones(libro) {
    return libro && ['descuento_porcentaje', 'precio_oferta', 'descuento_hasta', 'precio_final', 'descuento_vigente'].every((campo) => Object.hasOwn(libro, campo));
}

export function errorPromocion(mensaje) {
    const error = new Error(mensaje);
    error.mensajeUsuario = mensaje;
    return error;
}

export function coincidePromocion(libro, formulario) {
    const numero = (valor) => (valor === '' || valor === null || valor === undefined ? null : Number(valor));
    const porcentaje = numero(formulario.descuento_porcentaje);
    const oferta = numero(formulario.precio_oferta);

    const fecha = porcentaje === null && oferta === null ? null : formulario.descuento_hasta || null;
    return soportaPromociones(libro) && numero(libro.descuento_porcentaje) === porcentaje && numero(libro.precio_oferta) === oferta && (libro.descuento_hasta || null) === fecha;
}
