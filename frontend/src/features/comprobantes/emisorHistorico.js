export function emisorHistorico(comprobante = {}, empresa = {}) {
    return {
        ruc: comprobante.ruc ?? empresa.ruc ?? '',
        razon_social: comprobante.razon_social ?? empresa.razon_social ?? '',
        nombre_comercial: comprobante.emisor_nombre_comercial ?? empresa.nombre_comercial ?? '',
        direccion: comprobante.emisor_direccion ?? empresa.direccion ?? '',
    };
}
