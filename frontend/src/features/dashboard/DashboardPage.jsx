import { useEffect, useState } from 'react';

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

import { StatCard } from './StatCard';
import RecentBooks from './RecentBooks';
import SalesChart from './SalesChart';
import StatusDonut from './StatusDonut';
import TopBooks from './TopBooks';

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

    return (
        <div className="dashboard-page space-y-5">

            {/* ENCABEZADO */}
            <header className="space-y-1">
                <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[#10213f]">
                    Resumen
                </h1>
                <p className="mt-1 text-[14px] font-normal leading-relaxed text-[#66738c]">
                    Indicadores generales y actividad reciente de la librería
                </p>
            </header>

            {/* MÉTRICAS PRINCIPALES — tarjetas coloreadas */}
            <section aria-labelledby="metricas-principales">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard titulo="Total vendido" valor={formatearMoneda(resumen.total_vendido)} icono={<FaMoneyBillTrendUp />} color="primary" />
                    <StatCard titulo="Ventas pagadas" valor={resumen.total_ventas} icono={<FaCircleCheck />} color="danger" />
                    <StatCard titulo="Reservas" valor={resumen.total_reservas} icono={<FaCalendarCheck />} color="success" />
                    <StatCard titulo="Stock bajo" valor={resumen.libros_stock_bajo} icono={<FaTriangleExclamation />} color="warning" />
                </div>
            </section>

            {/* CATÁLOGO — tarjetas blancas compactas con mini gráfica */}
            <section aria-labelledby="catalogo-equipo">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">

                    {/* Libros */}
                    <article className="relative overflow-hidden rounded-[8px] border border-[#e6ebf3] bg-white px-5 py-4 shadow-[0_2px_8px_rgba(30,64,175,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_14px_rgba(30,64,175,0.08)]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eaf3ff] text-[18px] text-[#0877e8]">
                                    <FaBook />
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#66738c]">Libros</p>
                                    <p className="mt-1 text-[24px] font-semibold leading-none tracking-[-0.02em] text-[#10213f]">{resumen.total_libros}</p>
                                </div>
                            </div>
                        </div>
                        <div className="pointer-events-none absolute bottom-2 right-3 h-[28px] w-[120px] text-[#60a5fa] opacity-45">
                            <svg viewBox="0 0 120 30" preserveAspectRatio="none" className="h-full w-full">
                                <path d="M0 24 L15 20 L28 23 L42 15 L55 20 L68 13 L82 18 L96 10 L108 15 L120 8" fill="none" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </div>
                    </article>

                    {/* Autores */}
                    <article className="relative overflow-hidden rounded-[8px] border border-[#e6ebf3] bg-white px-5 py-4 shadow-[0_2px_8px_rgba(30,64,175,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_14px_rgba(30,64,175,0.08)]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fff0f3] text-[18px] text-[#f43f5e]">
                                    <FaUserPen />
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#66738c]">Autores</p>
                                    <p className="mt-1 text-[24px] font-semibold leading-none tracking-[-0.02em] text-[#10213f]">{resumen.total_autores}</p>
                                </div>
                            </div>
                        </div>
                        <div className="pointer-events-none absolute bottom-2 right-3 h-[28px] w-[120px] text-[#fb7185] opacity-45">
                            <svg viewBox="0 0 120 30" preserveAspectRatio="none" className="h-full w-full">
                                <path d="M0 20 L15 16 L28 22 L42 14 L55 18 L68 10 L82 16 L96 8 L108 12 L120 6" fill="none" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </div>
                    </article>

                    {/* Categorías */}
                    <article className="relative overflow-hidden rounded-[8px] border border-[#e6ebf3] bg-white px-5 py-4 shadow-[0_2px_8px_rgba(30,64,175,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_14px_rgba(30,64,175,0.08)]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eafaf5] text-[18px] text-[#10b981]">
                                    <FaTags />
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#66738c]">Categorías</p>
                                    <p className="mt-1 text-[24px] font-semibold leading-none tracking-[-0.02em] text-[#10213f]">{resumen.total_categorias}</p>
                                </div>
                            </div>
                        </div>
                        <div className="pointer-events-none absolute bottom-2 right-3 h-[28px] w-[120px] text-[#34d399] opacity-45">
                            <svg viewBox="0 0 120 30" preserveAspectRatio="none" className="h-full w-full">
                                <path d="M0 22 L15 18 L28 24 L42 16 L55 20 L68 12 L82 17 L96 9 L108 14 L120 7" fill="none" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </div>
                    </article>

                    {/* Usuarios */}
                    <article className="relative overflow-hidden rounded-[8px] border border-[#e6ebf3] bg-white px-5 py-4 shadow-[0_2px_8px_rgba(30,64,175,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_14px_rgba(30,64,175,0.08)]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fff4e8] text-[18px] text-[#f97316]">
                                    <FaUsers />
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#66738c]">Usuarios</p>
                                    <p className="mt-1 text-[24px] font-semibold leading-none tracking-[-0.02em] text-[#10213f]">{resumen.total_usuarios}</p>
                                </div>
                            </div>
                        </div>
                        <div className="pointer-events-none absolute bottom-2 right-3 h-[28px] w-[120px] text-[#fb923c] opacity-45">
                            <svg viewBox="0 0 120 30" preserveAspectRatio="none" className="h-full w-full">
                                <path d="M0 18 L15 22 L28 16 L42 20 L55 14 L68 19 L82 11 L96 16 L108 9 L120 5" fill="none" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </div>
                    </article>

                </div>
            </section>

            {/* RENDIMIENTO — gráfico + top libros */}
            <section aria-labelledby="rendimiento">
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
                    <SalesChart ventasPorMes={ventasPorMes} />
                    <TopBooks libros={librosMasVendidos} />
                </div>
            </section>

            {/* ESTADOS OPERATIVOS — donuts */}
            <section aria-labelledby="estados-operativos">
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <StatusDonut titulo="Ventas por estado" subtitulo="Distribución real de las ventas" datos={ventasPorEstado} tipo="ventas" />
                    <StatusDonut titulo="Reservas por estado" subtitulo="Distribución real de las reservas" datos={reservasPorEstado} tipo="reservas" />
                </div>
            </section>

            {/* ACTIVIDAD RECIENTE */}
            <section aria-labelledby="actividad-reciente">
                <RecentBooks libros={libros} />
            </section>

        </div>
    );
}
