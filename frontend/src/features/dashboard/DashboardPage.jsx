import { useEffect, useState } from 'react';

import { motion } from 'motion/react';

import {
    FaBook,
    FaCalendarCheck,
    FaCalendarDays,
    FaMoneyBillTrendUp,
    FaReceipt,
    FaRotate,
    FaTags,
    FaTrophy,
    FaUserPen,
    FaUsers,
} from 'react-icons/fa6';

import {
    obtenerResumen,
    obtenerLibros,
    obtenerLibrosMasVendidos,
    obtenerReservasPorEstado,
    obtenerVentasPorEstado,
    obtenerVentasPorMes,
    obtenerVentasPorDia,
    obtenerIndicadoresVentas,
    obtenerStockBajo,
} from './dashboardService';

import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { formatearMoneda } from '../../lib/utils/format';
import { num, serieDiaria, serieMensual } from './graficoUtils';

import { MiniStat, StatCard } from './StatCard';
import MejorRegistro from './MejorRegistro';
import RecentBooks from './RecentBooks';
import SalesChart from './SalesChart';
import StatusDonut from './StatusDonut';
import StockBajo from './StockBajo';
import TopBooks from './TopBooks';

const escalonado = {
    oculto: {},
    visible: { transition: { staggerChildren: 0.06 } },
};

const formatoFecha = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function esArreglo(valor) {
    return Array.isArray(valor) ? valor : [];
}

function formatearFechaCorta(fecha) {
    const partes = String(fecha || '').slice(0, 10).split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : 'Sin datos';
}

const plural = (n, uno, varios) => `${n} ${Number(n) === 1 ? uno : varios}`;

// Reflejo de luz que sigue al cursor dentro de cada tarjeta del mosaico.
const TARJETAS = '.kpi-card, .mini-stat, .registro-card, .grafico-card';
function moverLuz(evento) {
    const tarjeta = evento.target.closest?.(TARJETAS);
    if (!tarjeta) return;
    const caja = tarjeta.getBoundingClientRect();
    tarjeta.style.setProperty('--luz-x', `${evento.clientX - caja.left}px`);
    tarjeta.style.setProperty('--luz-y', `${evento.clientY - caja.top}px`);
}

