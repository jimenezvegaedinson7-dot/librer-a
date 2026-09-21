import { useEffect, useMemo, useState } from 'react';

import { FaEye, FaFileCsv, FaFileInvoice, FaMagnifyingGlass, FaPenToSquare, FaReceipt, FaRotate, FaXmark } from 'react-icons/fa6';

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

import { useToast } from '../../components/providers/ToastProvider';

import { listarVentas, obtenerVenta } from './ventasService';
import ComprobanteViewModal from '../comprobantes/ComprobanteViewModal';
import VentaForm from './VentaForm';
import VentaViewModal from './VentaViewModal';
import VentaEstadoModal from './VentaEstadoModal';
import EmitirComprobanteModal from './EmitirComprobanteModal';

const POR_PAGINA = 10;

const estadosVenta = {
    pendiente: { texto: 'Pendiente', color: 'warning' },
    pagada: { texto: 'Pagada', color: 'success' },
    entregada: { texto: 'Entregada', color: 'info' },
    cancelada: { texto: 'Cancelada', color: 'danger' },
};

function valorOrdenVenta(venta, campo) {
    switch (campo) {
        case 'usuario':
            return `${venta.nombre_usuario || ''} ${venta.apellido_usuario || ''}`.toLowerCase();
        case 'total':
            return Number(venta.total || 0);
        case 'fecha_venta':
            return new Date(venta.fecha_venta || 0).getTime();
        default:
            return venta[campo] || '';
    }
}

const columnasVentas = [
    { titulo: 'ID', alineacion: 'centro', ordenable: true, campo: 'id_venta', render: (fila) => <span className="font-semibold text-mahogany-700">{fila.id_venta}</span> },
    {
        titulo: 'Usuario',
        ordenable: true,
        campo: 'usuario',
        render: (fila) => (
            <p className="text-sm text-mahogany-700">
                <span className="font-semibold text-mahogany-700">{`${fila.nombre_usuario || ''} ${fila.apellido_usuario || ''}`.trim() || 'Usuario no disponible'}</span>
                <span className="block text-xs text-primary-400">{fila.correo_compra || fila.correo_usuario || ''}</span>
            </p>
        ),
    },
    { titulo: 'Fecha', alineacion: 'centro', ordenable: true, campo: 'fecha_venta', render: (fila) => <span className="text-xs font-medium text-mahogany-700">{formatearFecha(fila.fecha_venta) || 'Sin fecha'}</span> },
    { titulo: 'Total', alineacion: 'centro', ordenable: true, campo: 'total', render: (fila) => <span className="font-bold text-mahogany-700">{formatearMoneda(Number(fila.total || 0))}</span> },
    {
        titulo: 'Estado',
        alineacion: 'centro',
        ordenable: true,
        campo: 'estado',
        render: (fila) => {
            const estado = estadosVenta[fila.estado] || { texto: fila.estado || 'Sin estado', color: 'neutral' };
            return <Badge color={estado.color}>{estado.texto}</Badge>;
        },
    },
    {
        titulo: 'Entrega',
        alineacion: 'centro',
        ordenable: true,
        campo: 'tipo_entrega',
        render: (fila) => {
            if (fila.tipo_entrega === 'domicilio') {
                return <Badge color="primary">A domicilio</Badge>;
            }
            if (fila.tipo_entrega === 'agencia') {
                return (
                    <span title={fila.agencia || 'Agencia courier'}>
                        <Badge color="warning">Agencia</Badge>
                    </span>
                );
            }
            if (fila.tipo_entrega === 'tienda') {
                return <Badge color="neutral">Recoger en tienda</Badge>;
            }
            return <Badge color="neutral">Sin especificar</Badge>;
        },
    },
];

