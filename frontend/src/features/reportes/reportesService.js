import client from '../../lib/api/client';

export async function obtenerResumen() {
    const res = await client.get('/reportes/resumen');
    return res?.data ?? {};
}

export async function obtenerLibrosMasVendidos() {
    const res = await client.get('/reportes/libros-mas-vendidos');
    return Array.isArray(res?.data) ? res.data : [];
}

export async function obtenerVentasPorEstado() {
    const res = await client.get('/reportes/ventas-por-estado');
    return Array.isArray(res?.data) ? res.data : [];
}

export async function obtenerReservasPorEstado() {
    const res = await client.get('/reportes/reservas-por-estado');
    return Array.isArray(res?.data) ? res.data : [];
}

export async function obtenerStockBajo() {
    const res = await client.get('/reportes/stock-bajo');
    return Array.isArray(res?.data) ? res.data : [];
}

export async function obtenerVentasPorMes() {
    const res = await client.get('/reportes/ventas-por-mes');
    return Array.isArray(res?.data) ? res.data : [];
}

export async function obtenerVentasPorDia() {
    const res = await client.get('/reportes/ventas-por-dia');
    return Array.isArray(res?.data) ? res.data : [];
}

export async function obtenerIndicadoresVentas() {
    const res = await client.get('/reportes/indicadores-ventas');
    return res?.data ?? {};
}

// Cierre del día. Es el único indicador de caja que necesita el punto
// de venta: en lugar de /reportes/indicadores-ventas (solo admin).
export async function obtenerCierreCaja(fecha) {
    const res = await client.get('/reportes/cierre-caja', {
        params: fecha ? { fecha } : undefined,
    });
    return res?.data ?? {};
}