export default function DashboardPage() {
    const [resumen, setResumen] = useState(null);
    const [libros, setLibros] = useState([]);
    const [ventasPorMes, setVentasPorMes] = useState([]);
    const [ventasPorEstado, setVentasPorEstado] = useState([]);
    const [reservasPorEstado, setReservasPorEstado] = useState([]);
    const [librosMasVendidos, setLibrosMasVendidos] = useState([]);
    const [ventasPorDia, setVentasPorDia] = useState([]);
    const [indicadores, setIndicadores] = useState({});
    const [stockBajo, setStockBajo] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [recarga, setRecarga] = useState(0);

    useEffect(() => {
        let activo = true;

        const cargar = async () => {
            try {
                setCargando(true);
                setError('');
                const [r, l, vm, ve, re, lmv, vd, ind, sb] = await Promise.all([
                    obtenerResumen(),
                    obtenerLibros(),
                    obtenerVentasPorMes(),
                    obtenerVentasPorEstado(),
                    obtenerReservasPorEstado(),
                    obtenerLibrosMasVendidos(),
                    // Complementarios: si fallan, el resumen se muestra igual.
                    obtenerVentasPorDia().catch(() => []),
                    obtenerIndicadoresVentas().catch(() => ({})),
                    obtenerStockBajo().catch(() => []),
                ]);
                if (!activo) return;
                setResumen(r);
                setLibros(esArreglo(l));
                setVentasPorMes(esArreglo(vm));
                setVentasPorEstado(esArreglo(ve));
                setReservasPorEstado(esArreglo(re));
                setLibrosMasVendidos(esArreglo(lmv));
                setVentasPorDia(esArreglo(vd));
                setIndicadores(ind || {});
                setStockBajo(esArreglo(sb));
            } catch (err) {
                if (activo) setError(err.response?.data?.mensaje || 'Error al cargar el resumen');
            } finally {
                if (activo) setCargando(false);
            }
        };

        cargar();
        return () => { activo = false; };
    }, [recarga]);

    // Primera carga: esqueleto. Al actualizar se mantiene la vista anterior atenuada.
    if (cargando && !resumen) {
        return (
            <div className="space-y-6" role="status" aria-label="Cargando resumen">
                <div className="skeleton h-24 w-72 max-w-full" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-[172px] !rounded-[0.875rem]" />)}
                </div>
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]">
                    <div className="skeleton h-[520px] !rounded-[0.875rem]" />
                    <div className="skeleton h-[520px] !rounded-[0.875rem]" />
                </div>
            </div>
        );
    }

    if (error && !resumen) {
        return <Alert tipo="error">{error}</Alert>;
    }

    if (!resumen) return null;

    const diario = serieDiaria(ventasPorDia, 14);
    const mensual = serieMensual(ventasPorMes, 6);
    const reservasPendientes = num(reservasPorEstado.find((r) => String(r.estado).toLowerCase() === 'pendiente')?.cantidad);
    const vendidoHoy = num(indicadores.vendido_hoy);
    const { mejor_mes: mejorMes, mejor_dia: mejorDia } = indicadores;

    const fechaTexto = formatoFecha.format(new Date());
    const fechaHoy = fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1);

    return (
        <div
            className={`dashboard-page dashboard-mosaico space-y-5 transition-opacity duration-200 ${cargando ? 'opacity-60' : ''}`}
            aria-busy={cargando}
            onPointerMove={moverLuz}
        >

            {/* ENCABEZADO */}
            <header className="flex flex-col gap-3 border-b border-[#e6e0d7] pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9a7231]">Panel general</p>
                    <h1 className="mt-1 font-title text-[28px] font-semibold leading-tight tracking-[-0.015em] text-[#1c1814] sm:text-[32px]">
                        Resumen
                    </h1>
                    <p className="mt-1 text-[14px] leading-relaxed text-[#766d62]">
                        Indicadores, estadísticas y reportes de la librería · {fechaHoy}
                    </p>
                </div>
                <Button variante="secondary" icono={<FaRotate />} onClick={() => setRecarga((n) => n + 1)} cargando={cargando}>
                    {cargando ? 'Actualizando...' : 'Actualizar'}
                </Button>
            </header>

            {error && <Alert tipo="error">{error}</Alert>}

            {/* INDICADORES */}
            <motion.section
                aria-label="Indicadores principales"
                variants={escalonado}
                initial="oculto"
                animate="visible"
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4"
            >
                <StatCard
                    titulo="Total vendido"
                    valor={formatearMoneda(resumen.total_vendido)}
                    icono={<FaMoneyBillTrendUp />}
                    color="primary"
                    detalle={vendidoHoy > 0 ? `${formatearMoneda(vendidoHoy)} vendidos hoy` : 'Sin ventas pagadas hoy'}
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
                    color="success"
                    detalle={`Rango ${formatearMoneda(indicadores.venta_menor)} – ${formatearMoneda(indicadores.venta_mayor)}`}
                    tendencia={mensual.map((d) => (d.cantidad > 0 ? d.total / d.cantidad : 0))}
                    etiquetaTendencia="Ticket promedio por mes en los últimos 6 meses"
                />
                <StatCard
                    titulo="Reservas"
                    valor={num(resumen.total_reservas)}
                    icono={<FaCalendarCheck />}
                    color="warning"
                    detalle={reservasPendientes > 0 ? `${reservasPendientes} pendientes de atender` : 'Ninguna pendiente'}
                    medidor={{ valor: reservasPendientes, total: num(resumen.total_reservas), etiqueta: 'Reservas pendientes sobre el total', leyenda: 'del total de reservas está pendiente' }}
                />
            </motion.section>

            {/* CATÁLOGO */}
            <motion.section
                aria-label="Catálogo y usuarios"
                variants={escalonado}
                initial="oculto"
                animate="visible"
                className="grid grid-cols-2 gap-5 xl:grid-cols-4"
            >
                <MiniStat titulo="Libros" valor={resumen.total_libros} icono={<FaBook />} descripcion="Títulos en el catálogo" />
                <MiniStat titulo="Autores" valor={resumen.total_autores} icono={<FaUserPen />} descripcion="Autores registrados" />
                <MiniStat titulo="Categorías" valor={resumen.total_categorias} icono={<FaTags />} descripcion="Categorías del catálogo" />
                <MiniStat titulo="Usuarios" valor={resumen.total_usuarios} icono={<FaUsers />} descripcion="Cuentas registradas" />
            </motion.section>

            {/* MEJORES REGISTROS */}
            <motion.section
                aria-label="Mejores registros"
                variants={escalonado}
                initial="oculto"
                animate="visible"
                className="grid grid-cols-1 gap-5 md:grid-cols-2"
            >
                <MejorRegistro
                    icono={<FaTrophy />}
                    etiqueta="Mejor mes registrado"
                    principal={mejorMes ? `${mejorMes.mes} ${mejorMes.anio}` : 'Sin datos'}
                    vacio={!mejorMes}
                    detalle={mejorMes
                        ? `${plural(num(mejorMes.cantidad_ventas), 'venta', 'ventas')} · ${formatearMoneda(mejorMes.total_vendido)}`
                        : 'Aún no existen ventas pagadas.'}
                />
                <MejorRegistro
                    icono={<FaCalendarCheck />}
                    etiqueta="Mejor día registrado"
                    principal={mejorDia ? formatearFechaCorta(mejorDia.fecha) : 'Sin datos'}
                    vacio={!mejorDia}
                    detalle={mejorDia
                        ? `${plural(num(mejorDia.cantidad_ventas), 'venta', 'ventas')} · ${formatearMoneda(mejorDia.total_vendido)}`
                        : 'Aún no existen ventas pagadas.'}
                />
            </motion.section>

            {/* VENTAS: evolución + ranking */}
            <section aria-label="Evolución de ventas" className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
                <SalesChart
                    ventasPorMes={ventasPorMes}
                    ventasPorDia={ventasPorDia}
                    dias={30}
                    meses={12}
                    titulo="Evolución de ventas"
                    idBase="evolucion-ventas"
                    conMetrica
                />
                <TopBooks libros={librosMasVendidos} />
            </section>

            {/* ESTADOS E INVENTARIO: tres piezas del mismo alto */}
            <section aria-label="Estados operativos e inventario" className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                <StatusDonut titulo="Ventas por estado" subtitulo="Todas las ventas registradas" datos={ventasPorEstado} tipo="ventas" />
                <StatusDonut titulo="Reservas por estado" subtitulo="Todas las reservas registradas" datos={reservasPorEstado} tipo="reservas" variante="donut" />
                <div className="md:col-span-2 xl:col-span-1">
                    <StockBajo items={stockBajo} />
                </div>
            </section>

            {/* CATÁLOGO RECIENTE */}
            <section aria-label="Catálogo reciente">
                <RecentBooks libros={libros} />
            </section>

        </div>
    );
}
