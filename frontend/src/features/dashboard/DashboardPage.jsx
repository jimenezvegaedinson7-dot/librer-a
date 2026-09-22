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
} from './dashboardService';

import { CargandoPantalla } from '../../components/ui/Spinner';
import { Card } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';
import { formatearMoneda } from '../../lib/utils/format';

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
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let activo = true;

        const cargar = async () => {
            try {
                setCargando(true);
                setError('');
                const [r, l, vm, ve, re, lmv] = await Promise.all([
                    obtenerResumen(),
                    obtenerLibros(),
                    obtenerVentasPorMes(),
                    obtenerVentasPorEstado(),
                    obtenerReservasPorEstado(),
                    obtenerLibrosMasVendidos(),
                ]);
                if (!activo) return;
                setResumen(r);
                setLibros(esArreglo(l));
                setVentasPorMes(esArreglo(vm));
                setVentasPorEstado(esArreglo(ve));
                setReservasPorEstado(esArreglo(re));
                setLibrosMasVendidos(esArreglo(lmv));
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
        return <Card><CargandoPantalla texto="Cargando dashboard..." /></Card>;
    }

    if (error) {
        return <Alert tipo="error">{error}</Alert>;
    }

    if (!resumen) return null;

    const fechaHoy = formatoFecha.format(new Date());

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
                <p className="text-[13px] capitalize text-[#766d62] tabular-nums">{fechaHoy}</p>
            </header>

            {/* MÉTRICAS PRINCIPALES */}
            <motion.section
                aria-label="Métricas principales"
                variants={escalonado}
                initial="oculto"
                animate="visible"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5"
            >
                <StatCard titulo="Total vendido" valor={formatearMoneda(resumen.total_vendido)} icono={<FaMoneyBillTrendUp />} color="primary" />
                <StatCard titulo="Ventas pagadas" valor={resumen.total_ventas} icono={<FaCircleCheck />} color="success" />
                <StatCard titulo="Reservas" valor={resumen.total_reservas} icono={<FaCalendarCheck />} color="info" />
                <StatCard titulo="Stock bajo" valor={resumen.libros_stock_bajo} icono={<FaTriangleExclamation />} color="warning" />
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
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
                    <SalesChart ventasPorMes={ventasPorMes} />
                    <TopBooks libros={librosMasVendidos} />
                </div>
            </section>

            {/* ESTADOS OPERATIVOS — donuts */}
            <section aria-label="Estados operativos">
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <StatusDonut titulo="Ventas por estado" subtitulo="Distribución real de las ventas" datos={ventasPorEstado} tipo="ventas" />
                    <StatusDonut titulo="Reservas por estado" subtitulo="Distribución real de las reservas" datos={reservasPorEstado} tipo="reservas" />
                </div>
            </section>

            {/* ACTIVIDAD RECIENTE */}
            <section aria-label="Actividad reciente">
                <RecentBooks libros={libros} />
            </section>

        </div>
    );
}
