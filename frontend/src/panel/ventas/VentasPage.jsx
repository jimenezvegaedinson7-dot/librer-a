import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FaCircleCheck, FaClock, FaEye, FaFileCsv, FaFileInvoice, FaMagnifyingGlass, FaMoneyBillTrendUp, FaReceipt, FaRotate, FaRotateLeft, FaXmark } from 'react-icons/fa6';
import { PageHeader } from '../ui/PageHeader';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Form';
import { Indicador, Indicadores } from '../ui/Indicadores';
import { fechaLima, num, serieDiaria } from '../dashboard/graficoUtils';
import { Alert } from '../ui/Alert';
import { ErrorCarga } from '../ui/ErrorCarga';
import { Pagination } from '../ui/Pagination';
import { EmptyState } from '../ui/EmptyState';
import { TableSkeleton } from '../ui/TableSkeleton';
import { DataTable } from '../ui/DataTable';
import { Badge } from '../ui/Badge';
import { BtnAccion } from '../ui/Acciones';
import { formatearMoneda } from '../../compartido/lib/utils/format';
import { exportarCsv } from '../lib/utils/exportarCsv';
import { descripcionEntrega } from '../../compartido/lib/utils/entrega';
import { useToast } from '../../app/providers/ToastContext';
import { useRol } from '../auth/useRol';
import { listarVentas, obtenerVenta } from './ventasService';
import ComprobanteViewModal from '../comprobantes/ComprobanteViewModal';
import VentaViewModal from './VentaViewModal';
import EmitirComprobanteModal from './EmitirComprobanteModal';
import ReembolsoModal from './ReembolsoModal';
import { textoMetodoPago, textoOrigen } from './metodosPago';
import { correoVisible, esCorreoDeCuentaEliminada } from '../lib/utils/cuentas';
import { configEstadoPago, ESTADOS_PAGO, pagoDesdeVenta } from '../pagos/pagoPresentacion';
import { EntregaBadge, EstadoPagoBadge } from '../pagos/PagoBadges';
import { EstadoEntregaVenta } from './EstadoEntregaVenta';
import { FechaTabla } from '../ui/FechaTabla';

const POR_PAGINA = 10;

const estadosVenta = {
    pendiente: { texto: 'Pendiente', color: 'warning' },
    pagada: { texto: 'Pagada', color: 'success' },
    entregada: { texto: 'Entregada', color: 'info' },
    cancelada: { texto: 'Cancelada', color: 'danger' },
    reembolsada: { texto: 'Reembolsada', color: 'neutral' }
};

function nombreCliente(venta) {
    if (venta.origen === 'panel') {
        return venta.cliente_nombre || 'Cliente de mostrador';
    }
    return venta.cliente_nombre || `${venta.nombre_usuario || ''} ${venta.apellido_usuario || ''}`.trim();
}

const esDeCuentaEliminada = (venta) => venta.origen !== 'panel' && esCorreoDeCuentaEliminada(venta.correo_usuario);

function detalleCobro(venta) {
    if (venta.origen === 'panel' || venta.origen === 'reserva' || venta.id_reserva) {
        const metodo = textoMetodoPago(venta.metodo_pago);
        return [textoOrigen(venta), metodo].filter(Boolean).join(' · ');
    }
    if (esDeCuentaEliminada(venta)) {
        return 'Cuenta eliminada por su titular';
    }
    return correoVisible(venta.correo_compra) || correoVisible(venta.correo_usuario);
}

function valorOrdenVenta(venta, campo) {
    switch (campo) {
        case 'usuario':
            return nombreCliente(venta).toLowerCase();
        case 'total':
            return Number(venta.total || 0);
        case 'fecha_venta':
            return new Date(venta.fecha_venta || 0).getTime();
        case 'estado_pago':
            return pagoDesdeVenta(venta).estado_pago;
        default:
            return venta[campo] || '';
    }
}

