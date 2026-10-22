// Solo las ventas marcadas por el nuevo checkout son de Pallasca.
export const esEntregaPallasca = (venta) => venta?.cobertura_entrega === 'pallasca';

export function descripcionEntrega(venta) {
    if (venta?.tipo_entrega === 'domicilio') return esEntregaPallasca(venta) ? 'Delivery dentro de Pallasca' : 'A domicilio';
    if (venta?.tipo_entrega === 'tienda') return esEntregaPallasca(venta) ? 'Recojo en Pallasca' : 'Recoger en tienda';
    if (venta?.tipo_entrega === 'agencia') return 'Agencia courier (histórico)';
    return 'Sin especificar';
}

export function ubicacionEntrega(venta) {
    if (esEntregaPallasca(venta)) return [venta.zona_delivery_nombre, 'Pallasca'].filter(Boolean).join(', ');
    return [venta?.distrito, venta?.provincia].filter(Boolean).join(', ');
}
