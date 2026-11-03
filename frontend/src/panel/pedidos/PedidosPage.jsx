import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBoxOpen, FaCircleCheck, FaClock, FaEye, FaRotate, FaMagnifyingGlass, FaMapLocationDot, FaStore, FaTriangleExclamation, FaTruck, FaXmark } from 'react-icons/fa6';
import { PageHeader } from '../ui/PageHeader';
import { useCarga } from '../lib/hooks/useCarga';
import { FechaTabla } from '../ui/FechaTabla';
import { Indicador, Indicadores } from '../ui/Indicadores';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Input, Select } from '../ui/Form';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { ErrorCarga } from '../ui/ErrorCarga';
import { EmptyState } from '../ui/EmptyState';
import { TableSkeleton } from '../ui/TableSkeleton';
import { DataTable } from '../ui/DataTable';
import { Badge } from '../ui/Badge';
import { BtnAccion } from '../ui/Acciones';
import { Modal } from '../ui/Modal';
import { ConfirmarAccion } from '../ui/ConfirmarAccion';
import { Ficha } from '../ui/Ficha';
import { seguimientoPedido } from '../../compartido/lib/utils/seguimientoPedido';
import './pedidos.css';
import { useToast } from '../../app/providers/ToastContext';
import { formatearMoneda, formatearFecha } from '../../compartido/lib/utils/format';
import { descripcionEntrega, esEntregaPallasca, ubicacionEntrega } from '../../compartido/lib/utils/entrega';
import { listarPedidos, obtenerPedido, cambiarEstadoPedido } from './pedidosService';
import {
    COLOR_ESTADO,
    COLOR_COMERCIAL,
    ETIQUETA_PAGO,
    normalizarEstadoEntrega,
    pagoConfirmadoPedido,
    esPedidoEcommerce,
    resumirPedidos,
    estadoContabilizable,
    accionSiguiente,
    accionCancelar,
    etiquetaEstado,
    etiquetaEntregaPedido,
    etiquetaPagoPedido,
    pagoEnRevision,
    puedeCancelar,
    esFinal,
    esTipoEntregaValido
} from './estadosPedido';

const esPedido = esPedidoEcommerce;

const FILTROS = [
    { valor: 'todos', etiqueta: 'Todos' },
    { valor: 'pendiente', etiqueta: 'Por preparar' },
    { valor: 'listo_recojo', etiqueta: 'Listos para recoger' },
    { valor: 'en_camino', etiqueta: 'En camino' },
    { valor: 'entregado', etiqueta: 'Entregados' },
    { valor: 'sin_pago', etiqueta: 'Pendientes de pago' },
    { valor: 'cancelado', etiqueta: 'Cancelados' },
    { valor: 'reembolsada', etiqueta: 'Reembolsados' }
];

const ICONO_DESTINO = { listo_recojo: <FaStore aria-hidden="true" />, en_camino: <FaTruck aria-hidden="true" />, entregado: <FaCircleCheck aria-hidden="true" /> };

function Seguimiento({ pedido }) {
    const seg = seguimientoPedido(pedido);
    if (!seg.pasos.length)
        return (
            <Alert tipo={seg.tono === 'cancelado' ? 'info' : 'warning'}>
                {seg.titulo}. {seg.mensaje}
            </Alert>
        );
    return (
        <div className="space-y-3">
            <ol className="pedido-seguimiento" aria-label="Seguimiento del pedido">
                {seg.pasos.map((paso) => (
                    <li
                        key={paso.clave}
                        className={`pedido-seguimiento__paso ${paso.hecho || paso.actual ? 'pedido-seguimiento__paso--hecho' : ''}`}
                        aria-current={paso.actual ? 'step' : undefined}>
                        <span className="pedido-seguimiento__trazo" />
                        <span>{paso.etiqueta}</span>
                    </li>
                ))}
            </ol>
            {seg.tono === 'espera' && (
                <Alert tipo="warning">
                    {seg.titulo}. {seg.mensaje}
                </Alert>
            )}
        </div>
    );
}

