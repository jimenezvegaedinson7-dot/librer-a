import { useEffect, useMemo, useState } from 'react';

import {
    FaCreditCard,
    FaEye,
    FaFileCsv,
    FaMagnifyingGlass,
    FaRotate,
    FaXmark,
} from 'react-icons/fa6';

import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/TableSkeleton';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { BtnAccion } from '../../components/ui/Acciones';

import { formatearMoneda, formatearFecha } from '../../lib/utils/format';
import { exportarCsv } from '../../lib/utils/exportarCsv';

import { listarPagos, obtenerResumen } from './pagosService';
import PagoViewModal from './PagoViewModal';

const POR_PAGINA = 10;

const estadosVenta = {
    pendiente: { texto: 'Pendiente', color: 'warning' },
    pagada: { texto: 'Pagada', color: 'success' },
    entregada: { texto: 'Entregada', color: 'info' },
    cancelada: { texto: 'Cancelada', color: 'danger' },
};

const estadosPago = {
    approved: { texto: 'Aprobado', color: 'success' },
    pending: { texto: 'Pendiente', color: 'warning' },
    in_process: { texto: 'En proceso', color: 'warning' },
    rejected: { texto: 'Rechazado', color: 'danger' },
    refunded: { texto: 'Reembolsado', color: 'warning' },
    cancelled: { texto: 'Cancelado', color: 'neutral' },
};

function estadoVentaBadge(estado) {
    const dato = estadosVenta[estado] || { texto: estado || 'Sin estado', color: 'neutral' };
    return <Badge color={dato.color}>{dato.texto}</Badge>;
}

function estadoPagoBadge(estado) {
    const dato = estadosPago[estado] || estadosPago[`${estado}`.toLowerCase()];
    return <Badge color={dato?.color || 'neutral'}>{dato?.texto || estado || 'Sin pago'}</Badge>;
}

function entregaBadge(tipo) {
    switch (tipo) {
        case 'domicilio':
            return <Badge color="primary">A domicilio</Badge>;
        case 'agencia':
            return <Badge color="warning">Agencia</Badge>;
        case 'tienda':
            return <Badge color="neutral">Tienda</Badge>;
        default:
            return <Badge color="neutral">Sin especificar</Badge>;
    }
}

function valorOrdenPago(pago, campo) {
    switch (campo) {
        case 'cliente':
            return `${pago.cliente?.nombre_completo || ''}`.toLowerCase();
        case 'monto_total':
            return Number(pago.monto_total || 0);
        case 'estado_venta':
            return pago.estado_venta || '';
        case 'estado_pago':
            return pago.estado_pago || '';
        case 'fecha_creacion':
            return new Date(pago.fecha_creacion || 0).getTime();
        default:
            return pago[campo] || '';
    }
}

function formatearReferencia(referencia) {
    if (!referencia) return 'Sin referencia';
    return referencia.length > 26 ? `${referencia.slice(0, 26)}…` : referencia;
}

const columnasPagos = [
    {
        titulo: 'Cliente',
        ordenable: true,
        campo: 'cliente',
        render: (fila) => (
            <p className="text-sm text-slate-700">
                <span className="font-semibold text-slate-800">{fila.cliente?.nombre_completo || 'Sin nombre'}</span>
                <span className="block text-xs text-slate-500">{fila.cliente?.email || 'Sin correo'}</span>
            </p>
        ),
    },
    { titulo: 'Entrega', alineacion: 'centro', campo: 'tipo_entrega', ordenable: true, render: (fila) => entregaBadge(fila.tipo_entrega) },
    {
        titulo: 'Método de pago',
        campo: 'metodo_pago',
        render: (fila) => <span className="text-slate-700">{fila.metodo_pago || 'Sin método'}</span>,
    },
    {
        titulo: 'Monto',
        alineacion: 'centro',
        ordenable: true,
        campo: 'monto_total',
        render: (fila) => <span className="font-bold text-slate-800">{formatearMoneda(fila.monto_total)}</span>,
    },
    {
        titulo: 'Estado venta',
        alineacion: 'centro',
        ordenable: true,
        campo: 'estado_venta',
        render: (fila) => estadoVentaBadge(fila.estado_venta),
    },
    {
        titulo: 'Estado pago',
        alineacion: 'centro',
        ordenable: true,
        campo: 'estado_pago',
        render: (fila) => estadoPagoBadge(fila.estado_pago),
    },
    {
        titulo: 'Fecha',
        alineacion: 'centro',
        ordenable: true,
        campo: 'fecha_creacion',
        render: (fila) => (
            <span className="text-xs font-medium text-slate-700">{formatearFecha(fila.fecha_creacion) || 'Sin fecha'}</span>
        ),
    },
    {
        titulo: 'Referencia',
        render: (fila) => (
            <span title={fila.external_reference} className="block max-w-48 truncate text-xs font-medium text-slate-600">
                {formatearReferencia(fila.external_reference)}
            </span>
        ),
    },
];

