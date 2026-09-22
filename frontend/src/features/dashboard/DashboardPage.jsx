import { useEffect, useState } from 'react';

import { motion } from 'motion/react';

import {
    FaBook,
    FaUserPen,
    FaTags,
    FaCalendarCheck,
    FaMoneyBillTrendUp,
    FaUsers,
    FaTriangleExclamation,
    FaCircleCheck,
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
} from './dashboardService';

import { Alert } from '../../components/ui/Alert';
import { formatearMoneda } from '../../lib/utils/format';
import { num, serieDiaria } from './graficoUtils';

import { MiniStat, StatCard } from './StatCard';
import RecentBooks from './RecentBooks';
import SalesChart from './SalesChart';
import StatusDonut from './StatusDonut';
import TopBooks from './TopBooks';

const escalonado = {
    oculto: {},
    visible: { transition: { staggerChildren: 0.06 } },
};

const formatoFecha = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function esArreglo(valor) {
    return Array.isArray(valor) ? valor : [];
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
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let activo = true;

        const cargar = async () => {
            try {
                setCargando(true);
                setError('');
                const [r, l, vm, ve, re, lmv, vd, ind] = await Promise.all([
                    obtenerResumen(),
                    obtenerLibros(),
                    obtenerVentasPorMes(),
                    obtenerVentasPorEstado(),
                    obtenerReservasPorEstado(),
                    obtenerLibrosMasVendidos(),
                    // Complementarios: si fallan, el resumen se muestra igual.
                    obtenerVentasPorDia().catch(() => []),
                    obtenerIndicadoresVentas().catch(() => ({})),
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
            } catch (err) {
                if (activo) setError(err.response?.data?.mensaje || 'Error al cargar el dashboard');
            } finally {
                if (activo) setCargando(false);
            }
        };

        cargar();
        return () => { activo = false; };
    }, []);

    if (cargando) {
        return (
            <div className="space-y-6" role="status" aria-label="Cargando resumen">
                <div className="skeleton h-24 w-72 max-w-full" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-[172px] !rounded-[0.875rem]" />)}
                </div>
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]">
                    <div className="skeleton h-[460px] !rounded-[0.875rem]" />
                    <div className="skeleton h-[460px] !rounded-[0.875rem]" />
                </div>
            </div>
        );
    }

    if (error) {
        return <Alert tipo="error">{error}</Alert>;
    }

    if (!resumen) return null;

    const diario = serieDiaria(ventasPorDia, 14);
    const reservasPendientes = num(reservasPorEstado.find((r) => String(r.estado).toLowerCase() === 'pendiente')?.cantidad);
    const totalLibros = num(resumen.total_libros);
    const stockBajo = num(resumen.libros_stock_bajo);
    const vendidoHoy = num(indicadores.vendido_hoy);
    const ventasHoy = num(indicadores.ventas_hoy);
    const ticketPromedio = num(indicadores.ticket_promedio);

    const fechaTexto = formatoFecha.format(new Date());
    const fechaHoy = fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1);

    return (
        <div className="dashboard-page space-y-6">

            {/* ENCABEZADO */}
            <header className="flex flex-col gap-1 border-b border-[#e6e0d7] pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9a7231]">Panel general</p>
                    <h1 className="mt-1 font-title text-[28px] font-semibold leading-tight tracking-[-0.015em] text-[#1c1814] sm:text-[32px]">
                        Resumen
                    </h1>
                    <p className="mt-1 text-[14px] leading-relaxed text-[#766d62]">
                        Indicadores generales y actividad reciente de la librería
                    </p>
                </div>
                <p className="text-[13px] text-[#766d62] tabular-nums">{fechaHoy}</p>
            </header>

            {/* MÉTRICAS PRINCIPALES */}
            <motion.section
                aria-label="Métricas principales"
                variants={escalonado}
                initial="oculto"
                animate="visible"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5"
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
                    titulo="Ventas pagadas"
                    valor={num(resumen.total_ventas)}
                    icono={<FaCircleCheck />}
                    color="success"
                    detalle={ticketPromedio > 0 ? `Ticket promedio ${formatearMoneda(ticketPromedio)}` : `${ventasHoy} hoy`}
                    tendencia={diario.map((d) => d.cantidad)}
                    etiquetaTendencia="Ventas pagadas por día en los últimos 14 días"
                />
                <StatCard
                    titulo="Reservas"
                    valor={num(resumen.total_reservas)}
                    icono={<FaCalendarCheck />}
                    color="info"
                    detalle={reservasPendientes > 0 ? `${reservasPendientes} pendientes de atender` : 'Ninguna pendiente'}
                    medidor={{ valor: reservasPendientes, total: num(resumen.total_reservas), etiqueta: 'Reservas pendientes sobre el total' }}
                />
                <StatCard
                    titulo="Stock bajo"
                    valor={stockBajo}
                    icono={<FaTriangleExclamation />}
                    color="warning"
                    detalle={`de ${totalLibros} libros en catálogo`}
                    medidor={{ valor: stockBajo, total: totalLibros, etiqueta: 'Libros con stock bajo sobre el catálogo' }}
                />
            </motion.section>

            {/* CATÁLOGO */}
            <motion.section
                aria-label="Catálogo y usuarios"
                variants={escalonado}
                initial="oculto"
                animate="visible"
                className="grid grid-cols-2 gap-4 xl:grid-cols-4 xl:gap-5"
            >
                <MiniStat titulo="Libros" valor={resumen.total_libros} icono={<FaBook />} />
                <MiniStat titulo="Autores" valor={resumen.total_autores} icono={<FaUserPen />} />
                <MiniStat titulo="Categorías" valor={resumen.total_categorias} icono={<FaTags />} />
                <MiniStat titulo="Usuarios" valor={resumen.total_usuarios} icono={<FaUsers />} />
            </motion.section>

            {/* RENDIMIENTO — gráfico + top libros */}
            <section aria-label="Rendimiento">
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]">
                    <SalesChart ventasPorMes={ventasPorMes} ventasPorDia={ventasPorDia} />
                    <TopBooks libros={librosMasVendidos} />
                </div>
            </section>

            {/* ESTADOS OPERATIVOS — donuts */}
            <section aria-label="Estados operativos">
                <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
                    <StatusDonut titulo="Ventas por estado" subtitulo="Todas las ventas registradas" datos={ventasPorEstado} tipo="ventas" />
                    <StatusDonut titulo="Reservas por estado" subtitulo="Todas las reservas registradas" datos={reservasPorEstado} tipo="reservas" />
                </div>
            </section>

            {/* ACTIVIDAD RECIENTE */}
            <section aria-label="Actividad reciente">
                <RecentBooks libros={libros} />
            </section>

        </div>
    );
}
