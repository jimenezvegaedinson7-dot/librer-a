export const MENSAJE_API_SIN_PROMOCIONES = 'La API conectada aún no admite descuentos. Actualiza el backend antes de guardar una promoción.';

export function soportaPromociones(libro) {
    return libro && ['descuento_porcentaje', 'precio_oferta', 'descuento_hasta', 'precio_final', 'descuento_vigente']
        .every(campo => Object.hasOwn(libro, campo));
}

export function errorPromocion(mensaje) {
    const error = new Error(mensaje);
    error.mensajeUsuario = mensaje;
    return error;
}

export function coincidePromocion(libro, formulario) {
    const numero = valor => valor === '' || valor === null || valor === undefined ? null : Number(valor);
    const porcentaje = numero(formulario.descuento_porcentaje);
    const oferta = numero(formulario.precio_oferta);
    // Quitar ambos tipos de rebaja elimina también el vencimiento.
    const fecha = porcentaje === null && oferta === null ? null : (formulario.descuento_hasta || null);
    return soportaPromociones(libro)
        && numero(libro.descuento_porcentaje) === porcentaje
        && numero(libro.precio_oferta) === oferta
        && (libro.descuento_hasta || null) === fecha;
}
