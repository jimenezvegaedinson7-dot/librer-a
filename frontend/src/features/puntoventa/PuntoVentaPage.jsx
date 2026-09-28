import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    BookOpen,
    Boxes,
    CalendarCheck,
    CircleAlert,
    CreditCard,
    Package,
    Receipt,
    ShoppingCart,
    Store,
} from 'lucide-react';

import { useAuth } from '../auth/AuthContext';
import { Card, CardBody } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { formatearMoneda } from '../../lib/utils/format';
import { obtenerStockBajo, obtenerReservasPorEstado, obtenerVentasPorEstado, obtenerCierreCaja } from '../reportes/reportesService';
import { obtenerResumen as obtenerResumenPagos } from '../pagos/pagosService';

const buscarEstado = (filas, estado, campo) =>
    (Array.isArray(filas) ? filas : []).find(
        (fila) => String(fila?.estado) === estado,
    )?.[campo] ?? 0;

// Hora de Perú, igual que el backend y que CierreCajaPage.
const hoyLima = () => new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);

const ACCESOS = [
    { nombre: 'Ventas', detalle: 'Confirmar entregas', ruta: '/ventas', icono: ShoppingCart },
    { nombre: 'Reservas', detalle: 'Confirmar o cancelar', ruta: '/reservas', icono: CalendarCheck },
    { nombre: 'Comprobantes', detalle: 'Emitir y enviar boletas', ruta: '/comprobantes', icono: Receipt },
    { nombre: 'Pagos', detalle: 'Revisar pagos recibidos', ruta: '/pagos', icono: CreditCard },
    { nombre: 'Cierre de caja', detalle: 'Cobros del dÃ­a', ruta: '/cierre-caja', icono: Package },
    { nombre: 'Libros', detalle: 'Consultar catÃ¡logo', ruta: '/libros', icono: BookOpen },
    { nombre: 'Inventario', detalle: 'Consultar stock', ruta: '/inventario', icono: Boxes },
];

