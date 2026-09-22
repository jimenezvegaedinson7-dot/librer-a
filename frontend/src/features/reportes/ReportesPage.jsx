import { useEffect, useState } from 'react';

import {
    FaArrowTrendUp,
    FaBoxOpen,
    FaCalendarCheck,
    FaCalendarDays,
    FaCashRegister,
    FaReceipt,
    FaRotate,
    FaTriangleExclamation,
    FaTrophy,
} from 'react-icons/fa6';
import { motion, useReducedMotion } from 'motion/react';

import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/TableSkeleton';

import { formatearMoneda } from '../../lib/utils/format';

import { StatCard } from '../dashboard/StatCard';
import SalesChart from '../dashboard/SalesChart';
import StatusDonut from '../dashboard/StatusDonut';
import TopBooks from '../dashboard/TopBooks';
import { num, serieDiaria, serieMensual } from '../dashboard/graficoUtils';

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

const escalonado = {
    oculto: {},
    visible: { transition: { staggerChildren: 0.06 } },
};

const entrada = {
    oculto: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 1, 0.5, 1] } },
};

const plural = (n, uno, varios) => `${n} ${Number(n) === 1 ? uno : varios}`;

function MejorRegistro({ icono, etiqueta, principal, detalle, vacio }) {
    const reducirMovimiento = useReducedMotion();
    return (
        <motion.article variants={reducirMovimiento ? undefined : entrada} className="registro-card">
            <span className="ficha-icono flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base" aria-hidden="true">
                {icono}
            </span>
            <div className="min-w-0">
                <p className="kpi-label">{etiqueta}</p>
                <p className={`registro-principal ${vacio ? 'registro-principal--vacio' : ''}`}>{principal}</p>
                <p className="mt-0.5 text-[13px] text-[#766d62]">{detalle}</p>
            </div>
        </motion.article>
    );
}

