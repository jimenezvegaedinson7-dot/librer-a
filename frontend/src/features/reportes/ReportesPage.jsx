import { useEffect, useState } from 'react';

import {
    FaBook,
    FaUserPen,
    FaTags,
    FaUsers,
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
        <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50/50 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center text-xs text-primary-700">
                {icono}
            </div>
            <div>
                <h2 className="text-sm font-semibold text-slate-900">{titulo}</h2>
                <p className="mt-0.5 text-xs text-slate-600">{descripcion}</p>
            </div>
        </div>
    );
}

function TarjetaResumen({ icono, titulo, valor, detalle }) {
    return (
        <div className="rounded-md border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-500">{titulo}</p>
                    <p className="mt-1 text-lg font-semibold leading-tight text-slate-900">{valor}</p>
                    {detalle && <p className="mt-1 text-xs text-slate-500">{detalle}</p>}
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center border-l border-slate-200 pl-3 text-xs text-primary-700">{icono}</div>
            </div>
        </div>
    );
}

function Destacado({ icono, titulo, principal, detalle }) {
    return (
        <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center text-sm text-primary-700">{icono}</div>
            <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">{titulo}</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">{principal}</p>
                <p className="mt-0.5 text-xs text-slate-600">{detalle}</p>
            </div>
        </div>
    );
}

function obtenerColorVenta(estado) {
    switch (estado) {
        case 'pagada':
            return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'pendiente':
            return 'bg-amber-100 text-amber-700 border-amber-200';
        case 'cancelada':
            return 'bg-red-100 text-red-700 border-red-200';
        default:
            return 'bg-slate-100 text-slate-700 border-slate-200';
    }
}

