import { useEffect, useMemo, useState } from 'react';

import {
    FaCartPlus,
    FaCheck,
    FaChevronUp,
    FaCircleCheck,
    FaClock,
    FaEye,
    FaFileCsv,
    FaFileInvoice,
    FaMagnifyingGlass,
    FaMoneyBillTrendUp,
    FaReceipt,
    FaRotate,
    FaXmark,
} from 'react-icons/fa6';
import { motion } from 'motion/react';

import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Form';
import { StatCard } from '../dashboard/StatCard';
import { num, serieDiaria } from '../dashboard/graficoUtils';
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

import { cambiarEstadoVenta as actualizarEstadoVenta, listarVentas, obtenerVenta } from './ventasService';
import { ConfirmarAccion } from '../../components/ui/ConfirmarAccion';
import ComprobanteViewModal from '../comprobantes/ComprobanteViewModal';
import VentaForm from './VentaForm';
import VentaViewModal from './VentaViewModal';
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
    { titulo: 'ID', alineacion: 'centro', ordenable: true, campo: 'id_venta', render: (fila) => <span className="font-semibold tabular-nums text-slate-500">#{fila.id_venta}</span> },
    {
        titulo: 'Usuario',
        ordenable: true,
        campo: 'usuario',
        render: (fila) => {
            const nombre = `${fila.nombre_usuario || ''} ${fila.apellido_usuario || ''}`.trim();
            const iniciales = nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
            return (
                <div className="flex min-w-0 items-center gap-3">
                    <span className="cliente-iniciales" aria-hidden="true">{iniciales}</span>
                    <p className="min-w-0 text-sm">
                        <span className="block truncate font-semibold text-slate-800">{nombre || 'Usuario no disponible'}</span>
                        <span className="block truncate text-xs text-slate-500">{fila.correo_compra || fila.correo_usuario || ''}</span>
                    </p>
                </div>
            );
        },
    },
    { titulo: 'Fecha', alineacion: 'centro', ordenable: true, campo: 'fecha_venta', render: (fila) => <span className="text-xs font-medium text-slate-700">{formatearFecha(fila.fecha_venta) || 'Sin fecha'}</span> },
    { titulo: 'Total', alineacion: 'derecha', ordenable: true, campo: 'total', render: (fila) => <span className="font-semibold tabular-nums text-slate-800">{formatearMoneda(Number(fila.total || 0))}</span> },
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

function accionesVenta(fila, { onVer, onConfirmarEntrega, onEmitirComprobante }) {
    const conComprobante = Number(fila.tiene_comprobante ?? 0) === 1;
    const puedeEmitir = !conComprobante && (fila.estado === 'pagada' || fila.estado === 'entregada');
    return (
        <>
            <BtnAccion tipo="ver" onClick={() => onVer(fila)} titulo="Ver venta"><FaEye /></BtnAccion>
            {/* Única transición manual: pagada → entregada (las pendientes se cancelan solas a los 30 min). */}
            {fila.estado === 'pagada' && (
                <BtnAccion tipo="ver" onClick={() => onConfirmarEntrega(fila)} titulo="Confirmar entrega" className="btn-confirmar">
                    <FaCheck />
                </BtnAccion>
            )}
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

const FILTROS_ESTADO = [
    { valor: 'todos', texto: 'Todas', clase: 'estado--neutro' },
    { valor: 'pendiente', texto: 'Pendientes', clase: 'estado--aviso' },
    { valor: 'pagada', texto: 'Pagadas', clase: 'estado--exito' },
    { valor: 'entregada', texto: 'Entregadas', clase: 'estado--info' },
    { valor: 'cancelada', texto: 'Canceladas', clase: 'estado--peligro' },
];

function FiltroEstados({ valor, onCambiar, conteos }) {
    return (
        <div className="filtro-chips" role="radiogroup" aria-label="Filtrar por estado">
            {FILTROS_ESTADO.map((f) => {
                const activo = valor === f.valor;
                return (
                    <button
                        key={f.valor}
                        type="button"
                        role="radio"
                        aria-checked={activo}
                        onClick={() => onCambiar(f.valor)}
                        className={`filtro-chip ${f.clase} ${activo ? 'filtro-chip--activo' : ''}`}
                    >
                        {f.valor !== 'todos' && <span className="filtro-chip-punto" aria-hidden="true" />}
                        {f.texto}
                        <span className="filtro-chip-conteo">{conteos[f.valor] ?? 0}</span>
                    </button>
                );
            })}
        </div>
    );
}

export default function VentasPage() {
    const { exito, error: mostrarError } = useToast();

    const [ventas, setVentas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

const [ventaVer, setVentaVer] = useState(null);
    const [ventaEntregar, setVentaEntregar] = useState(null);
    const [entregando, setEntregando] = useState(false);
    const [comprobanteEmitido, setComprobanteEmitido] = useState(null);
    const [comprobanteModal, setComprobanteModal] = useState(null);

    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [filtroEntrega, setFiltroEntrega] = useState('todos');
    const [mostrarFormulario, setMostrarFormulario] = useState(false);

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

    const cobradas = ventas.filter((v) => v.estado === 'pagada' || v.estado === 'entregada');
    const porCobrar = ventas.filter((v) => v.estado === 'pendiente').reduce((acc, v) => acc + num(v.total), 0);
    const diario = useMemo(() => {
        const porDia = new Map();
        for (const v of ventas) {
            const clave = String(v.fecha_venta || '').slice(0, 10);
            if (!clave) continue;
            const dia = porDia.get(clave) || { fecha: clave, total_vendido: 0, cantidad_ventas: 0, registradas: 0 };
            dia.registradas += 1;
            if (v.estado === 'pagada' || v.estado === 'entregada') {
                dia.total_vendido += num(v.total);
                dia.cantidad_ventas += 1;
            }
            porDia.set(clave, dia);
        }
        return serieDiaria([...porDia.values()], 14);
    }, [ventas]);

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

    const confirmarEntrega = async () => {
        if (!ventaEntregar) return;
        try {
            setEntregando(true);
            await actualizarEstadoVenta(ventaEntregar.id_venta, 'entregada');
            const id = ventaEntregar.id_venta;
            setVentaEntregar(null);
            await cargarVentas();
            exito(`Venta #${id} marcada como entregada`);
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || 'Error al confirmar la entrega');
        } finally {
            setEntregando(false);
        }
    };

    const abrirEmitirComprobante = async (venta, tipo) => {
        try {
            const ventaCompleta = await obtenerVenta(venta.id_venta);
            setComprobanteModal({ venta: ventaCompleta || venta, tipo });
        } catch {
            setComprobanteModal({ venta, tipo });
        }
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
                titulo="Ventas"
                descripcion="Compras realizadas: quién compró, qué y cuánto"
                acciones={
                    <Button onClick={() => setMostrarFormulario((v) => !v)} aria-expanded={mostrarFormulario} aria-controls="panel-nueva-venta">
                        {mostrarFormulario ? <><FaChevronUp /> Ocultar formulario</> : <><FaCartPlus /> Nueva venta</>}
                    </Button>
                }
            />

            <motion.section
                aria-label="Indicadores de ventas"
                initial="oculto"
                animate="visible"
                variants={{ oculto: {}, visible: { transition: { staggerChildren: 0.06 } } }}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5"
            >
                <StatCard
                    titulo="Ingresos cobrados"
                    valor={formatearMoneda(totalIngresos)}
                    icono={<FaMoneyBillTrendUp />}
                    color="primary"
                    detalle={`${cobradas.length} ${cobradas.length === 1 ? 'venta pagada o entregada' : 'ventas pagadas o entregadas'}`}
                    tendencia={diario.map((d) => d.total)}
                    etiquetaTendencia="Ingresos cobrados por día en los últimos 14 días"
                />
                <StatCard
                    titulo="Ventas registradas"
                    valor={ventas.length}
                    icono={<FaReceipt />}
                    color="info"
                    detalle={`${totalCanceladas} ${totalCanceladas === 1 ? 'cancelada' : 'canceladas'}`}
                    tendencia={diario.map((d) => d.cantidad)}
                    etiquetaTendencia="Ventas cobradas por día en los últimos 14 días"
                />
                <StatCard
                    titulo="Pendientes de pago"
                    valor={totalPendientes}
                    icono={<FaClock />}
                    color="warning"
                    detalle={porCobrar > 0 ? `${formatearMoneda(porCobrar)} por cobrar` : 'Nada por cobrar'}
                    medidor={{ valor: totalPendientes, total: ventas.length, etiqueta: 'Ventas pendientes sobre el total' }}
                />
                <StatCard
                    titulo="Ticket promedio"
                    valor={cobradas.length > 0 ? formatearMoneda(totalIngresos / cobradas.length) : '—'}
                    icono={<FaCircleCheck />}
                    color="success"
                    detalle={`${totalPagadas} pagadas · ${totalEntregadas} entregadas`}
                />
            </motion.section>

            <div id="panel-nueva-venta" hidden={!mostrarFormulario}>
                <VentaForm onVentaCreada={ventaCreada} />
            </div>

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
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 transition hover:text-slate-700"
                                        title="Limpiar búsqueda"
                                    >
                                        <FaXmark />
                                    </button>
                                )}
                            </div>

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
                <div className="px-5 pb-4 sm:px-6">
                    <FiltroEstados
                        valor={filtroEstado}
                        onCambiar={setFiltroEstado}
                        conteos={{
                            todos: ventas.length,
                            pendiente: totalPendientes,
                            pagada: totalPagadas,
                            entregada: totalEntregadas,
                            cancelada: totalCanceladas,
                        }}
                    />
                </div>
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
                                <span className="reporte-contador">
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
                                    onConfirmarEntrega: setVentaEntregar,
                                    onEmitirComprobante: abrirEmitirComprobante,
                                })
                            }
                        />
                    </CardBody>
                    <Pagination pagina={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
                </Card>
            )}

<VentaViewModal venta={ventaVer} abierto={Boolean(ventaVer)} onCerrar={() => setVentaVer(null)} />
            <ConfirmarAccion
                abierto={Boolean(ventaEntregar)}
                titulo="Confirmar entrega"
                mensaje={`¿Confirmas que la venta #${ventaEntregar?.id_venta} (${formatearMoneda(ventaEntregar?.total)}) ya fue entregada al cliente?`}
                advertencia="La venta pasará a «Entregada» y no podrá volver a otro estado."
                icono={<FaCheck />}
                textoConfirmar="Sí, fue entregada"
                onCerrar={() => setVentaEntregar(null)}
                onConfirmar={confirmarEntrega}
                cargando={entregando}
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

