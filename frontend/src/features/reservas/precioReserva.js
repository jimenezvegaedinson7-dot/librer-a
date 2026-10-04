// No se sustituye el precio efectivo del servidor por el precio de lista.
export function precioReserva(libro) {
    if (!libro || Number(libro.estado) !== 1 || libro.precio_final == null ||
        !Number.isFinite(Number(libro.precio_final)) || Number(libro.precio_final) < 0) {
        throw new Error('No se pudo confirmar el precio final de un libro activo. Actualiza la reserva antes de cobrar.');
    }
    return Number(libro.precio_final);
}
