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
        <div className="space-y-4">
            <PageHeader titulo="Resumen" descripcion="Indicadores generales y actividad reciente de la librería" />

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard titulo="Total de libros" valor={resumen.total_libros} icono={<FaBook />} color="primary" />
                <StatCard titulo="Autores" valor={resumen.total_autores} icono={<FaUserPen />} color="info" />
                <StatCard titulo="Categorías" valor={resumen.total_categorias} icono={<FaTags />} color="warning" />
                <StatCard titulo="Reservas" valor={resumen.total_reservas} icono={<FaCalendarCheck />} color="success" />
                <StatCard titulo="Total vendido" valor={formatearMoneda(resumen.total_vendido)} icono={<FaMoneyBillTrendUp />} color="success" />
                <StatCard titulo="Usuarios" valor={resumen.total_usuarios} icono={<FaUsers />} color="primary" />
                <StatCard titulo="Stock bajo" valor={resumen.libros_stock_bajo} icono={<FaTriangleExclamation />} color="danger" />
                <StatCard titulo="Ventas pagadas" valor={resumen.total_ventas} icono={<FaCircleCheck />} color="info" />
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_1fr]">
                <RecentBooks libros={libros} />
                <SalesChart ventasPorMes={ventasPorMes} />
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <StatusDonut titulo="Ventas por estado" subtitulo="Distribución real de las ventas" datos={ventasPorEstado} tipo="ventas" />
                <StatusDonut titulo="Reservas por estado" subtitulo="Distribución real de las reservas" datos={reservasPorEstado} tipo="reservas" />
            </section>

            <TopBooks libros={librosMasVendidos} />
        </div>
    );
}