function obtenerColorReserva(estado) {
    switch (estado) {
        case 'confirmada':
            return 'bg-sky-100 text-sky-700 border-sky-200';
        case 'pendiente':
            return 'bg-amber-100 text-amber-700 border-amber-200';
        case 'cancelada':
            return 'bg-red-100 text-red-700 border-red-200';
        case 'completada':
            return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        default:
            return 'bg-slate-100 text-slate-700 border-slate-200';
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
        <div className="space-y-4">
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
                                />
                                <TarjetaResumen
                                    icono={<FaCalendarDays />}
                                    titulo="Ventas del mes"
                                    valor={indicadores.ventas_mes_actual || 0}
                                    detalle={formatearMoneda(indicadores.vendido_mes_actual)}
                                />
                                <TarjetaResumen
                                    icono={<FaReceipt />}
                                    titulo="Ticket promedio"
                                    valor={formatearMoneda(indicadores.ticket_promedio)}
                                    detalle="Promedio por venta pagada"
                                />
                                <TarjetaResumen
                                    icono={<FaMoneyBillWave />}
                                    titulo="Venta más alta"
                                    valor={formatearMoneda(indicadores.venta_mayor)}
                                    detalle="Mayor venta pagada"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-3 border-t border-slate-200 p-4 lg:grid-cols-2">
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
                                <EmptyState titulo="Sin ventas por mes" descripcion="Todavía no existen ventas pagadas para mostrar." />
                            ) : (
                                <div className="p-4">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                                        <div className="flex h-52 items-end gap-2 overflow-x-auto border-b border-slate-300 pb-7">
                                            {ventasPorMes.map((item) => {
                                                const porcentaje = Math.max(5, (Number(item.total_vendido || 0) / maximoMensual) * 100);
                                                return (
                                                    <div
                                                        key={`${item.anio}-${item.mes_numero}`}
                                                        className="group relative flex h-full min-w-[48px] flex-1 items-end justify-center"
                                                    >
                                                        <div
                                                            className="relative w-8 rounded-t-md bg-primary-500 transition-all duration-300 hover:bg-primary-600"
                                                            style={{ height: `${porcentaje}%` }}
                                                        >
                                                            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white shadow-lg group-hover:block">
                                                                {formatearMoneda(item.total_vendido)}
                                                            </div>
                                                        </div>
                                                        <div className="absolute -bottom-6 whitespace-nowrap text-[10px] font-semibold text-slate-600">
                                                            {item.mes} {String(item.anio).slice(-2)}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="mt-4 overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className="border-b-2 border-slate-300 bg-slate-50">
                                                    <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-700">Período</th>
                                                    <th className="px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-slate-700">Ventas</th>
                                                    <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-slate-700">Total vendido</th>
                                                    <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-slate-700">Promedio</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                {[...ventasPorMes].reverse().map((item) => (
                                                    <tr key={`tabla-${item.anio}-${item.mes_numero}`} className="transition hover:bg-slate-50">
                                                        <td className="px-3 py-2.5 text-xs font-semibold text-slate-700">{item.mes} {item.anio}</td>
                                                        <td className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700">{item.cantidad_ventas}</td>
                                                        <td className="px-3 py-2.5 text-right text-xs font-semibold text-slate-800">{formatearMoneda(item.total_vendido)}</td>
                                                        <td className="px-3 py-2.5 text-right text-xs text-slate-700">{formatearMoneda(item.promedio_venta)}</td>
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
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                                        <div className="flex h-44 items-end gap-1.5 overflow-x-auto border-b border-slate-300 pb-7">
                                            {ventasPorDia.map((item) => {
                                                const porcentaje = Math.max(5, (Number(item.total_vendido || 0) / maximoDiario) * 100);
                                                return (
                                                    <div
                                                        key={String(item.fecha)}
                                                        className="group relative flex h-full min-w-[32px] flex-1 items-end justify-center"
                                                    >
                                                        <div
                                                            className="relative w-5 rounded-t bg-sky-500 transition hover:bg-sky-600"
                                                            style={{ height: `${porcentaje}%` }}
                                                        >
                                                            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white shadow-lg group-hover:block">
                                                                {formatearMoneda(item.total_vendido)}
                                                            </div>
                                                        </div>
                                                        <span className="absolute -bottom-6 text-[9px] font-semibold text-slate-600">{item.dia}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="mt-4 max-h-80 overflow-auto rounded-lg border border-slate-200">
                                        <table className="min-w-full">
                                            <thead className="sticky top-0 z-10 bg-slate-50">
                                                <tr className="border-b-2 border-slate-300">
                                                    <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase text-slate-700">Fecha</th>
                                                    <th className="px-3 py-2.5 text-center text-[11px] font-bold uppercase text-slate-700">Ventas</th>
                                                    <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase text-slate-700">Total</th>
                                                    <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase text-slate-700">Promedio</th>
                                                    <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase text-slate-700">Venta mayor</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 bg-white">
                                                {[...ventasPorDia].reverse().map((item) => (
                                                    <tr key={`dia-${String(item.fecha)}`} className="hover:bg-slate-50">
                                                        <td className="px-3 py-2.5 text-xs font-semibold text-slate-700">{formatearFechaReportes(item.fecha)}</td>
                                                        <td className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700">{item.cantidad_ventas}</td>
                                                        <td className="px-3 py-2.5 text-right text-xs font-semibold text-slate-800">{formatearMoneda(item.total_vendido)}</td>
                                                        <td className="px-3 py-2.5 text-right text-xs text-slate-700">{formatearMoneda(item.promedio_venta)}</td>
                                                        <td className="px-3 py-2.5 text-right text-xs font-semibold text-slate-700">{formatearMoneda(item.venta_mayor)}</td>
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
                                icono={<FaChartColumn />}
                                titulo="Resumen general"
                                descripcion="Indicadores principales del sistema"
                            />

                            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                                <TarjetaResumen icono={<FaBook />} titulo="Libros" valor={resumen.total_libros || 0} />
                                <TarjetaResumen icono={<FaUserPen />} titulo="Autores" valor={resumen.total_autores || 0} />
                                <TarjetaResumen icono={<FaTags />} titulo="Categorías" valor={resumen.total_categorias || 0} />
                                <TarjetaResumen icono={<FaUsers />} titulo="Usuarios" valor={resumen.total_usuarios || 0} />
                                <TarjetaResumen icono={<FaCartShopping />} titulo="Ventas pagadas" valor={resumen.total_ventas || 0} />
                                <TarjetaResumen icono={<FaMoneyBillWave />} titulo="Total vendido" valor={formatearMoneda(resumen.total_vendido)} />
                                <TarjetaResumen icono={<FaCalendarCheck />} titulo="Reservas" valor={resumen.total_reservas || 0} />
                                <TarjetaResumen icono={<FaTriangleExclamation />} titulo="Stock bajo" valor={resumen.libros_stock_bajo || 0} />
                            </div>
                        </CardBody>
                    </Card>

                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                        <Card>
                            <CardBody className="p-0">
                                <EncabezadoSeccion icono={<FaCartShopping />} titulo="Ventas por estado" descripcion="Distribución de las ventas registradas" />

                                {ventasPorEstado.length === 0 ? (
                                    <EmptyState titulo="Sin ventas" descripcion="No hay ventas registradas." />
                                ) : (
                                    <div className="divide-y divide-slate-200">
                                        {ventasPorEstado.map((venta) => (
                                            <div key={venta.estado} className="flex items-center justify-between gap-4 px-4 py-3">
                                                <div>
                                                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${obtenerColorVenta(venta.estado)}`}>
                                                        {venta.estado}
                                                    </span>
                                                    <p className="mt-1.5 text-[11px] text-slate-600">
                                                        Total acumulado: <span className="font-semibold text-slate-700">{formatearMoneda(venta.total)}</span>
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-slate-900">{venta.cantidad}</p>
                                                    <p className="text-[11px] text-slate-600">ventas</p>
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
                                    <div className="divide-y divide-slate-200">
                                        {reservasPorEstado.map((reserva) => (
                                            <div key={reserva.estado} className="flex items-center justify-between gap-4 px-4 py-3">
                                                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${obtenerColorReserva(reserva.estado)}`}>
                                                    {reserva.estado}
                                                </span>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-slate-900">{reserva.cantidad}</p>
                                                    <p className="text-[11px] text-slate-600">reservas</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </div>

                    <Card>
                        <CardBody className="p-0">
                            <EncabezadoSeccion icono={<FaTrophy />} titulo="Libros más vendidos" descripcion="Ranking basado únicamente en ventas pagadas" />

                            {librosMasVendidos.length === 0 ? (
                                <EmptyState titulo="Sin ventas" descripcion="Todavía no hay ventas pagadas." />
                            ) : (
                                <div className="overflow-x-auto p-4">
                                    <table className="min-w-full">
                                        <thead>
                                            <tr className="border-b-2 border-slate-300 bg-slate-50">
                                                <th className="px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-slate-700">Posición</th>
                                                <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-700">Libro</th>
                                                <th className="px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-slate-700">Unidades</th>
                                                <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-slate-700">Total generado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {librosMasVendidos.map((libro, index) => (
                                                <tr key={libro.id_libro} className="transition hover:bg-slate-50">
                                                    <td className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700">#{index + 1}</td>
                                                    <td className="px-3 py-2.5 text-xs font-semibold text-slate-800">{libro.titulo}</td>
                                                    <td className="px-3 py-2.5 text-center">
                                                        <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                                            {libro.cantidad_vendida}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-800">{formatearMoneda(libro.total_generado)}</td>
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
                            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-xs text-red-700">
                                        <FaTriangleExclamation />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900">Libros con stock bajo</h2>
                                        <p className="mt-0.5 text-[11px] text-slate-600">Stock menor o igual al mínimo configurado</p>
                                    </div>
                                </div>
                                <span className="rounded-full border border-red-200 bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700">
                                    {stockBajo.length}
                                </span>
                            </div>

                            {stockBajo.length === 0 ? (
                                <EmptyState titulo="Inventario en orden" descripcion="Todo el inventario está en niveles normales." />
                            ) : (
                                <div className="overflow-x-auto p-4">
                                    <table className="min-w-full">
                                        <thead>
                                            <tr className="border-b-2 border-slate-300 bg-slate-50">
                                                <th className="px-3 py-2.5 text-center text-[11px] font-bold uppercase text-slate-700">ID</th>
                                                <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase text-slate-700">Libro</th>
                                                <th className="px-3 py-2.5 text-center text-[11px] font-bold uppercase text-slate-700">Stock</th>
                                                <th className="px-3 py-2.5 text-center text-[11px] font-bold uppercase text-slate-700">Mínimo</th>
                                                <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase text-slate-700">Ubicación</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {stockBajo.map((item) => {
                                                const sinStock = Number(item.stock) <= 0;
                                                return (
                                                    <tr key={item.id_inventario} className="hover:bg-slate-50">
                                                        <td className="px-3 py-2.5 text-center text-xs text-slate-700">{item.id_inventario}</td>
                                                        <td className="px-3 py-2.5 text-xs font-semibold text-slate-800">{item.titulo}</td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${sinStock ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                {sinStock ? 'Sin stock' : item.stock}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700">{item.stock_minimo}</td>
                                                        <td className="px-3 py-2.5 text-xs text-slate-700">{item.ubicacion || 'No registrada'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </>
            )}
        </div>
    );
}

