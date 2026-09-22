import { useEffect, useState } from 'react';

import {
    FaCartShopping,
    FaMoneyBillWave,
    FaCalendarCheck,
    FaTriangleExclamation,
    FaChartColumn,
    FaRotate,
    FaCalendarDay,
    FaCalendarDays,
    FaReceipt,
    FaArrowTrendUp,
    FaTrophy,
} from 'react-icons/fa6';

import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { EmptyState } from '../../components/ui/EmptyState';
import { CargandoPantalla } from '../../components/ui/Spinner';

import { formatearMoneda } from '../../lib/utils/format';

function formatearFechaReportes(fecha) {
    if (!fecha) return 'Sin datos';
    const fechaTexto = String(fecha).split('T')[0];
    const partes = fechaTexto.split('-');
    if (partes.length !== 3) return fechaTexto;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

import {
    obtenerResumen,
    obtenerLibrosMasVendidos,
    obtenerVentasPorEstado,
    obtenerReservasPorEstado,
    obtenerStockBajo,
    obtenerVentasPorMes,
    obtenerVentasPorDia,
    obtenerIndicadoresVentas,
} from './reportesService';

function EncabezadoSeccion({ icono, titulo, descripcion }) {
    return (
        <div className="flex items-center gap-3 border-b border-primary-200 bg-parchment-200/50 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center text-xs text-mahogany-600">
                {icono}
            </div>
            <div>
                <h2 className="text-sm font-semibold text-mahogany-700">{titulo}</h2>
                <p className="mt-0.5 text-xs text-primary-500">{descripcion}</p>
            </div>
        </div>
    );
}

const REPORT_COLORS = {
    primary: {
        bg: 'bg-gradient-to-br from-[#2563eb] to-[#60a5fa]',
        iconBg: 'bg-white/15',
        iconText: 'text-white',
        line: '#bfdbfe',
    },
    danger: {
        bg: 'bg-gradient-to-br from-[#f43f5e] to-[#fb7185]',
        iconBg: 'bg-white/15',
        iconText: 'text-white',
        line: '#fecdd3',
    },
    success: {
        bg: 'bg-gradient-to-br from-[#059669] to-[#34d399]',
        iconBg: 'bg-white/15',
        iconText: 'text-white',
        line: '#a7f3d0',
    },
    warning: {
        bg: 'bg-gradient-to-br from-[#f97316] to-[#fb923c]',
        iconBg: 'bg-white/15',
        iconText: 'text-white',
        line: '#fed7aa',
    },
    info: {
        bg: 'bg-gradient-to-br from-[#0284c7] to-[#38bdf8]',
        iconBg: 'bg-white/15',
        iconText: 'text-white',
        line: '#bae6fd',
    },
    violet: {
        bg: 'bg-gradient-to-br from-[#7c3aed] to-[#a78bfa]',
        iconBg: 'bg-white/15',
        iconText: 'text-white',
        line: '#ddd6fe',
    },
    sky: {
        bg: 'bg-gradient-to-br from-[#0284c7] to-[#38bdf8]',
        iconBg: 'bg-white/15',
        iconText: 'text-white',
        line: '#bae6fd',
    },
    emerald: {
        bg: 'bg-gradient-to-br from-[#059669] to-[#34d399]',
        iconBg: 'bg-white/15',
        iconText: 'text-white',
        line: '#a7f3d0',
    },
    amber: {
        bg: 'bg-gradient-to-br from-[#d97706] to-[#fbbf24]',
        iconBg: 'bg-white/15',
        iconText: 'text-white',
        line: '#fde68a',
    },
    crimson: {
        bg: 'bg-gradient-to-br from-[#dc2626] to-[#f87171]',
        iconBg: 'bg-white/15',
        iconText: 'text-white',
        line: '#fecaca',
    },
};

function TarjetaResumen({ icono, titulo, valor, detalle, color = 'primary' }) {
    const c = REPORT_COLORS[color] || REPORT_COLORS.primary;
    return (
        <article className={`group relative min-h-[110px] overflow-hidden rounded-lg px-4 py-3 text-white shadow-[0_4px_12px_rgba(30,64,175,0.10)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(30,64,175,0.16)] ${c.bg}`}>
            <div className="relative z-10">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/85">{titulo}</p>
                        <p className="mt-2 text-[22px] font-bold leading-none tracking-[-0.02em] text-white">{valor}</p>
                        {detalle && <p className="mt-1.5 text-[10px] font-medium text-white/80">{detalle}</p>}
                    </div>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${c.iconBg} backdrop-blur-sm`}>
                        <span className={`text-sm ${c.iconText}`}>{icono}</span>
                    </div>
                </div>
            </div>
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[30px] opacity-60">
                <svg viewBox="0 0 400 55" preserveAspectRatio="none" className="h-full w-full">
                    <path d="M0 42 L20 35 L45 43 L70 39 L92 45 L118 27 L140 20 L165 28 L190 38 L215 25 L240 32 L265 17 L285 30 L305 24 L330 37 L355 21 L380 30 L400 25" fill="none" stroke={c.line} strokeWidth="2" />
                    <path d="M0 42 L20 35 L45 43 L70 39 L92 45 L118 27 L140 20 L165 28 L190 38 L215 25 L240 32 L265 17 L285 30 L305 24 L330 37 L355 21 L380 30 L400 25 L400 55 L0 55 Z" fill="rgba(255,255,255,0.08)" />
                </svg>
            </div>
        </article>
    );
}

function Destacado({ icono, titulo, principal, detalle, color = 'primary' }) {
    const c = REPORT_COLORS[color] || REPORT_COLORS.primary;
    return (
        <article className={`group relative min-h-[85px] overflow-hidden rounded-lg px-4 py-3 text-white shadow-[0_4px_12px_rgba(30,64,175,0.10)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(30,64,175,0.16)] ${c.bg}`}>
            <div className="relative z-10">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/85">{titulo}</p>
                        <p className="mt-1.5 text-[16px] font-bold leading-tight text-white">{principal}</p>
                        {detalle && <p className="mt-1 text-[10px] font-medium text-white/80">{detalle}</p>}
                    </div>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${c.iconBg} backdrop-blur-sm`}>
                        <span className={`text-sm ${c.iconText}`}>{icono}</span>
                    </div>
                </div>
            </div>
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[30px] opacity-60">
                <svg viewBox="0 0 400 55" preserveAspectRatio="none" className="h-full w-full">
                    <path d="M0 42 L20 35 L45 43 L70 39 L92 45 L118 27 L140 20 L165 28 L190 38 L215 25 L240 32 L265 17 L285 30 L305 24 L330 37 L355 21 L380 30 L400 25" fill="none" stroke={c.line} strokeWidth="2" />
                    <path d="M0 42 L20 35 L45 43 L70 39 L92 45 L118 27 L140 20 L165 28 L190 38 L215 25 L240 32 L265 17 L285 30 L305 24 L330 37 L355 21 L380 30 L400 25 L400 55 L0 55 Z" fill="rgba(255,255,255,0.08)" />
                </svg>
            </div>
        </article>
    );
}

