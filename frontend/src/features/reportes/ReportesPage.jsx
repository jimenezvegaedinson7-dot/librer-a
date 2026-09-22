import { useEffect, useState } from 'react';

import {
    CalendarDays,
    BarChart3,
    Tag,
    Banknote,
    Trophy,
    CalendarCheck,
} from 'lucide-react';

import {
    FaBoxOpen,
    FaCartShopping,
    FaCalendarCheck,
    FaTriangleExclamation,
    FaChartColumn,
    FaRotate,
    FaCalendarDay,
    FaTrophy,
} from 'react-icons/fa6';
import { motion, useReducedMotion } from 'motion/react';

import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/TableSkeleton';

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

// Paleta de marca para los reportes; cada tono es una variable CSS con su versión oscura.
const TONOS = {
    burdeos: 'var(--r-burdeos)',
    oro: 'var(--r-oro)',
    tinta: 'var(--r-tinta)',
    verde: 'var(--r-verde)',
};

const suave = (color, porcentaje) => `color-mix(in srgb, ${color} ${porcentaje}%, transparent)`;

const escalonado = {
    oculto: {},
    visible: { transition: { staggerChildren: 0.06 } },
};

const entrada = {
    oculto: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 1, 0.5, 1] } },
};

function EncabezadoSeccion({ icono, titulo, descripcion, acciones = null, peligro = false }) {
    return (
        <div className="reporte-encabezado flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
                <div className={`${peligro ? 'reporte-icono-peligro' : 'ficha-icono'} flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm`} aria-hidden="true">
                    {icono}
                </div>
                <div className="min-w-0">
                    <h2 className="font-title text-[17px] font-semibold leading-snug text-slate-900">{titulo}</h2>
                    <p className="mt-0.5 text-[13px] text-slate-500">{descripcion}</p>
                </div>
            </div>
            {acciones}
        </div>
    );
}

function MiniSparkline({ data, tono = 'burdeos', height = 32, width = 120 }) {
    if (!data || data.length < 2) return null;
    const color = TONOS[tono];
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const step = width / (data.length - 1);
    const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 4)}`);
    const pathD = points.map((p, i) => (i === 0 ? `M${p}` : `L${p}`)).join(' ');
    const fillD = `${pathD} L${width},${height} L0,${height} Z`;
    return (
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} aria-hidden="true">
            <defs>
                <linearGradient id={`spark-${tono}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.18 }} />
                    <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.01 }} />
                </linearGradient>
            </defs>
            <path d={fillD} fill={`url(#spark-${tono})`} />
            <path d={pathD} fill="none" style={{ stroke: color }} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
    );
}

function MiniBarChart({ data, tono = 'burdeos', highlightLast = false, height = 32 }) {
    if (!data || data.length === 0) return null;
    const color = TONOS[tono];
    const max = Math.max(...data);
    return (
        <div className="flex items-end gap-[3px]" style={{ height }} aria-hidden="true">
            {data.map((v, i) => {
                const h = max > 0 ? (v / max) * 100 : 0;
                const isLast = highlightLast && i === data.length - 1;
                return (
                    <div
                        key={i}
                        className="reporte-barra flex-1 rounded-[2px]"
                        style={{
                            '--barra-i': i,
                            height: `${Math.max(h, 8)}%`,
                            backgroundColor: isLast ? color : suave(color, 22),
                        }}
                    />
                );
            })}
        </div>
    );
}

function Etiquetas({ etiquetas }) {
    if (!etiquetas) return null;
    return (
        <div className="mt-1 flex justify-between gap-1">
            {etiquetas.map((l, i) => (
                <span key={i} className="flex-1 truncate text-center text-[10px] capitalize text-slate-500">{l}</span>
            ))}
        </div>
    );
}

function ReportCard({ icon: Icon, titulo, subtitulo, valor, monto, tono = 'burdeos', sparkData, barData, barLabels }) {
    const reducirMovimiento = useReducedMotion();
    const color = TONOS[tono];
    const hasBarData = barData && barData.length > 0;
    const hasSparkData = sparkData && sparkData.length > 1;
    return (
        <motion.article variants={reducirMovimiento ? undefined : entrada} className="reporte-card">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="kpi-label">{titulo}</p>
                    <p className="mt-0.5 text-[12px] text-slate-500">{subtitulo}</p>
                </div>
                <span className="kpi-icono" style={{ backgroundColor: suave(color, 12), color }} aria-hidden="true">
                    <Icon size={17} strokeWidth={1.9} />
                </span>
            </div>
            <p className="kpi-valor !pt-3">{valor}</p>
            {monto && <p className="mt-1 text-sm font-semibold tabular-nums" style={{ color }}>{monto}</p>}
            {hasSparkData && (
                <div className="mt-3">
                    <MiniSparkline data={sparkData} tono={tono} height={28} />
                </div>
            )}
            {hasBarData && (
                <div className="mt-3">
                    <MiniBarChart data={barData} tono={tono} highlightLast height={28} />
                    <Etiquetas etiquetas={barLabels} />
                </div>
            )}
        </motion.article>
    );
}

