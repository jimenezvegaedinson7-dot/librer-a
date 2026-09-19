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
import { PageHeader } from '../../components/ui/PageHeader';
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
        return () => {
            activo = false;
        };
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
            <PageHeader titulo="Resumen" descripcion="Indicadores generales y actividad reciente de la librería" />

            <section aria-labelledby="metricas-principales">
                <div className="dashboard-section-heading">
                    <div>
                        <h2 id="metricas-principales">Métricas principales</h2>
                        <p>Rendimiento comercial y alertas operativas</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard titulo="Total vendido" valor={formatearMoneda(resumen.total_vendido)} icono={<FaMoneyBillTrendUp />} color="success" />
                    <StatCard titulo="Ventas pagadas" valor={resumen.total_ventas} icono={<FaCircleCheck />} color="info" />
                    <StatCard titulo="Reservas" valor={resumen.total_reservas} icono={<FaCalendarCheck />} color="success" />
                    <StatCard titulo="Stock bajo" valor={resumen.libros_stock_bajo} icono={<FaTriangleExclamation />} color="danger" />
                </div>
            </section>

            <section aria-labelledby="catalogo-equipo">
                <div className="dashboard-section-heading">
                    <div>
                        <h2 id="catalogo-equipo">Catálogo y equipo</h2>
                        <p>Vista general de los recursos registrados</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatCard titulo="Total de libros" valor={resumen.total_libros} icono={<FaBook />} color="primary" />
                    <StatCard titulo="Autores" valor={resumen.total_autores} icono={<FaUserPen />} color="info" />
                    <StatCard titulo="Categorías" valor={resumen.total_categorias} icono={<FaTags />} color="warning" />
                    <StatCard titulo="Usuarios" valor={resumen.total_usuarios} icono={<FaUsers />} color="primary" />
                </div>
            </section>

            <section aria-labelledby="rendimiento" className="space-y-3">
                <div className="dashboard-section-heading">
                    <div>
                        <h2 id="rendimiento">Rendimiento</h2>
                        <p>Evolución de ventas y productos destacados</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
                    <SalesChart ventasPorMes={ventasPorMes} />
                    <TopBooks libros={librosMasVendidos} />
                </div>
            </section>

            <section aria-labelledby="estados-operativos" className="space-y-3">
                <div className="dashboard-section-heading">
                    <div>
                        <h2 id="estados-operativos">Estados operativos</h2>
                        <p>Distribución de ventas y reservas</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <StatusDonut titulo="Ventas por estado" subtitulo="Distribución real de las ventas" datos={ventasPorEstado} tipo="ventas" />
                    <StatusDonut titulo="Reservas por estado" subtitulo="Distribución real de las reservas" datos={reservasPorEstado} tipo="reservas" />
                </div>
            </section>

            <section aria-labelledby="actividad-reciente" className="space-y-3">
                <div className="dashboard-section-heading">
                    <div>
                        <h2 id="actividad-reciente">Actividad reciente</h2>
                        <p>Últimas incorporaciones al catálogo</p>
                    </div>
                </div>
                <RecentBooks libros={libros} />
            </section>
        </div>
    );
}