function ResumenPedidos({ resumen, cargando, error }) {
    const tarjetas = [
        ['pendiente', 'Por preparar', 'Sin salir ni estar listos', FaClock, 'warning'],
        ['listo_recojo', 'Listos para recoger', 'Disponibles en tienda', FaStore, 'primary'],
        ['en_camino', 'En camino', 'Con el repartidor', FaTruck, 'info'],
        ['entregado', 'Entregados', 'Recibidos por el cliente', FaCircleCheck, 'success']
    ];
    return (
        <>
            <Indicadores etiqueta="Indicadores de pedidos" cargando={cargando}>
                {tarjetas.map(([estado, titulo, detalle, Icono, tono]) => {
                    const cantidad = resumen.conteos[estado];
                    const porcentaje = `${resumen.porcentajes[estado].toLocaleString('es-PE')}%`;
                    return (
                        <Indicador
                            key={estado}
                            titulo={titulo}
                            detalle={detalle}
                            icono={<Icono />}
                            tono={tono}
                            valor={error ? '—' : cantidad}
                            className={`pedido-indicador pedido-estado--${estado}`}
                            claseValor="pedido-indicador__valor">
                            {!cargando &&
                                !error &&
                                (resumen.total > 0 ? (
                                    <p
                                        className="pedido-indicador__proporcion"
                                        role="meter"
                                        aria-label={`${titulo} sobre el total`}
                                        aria-valuemin={0}
                                        aria-valuemax={resumen.total}
                                        aria-valuenow={cantidad}
                                        aria-valuetext={`${porcentaje} del total (${cantidad} de ${resumen.total} pedidos)`}>
                                        {porcentaje} del total
                                    </p>
                                ) : (
                                    <p className="pedido-indicador__proporcion">Sin base para calcular porcentaje</p>
                                ))}
                        </Indicador>
                    );
                })}
            </Indicadores>
            <p className="pedido-resumen-nota">
                {cargando ? (
                    'Consultando los pedidos...'
                ) : error ? (
                    'Indicadores no disponibles. Actualiza para consultar los pedidos.'
                ) : (
                    <>
                        Base del resumen: {resumen.total} {resumen.total === 1 ? 'pedido pagado y vigente' : 'pedidos pagados y vigentes'}. Se excluyen cancelaciones, reembolsos,
                        devoluciones pendientes y pagos en revisión. El filtro de estado solo cambia la lista.
                    </>
                )}
            </p>
        </>
    );
}

const nombreCliente = (p) => {
    const nombre = [p?.nombre_usuario, p?.apellido_usuario].filter(Boolean).join(' ').trim();
    return nombre || p?.cliente_nombre || p?.correo_usuario || 'Cliente';
};

const destino = (p) => {
    if (p?.tipo_entrega === 'tienda') return esEntregaPallasca(p) ? 'Recojo en Pallasca' : 'Recoge en tienda';
    const partes = [p?.direccion, ubicacionEntrega(p)].filter(Boolean).join(', ');
    return partes || 'Sin dirección registrada';
};

