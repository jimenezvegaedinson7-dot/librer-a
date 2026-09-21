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
        <div className="dashboard-page space-y-6">

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

            {/* CATÁLOGO Y EQUIPO — tarjetas blancas limpias */}
            <section aria-labelledby="catalogo-equipo">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <article className="flex min-h-[110px] items-center gap-4 rounded-[8px] border border-[#e6ebf3] bg-white px-5 py-5 shadow-[0_2px_8px_rgba(30,64,175,0.05)]">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#edf5ff] text-[16px] text-[#0877e8]">
                            <FaBook />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#67738d]">Libros</p>
                            <p className="mt-1 text-[26px] font-semibold leading-none tracking-[-0.02em] text-[#10213f]">{resumen.total_libros}</p>
                        </div>
                    </article>

                    <article className="flex min-h-[110px] items-center gap-4 rounded-[8px] border border-[#e6ebf3] bg-white px-5 py-5 shadow-[0_2px_8px_rgba(30,64,175,0.05)]">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#edf5ff] text-[16px] text-[#0877e8]">
                            <FaUserPen />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#67738d]">Autores</p>
                            <p className="mt-1 text-[26px] font-semibold leading-none tracking-[-0.02em] text-[#10213f]">{resumen.total_autores}</p>
                        </div>
                    </article>

                    <article className="flex min-h-[110px] items-center gap-4 rounded-[8px] border border-[#e6ebf3] bg-white px-5 py-5 shadow-[0_2px_8px_rgba(30,64,175,0.05)]">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#edf5ff] text-[16px] text-[#0877e8]">
                            <FaTags />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#67738d]">Categorías</p>
                            <p className="mt-1 text-[26px] font-semibold leading-none tracking-[-0.02em] text-[#10213f]">{resumen.total_categorias}</p>
                        </div>
                    </article>

                    <article className="flex min-h-[110px] items-center gap-4 rounded-[8px] border border-[#e6ebf3] bg-white px-5 py-5 shadow-[0_2px_8px_rgba(30,64,175,0.05)]">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#edf5ff] text-[16px] text-[#0877e8]">
                            <FaUsers />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#67738d]">Usuarios</p>
                            <p className="mt-1 text-[26px] font-semibold leading-none tracking-[-0.02em] text-[#10213f]">{resumen.total_usuarios}</p>
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