function ReportDestacadoCard({ icon: Icon, titulo, subtitulo, principal, detalle, tono = 'oro', barData, barLabels }) {
    const reducirMovimiento = useReducedMotion();
    const color = TONOS[tono];
    return (
        <motion.article variants={reducirMovimiento ? undefined : entrada} className="reporte-card reporte-card--destacado">
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:items-end">
                <div className="min-w-0">
                    <div className="flex items-center gap-3">
                        <span className="kpi-icono" style={{ backgroundColor: suave(color, 14), color }} aria-hidden="true">
                            <Icon size={18} strokeWidth={1.9} />
                        </span>
                        <div className="min-w-0">
                            <p className="kpi-label">{titulo}</p>
                            <p className="mt-0.5 text-[12px] text-slate-500">{subtitulo}</p>
                        </div>
                    </div>
                    <p className="mt-4 font-title text-[26px] font-semibold capitalize leading-tight tracking-[-0.015em] text-slate-900">{principal}</p>
                    {detalle && <p className="mt-1 text-[13px] tabular-nums text-slate-500">{detalle}</p>}
                </div>
                {barData && barData.length > 0 && (
                    <div>
                        <MiniBarChart data={barData} tono={tono} highlightLast height={56} />
                        <Etiquetas etiquetas={barLabels} />
                    </div>
                )}
            </div>
        </motion.article>
    );
}