function accionesVenta(fila, { onVer, onCambiarEstado, onEmitirComprobante }) {
    const ventaCancelada = fila.estado === 'cancelada';
    const conComprobante = Number(fila.tiene_comprobante ?? 0) === 1;
    const puedeEmitir = !conComprobante && (fila.estado === 'pagada' || fila.estado === 'entregada');
    return (
        <>
            <BtnAccion tipo="ver" onClick={() => onVer(fila)} titulo="Ver venta"><FaEye /></BtnAccion>
            <BtnAccion
                tipo="editar"
                onClick={() => !ventaCancelada && onCambiarEstado(fila)}
                titulo={ventaCancelada ? 'La venta ya está cancelada' : 'Cambiar estado'}
            >
                <FaPenToSquare />
            </BtnAccion>
            {conComprobante && (fila.estado === 'pagada' || fila.estado === 'entregada') && (
                <Badge color="primary">Comprobante</Badge>
            )}
            {puedeEmitir && (
                <>
                    <BtnAccion tipo="ver" onClick={() => onEmitirComprobante(fila, 'boleta')} titulo="Emitir boleta">
                        <FaReceipt />
                    </BtnAccion>
                    <BtnAccion tipo="ver" onClick={() => onEmitirComprobante(fila, 'factura')} titulo="Emitir factura">
                        <FaFileInvoice />
                    </BtnAccion>
                </>
            )}
        </>
    );
}