const columnasVentas = [
    {
        titulo: 'Venta / fecha',
        className: 'tabla-col-registro',
        ordenable: true,
        campo: 'fecha_venta',
        render: (fila) => {
            const estado = estadosVenta[fila.estado] || { texto: fila.estado || 'Sin estado', color: 'neutral' };
            return (
                <div className="tabla-celda-grupo">
                    <span className="tabla-dato">#{fila.id_venta}</span>
                    <FechaTabla valor={fila.fecha_venta} />
                    <Badge color={estado.color}>{estado.texto}</Badge>
                </div>
            );
        }
    },
    {
        titulo: 'Cliente',
        className: 'tabla-col-principal',
        ordenable: true,
        campo: 'usuario',
        render: (fila) => {
            const nombre = nombreCliente(fila);
            const iniciales =
                nombre
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join('')
                    .toUpperCase() || '?';
            return (
                <div className="flex min-w-0 items-center gap-3">
                    <span className="cliente-iniciales" aria-hidden="true">
                        {iniciales}
                    </span>
                    <p className="min-w-0 text-sm">
                        <span className="block truncate font-semibold text-slate-800">{nombre || 'Usuario no disponible'}</span>
                        <span className="block truncate text-xs text-slate-500">{detalleCobro(fila)}</span>
                    </p>
                </div>
            );
        }
    },
    {
        titulo: 'Importe',
        className: 'tabla-col-importe',
        alineacion: 'derecha',
        ordenable: true,
        campo: 'total',
        render: (fila) => <span className="whitespace-nowrap font-semibold tabular-nums text-slate-800">{formatearMoneda(Number(fila.total || 0))}</span>
    },
    {
        titulo: 'Pago',
        alineacion: 'centro',
        campo: 'estado_pago',
        ordenable: true,
        render: (fila) => {
            const pago = pagoDesdeVenta(fila);
            return (
                <div className="gestion-ventas__pago tabla-celda-grupo">
                    <EstadoPagoBadge estado={pago.estado_pago} />
                    <span className="gestion-ventas__referencia">{textoMetodoPago(pago.metodo_pago)}</span>
                    {fila.pago_revision_motivo && <span className="tabla-nota">Pago en revisión</span>}
                    {fila.estado_reembolso === 'pendiente_verificacion' && <span className="tabla-nota">Devolución pendiente</span>}
                </div>
            );
        }
    },
    {
        titulo: 'Entrega',
        className: 'tabla-col-nota',
        ordenable: true,
        campo: 'tipo_entrega',
        render: (fila) => (
            <div className="space-y-1">
                <EstadoEntregaVenta venta={fila} />
                <span className="block">
                    <EntregaBadge tipo={fila.tipo_entrega} venta={fila} />
                </span>
            </div>
        )
    },
    {
        titulo: 'Comprobante',
        alineacion: 'centro',
        render: (fila) =>
            Number(fila.tiene_comprobante) === 1 ? (
                <Link className="tabla-enlace" to={`/ventas/comprobantes?venta=${fila.id_venta}`} aria-label={`Ver comprobante de la venta ${fila.id_venta}`}>
                    Ver comprobante
                </Link>
            ) : (
                <span className="text-xs text-slate-500">Sin emitir</span>
            )
    }
];

function accionesVenta(fila, { onVer, onEmitirComprobante, onReembolsar, puedeReembolsar }) {
    if (fila.origen === 'panel' || fila.origen === 'reserva' || fila.id_reserva) {
        return (
            <BtnAccion tipo="ver" onClick={() => onVer(fila)} titulo="Ver venta">
                <FaEye />
            </BtnAccion>
        );
    }
    const conComprobante = Number(fila.tiene_comprobante ?? 0) === 1;
    const puedeEmitir = !conComprobante && (fila.estado === 'pagada' || fila.estado === 'entregada');
    return (
        <>
            <BtnAccion tipo="ver" onClick={() => onVer(fila)} titulo="Ver venta">
                <FaEye />
            </BtnAccion>
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
            {puedeReembolsar && fila.reembolso_elegible === true && (
                <BtnAccion
                    tipo="eliminar"
                    onClick={() => onReembolsar(fila)}
                    titulo={fila.estado_reembolso === 'pendiente_verificacion' ? 'Verificar devolución PayU' : 'Solicitar devolución PayU'}>
                    <FaRotateLeft />
                </BtnAccion>
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
    { valor: 'reembolsada', texto: 'Reembolsadas', clase: 'estado--neutro' }
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
                        className={`filtro-chip ${f.clase} ${activo ? 'filtro-chip--activo' : ''}`}>
                        {f.valor !== 'todos' && <span className="filtro-chip-punto" aria-hidden="true" />}
                        {f.texto}
                        <span className="filtro-chip-conteo">{conteos[f.valor] ?? 0}</span>
                    </button>
                );
            })}
        </div>
    );
}