function GraficoBarras({ datos, maximo, clave, etiqueta, tono, alto = 'h-48', anchoMin = 'min-w-[44px]', anchoBarra = 'w-7' }) {
    const color = TONOS[tono];
    return (
        <div className="reporte-grafico rounded-xl border border-slate-200 p-4 pt-8">
            <div className={`relative flex ${alto} items-end gap-2 overflow-x-auto pb-7`}>
                <div className="pointer-events-none absolute inset-x-0 bottom-7 border-t border-slate-300" aria-hidden="true" />
                <div className="pointer-events-none absolute inset-x-0 bottom-[calc(50%+14px)] border-t border-dashed border-slate-200" aria-hidden="true" />
                {datos.map((item, i) => {
                    const monto = Number(item.total_vendido || 0);
                    const porcentaje = Math.max(4, (monto / maximo) * 100);
                    const texto = `${etiqueta(item)}: ${formatearMoneda(item.total_vendido)}`;
                    return (
                        <div key={clave(item)} className={`group relative flex h-full ${anchoMin} flex-1 items-end justify-center`}>
                            <div
                                tabIndex={0}
                                role="img"
                                aria-label={texto}
                                className={`reporte-barra relative ${anchoBarra} cursor-default rounded-t-[3px] outline-none transition-[filter] duration-150 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[#b98d3e] focus-visible:ring-offset-2`}
                                style={{ '--barra-i': Math.min(i, 16), height: `${porcentaje}%`, backgroundColor: color }}
                            >
                                <div className="reporte-tooltip pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold tabular-nums opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                                    {formatearMoneda(item.total_vendido)}
                                </div>
                            </div>
                            <span className="absolute -bottom-6 whitespace-nowrap text-[10.5px] font-medium capitalize text-slate-500">
                                {etiqueta(item)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function obtenerColorVenta(estado) {
    switch (estado) {
        case 'pagada':
            return 'bg-success-bg text-success border-success/20';
        case 'pendiente':
            return 'bg-warning-bg text-warning border-warning/20';
        case 'cancelada':
            return 'bg-crimson-100 text-crimson-600 border-crimson-200';
        default:
            return 'bg-parchment-300 text-slate-700 border-primary-200';
    }
}

function obtenerColorReserva(estado) {
    switch (estado) {
        case 'confirmada':
            return 'bg-sky-100 text-sky-700 border-sky-200';
        case 'pendiente':
            return 'bg-warning-bg text-warning border-warning/20';
        case 'cancelada':
            return 'bg-crimson-100 text-crimson-600 border-crimson-200';
        case 'completada':
            return 'bg-success-bg text-success border-success/20';
        default:
            return 'bg-parchment-300 text-slate-700 border-primary-200';
    }
}

function EsqueletoReportes() {
    return (
        <div className="space-y-5" role="status" aria-label="Cargando reportes">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="card space-y-3 p-5">
                        <div className="skeleton h-3 w-24" />
                        <div className="skeleton h-7 w-32" />
                        <div className="skeleton h-7 w-full" />
                    </div>
                ))}
            </div>
            <TableSkeleton columnas={4} filas={5} titulo />
        </div>
    );
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
        <div className="space-y-5">
            <PageHeader
                titulo="Reportes"
                descripcion="Análisis general, comercial y operativo de la librería"
                acciones={
                    <Button variante="secondary" icono={<FaRotate />} onClick={cargarReportes} cargando={cargando}>
                        {cargando ? 'Actualizando...' : 'Actualizar reportes'}
                    </Button>
                }
            />

            {cargando && <EsqueletoReportes />}

            {!cargando && error && <Alert tipo="error">{error}</Alert>}

            {!cargando && !error && (
                <>
                    <motion.section
                        aria-label="Indicadores de ventas"
                        variants={escalonado}
                        initial="oculto"
                        animate="visible"
                        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
                    >
                        <ReportCard
                            icon={CalendarDays}
                            titulo="Ventas de hoy"
                            subtitulo="Total del día"
                            valor={indicadores.ventas_hoy || 0}
                            monto={formatearMoneda(indicadores.vendido_hoy)}
                            tono="burdeos"
                            sparkData={ventasPorDia.slice(-7).map(d => Number(d.total_vendido || 0))}
                        />
                        <ReportCard
                            icon={BarChart3}
                            titulo="Ventas del mes"
                            subtitulo="Total acumulado"
                            valor={indicadores.ventas_mes_actual || 0}
                            monto={formatearMoneda(indicadores.vendido_mes_actual)}
                            tono="oro"
                            barData={ventasPorMes.slice(-4).map(d => Number(d.total_vendido || 0))}
                            barLabels={ventasPorMes.slice(-4).map(d => d.mes ? d.mes.substring(0, 3) : '')}
                        />
                        <ReportCard
                            icon={Tag}
                            titulo="Ticket promedio"
                            subtitulo="Promedio por venta pagada"
                            valor={formatearMoneda(indicadores.ticket_promedio)}
                            tono="tinta"
                            sparkData={ventasPorMes.slice(-6).map(d => Number(d.promedio_venta || 0))}
                        />
                        <ReportCard
                            icon={Banknote}
                            titulo="Venta más alta"
                            subtitulo="Mayor venta pagada"
                            valor={formatearMoneda(indicadores.venta_mayor)}
                            tono="verde"
                            barData={ventasPorDia.slice(-6).map(d => Number(d.venta_mayor || 0))}
                            barLabels={ventasPorDia.slice(-6).map(d => d.dia || '')}
                        />
                    </motion.section>

                    <motion.section
                        aria-label="Mejores registros"
                        variants={escalonado}
                        initial="oculto"
                        animate="visible"
                        className="grid grid-cols-1 gap-4 xl:grid-cols-2"
                    >
                        <ReportDestacadoCard
                            icon={Trophy}
                            titulo="Mejor mes registrado"
                            subtitulo="Mes con mayor facturación"
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
                            tono="oro"
                            barData={ventasPorMes.slice(-12).map(d => Number(d.total_vendido || 0))}
                            barLabels={ventasPorMes.slice(-12).map(d => d.mes ? d.mes.substring(0, 3) : '')}
                        />
                        <ReportDestacadoCard
                            icon={CalendarCheck}
                            titulo="Mejor día registrado"
                            subtitulo="Día con mayor facturación"
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
                            tono="burdeos"
                            barData={ventasPorDia.slice(-7).map(d => Number(d.total_vendido || 0))}
                            barLabels={ventasPorDia.slice(-7).map(d => d.dia || '')}
                        />
                    </motion.section>

                    <Card>
                        <EncabezadoSeccion
                            icono={<FaChartColumn />}
                            titulo="Ventas por mes"
                            descripcion="Evolución de ingresos provenientes de ventas pagadas"
                        />
                        <CardBody className="p-0">
                            {ventasPorMes.length === 0 ? (
                                <div className="p-5">
                                    <EmptyState titulo="Sin ventas por mes" descripcion="Todavía no existen ventas pagadas para mostrar." icono={<FaChartColumn />} />
                                </div>
                            ) : (
                                <div className="space-y-4 p-5">
                                    <GraficoBarras
                                        datos={ventasPorMes}
                                        maximo={maximoMensual}
                                        clave={(item) => `${item.anio}-${item.mes_numero}`}
                                        etiqueta={(item) => `${item.mes} ${String(item.anio).slice(-2)}`}
                                        tono="burdeos"
                                    />

                                    <div className="tabla-reporte overflow-x-auto rounded-xl border border-slate-200">
                                        <table className="min-w-full">
                                            <thead>
                                                <tr>
                                                    <th scope="col" className="text-left">Periodo</th>
                                                    <th scope="col" className="text-center">Ventas</th>
                                                    <th scope="col" className="text-right">Total vendido</th>
                                                    <th scope="col" className="text-right">Promedio</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {[...ventasPorMes].reverse().map((item) => (
                                                    <tr key={`tabla-${item.anio}-${item.mes_numero}`}>
                                                        <td className="font-semibold capitalize text-slate-800">{item.mes} {item.anio}</td>
                                                        <td className="text-center">{item.cantidad_ventas}</td>
                                                        <td className="text-right font-semibold text-slate-800">{formatearMoneda(item.total_vendido)}</td>
                                                        <td className="text-right">{formatearMoneda(item.promedio_venta)}</td>
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
                        <EncabezadoSeccion
                            icono={<FaCalendarDay />}
                            titulo="Ventas diarias"
                            descripcion="Detalle de los últimos días que registraron ventas pagadas"
                        />
                        <CardBody className="p-0">
                            {ventasPorDia.length === 0 ? (
                                <div className="p-5">
                                    <EmptyState titulo="Sin ventas diarias" descripcion="No existen ventas diarias para mostrar." icono={<FaCalendarDay />} />
                                </div>
                            ) : (
                                <div className="space-y-4 p-5">
                                    <GraficoBarras
                                        datos={ventasPorDia}
                                        maximo={maximoDiario}
                                        clave={(item) => String(item.fecha)}
                                        etiqueta={(item) => item.dia}
                                        tono="oro"
                                        alto="h-40"
                                        anchoMin="min-w-[28px]"
                                        anchoBarra="w-4"
                                    />

                                    <div className="tabla-reporte max-h-80 overflow-auto rounded-xl border border-slate-200">
                                        <table className="min-w-full">
                                            <thead className="sticky top-0 z-10">
                                                <tr>
                                                    <th scope="col" className="text-left">Fecha</th>
                                                    <th scope="col" className="text-center">Ventas</th>
                                                    <th scope="col" className="text-right">Total</th>
                                                    <th scope="col" className="text-right">Promedio</th>
                                                    <th scope="col" className="text-right">Venta mayor</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {[...ventasPorDia].reverse().map((item) => (
                                                    <tr key={`dia-${String(item.fecha)}`}>
                                                        <td className="font-semibold text-slate-800">{formatearFechaReportes(item.fecha)}</td>
                                                        <td className="text-center">{item.cantidad_ventas}</td>
                                                        <td className="text-right font-semibold text-slate-800">{formatearMoneda(item.total_vendido)}</td>
                                                        <td className="text-right">{formatearMoneda(item.promedio_venta)}</td>
                                                        <td className="text-right">{formatearMoneda(item.venta_mayor)}</td>
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
                            <EncabezadoSeccion icono={<FaCartShopping />} titulo="Ventas por estado" descripcion="Distribución de las ventas registradas" />
                            <CardBody className="p-0">
                                {ventasPorEstado.length === 0 ? (
                                    <div className="p-5">
                                        <EmptyState titulo="Sin ventas" descripcion="No hay ventas registradas." icono={<FaCartShopping />} />
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-slate-200">
                                        {ventasPorEstado.map((venta) => (
                                            <li key={venta.estado} className="flex items-center justify-between gap-4 px-5 py-3.5">
                                                <div>
                                                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${obtenerColorVenta(venta.estado)}`}>
                                                        {venta.estado}
                                                    </span>
                                                    <p className="mt-1.5 text-[13px] text-slate-500">
                                                        Total acumulado: <span className="font-semibold tabular-nums text-slate-800">{formatearMoneda(venta.total)}</span>
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-title text-[22px] font-semibold leading-none tabular-nums text-slate-900">{venta.cantidad}</p>
                                                    <p className="mt-1 text-xs text-slate-500">ventas</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardBody>
                        </Card>

                        <Card>
                            <EncabezadoSeccion icono={<FaCalendarCheck />} titulo="Reservas por estado" descripcion="Distribución de las reservas registradas" />
                            <CardBody className="p-0">
                                {reservasPorEstado.length === 0 ? (
                                    <div className="p-5">
                                        <EmptyState titulo="Sin reservas" descripcion="No hay reservas registradas." icono={<FaCalendarCheck />} />
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-slate-200">
                                        {reservasPorEstado.map((reserva) => (
                                            <li key={reserva.estado} className="flex items-center justify-between gap-4 px-5 py-3.5">
                                                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${obtenerColorReserva(reserva.estado)}`}>
                                                    {reserva.estado}
                                                </span>
                                                <div className="text-right">
                                                    <p className="font-title text-[22px] font-semibold leading-none tabular-nums text-slate-900">{reserva.cantidad}</p>
                                                    <p className="mt-1 text-xs text-slate-500">reservas</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardBody>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <Card>
                            <EncabezadoSeccion icono={<FaTrophy />} titulo="Libros más vendidos" descripcion="Ranking basado únicamente en ventas pagadas" />
                            <CardBody className="p-0">
                                {librosMasVendidos.length === 0 ? (
                                    <div className="p-5">
                                        <EmptyState titulo="Sin ventas" descripcion="Todavía no hay ventas pagadas." icono={<FaTrophy />} />
                                    </div>
                                ) : (
                                    <div className="tabla-reporte overflow-x-auto">
                                        <table className="min-w-full">
                                            <thead>
                                                <tr>
                                                    <th scope="col" className="w-12 text-center">#</th>
                                                    <th scope="col" className="text-left">Libro</th>
                                                    <th scope="col" className="text-center">Unid.</th>
                                                    <th scope="col" className="text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {librosMasVendidos.map((libro, index) => (
                                                    <tr key={libro.id_libro}>
                                                        <td className="text-center">
                                                            <span className={`reporte-puesto ${index < 3 ? `reporte-puesto--${index + 1}` : ''}`}>{index + 1}</span>
                                                        </td>
                                                        <td className="max-w-[220px] truncate font-semibold text-slate-800" title={libro.titulo}>{libro.titulo}</td>
                                                        <td className="text-center">
                                                            <span className="inline-flex min-w-7 justify-center rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                                                                {libro.cantidad_vendida}
                                                            </span>
                                                        </td>
                                                        <td className="text-right font-semibold text-slate-800">{formatearMoneda(libro.total_generado)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardBody>
                        </Card>

                        <Card>
                            <EncabezadoSeccion
                                icono={<FaTriangleExclamation />}
                                titulo="Libros con stock bajo"
                                descripcion="Stock menor o igual al mínimo configurado"
                                peligro={stockBajo.length > 0}
                                acciones={
                                    <span className={`reporte-contador ${stockBajo.length > 0 ? 'reporte-contador--peligro' : ''}`}>
                                        {stockBajo.length}
                                    </span>
                                }
                            />
                            <CardBody className="p-0">
                                {stockBajo.length === 0 ? (
                                    <div className="p-5">
                                        <EmptyState titulo="Inventario en orden" descripcion="Todo el inventario está en niveles normales." icono={<FaBoxOpen />} />
                                    </div>
                                ) : (
                                    <div className="tabla-reporte overflow-x-auto">
                                        <table className="min-w-full">
                                            <thead>
                                                <tr>
                                                    <th scope="col" className="text-center">ID</th>
                                                    <th scope="col" className="text-left">Libro</th>
                                                    <th scope="col" className="text-center">Stock</th>
                                                    <th scope="col" className="text-center">Mín.</th>
                                                    <th scope="col" className="text-left">Ubicación</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stockBajo.map((item) => {
                                                    const sinStock = Number(item.stock) <= 0;
                                                    return (
                                                        <tr key={item.id_inventario}>
                                                            <td className="text-center text-slate-500">{item.id_inventario}</td>
                                                            <td className="max-w-[200px] truncate font-semibold text-slate-800" title={item.titulo}>{item.titulo}</td>
                                                            <td className="text-center">
                                                                <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${sinStock ? 'bg-crimson-100 text-crimson-600' : 'bg-warning-bg text-warning'}`}>
                                                                    {sinStock ? 'Sin stock' : item.stock}
                                                                </span>
                                                            </td>
                                                            <td className="text-center font-semibold">{item.stock_minimo}</td>
                                                            <td className="max-w-[140px] truncate" title={item.ubicacion || 'No registrada'}>{item.ubicacion || 'No registrada'}</td>
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