function obtenerColorVenta(estado) {
    switch (estado) {
        case 'pagada':
            return 'bg-success-bg text-success border-success/20';
        case 'pendiente':
            return 'bg-warning-bg text-warning border-warning/20';
        case 'cancelada':
            return 'bg-crimson-100 text-crimson-500 border-crimson-200';
        default:
            return 'bg-parchment-300 text-mahogany-700 border-primary-200';
    }
}

function obtenerColorReserva(estado) {
    switch (estado) {
        case 'confirmada':
            return 'bg-sky-100 text-sky-700 border-sky-200';
        case 'pendiente':
            return 'bg-warning-bg text-warning border-warning/20';
        case 'cancelada':
            return 'bg-crimson-100 text-crimson-500 border-crimson-200';
        case 'completada':
            return 'bg-success-bg text-success border-success/20';
        default:
            return 'bg-parchment-300 text-mahogany-700 border-primary-200';
    }
}

export default function ReportesPage() {
    const [resumen, setResumen] = useState({
        total_libros: 0,
        total_autores: 0,
        total_categorias: 0,
        total_usuarios: 0,
        total_ventas: 0,
        total_vendido: 0,
        total_reservas: 0,
        libros_stock_bajo: 0,
    });

    const [indicadores, setIndicadores] = useState({
        total_ventas_pagadas: 0,
        total_vendido: 0,
        ticket_promedio: 0,
        venta_mayor: 0,
        venta_menor: 0,
        ventas_hoy: 0,
        vendido_hoy: 0,
        ventas_mes_actual: 0,
        vendido_mes_actual: 0,
        mejor_mes: null,
        mejor_dia: null,
    });

    const [librosMasVendidos, setLibrosMasVendidos] = useState([]);
    const [ventasPorEstado, setVentasPorEstado] = useState([]);
    const [reservasPorEstado, setReservasPorEstado] = useState([]);
    const [stockBajo, setStockBajo] = useState([]);
    const [ventasPorMes, setVentasPorMes] = useState([]);
    const [ventasPorDia, setVentasPorDia] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const cargarReportes = async () => {
        try {
            setCargando(true);
            setError('');

            const [
                resumenRespuesta,
                librosRespuesta,
                ventasRespuesta,
                reservasRespuesta,
                stockRespuesta,
                ventasMesRespuesta,
                ventasDiaRespuesta,
                indicadoresRespuesta,
            ] = await Promise.all([
                obtenerResumen(),
                obtenerLibrosMasVendidos(),
                obtenerVentasPorEstado(),
                obtenerReservasPorEstado(),
                obtenerStockBajo(),
                obtenerVentasPorMes(),
                obtenerVentasPorDia(),
                obtenerIndicadoresVentas(),
            ]);

            setResumen(resumenRespuesta);
            setLibrosMasVendidos(librosRespuesta);
            setVentasPorEstado(ventasRespuesta);
            setReservasPorEstado(reservasRespuesta);
            setStockBajo(stockRespuesta);
            setVentasPorMes(ventasMesRespuesta);
            setVentasPorDia(ventasDiaRespuesta);
            setIndicadores(indicadoresRespuesta);
        } catch (error) {
            console.error('Error al cargar reportes:', error);
            setError(error.response?.data?.mensaje || 'Error al cargar los reportes');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarReportes();
    }, []);

    const maximoMensual = Math.max(...ventasPorMes.map((item) => Number(item.total_vendido || 0)), 1);
    const maximoDiario = Math.max(...ventasPorDia.map((item) => Number(item.total_vendido || 0)), 1);

    return (
        <div className="space-y-2">
            <PageHeader
                titulo="Reportes"
                descripcion="Análisis general, comercial y operativo de la librería"
                acciones={
                    <Button variante="secondary" icono={<FaRotate />} onClick={cargarReportes} cargando={cargando}>
                        {cargando ? 'Actualizando...' : 'Actualizar reportes'}
                    </Button>
                }
            />

            {cargando && (
                <Card>
                    <CargandoPantalla texto="Cargando reportes..." />
                </Card>
            )}

            {!cargando && error && <Alert tipo="error">{error}</Alert>}

            {!cargando && !error && (
                <>
                    <Card>
                        <CardBody className="p-0">
                            <EncabezadoSeccion
                                icono={<FaArrowTrendUp />}
                                titulo="Indicadores de ventas"
                                descripcion="Resultados calculados a partir de ventas pagadas"
                            />

                            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                                <TarjetaResumen
                                    icono={<FaCalendarDay />}
                                    titulo="Ventas de hoy"
                                    valor={indicadores.ventas_hoy || 0}
                                    detalle={formatearMoneda(indicadores.vendido_hoy)}
                                    color="sky"
                                />
                                <TarjetaResumen
                                    icono={<FaCalendarDays />}
                                    titulo="Ventas del mes"
                                    valor={indicadores.ventas_mes_actual || 0}
                                    detalle={formatearMoneda(indicadores.vendido_mes_actual)}
                                    color="primary"
                                />
                                <TarjetaResumen
                                    icono={<FaReceipt />}
                                    titulo="Ticket promedio"
                                    valor={formatearMoneda(indicadores.ticket_promedio)}
                                    detalle="Promedio por venta pagada"
                                    color="violet"
                                />
                                <TarjetaResumen
                                    icono={<FaMoneyBillWave />}
                                    titulo="Venta más alta"
                                    valor={formatearMoneda(indicadores.venta_mayor)}
                                    detalle="Mayor venta pagada"
                                    color="success"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-3 border-t border-primary-200 p-4 lg:grid-cols-2">
                                <Destacado
                                    icono={<FaTrophy />}
                                    titulo="Mejor mes registrado"
                                    principal={
                                        indicadores.mejor_mes
                                            ? `${indicadores.mejor_mes.mes} ${indicadores.mejor_mes.anio}`
                                            : 'Sin datos'
                                    }
                                    detalle={
                                        indicadores.mejor_mes
                                            ? `${indicadores.mejor_mes.cantidad_ventas} ventas · ${formatearMoneda(indicadores.mejor_mes.total_vendido)}`
                                            : 'Aún no existen ventas pagadas.'
                                    }
                                    color="amber"
                                />
                                <Destacado
                                    icono={<FaCalendarDay />}
                                    titulo="Mejor día registrado"
                                    principal={
                                        indicadores.mejor_dia
                                            ? formatearFechaReportes(indicadores.mejor_dia.fecha)
                                            : 'Sin datos'
                                    }
                                    detalle={
                                        indicadores.mejor_dia
                                            ? `${indicadores.mejor_dia.cantidad_ventas} ventas · ${formatearMoneda(indicadores.mejor_dia.total_vendido)}`
                                            : 'Aún no existen ventas pagadas.'
                                    }
                                    color="success"
                                />
                            </div>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardBody className="p-0">
                            <EncabezadoSeccion
                                icono={<FaChartColumn />}
                                titulo="Ventas por mes"
                                descripcion="Evolución de ingresos provenientes de ventas pagadas"
                            />

                            {ventasPorMes.length === 0 ? (
                                <EmptyState titulo="Sin ventas por mes" descripcion="Todavia no existen ventas pagadas para mostrar." />
                            ) : (
                                <div className="p-4">
                                    <div className="rounded-lg border border-primary-200 bg-parchment-200/60 p-4">
                                        <div className="flex h-44 items-end gap-2 overflow-x-auto border-b border-primary-200 pb-6">
                                            {ventasPorMes.map((item) => {
                                                const porcentaje = Math.max(5, (Number(item.total_vendido || 0) / maximoMensual) * 100);
                                                return (
                                                    <div
                                                        key={`${item.anio}-${item.mes_numero}`}
                                                        className="group relative flex h-full min-w-[44px] flex-1 items-end justify-center"
                                                    >
                                                        <div
                                                            className="relative w-7 rounded-t-sm bg-primary-500 transition-all duration-300 hover:bg-primary-600"
                                                            style={{ height: `${porcentaje}%` }}
                                                        >
                                                            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-mahogany-700 px-2 py-1 text-[10px] font-semibold text-white shadow-lg group-hover:block">
                                                                {formatearMoneda(item.total_vendido)}
                                                            </div>
                                                        </div>
                                                        <div className="absolute -bottom-5 whitespace-nowrap text-[10px] font-semibold text-primary-500">
                                                            {item.mes} {String(item.anio).slice(-2)}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="mt-4 overflow-x-auto rounded-lg border border-primary-200">
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className="border-b-2 border-primary-200 bg-parchment-200">
                                                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-mahogany-700">Periodo</th>
                                                    <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-mahogany-700">Ventas</th>
                                                    <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-mahogany-700">Total vendido</th>
                                                    <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-mahogany-700">Promedio</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-primary-200">
                                                {[...ventasPorMes].reverse().map((item) => (
                                                    <tr key={`tabla-${item.anio}-${item.mes_numero}`} className="hover:bg-parchment-200">
                                                        <td className="px-4 py-2.5 text-xs font-semibold text-mahogany-700">{item.mes} {item.anio}</td>
                                                        <td className="px-4 py-2.5 text-center text-xs font-semibold text-mahogany-700">{item.cantidad_ventas}</td>
                                                        <td className="px-4 py-2.5 text-right text-xs font-semibold text-mahogany-700">{formatearMoneda(item.total_vendido)}</td>
                                                        <td className="px-4 py-2.5 text-right text-xs text-mahogany-700">{formatearMoneda(item.promedio_venta)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardBody className="p-0">
                            <EncabezadoSeccion
                                icono={<FaCalendarDay />}
                                titulo="Ventas diarias"
                                descripcion="Detalle de los últimos días que registraron ventas pagadas"
                            />

                            {ventasPorDia.length === 0 ? (
                                <EmptyState titulo="Sin ventas diarias" descripcion="No existen ventas diarias para mostrar." />
                            ) : (
                                <div className="p-4">
                                    <div className="rounded-lg border border-primary-200 bg-parchment-200/60 p-4">
                                        <div className="flex h-36 items-end gap-1.5 overflow-x-auto border-b border-primary-200 pb-6">
                                            {ventasPorDia.map((item) => {
                                                const porcentaje = Math.max(5, (Number(item.total_vendido || 0) / maximoDiario) * 100);
                                                return (
                                                    <div
                                                        key={String(item.fecha)}
                                                        className="group relative flex h-full min-w-[28px] flex-1 items-end justify-center"
                                                    >
                                                        <div
                                                            className="relative w-4 rounded-t-sm bg-sky-500 transition hover:bg-sky-600"
                                                            style={{ height: `${porcentaje}%` }}
                                                        >
                                                            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-mahogany-700 px-2 py-1 text-[10px] font-semibold text-white shadow-lg group-hover:block">
                                                                {formatearMoneda(item.total_vendido)}
                                                            </div>
                                                        </div>
                                                        <span className="absolute -bottom-5 text-[9px] font-semibold text-primary-500">{item.dia}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="mt-4 max-h-72 overflow-auto rounded-lg border border-primary-200">
                                        <table className="min-w-full">
                                            <thead className="sticky top-0 z-10 bg-parchment-200">
                                                <tr className="border-b-2 border-primary-200">
                                                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase text-mahogany-700">Fecha</th>
                                                    <th className="px-4 py-3 text-center text-[11px] font-bold uppercase text-mahogany-700">Ventas</th>
                                                    <th className="px-4 py-3 text-right text-[11px] font-bold uppercase text-mahogany-700">Total</th>
                                                    <th className="px-4 py-3 text-right text-[11px] font-bold uppercase text-mahogany-700">Promedio</th>
                                                    <th className="px-4 py-3 text-right text-[11px] font-bold uppercase text-mahogany-700">Venta mayor</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-primary-200 bg-white">
                                                {[...ventasPorDia].reverse().map((item) => (
                                                    <tr key={`dia-${String(item.fecha)}`} className="hover:bg-parchment-200">
                                                        <td className="px-4 py-2.5 text-xs font-semibold text-mahogany-700">{formatearFechaReportes(item.fecha)}</td>
                                                        <td className="px-4 py-2.5 text-center text-xs font-semibold text-mahogany-700">{item.cantidad_ventas}</td>
                                                        <td className="px-4 py-2.5 text-right text-xs font-semibold text-mahogany-700">{formatearMoneda(item.total_vendido)}</td>
                                                        <td className="px-4 py-2.5 text-right text-xs text-mahogany-700">{formatearMoneda(item.promedio_venta)}</td>
                                                        <td className="px-4 py-2.5 text-right text-xs font-semibold text-mahogany-700">{formatearMoneda(item.venta_mayor)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                        <Card>
                            <CardBody className="p-0">
                                <EncabezadoSeccion icono={<FaCartShopping />} titulo="Ventas por estado" descripcion="Distribución de las ventas registradas" />

                                {ventasPorEstado.length === 0 ? (
                                    <EmptyState titulo="Sin ventas" descripcion="No hay ventas registradas." />
                                ) : (
                                     <div className="divide-y divide-primary-200">
                                        {ventasPorEstado.map((venta) => (
                                            <div key={venta.estado} className="flex items-center justify-between gap-4 px-4 py-3">
                                                <div>
                                                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${obtenerColorVenta(venta.estado)}`}>
                                                        {venta.estado}
                                                    </span>
                                                    <p className="mt-1.5 text-[11px] text-primary-500">
                                                        Total acumulado: <span className="font-semibold text-mahogany-700">{formatearMoneda(venta.total)}</span>
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-mahogany-700">{venta.cantidad}</p>
                                                    <p className="text-[11px] text-primary-500">ventas</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardBody>
                        </Card>

                        <Card>
                            <CardBody className="p-0">
                                <EncabezadoSeccion icono={<FaCalendarCheck />} titulo="Reservas por estado" descripcion="Distribución de las reservas registradas" />

                                {reservasPorEstado.length === 0 ? (
                                    <EmptyState titulo="Sin reservas" descripcion="No hay reservas registradas." />
                                ) : (
                                    <div className="divide-y divide-primary-200">
                                        {reservasPorEstado.map((reserva) => (
                                            <div key={reserva.estado} className="flex items-center justify-between gap-4 px-4 py-3">
                                                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${obtenerColorReserva(reserva.estado)}`}>
                                                    {reserva.estado}
                                                </span>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-mahogany-700">{reserva.cantidad}</p>
                                                    <p className="text-[11px] text-primary-500">reservas</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <Card>
                            <CardBody className="p-0">
                                <EncabezadoSeccion icono={<FaTrophy />} titulo="Libros mas vendidos" descripcion="Ranking basado unicamente en ventas pagadas" />

                                {librosMasVendidos.length === 0 ? (
                                    <EmptyState titulo="Sin ventas" descripcion="Todavia no hay ventas pagadas." />
                                ) : (
                                    <div className="overflow-x-auto p-3">
                                        <table className="min-w-full rounded-lg border border-primary-200">
                                            <thead>
                                                <tr className="border-b-2 border-primary-200 bg-parchment-200">
                                                    <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-mahogany-700">#</th>
                                                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-mahogany-700">Libro</th>
                                                    <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-mahogany-700">Unid.</th>
                                                    <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-mahogany-700">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-primary-200">
                                                {librosMasVendidos.map((libro, index) => (
                                                    <tr key={libro.id_libro} className="hover:bg-parchment-200">
                                                        <td className="px-3 py-2 text-center text-[11px] font-semibold text-mahogany-700">{index + 1}</td>
                                                        <td className="px-3 py-2 text-[11px] font-semibold text-mahogany-700 truncate max-w-[140px]">{libro.titulo}</td>
                                                        <td className="px-3 py-2 text-center">
                                                            <span className="inline-flex rounded bg-parchment-300 px-1.5 py-0.5 text-[10px] font-semibold text-mahogany-700">
                                                                {libro.cantidad_vendida}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-right text-[11px] font-bold text-mahogany-700">{formatearMoneda(libro.total_generado)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardBody>
                        </Card>

                        <Card>
                            <CardBody className="p-0">
                                <div className="flex items-center justify-between border-b border-primary-200 bg-parchment-200/50 px-3 py-2.5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-crimson-100 text-[11px] text-crimson-500">
                                            <FaTriangleExclamation />
                                        </div>
                                        <div>
                                            <h2 className="text-xs font-bold text-mahogany-700">Libros con stock bajo</h2>
                                            <p className="mt-0.5 text-[10px] text-primary-500">Stock menor o igual al minimo configurado</p>
                                        </div>
                                    </div>
                                    <span className="rounded-full border border-crimson-200 bg-crimson-100 px-2 py-0.5 text-[10px] font-bold text-crimson-500">
                                        {stockBajo.length}
                                    </span>
                                </div>

                                {stockBajo.length === 0 ? (
                                    <EmptyState titulo="Inventario en orden" descripcion="Todo el inventario esta en niveles normales." />
                                ) : (
                                    <div className="overflow-x-auto p-3">
                                        <table className="min-w-full rounded-lg border border-primary-200">
                                            <thead>
                                                <tr className="border-b-2 border-primary-200 bg-parchment-200">
                                                    <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase text-mahogany-700">ID</th>
                                                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase text-mahogany-700">Libro</th>
                                                    <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase text-mahogany-700">Stock</th>
                                                    <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase text-mahogany-700">Min.</th>
                                                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase text-mahogany-700">Ubic.</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-primary-200">
                                                {stockBajo.map((item) => {
                                                    const sinStock = Number(item.stock) <= 0;
                                                    return (
                                                        <tr key={item.id_inventario} className="hover:bg-parchment-200">
                                                            <td className="px-3 py-2 text-center text-[11px] text-mahogany-700">{item.id_inventario}</td>
                                                            <td className="px-3 py-2 text-[11px] font-semibold text-mahogany-700 truncate max-w-[120px]">{item.titulo}</td>
                                                            <td className="px-3 py-2 text-center">
                                                                <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${sinStock ? 'bg-crimson-100 text-crimson-500' : 'bg-warning-bg text-warning'}`}>
                                                                    {sinStock ? 'Sin stock' : item.stock}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2 text-center text-[11px] font-semibold text-mahogany-700">{item.stock_minimo}</td>
                                                            <td className="px-3 py-2 text-[11px] text-mahogany-700 truncate max-w-[90px]">{item.ubicacion || 'No registrada'}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}