export default function PuntoVentaPage() {
    const { usuario } = useAuth();

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [datos, setDatos] = useState({
        cierre: {},
        pagos: {},
        stockBajo: [],
        reservas: [],
        ventasPorEstado: [],
    });

    useEffect(() => {
        let vigente = true;

        // Cada consulta es independiente: si una falla, el resto de la
        // portada sigue siendo útil.
        //
        // Solo se piden agregados operativos permitidos al cajero.
        // Las estadísticas administrativas del dashboard
        // (/reportes/indicadores-ventas, /resumen, las series) son
        // solo de administrador y no se usan aquí.
        const cargar = async () => {
            try {
                const [cierre, pagos, stockBajo, reservas, ventasPorEstado] = await Promise.all([
                    obtenerCierreCaja(hoyLima()).catch(() => ({})),
                    obtenerResumenPagos().catch(() => ({})),
                    obtenerStockBajo().catch(() => []),
                    obtenerReservasPorEstado().catch(() => []),
                    obtenerVentasPorEstado().catch(() => []),
                ]);

                if (!vigente) return;
                setDatos({ cierre, pagos, stockBajo, reservas, ventasPorEstado });
            } catch (err) {
                if (vigente) setError(err?.response?.data?.mensaje || 'No se pudo cargar el resumen del día');
            } finally {
                if (vigente) setCargando(false);
            }
        };

        cargar();

        return () => {
            vigente = false;
        };
    }, []);

    const { cierre, pagos, stockBajo, reservas, ventasPorEstado } = datos;
    const totales = cierre?.totales || {};

    const pendientes = useMemo(
        () => buscarEstado(reservas, 'pendiente', 'cantidad'),
        [reservas],
    );
    const ventasPendientes = useMemo(
        () => buscarEstado(ventasPorEstado, 'pendiente', 'cantidad'),
        [ventasPorEstado],
    );

    if (cargando) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                titulo={`Hola, ${usuario?.nombre || 'cajero'}`}
                descripcion="Punto de venta: lo que necesitas para atender el mostrador."
                icono={<Store />}
                color="emerald"
            />

            {error && <Alert tipo="error">{error}</Alert>}

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Indicador
                    titulo="Cobrado hoy"
                    valor={formatearMoneda(totales.cobrado)}
                    detalle={`${Number(totales.cobros ?? 0)} cobro(s)`}
                    icono={<ShoppingCart />}
                />
                <Indicador
                    titulo="Neto del día"
                    valor={formatearMoneda(totales.neto)}
                    detalle={`Reembolsos: ${formatearMoneda(totales.reembolsado)}`}
                    icono={<Receipt />}
                />
                <Indicador
                    titulo="Ventas por entregar"
                    valor={ventasPendientes}
                    detalle="Pendientes de confirmar"
                    icono={<Package />}
                />
                <Indicador
                    titulo="Reservas pendientes"
                    valor={pendientes}
                    detalle="Requieren confirmación"
                    icono={<CalendarCheck />}
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardBody className="space-y-3">
                        <h2 className="text-sm font-semibold text-[#1c1814]">Accesos rÃ¡pidos</h2>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {ACCESOS.map(({ nombre, detalle, ruta, icono }) => (
                                <Link
                                    key={ruta}
                                    to={ruta}
                                    className="flex items-center gap-3 rounded-xl border border-[#e6e0d7] bg-[#faf8f5] px-3 py-2.5 transition-colors hover:border-[#dcbb7a] hover:bg-[#fcf8ef]"
                                >
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#9a7231] shadow-sm">
                                        {icono}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block truncate text-[13.5px] font-semibold text-[#1c1814]">{nombre}</span>
                                        <span className="block truncate text-[11.5px] text-[#766d62]">{detalle}</span>
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </CardBody>
                </Card>

                <div className="space-y-4">
                    <Card>
                        <CardBody>
                            <h2 className="text-sm font-semibold text-[#1c1814]">Pendientes de hoy</h2>
                            <ul className="mt-3 space-y-2 text-sm text-[#433c35]">
                                <li className="flex items-center justify-between gap-3">
                                    <span>Ventas por entregar</span>
                                    <strong className="tabular-nums">{ventasPendientes}</strong>
                                </li>
                                <li className="flex items-center justify-between gap-3">
                                    <span>Reservas por confirmar</span>
                                    <strong className="tabular-nums">{pendientes}</strong>
                                </li>
                                <li className="flex items-center justify-between gap-3">
                                    <span>Pagos pendientes de cobro</span>
                                    <strong className="tabular-nums">{formatearMoneda(pagos.pendiente)}</strong>
                                </li>
                                <li className="flex items-center justify-between gap-3">
                                    <span>TÃ­tulos con stock bajo o agotado</span>
                                    <strong className="tabular-nums">{stockBajo.length}</strong>
                                </li>
                            </ul>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardBody>
                            <h2 className="flex items-center gap-2 text-sm font-semibold text-[#1c1814]">
                                <CircleAlert className="text-amber-500" />
                                Stock bajo o agotado
                            </h2>
                            {stockBajo.length === 0 ? (
                                <p className="mt-2 text-sm text-[#766d62]">NingÃºn tÃ­tulo estÃ¡ por debajo del mÃ­nimo.</p>
                            ) : (
                                <ul className="mt-2 space-y-1.5 text-sm text-[#433c35]">
                                    {stockBajo.slice(0, 5).map((fila) => (
                                        <li key={fila.id_inventario} className="flex items-center justify-between gap-3">
                                            <span className="truncate">{fila.titulo}</span>
                                            <strong className="shrink-0 tabular-nums">
                                                {fila.stock} / {fila.stock_minimo}
                                            </strong>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {stockBajo.length > 5 && (
                                <Link to="/inventario" className="mt-3 inline-block text-xs font-semibold text-[#9a7231] hover:underline">
                                    Ver los {stockBajo.length} tÃ­tulos
                                </Link>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function Indicador({ titulo, valor, detalle, icono }) {
    return (
        <div className="rounded-xl border border-[#e6e0d7] bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a39a8e]">{titulo}</p>
                <span className="text-[#dcbb7a]">{icono}</span>
            </div>
            <p className="mt-1.5 font-title text-[22px] font-semibold leading-tight text-[#1c1814] tabular-nums">{valor}</p>
            <p className="mt-0.5 truncate text-[11.5px] text-[#766d62]">{detalle}</p>
        </div>
    );
}