function accionesPago(fila, { onVer }) {
    return (
        <BtnAccion tipo="ver" onClick={() => onVer(fila)} titulo="Ver detalle del pago">
            <FaEye />
        </BtnAccion>
    );
}

function Contador({ total, pagados, pendientes, cancelados, ingresos }) {
    return (
        <div className="flex flex-wrap gap-2">
            <span className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">
                Total: <span className="font-bold text-slate-900">{total}</span>
            </span>
            <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                Pagados: <span className="font-bold text-emerald-800">{pagados}</span>
            </span>
            <span className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
                Pendientes: <span className="font-bold text-amber-800">{pendientes}</span>
            </span>
            <span className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                Cancelados: <span className="font-bold text-red-800">{cancelados}</span>
            </span>
            <span className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-700">
                Ingresos: <span className="font-bold text-sky-800">{formatearMoneda(ingresos)}</span>
            </span>
        </div>
    );
}

export default function PagosPage() {
    const [pagos, setPagos] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalPaginas, setTotalPaginas] = useState(0);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const [resumen, setResumen] = useState({ pagado: 0, pendiente: 0, cancelado: 0, ingresos: 0 });

    const [busqueda, setBusqueda] = useState('');
    const [busquedaAplicada, setBusquedaAplicada] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [paginaActual, setPaginaActual] = useState(1);

    const [orden, setOrden] = useState({ campo: 'fecha_creacion', direccion: 'desc' });
    const [pagoVer, setPagoVer] = useState(null);

    const cargarPagos = async () => {
        try {
            setCargando(true);
            setError('');
            const resultado = await listarPagos({
                q: busquedaAplicada.trim() || undefined,
                estado: filtroEstado === 'todos' ? undefined : filtroEstado,
                pagina: paginaActual,
                por_pagina: POR_PAGINA,
            });
            setPagos(resultado.pagos);
            setTotal(resultado.total);
            setTotalPaginas(resultado.paginas);
            if (paginaActual > resultado.paginas) {
                setPaginaActual(resultado.paginas);
            }
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al cargar los pagos');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarPagos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busquedaAplicada, filtroEstado, paginaActual]);

    const cargarResumen = async () => {
        try {
            const datos = await obtenerResumen();
            setResumen({
                pagado: Number(datos.pagado || 0),
                pendiente: Number(datos.pendiente || 0),
                cancelado: Number(datos.cancelado || 0),
                ingresos: Number(datos.ingresos || 0),
            });
        } catch {
            setResumen({ pagado: 0, pendiente: 0, cancelado: 0, ingresos: 0 });
        }
    };

    useEffect(() => {
        cargarResumen();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const actualizar = () => {
        cargarPagos();
        cargarResumen();
    };

    const aplicarBusqueda = (valor) => {
        setBusqueda(valor);
        setBusquedaAplicada(valor);
        setPaginaActual(1);
    };

    const cambiarEstado = (estado) => {
        setFiltroEstado(estado);
        setPaginaActual(1);
    };

    const manejarOrden = (campo) => {
        setOrden((actual) => {
            if (actual.campo === campo) {
                return { campo, direccion: actual.direccion === 'asc' ? 'desc' : 'asc' };
            }
            return { campo, direccion: 'asc' };
        });
    };

    const pagosOrdenados = useMemo(() => {
        const copia = [...pagos];
        copia.sort((a, b) => {
            const va = valorOrdenPago(a, orden.campo);
            const vb = valorOrdenPago(b, orden.campo);
            if (va < vb) return orden.direccion === 'asc' ? -1 : 1;
            if (va > vb) return orden.direccion === 'asc' ? 1 : -1;
            return 0;
        });
        return copia;
    }, [pagos, orden]);

    const totalPagados = resumen.pagado;
    const totalPendientes = resumen.pendiente;
    const totalCancelados = resumen.cancelado;
    const totalIngresos = resumen.ingresos;

    const exportar = () => {
        exportarCsv({
            nombreArchivo: `pagos_${new Date().toISOString().slice(0, 10)}`,
            columnas: [
                { titulo: 'ID pago', exportar: (f) => f.id_pago },
                { titulo: 'ID venta', exportar: (f) => f.id_venta },
                { titulo: 'Cliente', exportar: (f) => f.cliente?.nombre_completo || '' },
                { titulo: 'Email', exportar: (f) => f.cliente?.email || '' },
                { titulo: 'Tipo de entrega', exportar: (f) => f.tipo_entrega || '' },
                { titulo: 'Método de pago', exportar: (f) => f.metodo_pago || '' },
                { titulo: 'Monto', exportar: (f) => f.monto_total || 0 },
                { titulo: 'Estado venta', exportar: (f) => f.estado_venta || '' },
                { titulo: 'Estado pago', exportar: (f) => f.estado_pago || '' },
                { titulo: 'Fecha', exportar: (f) => f.fecha_creacion || '' },
                { titulo: 'Referencia', exportar: (f) => f.external_reference || '' },
                { titulo: 'Orden PayU', exportar: (f) => f.payu_order_id || '' },
            ],
            filas: pagosOrdenados,
        });
    };

    return (
        <div className="space-y-4">
            <PageHeader
                titulo="Pagos"
                descripcion="Pagos de ventas realizadas en la librería"
                icono={<FaCreditCard />}
                acciones={
                    <Contador
                        total={total}
                        pagados={totalPagados}
                        pendientes={totalPendientes}
                        cancelados={totalCancelados}
                        ingresos={totalIngresos}
                    />
                }
            />

            <Card>
                <CardHeader
                    titulo="Filtros de pagos"
                    subtitulo="Busca por cliente, referencia o monto"
                    acciones={
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <div className="relative">
                                <Input
                                    type="text"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') aplicarBusqueda(busqueda);
                                    }}
                                    placeholder="Buscar pago..."
                                    icono={<FaMagnifyingGlass />}
                                    className="pr-8 sm:w-72"
                                />
                                {busqueda && (
                                    <button
                                        type="button"
                                        onClick={() => aplicarBusqueda('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 transition hover:text-slate-700"
                                        title="Limpiar búsqueda"
                                    >
                                        <FaXmark />
                                    </button>
                                )}
                            </div>

                            <Select value={filtroEstado} onChange={(e) => cambiarEstado(e.target.value)} className="sm:w-44">
                                <option value="todos">Todos los estados</option>
                                <option value="pendiente">Pendientes</option>
                                <option value="pagada">Pagadas</option>
                                <option value="entregada">Entregadas</option>
                                <option value="cancelada">Canceladas</option>
                            </Select>

                            <Button variante="secondary" onClick={actualizar} disabled={cargando}>
                                <FaRotate /> {cargando ? 'Actualizando...' : 'Actualizar'}
                            </Button>
                        </div>
                    }
                />
            </Card>

            {cargando && <TableSkeleton columnas={7} filas={8} titulo />}

            {!cargando && error && <Alert tipo="error">{error}</Alert>}

            {!cargando && !error && total === 0 && (
                <EmptyState
                    titulo="No hay pagos registrados"
                    descripcion="Cuando los clientes realicen compras, sus pagos aparecerán aquí."
                    icono={<FaCreditCard />}
                />
            )}

            {!cargando && !error && total > 0 && pagos.length === 0 && (
                <EmptyState
                    titulo="No se encontraron pagos"
                    descripcion="Cambia la búsqueda o el filtro seleccionado."
                    icono={<FaMagnifyingGlass />}
                    acciones={
                        <Button
                            variante="secondary"
                            onClick={() => {
                                setBusqueda('');
                                setBusquedaAplicada('');
                                setFiltroEstado('todos');
                                setPaginaActual(1);
                            }}
                        >
                            Limpiar filtros
                        </Button>
                    }
                />
            )}

            {!cargando && !error && pagos.length > 0 && (
                <Card>
                    <CardHeader
                        titulo="Pagos recibidos"
                        subtitulo="Detalle de pagos y su estado asociado a la venta"
                        acciones={
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                                    {total} {total === 1 ? 'pago' : 'pagos'}
                                </span>
                                <Button variante="secondary" tamano="sm" onClick={exportar}>
                                    <FaFileCsv /> Exportar CSV
                                </Button>
                            </div>
                        }
                    />
                    <CardBody className="p-0">
                        <DataTable
                            columnas={columnasPagos}
                            filas={pagosOrdenados}
                            keyExtractor={(fila) => fila.id_pago ?? fila.id_venta}
                            orden={orden}
                            onOrdenar={manejarOrden}
                            acciones={(fila) => accionesPago(fila, { onVer: setPagoVer })}
                        />
                    </CardBody>
                    <Pagination pagina={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
                </Card>
            )}

            <PagoViewModal pago={pagoVer} abierto={Boolean(pagoVer)} onCerrar={() => setPagoVer(null)} />
        </div>
    );
}