function StockBajo({ items = [] }) {
    const lista = Array.isArray(items) ? items : [];
    const sinStock = lista.filter((i) => num(i.stock) <= 0).length;

    return (
        <section className="grafico-card flex flex-col" aria-labelledby="titulo-stock-bajo">
            <header className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <span
                        className={`${lista.length > 0 ? 'reporte-icono-peligro' : 'ficha-icono'} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl`}
                        aria-hidden="true"
                    >
                        <FaTriangleExclamation />
                    </span>
                    <div className="min-w-0">
                        <h2 id="titulo-stock-bajo" className="font-title text-[18px] font-semibold leading-snug text-[#1c1814]">
                            Libros con stock bajo
                        </h2>
                        <p className="mt-0.5 text-[13px] text-[#766d62]">Stock igual o menor al mínimo configurado</p>
                    </div>
                </div>
                <span className={`reporte-contador ${lista.length > 0 ? 'reporte-contador--peligro' : ''}`}>{lista.length}</span>
            </header>

            {lista.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                    <span className="ficha-icono mb-3 flex h-12 w-12 items-center justify-center rounded-full" aria-hidden="true">
                        <FaBoxOpen />
                    </span>
                    <p className="font-title text-[16px] font-semibold text-[#1c1814]">Inventario en orden</p>
                    <p className="mt-1 text-[13px] text-[#766d62]">Todos los libros están sobre su stock mínimo.</p>
                </div>
            ) : (
                <>
                    <ul className="flex-1 space-y-1 px-3 py-4 sm:px-4">
                        {lista.map((item) => {
                            const stock = num(item.stock);
                            const minimo = num(item.stock_minimo);
                            const agotado = stock <= 0;
                            const porcentaje = minimo > 0 ? Math.min(100, (stock / minimo) * 100) : 0;
                            return (
                                <li key={item.id_inventario} className="ranking-fila">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline justify-between gap-3">
                                            <p className="truncate text-[14px] font-semibold text-[#1c1814]" title={item.titulo}>{item.titulo}</p>
                                            <span className={`estado-pildora shrink-0 ${agotado ? 'estado--peligro' : 'estado--aviso'}`}>
                                                {agotado ? 'Sin stock' : `${stock} de ${minimo}`}
                                            </span>
                                        </div>
                                        <div className="mt-1.5 flex items-center gap-3">
                                            <div
                                                className="ranking-pista"
                                                role="meter"
                                                aria-valuemin={0}
                                                aria-valuemax={minimo}
                                                aria-valuenow={stock}
                                                aria-label={`Stock de ${item.titulo}: ${stock} de un mínimo de ${minimo}`}
                                            >
                                                <span
                                                    className={`ranking-barra reporte-barra-h stock-barra ${agotado ? 'estado--peligro' : 'estado--aviso'}`}
                                                    style={{ width: `${Math.max(porcentaje, agotado ? 0 : 4)}%` }}
                                                />
                                            </div>
                                            <span className="w-[110px] shrink-0 truncate text-right text-[12px] text-[#766d62]" title={item.ubicacion || 'Sin ubicación'}>
                                                {item.ubicacion || 'Sin ubicación'}
                                            </span>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                    <footer className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 text-[13px] sm:px-6">
                        <span className="text-[#766d62]">{plural(sinStock, 'libro agotado', 'libros agotados')}</span>
                        <span className="text-[#766d62]">{plural(lista.length - sinStock, 'bajo mínimo', 'bajo mínimo')}</span>
                    </footer>
                </>
            )}
        </section>
    );
}

function EsqueletoReportes() {
    return (
        <div className="space-y-5" role="status" aria-label="Cargando reportes">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton h-[172px] !rounded-[0.875rem]" />
                ))}
            </div>
            <div className="skeleton h-[480px] !rounded-[0.875rem]" />
            <TableSkeleton columnas={4} filas={4} titulo />
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

    const diario = serieDiaria(ventasPorDia, 14);
    const mensual = serieMensual(ventasPorMes, 6);

    return (
        <div className="space-y-6">
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
                        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5"
                    >
                        <StatCard
                            titulo="Ventas de hoy"
                            valor={formatearMoneda(indicadores.vendido_hoy)}
                            icono={<FaCashRegister />}
                            color="primary"
                            detalle={plural(num(indicadores.ventas_hoy), 'venta pagada hoy', 'ventas pagadas hoy')}
                            tendencia={diario.map((d) => d.total)}
                            etiquetaTendencia="Ingresos diarios de los últimos 14 días"
                        />
                        <StatCard
                            titulo="Ventas del mes"
                            valor={formatearMoneda(indicadores.vendido_mes_actual)}
                            icono={<FaCalendarDays />}
                            color="info"
                            detalle={plural(num(indicadores.ventas_mes_actual), 'venta este mes', 'ventas este mes')}
                            tendencia={mensual.map((d) => d.total)}
                            etiquetaTendencia="Ingresos mensuales de los últimos 6 meses"
                        />
                        <StatCard
                            titulo="Ticket promedio"
                            valor={formatearMoneda(indicadores.ticket_promedio)}
                            icono={<FaReceipt />}
                            color="neutral"
                            detalle={plural(num(indicadores.total_ventas_pagadas), 'venta pagada en total', 'ventas pagadas en total')}
                            tendencia={mensual.map((d) => (d.cantidad > 0 ? d.total / d.cantidad : 0))}
                            etiquetaTendencia="Ticket promedio por mes en los últimos 6 meses"
                        />
                        <StatCard
                            titulo="Venta más alta"
                            valor={formatearMoneda(indicadores.venta_mayor)}
                            icono={<FaArrowTrendUp />}
                            color="success"
                            detalle={`La más baja: ${formatearMoneda(indicadores.venta_menor)}`}
                        />
                    </motion.section>

                    <motion.section
                        aria-label="Mejores registros"
                        variants={escalonado}
                        initial="oculto"
                        animate="visible"
                        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:gap-5"
                    >
                        <MejorRegistro
                            icono={<FaTrophy />}
                            etiqueta="Mejor mes registrado"
                            principal={indicadores.mejor_mes ? `${indicadores.mejor_mes.mes} ${indicadores.mejor_mes.anio}` : 'Sin datos'}
                            vacio={!indicadores.mejor_mes}
                            detalle={
                                indicadores.mejor_mes
                                    ? `${plural(num(indicadores.mejor_mes.cantidad_ventas), 'venta', 'ventas')} · ${formatearMoneda(indicadores.mejor_mes.total_vendido)}`
                                    : 'Aún no existen ventas pagadas.'
                            }
                        />
                        <MejorRegistro
                            icono={<FaCalendarCheck />}
                            etiqueta="Mejor día registrado"
                            principal={indicadores.mejor_dia ? formatearFechaReportes(indicadores.mejor_dia.fecha) : 'Sin datos'}
                            vacio={!indicadores.mejor_dia}
                            detalle={
                                indicadores.mejor_dia
                                    ? `${plural(num(indicadores.mejor_dia.cantidad_ventas), 'venta', 'ventas')} · ${formatearMoneda(indicadores.mejor_dia.total_vendido)}`
                                    : 'Aún no existen ventas pagadas.'
                            }
                        />
                    </motion.section>

                    <SalesChart
                        ventasPorMes={ventasPorMes}
                        ventasPorDia={ventasPorDia}
                        dias={30}
                        meses={12}
                        titulo="Evolución de ventas"
                        idBase="reporte-ventas"
                        conMetrica
                    />

                    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
                        <StatusDonut titulo="Ventas por estado" subtitulo="Todas las ventas registradas" datos={ventasPorEstado} tipo="ventas" />
                        <StatusDonut titulo="Reservas por estado" subtitulo="Todas las reservas registradas" datos={reservasPorEstado} tipo="reservas" />
                    </div>

                    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
                        {librosMasVendidos.length === 0 ? (
                            <EmptyState titulo="Sin ventas" descripcion="Todavía no hay ventas pagadas." icono={<FaTrophy />} />
                        ) : (
                            <TopBooks libros={librosMasVendidos} limite={10} />
                        )}
                        <StockBajo items={stockBajo} />
                    </div>

                    <p className="text-[12px] text-[#766d62]">
                        Catálogo: {plural(num(resumen.total_libros), 'libro', 'libros')} · {plural(num(resumen.total_autores), 'autor', 'autores')} ·{' '}
                        {plural(num(resumen.total_categorias), 'categoría', 'categorías')} · {plural(num(resumen.total_usuarios), 'usuario', 'usuarios')}
                    </p>
                </>
            )}
        </div>
    );
}
