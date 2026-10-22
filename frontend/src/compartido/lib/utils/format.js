export function formatearFecha(fecha, opciones = {}) {
    if (!fecha) return '';
    const objeto = new Date(fecha);
    if (Number.isNaN(objeto.getTime())) return '';
    return objeto.toLocaleString('es-PE', {
        day: '2-digit',
        month: opciones.soloDia ? '2-digit' : 'short',
        year: opciones.soloDia ? undefined : 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatearMoneda(valor) {
    return `S/ ${Number(valor || 0).toFixed(2)}`;
}

export function pluralizar(cantidad, singular, plural) {
    return cantidad === 1 ? singular : plural;
}