function Contador({ total, pendientes, pagadas, entregadas, canceladas, ingresos }) {
    return (
        <div className="summary-strip flex flex-wrap gap-2">
            <span className="rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm font-medium text-[#334155] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Total: <span className="font-bold text-[#0f172a]">{total}</span>
            </span>
            <span className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-2.5 text-sm font-medium text-[#d97706] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Pendientes: <span className="font-bold text-[#d97706]">{pendientes}</span>
            </span>
            <span className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-2.5 text-sm font-medium text-[#15803d] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Pagadas: <span className="font-bold text-[#15803d]">{pagadas}</span>
            </span>
            <span className="rounded-xl border border-[#a5f3fc] bg-[#f0f9ff] px-4 py-2.5 text-sm font-medium text-[#0891b2] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Entregadas: <span className="font-bold text-[#0891b2]">{entregadas}</span>
            </span>
            <span className="rounded-xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-2.5 text-sm font-medium text-[#e11d48] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Canceladas: <span className="font-bold text-[#e11d48]">{canceladas}</span>
            </span>
            <span className="rounded-xl border border-[#bbf7d0] bg-[#ecfdf5] px-4 py-2.5 text-sm font-medium text-[#059669] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Ingresos: <span className="font-bold text-[#059669]">{formatearMoneda(ingresos)}</span>
            </span>
        </div>
    );
}

export default function VentasPage() {
    const { exito, error: mostrarError } = useToast();

    const [ventas, setVentas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

const [ventaVer, setVentaVer] = useState(null);
    const [ventaEstado, setVentaEstado] = useState(null);
    const [comprobanteEmitido, setComprobanteEmitido] = useState(null);
    const [comprobanteModal, setComprobanteModal] = useState(null);

    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [filtroEntrega, setFiltroEntrega] = useState('todos');

const [paginaActual, setPaginaActual] = useState(1);

    const [orden, setOrden] = useState({ campo: 'fecha_venta', direccion: 'desc' });

    const cargarVentas = async () => {
        try {
            setCargando(true);
            setError('');
            setVentas(await listarVentas());
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al cargar las ventas');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarVentas();
    }, []);

    const totalPendientes = ventas.filter((v) => v.estado === 'pendiente').length;
    const totalPagadas = ventas.filter((v) => v.estado === 'pagada').length;
    const totalEntregadas = ventas.filter((v) => v.estado === 'entregada').length;
    const totalCanceladas = ventas.filter((v) => v.estado === 'cancelada').length;
const totalIngresos = ventas
        .filter((v) => v.estado === 'pagada' || v.estado === 'entregada')
        .reduce((acumulado, v) => acumulado + Number(v.total || 0), 0);

    const ventasFiltradas = useMemo(() => {
        const texto = busqueda.toLowerCase().trim();
        return ventas.filter((venta) => {
            const usuario = `${venta.nombre_usuario || ''} ${venta.apellido_usuario || ''}`.toLowerCase();
            const idVenta = String(venta.id_venta || '');
            const total = String(venta.total || '');
            const direccion = String(venta.direccion || '').toLowerCase();
            const tipoEntrega = String(venta.tipo_entrega || '').toLowerCase();

            const coincideBusqueda =
                !texto ||
                usuario.includes(texto) ||
                idVenta.includes(texto) ||
                total.includes(texto) ||
                direccion.includes(texto) ||
                tipoEntrega.includes(texto);
            const coincideEstado = filtroEstado === 'todos' || venta.estado === filtroEstado;
            const coincideEntrega = filtroEntrega === 'todos' || (venta.tipo_entrega || '') === filtroEntrega;

            return coincideBusqueda && coincideEstado && coincideEntrega;
        });
    }, [ventas, busqueda, filtroEstado, filtroEntrega]);

const totalPaginas = Math.ceil(ventasFiltradas.length / POR_PAGINA);

    const ventasOrdenadas = useMemo(() => {
        const copia = [...ventasFiltradas];
        copia.sort((a, b) => {
            const va = valorOrdenVenta(a, orden.campo);
            const vb = valorOrdenVenta(b, orden.campo);
            if (va < vb) return orden.direccion === 'asc' ? -1 : 1;
            if (va > vb) return orden.direccion === 'asc' ? 1 : -1;
            return 0;
        });
        return copia;
    }, [ventasFiltradas, orden]);

    const ventasPaginadas = ventasOrdenadas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

    const manejarOrden = (campo) => {
        setOrden((actual) => {
            if (actual.campo === campo) {
                return { campo, direccion: actual.direccion === 'asc' ? 'desc' : 'asc' };
            }
            return { campo, direccion: 'asc' };
        });
    };

    useEffect(() => {
        setPaginaActual(1);
    }, [busqueda, filtroEstado, filtroEntrega]);

    useEffect(() => {
        if (totalPaginas > 0 && paginaActual > totalPaginas) setPaginaActual(totalPaginas);
    }, [paginaActual, totalPaginas]);

    const verVenta = async (venta) => {
        try {
            setVentaVer(await obtenerVenta(venta.id_venta));
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || 'Error al obtener la venta');
        }
    };

const cambiarEstadoVenta = async (venta) => {
        try {
            setVentaEstado(await obtenerVenta(venta.id_venta));
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || 'Error al obtener la venta');
        }
    };

    const abrirEmitirComprobante = (venta, tipo) => {
        setComprobanteModal({ venta, tipo });
    };

    const manejarComprobanteEmitido = (comprobante) => {
        setVentas((actuales) =>
            actuales.map((venta) =>
                venta.id_venta === comprobante?.id_venta
                    ? { ...venta, tiene_comprobante: 1 }
                    : venta,
            ),
        );
        setComprobanteEmitido(comprobante);
    };

    const ventaCreada = async (respuesta) => {
        await cargarVentas();
        exito(respuesta?.mensaje || 'Venta registrada correctamente');
    };

const ventaActualizada = async (mensaje) => {
        await cargarVentas();
        exito(mensaje || 'Estado de venta actualizado correctamente');
    };

    const exportar = () => {
        exportarCsv({
            nombreArchivo: `ventas_${new Date().toISOString().slice(0, 10)}`,
            columnas: [
                { titulo: 'ID', exportar: (f) => f.id_venta },
                { titulo: 'Cliente', exportar: (f) => `${f.nombre_usuario || ''} ${f.apellido_usuario || ''}`.trim() },
                { titulo: 'Correo', exportar: (f) => f.correo_compra || f.correo_usuario || '' },
                { titulo: 'Fecha', exportar: (f) => f.fecha_venta || '' },
                { titulo: 'Total', exportar: (f) => f.total || 0 },
                { titulo: 'Costo envío', exportar: (f) => f.costo_envio || 0 },
                { titulo: 'Estado', exportar: (f) => f.estado || '' },
                { titulo: 'Tipo de entrega', exportar: (f) => f.tipo_entrega || '' },
                { titulo: 'Dirección', exportar: (f) => f.direccion || '' },
                { titulo: 'Agencia', exportar: (f) => f.agencia || '' },
            ],
            filas: ventasOrdenadas,
        });
    };

    const limpiarFiltros = () => {
        setBusqueda('');
        setFiltroEstado('todos');
        setFiltroEntrega('todos');
        setPaginaActual(1);
    };

    const hayFiltros = busqueda || filtroEstado !== 'todos' || filtroEntrega !== 'todos';

    return (
        <div className="space-y-4">
<PageHeader
                titulo="Ventas / Compras"
                descripcion="Compras realizadas: quién compró, qué y cuánto"
                acciones={
                    <Contador
                        total={ventas.length}
                        pendientes={totalPendientes}
                        pagadas={totalPagadas}
                        entregadas={totalEntregadas}
                        canceladas={totalCanceladas}
                        ingresos={totalIngresos}
                    />
                }
            />

            <VentaForm onVentaCreada={ventaCreada} />

            <Card>
                <CardHeader
                    titulo="Lista de ventas"
                    subtitulo="Busca ventas por usuario, ID o total"
                    acciones={
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <div className="relative">
                                <Input
                                    type="text"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Buscar venta..."
                                    icono={<FaMagnifyingGlass />}
                                    className="pr-8 sm:w-72"
                                />
                                {busqueda && (
                                    <button
                                        type="button"
                                        onClick={() => setBusqueda('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-primary-400 transition hover:text-mahogany-700"
                                        title="Limpiar búsqueda"
                                    >
                                        <FaXmark />
                                    </button>
                                )}
                            </div>

                            <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="sm:w-48">
                                <option value="todos">Todos los estados</option>
                                <option value="pendiente">Pendientes</option>
                                <option value="pagada">Pagadas</option>
                                <option value="entregada">Entregadas</option>
                                <option value="cancelada">Canceladas</option>
                            </Select>

<Select value={filtroEntrega} onChange={(e) => setFiltroEntrega(e.target.value)} className="sm:w-52">
                                <option value="todos">Todas las entregas</option>
                                <option value="domicilio">A domicilio</option>
                                <option value="agencia">Agencia courier</option>
                                <option value="tienda">Recoger en tienda</option>
                            </Select>

                            {hayFiltros && (
                                <Button variante="secondary" onClick={limpiarFiltros}>Limpiar</Button>
                            )}

                            <Button variante="secondary" onClick={cargarVentas} disabled={cargando}>
                                <FaRotate /> {cargando ? 'Actualizando...' : 'Actualizar'}
                            </Button>
                        </div>
                    }
                />
            </Card>

            {cargando && <TableSkeleton columnas={7} filas={8} titulo />}

            {!cargando && error && <Alert tipo="error">{error}</Alert>}

            {!cargando && !error && ventas.length === 0 && (
                <EmptyState
                    titulo="No hay ventas registradas"
                    descripcion="Registra una venta utilizando el formulario."
                    icono={<FaMagnifyingGlass />}
                />
            )}

            {!cargando && !error && ventas.length > 0 && ventasFiltradas.length === 0 && (
                <EmptyState
                    titulo="No se encontraron ventas"
                    descripcion="Cambia la búsqueda o el filtro seleccionado."
                    icono={<FaMagnifyingGlass />}
                    acciones={<Button variante="secondary" onClick={limpiarFiltros}>Limpiar filtros</Button>}
                />
            )}

            {!cargando && !error && ventasPaginadas.length > 0 && (
                <Card>
<CardHeader
                        titulo="Ventas registradas"
                        subtitulo="Historial de ventas realizadas"
                        acciones={
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-primary-200 bg-white px-3 py-1 text-xs font-bold text-mahogany-700">
                                    {ventasFiltradas.length} {ventasFiltradas.length === 1 ? 'venta' : 'ventas'}
                                </span>
                                <Button variante="secondary" tamano="sm" onClick={exportar}>
                                    <FaFileCsv /> Exportar CSV
                                </Button>
                            </div>
                        }
                    />
                    <CardBody className="p-0">
                        <DataTable
                            columnas={columnasVentas}
                            filas={ventasPaginadas}
                            keyExtractor={(fila) => fila.id_venta}
                            orden={orden}
                            onOrdenar={manejarOrden}
                            acciones={(fila) =>
                                accionesVenta(fila, {
                                    onVer: verVenta,
                                    onCambiarEstado: cambiarEstadoVenta,
                                    onEmitirComprobante: abrirEmitirComprobante,
                                })
                            }
                        />
                    </CardBody>
                    <Pagination pagina={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
                </Card>
            )}

<VentaViewModal venta={ventaVer} abierto={Boolean(ventaVer)} onCerrar={() => setVentaVer(null)} />
            <VentaEstadoModal
                venta={ventaEstado}
                abierto={Boolean(ventaEstado)}
                onCerrar={() => setVentaEstado(null)}
                onActualizado={ventaActualizada}
            />
<ComprobanteViewModal
                comprobante={comprobanteEmitido}
                abierto={Boolean(comprobanteEmitido)}
                onCerrar={() => setComprobanteEmitido(null)}
            />
            <EmitirComprobanteModal
                venta={comprobanteModal?.venta}
                tipoInicial={comprobanteModal?.tipo || 'boleta'}
                abierto={Boolean(comprobanteModal)}
                onCerrar={() => setComprobanteModal(null)}
                onEmitido={manejarComprobanteEmitido}
            />
        </div>
    );
}