export default function PedidosPage({ incrustado = false }) {
    const { exito, error: mostrarError } = useToast();

    const [pedidos, setPedidos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [errorCarga, setErrorCarga] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [filtro, setFiltro] = useState('todos');
    const [canal, setCanal] = useState('todos');
    const [tipoEntrega, setTipoEntrega] = useState('todos');

    const [detalle, setDetalle] = useState(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);

    const [pendiente, setPendiente] = useState(null);
    const [procesando, setProcesando] = useState(false);
    const [cancelacion, setCancelacion] = useState(null);
    const mutando = useRef(false);
    const revisionCarga = useRef(0);
    const consultaActiva = useRef(false);
    const revisionDetalle = useRef(0);
    const activo = useRef(true);

    const cargarPedidos = async (silencioso = false, forzar = false) => {
        if (consultaActiva.current && !forzar) return;
        consultaActiva.current = true;
        const revision = ++revisionCarga.current;
        if (!silencioso) setCargando(true);
        setErrorCarga(null);

        try {
            const datos = await listarPedidos();
            if (revision !== revisionCarga.current) return;
            setPedidos(Array.isArray(datos) ? datos.filter(esPedido) : []);
        } catch (e) {
            if (revision !== revisionCarga.current) return;
            setErrorCarga(e?.response?.data?.mensaje || 'No se pudieron cargar los pedidos');
        } finally {
            if (revision === revisionCarga.current) {
                consultaActiva.current = false;
                setCargando(false);
            }
        }
    };

    const invalidarConsultas = () => {
        revisionCarga.current++;
        revisionDetalle.current++;
    };
    useCarga(() => cargarPedidos());
    const refrescarPedidos = useEffectEvent(() => {
        if (document.visibilityState === 'visible' && !mutando.current) cargarPedidos(true);
    });

    useEffect(() => {
        activo.current = true;
        const refrescar = () => refrescarPedidos();
        const timer = setInterval(refrescar, 60000);
        window.addEventListener('focus', refrescar);
        return () => {
            activo.current = false;
            clearInterval(timer);
            window.removeEventListener('focus', refrescar);
            invalidarConsultas();
            consultaActiva.current = false;
        };
    }, []);

    const verDetalle = async (pedido) => {
        const revision = ++revisionDetalle.current;
        setCargandoDetalle(true);
        setDetalle(pedido);

        try {
            const completo = await obtenerPedido(pedido.id_venta);
            if (completo && revision === revisionDetalle.current) setDetalle(completo);
        } catch (e) {
            if (revision !== revisionDetalle.current) return;
            mostrarError(e?.response?.data?.mensaje || 'No se pudo cargar el detalle del pedido');
        } finally {
            if (revision === revisionDetalle.current) setCargandoDetalle(false);
        }
    };

    const actualizarPedido = async (objetivo) => {
        if (!objetivo || mutando.current) return;

        if (
            objetivo.destino !== 'cancelado' &&
            [pedidos.find((p) => p.id_venta === objetivo.id_venta), detalle?.id_venta === objetivo.id_venta ? detalle : null].some(pagoEnRevision)
        ) {
            setPendiente(null);
            mostrarError('El pago está en revisión. Actualiza el pedido antes de avanzar la entrega.');
            return;
        }
        mutando.current = true;
        const revisionAbierta = revisionDetalle.current;

        setProcesando(true);

        try {
            const respuesta = await cambiarEstadoPedido(objetivo.id_venta, objetivo.destino, {
                confirmado: objetivo.destino !== 'cancelado',
                estadoAnterior: objetivo.estadoAnterior
            });
            if (!activo.current) return;
            exito(
                objetivo.destino === 'cancelado' && respuesta?.mensaje
                    ? respuesta.mensaje
                    : `Pedido #${objetivo.id_venta} → ${etiquetaEstado(objetivo.tipo_entrega, objetivo.destino)}`
            );

            setPendiente(null);
            setCancelacion(null);

            await cargarPedidos(true, true);

            if (detalle?.id_venta === objetivo.id_venta && revisionAbierta === revisionDetalle.current) {
                const actualizado = await obtenerPedido(objetivo.id_venta);
                if (activo.current && revisionAbierta === revisionDetalle.current) setDetalle(actualizado);
            }
        } catch (e) {
            if (!activo.current) return;
            mostrarError(e?.response?.data?.mensaje || 'No se pudo actualizar el estado del pedido');
        } finally {
            mutando.current = false;
            if (activo.current) setProcesando(false);
        }
    };
    const confirmarCambio = () => actualizarPedido(pendiente || cancelacion);

    const pedidosEnAmbito = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();

        return pedidos.filter((p) => {
            if (canal === 'web' && p.canal_compra !== 'web') return false;
            if (canal === 'app' && p.canal_compra === 'web') return false;
            if (tipoEntrega !== 'todos' && p.tipo_entrega !== tipoEntrega) return false;

            if (!texto) return true;

            return [`#${p.id_venta}`, nombreCliente(p), p.correo_usuario, p.correo_compra, p.distrito, p.zona_delivery_nombre, p.direccion, p.external_reference]
                .filter(Boolean)
                .some((campo) => String(campo).toLowerCase().includes(texto));
        });
    }, [pedidos, canal, tipoEntrega, busqueda]);
    const pedidosFiltrados = useMemo(
        () =>
            pedidosEnAmbito.filter((p) => {
                if (['pendiente', 'listo_recojo', 'en_camino', 'entregado'].includes(filtro)) return estadoContabilizable(p) === filtro;
                if (filtro === 'sin_pago') return p.estado === 'pendiente';
                if (filtro === 'cancelado') return p.estado === 'cancelada' || p.estado_entrega === 'cancelado';
                if (filtro === 'reembolsada') return p.estado === 'reembolsada';
                return true;
            }),
        [pedidosEnAmbito, filtro]
    );

    const indicadores = useMemo(() => resumirPedidos(pedidosEnAmbito), [pedidosEnAmbito]);

    const columnas = [
        {
            titulo: 'N° pedido',
            className: 'tabla-col-registro',
            campo: 'id_venta',
            render: (p) => (
                <div>
                    <span className="font-semibold text-primary-700">#{p.id_venta}</span>
                    <span className="ml-2">
                        <Badge color="neutral">{p.canal_compra === 'web' ? 'Web' : 'App'}</Badge>
                    </span>
                    <FechaTabla valor={p.fecha_venta} />
                </div>
            )
        },
        {
            titulo: 'Cliente',
            className: 'tabla-col-principal',
            render: (p) => (
                <div className="min-w-0">
                    <div className="truncate font-medium text-slate-800">{nombreCliente(p)}</div>
                    <div className="truncate text-xs text-slate-500">{p.correo_usuario || p.correo_compra || '—'}</div>
                </div>
            )
        },
        {
            titulo: 'Total',
            className: 'tabla-col-importe',
            alineacion: 'derecha',
            render: (p) => <span className="whitespace-nowrap font-semibold text-slate-800">{formatearMoneda(p.total)}</span>
        },
        { titulo: 'Pago', render: (p) => <Badge color={pagoEnRevision(p) ? 'warning' : COLOR_COMERCIAL[p.estado] || 'neutral'}>{etiquetaPagoPedido(p)}</Badge> },
        {
            titulo: 'Entrega y destino',
            className: 'tabla-col-nota',
            render: (p) => (
                <div className="tabla-celda-grupo">
                    <Badge
                        className={`pedido-estado pedido-estado--${normalizarEstadoEntrega(p.estado_entrega)}`}
                        color={COLOR_ESTADO[normalizarEstadoEntrega(p.estado_entrega)] || 'neutral'}>
                        {etiquetaEntregaPedido(p)}
                    </Badge>
                    <span className="tabla-nota">{descripcionEntrega(p)}</span>
                    {p.tipo_entrega !== 'tienda' && <span className="tabla-nota">{destino(p)}</span>}
                </div>
            )
        }
    ];

    const opcionesPedido = (p) => {
        const estado = p.estado_entrega;
        const tipoValido = esTipoEntregaValido(p.tipo_entrega);
        const historico = p.origen === 'panel' || p.origen === 'reserva' || Boolean(p.id_reserva);
        const devolucionPendiente = p.estado_reembolso === 'pendiente_verificacion';
        const revisionPago = pagoEnRevision(p);
        const pagoConfirmado = pagoConfirmadoPedido(p);
        const habilitado = tipoValido && !historico && !devolucionPendiente;
        return {
            tipoValido,
            historico,
            devolucionPendiente,
            avance: habilitado && pagoConfirmado && !revisionPago ? accionSiguiente(p.tipo_entrega, estado) : null,
            cancelar:
                tipoValido && !historico && !['cancelada', 'reembolsada'].includes(p.estado) && puedeCancelar(estado)
                    ? accionCancelar(p.tipo_entrega, estado, p.estado, revisionPago)
                    : null
        };
    };

    const avanzar = (p, accion) => {
        const objetivo = { id_venta: p.id_venta, destino: accion.destino, tipo_entrega: p.tipo_entrega, estadoAnterior: p.estado_entrega };
        if (accion.confirmar) {
            setPendiente({ ...objetivo, titulo: accion.confirmar.titulo, mensaje: accion.confirmar.mensaje(p), boton: accion.confirmar.boton });
        } else {
            actualizarPedido(objetivo);
        }
    };

    const pedirCancelacion = (p, cancelar) =>
        setCancelacion({ id_venta: p.id_venta, destino: 'cancelado', tipo_entrega: p.tipo_entrega, estadoAnterior: p.estado_entrega, ...cancelar });

    const botonesPedido = (p, compacto) => {
        const { avance, cancelar } = opcionesPedido(p);
        return (
            <>
                {avance && (
                    <Button tamano="sm" className="whitespace-nowrap" disabled={procesando} onClick={() => avanzar(p, avance)}>
                        {ICONO_DESTINO[avance.destino]}
                        {avance.texto}
                    </Button>
                )}
                {cancelar &&
                    (compacto ? (
                        <BtnAccion tipo="eliminar" titulo={cancelar.texto} disabled={procesando} onClick={() => pedirCancelacion(p, cancelar)}>
                            <FaXmark aria-hidden="true" />
                            <span className="sr-only">
                                {cancelar.texto}: pedido #{p.id_venta}
                            </span>
                        </BtnAccion>
                    ) : (
                        <Button tamano="sm" variante="secondary" disabled={procesando} onClick={() => pedirCancelacion(p, cancelar)}>
                            <FaXmark aria-hidden="true" />
                            {cancelar.texto}
                        </Button>
                    ))}
            </>
        );
    };

    const accionesFila = (p) => {
        const { tipoValido, historico, devolucionPendiente } = opcionesPedido(p);
        return (
            <>
                {historico && (
                    <Badge color="neutral" title="Histórico: solo consulta">
                        Histórico
                    </Badge>
                )}
                {devolucionPendiente && (
                    <Badge color="warning" title="Devolución pendiente de verificación">
                        Devolución pendiente
                    </Badge>
                )}
                {!tipoValido && (
                    <span
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700"
                        title="El backend no puede mover este pedido hasta que su tipo de entrega sea 'domicilio' o 'tienda'.">
                        <FaTriangleExclamation aria-hidden="true" />
                        Sin tipo de entrega
                    </span>
                )}

                {botonesPedido(p, true)}

                <BtnAccion tipo="ver" titulo="Ver detalle" onClick={() => verDetalle(p)}>
                    <FaEye aria-hidden="true" />
                    <span className="sr-only">Ver detalle del pedido #{p.id_venta}</span>
                </BtnAccion>
            </>
        );
    };

    return (
        <div className="pedidos-pagina space-y-4">
            {!incrustado && (
                <PageHeader
                    titulo="Pedidos"
                    descripcion="Pedidos de la web y la app: pagos, delivery y recojo en Pallasca"
                    acciones={
                        <Button variante="secondary" onClick={() => cargarPedidos()} disabled={cargando || procesando}>
                            <FaRotate /> Actualizar pedidos
                        </Button>
                    }
                />
            )}

            <ResumenPedidos resumen={indicadores} cargando={cargando} error={errorCarga} />

            <Card className="pedido-lista">
                <CardHeader
                    titulo="Lista de pedidos"
                    subtitulo="Por preparar → En camino o Listo para recoger → Entregado. Confirma cada avance cuando realmente ocurra."
                    acciones={
                        <div className="tabla-filtros-acciones">
                            {(busqueda || filtro !== 'todos' || canal !== 'todos' || tipoEntrega !== 'todos') && (
                                <Button
                                    variante="secondary"
                                    onClick={() => {
                                        setBusqueda('');
                                        setFiltro('todos');
                                        setCanal('todos');
                                        setTipoEntrega('todos');
                                    }}>
                                    Limpiar
                                </Button>
                            )}
                            <Button variante="secondary" onClick={() => cargarPedidos()} disabled={cargando || procesando}>
                                <FaRotate /> Actualizar pedidos
                            </Button>
                        </div>
                    }
                    filtros={
                        <div className="filtros-grid filtros-grid--cuatro">
                            <div>
                                <Input
                                    label="Pedido, cliente o destino"
                                    type="text"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Buscar pedido, cliente o zona"
                                    aria-label="Buscar pedidos"
                                    icono={<FaMagnifyingGlass />}
                                />
                            </div>
                            <Select label="Canal de compra" value={canal} onChange={(e) => setCanal(e.target.value)}>
                                <option value="todos">Web y app</option>
                                <option value="web">Compras web</option>
                                <option value="app">Compras app</option>
                            </Select>
                            <Select label="Tipo de entrega" value={tipoEntrega} onChange={(e) => setTipoEntrega(e.target.value)}>
                                <option value="todos">Todas las entregas</option>
                                <option value="domicilio">Delivery</option>
                                <option value="tienda">Recojo en tienda</option>
                            </Select>
                            <Select
                                label="Estado del pedido"
                                value={filtro}
                                onChange={(e) => {
                                    setFiltro(e.target.value);
                                }}
                                aria-label="Filtrar pedidos">
                                {FILTROS.map((f) => (
                                    <option key={f.valor} value={f.valor}>
                                        {f.etiqueta}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    }
                />

                <CardBody>
                    {errorCarga && (
                        <div className="mb-4">
                            <ErrorCarga mensaje={errorCarga} onReintentar={() => cargarPedidos()} cargando={cargando || procesando} />
                        </div>
                    )}

                    {cargando ? (
                        <TableSkeleton columnas={columnas.length + 1} filas={5} />
                    ) : errorCarga ? null : pedidosFiltrados.length === 0 ? (
                        <EmptyState
                            icono={<FaBoxOpen aria-hidden="true" />}
                            titulo="No hay pedidos"
                            descripcion={pedidos.length === 0 ? 'Todavía no hay compras desde la web o la app.' : 'Ningún pedido coincide con el filtro o la búsqueda.'}
                        />
                    ) : (
                        <DataTable
                            etiqueta="Pedidos de la web y la app"
                            columnas={columnas}
                            filas={pedidosFiltrados}
                            keyExtractor={(p) => p.id_venta}
                            acciones={accionesFila}
                            vacio="No hay pedidos"
                            onFilaClick={verDetalle}
                        />
                    )}
                </CardBody>
            </Card>

            <Modal
                abierto={Boolean(detalle)}
                titulo={detalle ? `Pedido #${detalle.id_venta}` : 'Pedido'}
                subtitulo={detalle ? nombreCliente(detalle) : null}
                onCerrar={() => {
                    revisionDetalle.current++;
                    setDetalle(null);
                    setCargandoDetalle(false);
                }}
                grande>
                {detalle && (
                    <div className="space-y-5">
                        {cargandoDetalle && <TableSkeleton columnas={2} filas={3} />}

                        <Seguimiento pedido={detalle} />

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Ficha icono={<FaBoxOpen aria-hidden="true" />} etiqueta="Estado del pago">
                                <Badge color={COLOR_COMERCIAL[detalle.estado] || 'neutral'}>{etiquetaPagoPedido(detalle)}</Badge>
                            </Ficha>

                            <Ficha icono={<FaTruck aria-hidden="true" />} etiqueta="Estado de entrega">
                                <Badge
                                    className={`pedido-estado pedido-estado--${normalizarEstadoEntrega(detalle.estado_entrega)}`}
                                    color={COLOR_ESTADO[normalizarEstadoEntrega(detalle.estado_entrega)] || 'neutral'}>
                                    {etiquetaEntregaPedido(detalle)}
                                </Badge>
                            </Ficha>

                            <Ficha icono={<FaStore aria-hidden="true" />} etiqueta="Tipo de entrega">
                                {descripcionEntrega(detalle)}
                            </Ficha>
                            <Ficha icono={<FaBoxOpen aria-hidden="true" />} etiqueta="Canal de compra">
                                {detalle.canal_compra === 'web' ? 'Web' : 'App'}
                            </Ficha>

                            <Ficha icono={<FaMapLocationDot aria-hidden="true" />} etiqueta="Destino">
                                {destino(detalle)}
                            </Ficha>
                            <Ficha icono={<FaTruck aria-hidden="true" />} etiqueta="Costo de entrega">
                                {formatearMoneda(detalle.costo_envio)}
                            </Ficha>

                            <Ficha icono={<FaCircleCheck aria-hidden="true" />} etiqueta="Método de pago">
                                {pagoEnRevision(detalle) ? 'Pago en revisión' : ETIQUETA_PAGO[detalle.metodo_pago] || 'PayU'}
                                {detalle.fecha_pago ? ` · ${formatearFecha(detalle.fecha_pago)}` : ''}
                            </Ficha>

                            <Ficha icono={<FaBoxOpen aria-hidden="true" />} etiqueta="Total">
                                {formatearMoneda(detalle.total)}
                                {Number(detalle.costo_envio) > 0 ? ` (incluye envío ${formatearMoneda(detalle.costo_envio)})` : ''}
                            </Ficha>
                        </div>

                        {detalle.direccion && detalle.tipo_entrega === 'domicilio' && (
                            <p className="text-sm text-slate-600">
                                <span className="font-medium text-slate-700">Dirección:</span> {detalle.direccion}
                                {detalle.distrito ? `, ${detalle.distrito}` : ''}
                                {detalle.referencia ? ` — ref: ${detalle.referencia}` : ''}
                            </p>
                        )}

                        {detalle.estado_entrega === 'preparando' && (
                            <p className="text-xs text-slate-600">El registro antiguo “preparando” pertenece al tramo Por preparar. No se ha modificado su historial.</p>
                        )}
                        {esFinal(detalle.estado_entrega) ? (
                            <Alert tipo="info">
                                {detalle.estado_entrega === 'entregado'
                                    ? `Pedido entregado ${detalle.tipo_entrega === 'tienda' ? 'en tienda' : 'en domicilio'}. No quedan pasos logísticos.`
                                    : 'Pedido cancelado. No quedan pasos logísticos.'}
                            </Alert>
                        ) : (
                            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">{botonesPedido(detalle, false)}</div>
                        )}
                        <div className="border-t border-slate-100 pt-4">
                            <Link className="text-sm font-semibold underline underline-offset-4" to={`/ventas?ver=${detalle.id_venta}`}>
                                Ver venta y pago de este pedido
                            </Link>
                        </div>
                    </div>
                )}
            </Modal>

            <ConfirmarAccion
                abierto={Boolean(pendiente)}
                titulo={pendiente?.titulo || 'Confirmar'}
                mensaje={pendiente?.mensaje || ''}
                textoConfirmar={pendiente?.boton || 'Confirmar'}
                variante="primary"
                cargando={procesando}
                onConfirmar={confirmarCambio}
                onCerrar={() => setPendiente(null)}
            />

            <ConfirmarAccion
                abierto={Boolean(cancelacion)}
                titulo={cancelacion?.texto || 'Cancelar pedido'}
                mensaje={cancelacion ? `Pedido #${cancelacion.id_venta}. ${cancelacion.mensaje}` : ''}
                textoConfirmar="Sí, cancelar"
                variante="danger"
                cargando={procesando}
                onConfirmar={confirmarCambio}
                onCerrar={() => setCancelacion(null)}
            />
        </div>
    );
}
