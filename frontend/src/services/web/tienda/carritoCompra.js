export function estadoCarrito(datos) {
    const lista = Array.isArray(datos) ? datos : datos?.items;
    const ids = new Set();
    const items = (Array.isArray(lista) ? lista : [])
        .filter((i) => {
            if (!Number.isInteger(i.id_libro) || i.id_libro < 1 || ids.has(i.id_libro) || !Number.isInteger(i.cantidad) || i.cantidad < 1 || i.cantidad > 999) return false;
            ids.add(i.id_libro);
            return true;
        })
        .map((i) => ({
            id_libro: i.id_libro,
            cantidad: i.cantidad,
            linea: i.linea || `previa-${i.id_libro}`,
            retiradas: Number.isInteger(i.retiradas) && i.retiradas >= 0 ? i.retiradas : 0
        }));
    return { items, confirmadas: Array.isArray(datos?.confirmadas) ? datos.confirmadas : [] };
}

export function descontarCompra(estado, intento, venta) {
    const id = String(venta.id_venta);
    if (estado.confirmadas.includes(id)) return estado;
    const detalle = venta.detalle || venta.detalles;
    if (!Array.isArray(detalle) || !detalle.length) throw new Error('Falta el detalle confirmado de la compra. Reintenta actualizar tus compras.');
    const originales = intento.carrito || intento.items || intento.cuerpo.items;
    const items = estado.items
        .map((i) => {
            const original = originales.find((x) => x.id_libro === i.id_libro);
            if (!original || i.linea !== (original.linea || `previa-${i.id_libro}`)) return i;
            const pagadas = detalle.filter((x) => Number(x.id_libro) === i.id_libro).reduce((s, x) => s + Number(x.cantidad || 0), 0);
            const pendientes = Math.max(0, original.cantidad - Math.max(0, i.retiradas - (original.retiradas || 0)));
            return { ...i, cantidad: i.cantidad - Math.min(i.cantidad, pendientes, pagadas) };
        })
        .filter((i) => i.cantidad > 0);

    return { items, confirmadas: [...estado.confirmadas, id] };
}
