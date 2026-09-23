import { formatearMoneda } from '../../lib/utils/format';
import { listarPagos } from '../pagos/pagosService';
import { obtenerStockBajo } from '../reportes/reportesService';
import { listarReservas } from '../reservas/reservasService';

// Notificaciones = solo eventos que piden atención del administrador:
// pagos en línea aprobados, reservas pendientes y libros con stock bajo.
// Se arman con endpoints existentes; cada una lleva a su registro.

const CLAVE_VISTAS = 'notificacionesVistas';
const MAX_VISTAS = 300;

const numero = (v) => Number(v) || 0;
const nombreCliente = (texto) => String(texto || '').trim() || 'un cliente';

function deStock(item) {
    const stock = numero(item.stock);
    const minimo = numero(item.stock_minimo);
    const agotado = stock <= 0;
    return {
        clave: `stock-${item.id_inventario}-${agotado ? 'agotado' : 'bajo'}`,
        tipo: 'stock',
        tono: agotado ? 'peligro' : 'aviso',
        etiqueta: agotado ? 'Sin stock' : 'Stock bajo',
        titulo: item.titulo || 'Libro sin título',
        detalle: agotado
            ? `Agotado · mínimo configurado ${minimo}`
            : `Quedan ${stock} de un mínimo de ${minimo}${item.ubicacion ? ` · ${item.ubicacion}` : ''}`,
        fecha: null,
        destino: `/inventario?ver=${item.id_libro}`,
    };
}

function dePago(pago) {
    return {
        clave: `pago-${pago.id_venta}`,
        tipo: 'pago',
        tono: 'exito',
        etiqueta: 'Pago aprobado',
        titulo: `Pago de ${nombreCliente(pago.cliente?.nombre_completo)}`,
        detalle: `${formatearMoneda(pago.monto_total)} · Venta #${pago.id_venta} · PayU`,
        fecha: pago.fecha_creacion ? new Date(pago.fecha_creacion) : null,
        destino: `/pagos?ver=${encodeURIComponent(pago.external_reference)}`,
    };
}

function deReserva(reserva) {
    const cliente = `${reserva.nombre_usuario || ''} ${reserva.apellido_usuario || ''}`;
    return {
        clave: `reserva-${reserva.id_reserva}`,
        tipo: 'reserva',
        tono: 'info',
        etiqueta: 'Reserva pendiente',
        titulo: `Reserva de ${nombreCliente(cliente)}`,
        detalle: `${reserva.titulo || 'Libro'} · ${numero(reserva.cantidad) || 1} ud.`,
        fecha: reserva.fecha_reserva ? new Date(reserva.fecha_reserva) : null,
        destino: `/reservas?ver=${reserva.id_reserva}`,
    };
}

export async function obtenerNotificaciones() {
    const [stock, pagos, reservas] = await Promise.all([
        obtenerStockBajo().catch(() => []),
        listarPagos({ estado: 'pagada', por_pagina: 15 }).then((r) => r.pagos).catch(() => []),
        listarReservas().catch(() => []),
    ]);

    const actividad = [
        // Solo pagos en línea: los cobros que registra el propio admin no se notifican.
        ...pagos.filter((p) => p.metodo_pago === 'payu' && p.external_reference).map(dePago),
        ...reservas.filter((r) => String(r.estado).toLowerCase() === 'pendiente').slice(0, 15).map(deReserva),
    ].sort((a, b) => (b.fecha?.getTime() || 0) - (a.fecha?.getTime() || 0));

    const inventario = stock.map(deStock).sort((a, b) => (a.tono === 'peligro' ? -1 : 0) - (b.tono === 'peligro' ? -1 : 0));

    return [...actividad, ...inventario];
}

// Primera vez en este navegador: lo existente se toma como ya visto.
export function esPrimeraVez() {
    try {
        return localStorage.getItem(CLAVE_VISTAS) === null;
    } catch {
        return false;
    }
}

export function leerVistas() {
    try {
        const lista = JSON.parse(localStorage.getItem(CLAVE_VISTAS) || '[]');
        return new Set(Array.isArray(lista) ? lista : []);
    } catch {
        return new Set();
    }
}

export function marcarVistas(claves) {
    try {
        const todas = [...new Set([...leerVistas(), ...claves])].slice(-MAX_VISTAS);
        localStorage.setItem(CLAVE_VISTAS, JSON.stringify(todas));
    } catch {
        // Sin almacenamiento: las notificaciones se muestran igual.
    }
}

const relativo = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
const fechaCorta = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' });

export function haceCuanto(fecha) {
    if (!fecha || Number.isNaN(fecha.getTime())) return '';
    const segundos = Math.round((fecha.getTime() - Date.now()) / 1000);
    const abs = Math.abs(segundos);
    if (abs < 60) return 'ahora';
    if (abs < 3600) return relativo.format(Math.round(segundos / 60), 'minute');
    if (abs < 86400) return relativo.format(Math.round(segundos / 3600), 'hour');
    if (abs < 7 * 86400) return relativo.format(Math.round(segundos / 86400), 'day');
    return fechaCorta.format(fecha);
}