export default function VentasPage({ incrustado = false }) {
    const { exito, error: mostrarError } = useToast();
    const { puedeReembolsar } = useRol();

    const [ventas, setVentas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [parametros, setParametros] = useSearchParams();
    const referenciaDetalle = parametros.get('ver');
    const [errorEnlace, setErrorEnlace] = useState('');
    const ventaEnlace = referenciaDetalle ? ventas.find((v) => v.external_reference === referenciaDetalle || String(v.id_venta) === referenciaDetalle) : null;
    const errorReferencia = referenciaDetalle && !cargando && !error && !ventaEnlace ? 'No se encontró la venta de este enlace. Actualiza para volver a consultar.' : errorEnlace;

    const [ventaVer, setVentaVer] = useState(null);
    const [ventaReembolsar, setVentaReembolsar] = useState(null);
    const [comprobanteEmitido, setComprobanteEmitido] = useState(null);
    const [comprobanteModal, setComprobanteModal] = useState(null);

    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [filtroEntrega, setFiltroEntrega] = useState('todos');
    const [filtroPago, setFiltroPago] = useState('todos');

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
        let vigente = true;

        (async () => {
            try {
                const datos = await listarVentas();
                if (vigente) setVentas(datos);
            } catch (err) {
                if (vigente) {
                    setError(err.response?.data?.mensaje || 'Error al cargar las ventas');
                }
            } finally {
                if (vigente) setCargando(false);
            }
        })();

        return () => {
            vigente = false;
        };
    }, []);

    useEffect(() => {
        if (!referenciaDetalle || cargando || error) return undefined;
        let vigente = true;
        if (!ventaEnlace) return undefined;
        obtenerVenta(ventaEnlace.id_venta)
            .then((detalle) => {
                if (vigente) {
                    if (detalle) {
                        setVentaVer(detalle);
                        setErrorEnlace('');
                    } else setErrorEnlace('No se pudo abrir el detalle de la venta. Actualiza para reintentar.');
                }
            })
            .catch(() => {
                if (vigente) setErrorEnlace('No se pudo abrir el detalle de la venta. Actualiza para reintentar.');
            });
        return () => {
            vigente = false;
        };
    }, [referenciaDetalle, cargando, error, ventaEnlace]);

    const cerrarDetalle = () => {
        setVentaVer(null);
        setErrorEnlace('');
        if (referenciaDetalle)
            setParametros(
                (actuales) => {
                    const siguientes = new URLSearchParams(actuales);
                    siguientes.delete('ver');
                    return siguientes;
                },
                { replace: true }
            );
    };

    const alBuscar = (valor) => {
        setBusqueda(valor);
        setPaginaActual(1);
    };

    const alFiltrarEstado = (valor) => {
        setFiltroEstado(valor);
        setPaginaActual(1);
    };

    const alFiltrarEntrega = (valor) => {
        setFiltroEntrega(valor);
        setPaginaActual(1);
    };

    const totalPendientes = ventas.filter((v) => v.estado === 'pendiente').length;
    const totalPagadas = ventas.filter((v) => v.estado === 'pagada').length;
    const totalEntregadas = ventas.filter((v) => v.estado === 'entregada').length;
    const totalCanceladas = ventas.filter((v) => v.estado === 'cancelada').length;
    const totalReembolsadas = ventas.filter((v) => v.estado === 'reembolsada').length;
    const totalIngresos = ventas.filter((v) => v.estado === 'pagada' || v.estado === 'entregada').reduce((acumulado, v) => acumulado + Number(v.total || 0), 0);

    const cobradas = ventas.filter((v) => v.estado === 'pagada' || v.estado === 'entregada');
    const porCobrar = ventas.filter((v) => v.estado === 'pendiente').reduce((acc, v) => acc + num(v.total), 0);
    const diario = useMemo(() => {
        const porDia = new Map();
        for (const v of ventas) {
            const fechaCobro = v.fecha_pago || v.fecha_venta;
            const clave = fechaCobro ? fechaLima(fechaCobro) : '';
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
            const usuario = `${nombreCliente(venta)} ${venta.nombre_usuario || ''} ${venta.apellido_usuario || ''}`.toLowerCase();
            const idVenta = String(venta.id_venta || '');
            const total = String(venta.total || '');
            const direccion = String(venta.direccion || '').toLowerCase();
            const tipoEntrega = String(venta.tipo_entrega || '').toLowerCase();

            const coincideBusqueda =
                !texto || usuario.includes(texto) || idVenta.includes(texto) || total.includes(texto) || direccion.includes(texto) || tipoEntrega.includes(texto);
            const coincideReferencia = [
                venta.external_reference,
                venta.payu_order_id,
                venta.payu_payment_id,
                venta.referencia_pago,
                venta.cliente_documento,
                venta.correo_compra,
                venta.correo_usuario
            ].some((valor) =>
                String(valor || '')
                    .toLowerCase()
                    .includes(texto)
            );
            const coincideEstado = filtroEstado === 'todos' || venta.estado === filtroEstado;
            const coincideEntrega = filtroEntrega === 'todos' || (venta.tipo_entrega || '') === filtroEntrega;
            const coincidePago = filtroPago === 'todos' || pagoDesdeVenta(venta).estado_pago?.toLowerCase() === filtroPago;

            return (coincideBusqueda || coincideReferencia) && coincideEstado && coincideEntrega && coincidePago;
        });
    }, [ventas, busqueda, filtroEstado, filtroEntrega, filtroPago]);

    const totalPaginas = Math.ceil(ventasFiltradas.length / POR_PAGINA);

    const paginaActualEfectiva = totalPaginas > 0 ? Math.min(paginaActual, totalPaginas) : 1;

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

    const ventasPaginadas = ventasOrdenadas.slice((paginaActualEfectiva - 1) * POR_PAGINA, paginaActualEfectiva * POR_PAGINA);

    const manejarOrden = (campo) => {
        setOrden((actual) => {
            if (actual.campo === campo) {
                return { campo, direccion: actual.direccion === 'asc' ? 'desc' : 'asc' };
            }
            return { campo, direccion: 'asc' };
        });
    };

    const verVenta = async (venta) => {
        try {
            setVentaVer(await obtenerVenta(venta.id_venta));
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || 'Error al obtener la venta');
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
        setVentas((actuales) => actuales.map((venta) => (venta.id_venta === comprobante?.id_venta ? { ...venta, tiene_comprobante: 1 } : venta)));
        setComprobanteEmitido(comprobante);
    };

    const ventaReembolsada = async (respuesta) => {
        await cargarVentas();
        const anulado = respuesta?.data?.comprobante_anulado;
        exito(
            (respuesta?.data?.estado_reembolso === 'pendiente_verificacion'
                ? `Devolución de venta #${respuesta?.data?.id_venta} pendiente de verificación`
                : `Devolución externa de venta #${respuesta?.data?.id_venta} confirmada documentalmente`) +
                (anulado ? `. Comprobante ${anulado.serie}-${String(anulado.numero).padStart(8, '0')} anulado.` : '')
        );
    };

    const exportar = () => {
        exportarCsv({
            nombreArchivo: `ventas_${new Date().toISOString().slice(0, 10)}`,
            columnas: [
                { titulo: 'N.º', exportar: (f) => f.id_venta },
                { titulo: 'Cliente', exportar: (f) => nombreCliente(f) },
                { titulo: 'Documento', exportar: (f) => f.cliente_documento || '' },
                { titulo: 'Origen', exportar: (f) => textoOrigen(f) },
                { titulo: 'Método de pago', exportar: (f) => (f.origen === 'panel' || f.origen === 'reserva' || f.id_reserva ? textoMetodoPago(f.metodo_pago) : 'PayU') },
                { titulo: 'Referencia de pago', exportar: (f) => f.referencia_pago || f.payu_order_id || '' },
                { titulo: 'Correo', exportar: (f) => correoVisible(f.correo_compra) || correoVisible(f.correo_usuario) },
                { titulo: 'Fecha', exportar: (f) => f.fecha_venta || '' },
                { titulo: 'Total', exportar: (f) => f.total || 0 },
                { titulo: 'Costo envío', exportar: (f) => f.costo_envio || 0 },
                { titulo: 'Estado', exportar: (f) => f.estado || '' },
                { titulo: 'Estado del pago', exportar: (f) => configEstadoPago(pagoDesdeVenta(f).estado_pago).texto },
                { titulo: 'Transacción PayU', exportar: (f) => f.payu_payment_id || '' },
                { titulo: 'Referencia externa', exportar: (f) => f.external_reference || '' },
                { titulo: 'Estado de entrega', exportar: (f) => f.estado_entrega || '' },
                { titulo: 'Comprobante', exportar: (f) => (Number(f.tiene_comprobante) === 1 ? 'Emitido' : 'Sin emitir') },
                { titulo: 'Tipo de entrega', exportar: (f) => descripcionEntrega(f) },
                { titulo: 'Dirección', exportar: (f) => f.direccion || '' },
                { titulo: 'Motivo de reembolso', exportar: (f) => f.motivo_reembolso || '' }
            ],
            filas: ventasOrdenadas
        });
    };

    const limpiarFiltros = () => {
        setBusqueda('');
        setFiltroEstado('todos');
        setFiltroEntrega('todos');
        setFiltroPago('todos');
        setPaginaActual(1);
    };

    const hayFiltros = busqueda || filtroEstado !== 'todos' || filtroEntrega !== 'todos' || filtroPago !== 'todos';

    return (
        <div className="space-y-4">
            {!incrustado && <PageHeader titulo="Ventas y pagos" descripcion="Compras realizadas y estado de sus cobros" />}
            {errorReferencia && <Alert tipo="error">{errorReferencia}</Alert>}

            <Indicadores etiqueta="Indicadores de ventas" cargando={cargando}>
                <Indicador
                    titulo="Ingresos cobrados"
                    valor={error ? '—' : totalIngresos}
                    formato="moneda"
                    icono={<FaMoneyBillTrendUp />}
                    tono="primary"
                    detalle={`${cobradas.length} ${cobradas.length === 1 ? 'venta pagada o entregada' : 'ventas pagadas o entregadas'}`}
                    serie={diario.map((d) => d.total)}
                />
                <Indicador
                    titulo="Ventas registradas"
                    valor={error ? '—' : ventas.length}
                    icono={<FaReceipt />}
                    tono="info"
                    detalle={`${totalCanceladas} ${totalCanceladas === 1 ? 'cancelada' : 'canceladas'} · ${totalReembolsadas} ${totalReembolsadas === 1 ? 'reembolsada' : 'reembolsadas'}`}
                    serie={diario.map((d) => d.cantidad)}
                />
                <Indicador
                    titulo="Pendientes de pago"
                    valor={error ? '—' : totalPendientes}
                    icono={<FaClock />}
                    tono="warning"
                    detalle={porCobrar > 0 ? `${formatearMoneda(porCobrar)} por cobrar` : 'Nada por cobrar'}
                    de={ventas.length}
                />
                <Indicador
                    titulo="Promedio por venta"
                    valor={!error && cobradas.length > 0 ? totalIngresos / cobradas.length : '—'}
                    formato="moneda"
                    icono={<FaCircleCheck />}
                    tono="success"
                    detalle={`${totalPagadas} pagadas · ${totalEntregadas} entregadas`}
                    serie={diario.map((d) => (d.cantidad > 0 ? d.total / d.cantidad : 0))}
                />
            </Indicadores>

            <Card>
                <CardHeader
                    titulo="Ventas y pagos"
                    subtitulo="Busca por cliente, venta o referencia PayU"
                    acciones={
                        <div className="tabla-filtros-acciones">
                            {hayFiltros && (
                                <Button variante="secondary" onClick={limpiarFiltros}>
                                    Limpiar
                                </Button>
                            )}
                            <Button variante="secondary" onClick={cargarVentas} disabled={cargando}>
                                <FaRotate /> {cargando ? 'Actualizando...' : 'Actualizar'}
                            </Button>
                        </div>
                    }
                    filtros={
                        <div className="filtros-grid">
                            <div className="filtro-busqueda">
                                <Input
                                    label="Cliente, venta o referencia"
                                    type="text"
                                    value={busqueda}
                                    onChange={(e) => alBuscar(e.target.value)}
                                    placeholder="Buscar venta..."
                                    aria-label="Buscar ventas y pagos"
                                    icono={<FaMagnifyingGlass />}
                                    className="pr-8 sm:w-72"
                                />
                                {busqueda && (
                                    <button
                                        type="button"
                                        onClick={() => setBusqueda('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 transition hover:text-slate-700"
                                        title="Limpiar búsqueda">
                                        <FaXmark />
                                    </button>
                                )}
                            </div>

                            <Select
                                label="Estado del pago"
                                value={filtroPago}
                                aria-label="Filtrar por estado de pago"
                                onChange={(e) => {
                                    setFiltroPago(e.target.value);
                                    setPaginaActual(1);
                                }}>
                                <option value="todos">Todos los pagos</option>
                                {Object.entries(ESTADOS_PAGO).map(([valor, dato]) => (
                                    <option key={valor} value={valor}>
                                        {dato.texto}
                                    </option>
                                ))}
                            </Select>
                            <Select label="Tipo de entrega" value={filtroEntrega} aria-label="Filtrar por tipo de entrega" onChange={(e) => alFiltrarEntrega(e.target.value)}>
                                <option value="todos">Todas las entregas</option>
                                <option value="domicilio">A domicilio</option>
                                <option value="tienda">Recoger en tienda</option>
                            </Select>
                        </div>
                    }
                />
                <div className="tabla-estados-rapidos">
                    <span className="tabla-estados-etiqueta">Estado de la venta</span>
                    <FiltroEstados
                        valor={filtroEstado}
                        onCambiar={alFiltrarEstado}
                        conteos={{
                            todos: ventas.length,
                            pendiente: totalPendientes,
                            pagada: totalPagadas,
                            entregada: totalEntregadas,
                            cancelada: totalCanceladas,
                            reembolsada: totalReembolsadas
                        }}
                    />
                </div>
            </Card>

            {cargando && <TableSkeleton columnas={7} filas={8} titulo />}

            {!cargando && error && <ErrorCarga mensaje={error} onReintentar={cargarVentas} />}

            {!cargando && !error && ventas.length === 0 && (
                <EmptyState titulo="No hay ventas registradas" descripcion="Las compras de la web y la app aparecerán aquí con sus datos de pago." icono={<FaMagnifyingGlass />} />
            )}

            {!cargando && !error && ventas.length > 0 && ventasFiltradas.length === 0 && (
                <EmptyState
                    titulo="No se encontraron ventas"
                    descripcion="Cambia la búsqueda o el filtro seleccionado."
                    icono={<FaMagnifyingGlass />}
                    acciones={
                        <Button variante="secondary" onClick={limpiarFiltros}>
                            Limpiar filtros
                        </Button>
                    }
                />
            )}

            {!cargando && !error && ventasPaginadas.length > 0 && (
                <Card>
                    <CardHeader
                        titulo="Ventas registradas"
                        subtitulo="Compras registradas y su situación de pago y entrega"
                        acciones={
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="reporte-contador">
                                    {ventasFiltradas.length} {ventasFiltradas.length === 1 ? 'venta' : 'ventas'}
                                </span>
                                <Button variante="secondary" tamano="sm" onClick={exportar}>
                                    <FaFileCsv /> Descargar para Excel
                                </Button>
                            </div>
                        }
                    />
                    <CardBody className="p-0">
                        <DataTable
                            etiqueta="Ventas y pagos registrados"
                            columnas={columnasVentas}
                            filas={ventasPaginadas}
                            keyExtractor={(fila) => fila.id_venta}
                            orden={orden}
                            onOrdenar={manejarOrden}
                            acciones={(fila) =>
                                accionesVenta(fila, { onVer: verVenta, onEmitirComprobante: abrirEmitirComprobante, onReembolsar: setVentaReembolsar, puedeReembolsar })
                            }
                        />
                    </CardBody>
                    <Pagination pagina={paginaActualEfectiva} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
                </Card>
            )}

            <VentaViewModal venta={ventaVer} abierto={Boolean(ventaVer)} onCerrar={cerrarDetalle} />
            <ComprobanteViewModal comprobante={comprobanteEmitido} abierto={Boolean(comprobanteEmitido)} onCerrar={() => setComprobanteEmitido(null)} />
            {ventaReembolsar && <ReembolsoModal venta={ventaReembolsar} abierto onCerrar={() => setVentaReembolsar(null)} onReembolsada={ventaReembolsada} />}
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
