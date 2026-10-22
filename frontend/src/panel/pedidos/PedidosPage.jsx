import { useEffect, useMemo, useRef, useState } from 'react';
import { animate, motion, useReducedMotion } from 'motion/react';
import {
    FaBoxOpen,
    FaCircleCheck,
    FaClock,
    FaEye,
    FaRotate,
    FaMagnifyingGlass,
    FaMapLocationDot,
    FaStore,
    FaTriangleExclamation,
    FaTruck,
    FaXmark,
} from 'react-icons/fa6';

import { PageHeader } from '../ui/PageHeader';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Input, Select } from '../ui/Form';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
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
import { useToast } from '../../app/providers/ToastProvider';
import { formatearMoneda, formatearFecha } from '../../compartido/lib/utils/format';
import { descripcionEntrega, esEntregaPallasca, ubicacionEntrega } from '../../compartido/lib/utils/entrega';

import {
    listarPedidos,
    obtenerPedido,
    cambiarEstadoPedido,
} from './pedidosService';
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
    esTipoEntregaValido,
} from './estadosPedido';

// ============================================================
// PEDIDOS: LOGÍSTICA DE LAS VENTAS ECOMMERCE
// ============================================================
// Solo ADMIN (la ruta y la API lo exigen).
//
// Qué es un pedido aquí
//   Es una venta que NACIÓ EN LA APP y se cobró con PayU. Son las
//   únicas que tienen una entrega que gestionar. Las ventas
//   históricas de mostrador (origen 'panel') y las que nacieron de
//   una reserva (origen 'reserva') NO son pedidos: se ven en el
//   módulo Ventas, que ya las muestra. Por eso esta página no
//   duplica Ventas.
//
// Qué NO hace esta página
//   No cobra, no crea ventas, no toca PayU y no modifica el estado
//   de pago (pagada/reembolsada). Solo mueve el estado
//   logístico estado_entrega, que es lo que el backend valida.
// ============================================================

// Un pedido real es el que viene de la app con su orden de PayU.
const esPedido = esPedidoEcommerce;

const FILTROS = [
    { valor: 'todos', etiqueta: 'Todos' },
    { valor: 'web', etiqueta: 'Compras web' },
    { valor: 'app', etiqueta: 'Compras app' },
    { valor: 'domicilio', etiqueta: 'Delivery' },
    { valor: 'tienda', etiqueta: 'Recojo en tienda' },
    { valor: 'pendiente', etiqueta: 'Por preparar' },
    { valor: 'listo_recojo', etiqueta: 'Listos para recoger' },
    { valor: 'en_camino', etiqueta: 'En camino' },
    { valor: 'entregado', etiqueta: 'Entregados' },
    { valor: 'sin_pago', etiqueta: 'Pendientes de pago' },
    { valor: 'cancelado', etiqueta: 'Cancelados' },
    { valor: 'reembolsada', etiqueta: 'Reembolsados' },
];

// Icono del botón según el paso al que lleva.
const ICONO_DESTINO = {
    listo_recojo: <FaStore aria-hidden="true" />,
    en_camino: <FaTruck aria-hidden="true" />,
    entregado: <FaCircleCheck aria-hidden="true" />,
};

// Seguimiento visual del pedido: los pasos de su tipo de entrega con el
// actual resaltado. Un pedido cancelado lo indica debajo.
function Seguimiento({ pedido }) {
    const seg = seguimientoPedido(pedido);
    if (!seg.pasos.length) return <Alert tipo={seg.tono === 'cancelado' ? 'info' : 'warning'}>{seg.titulo}. {seg.mensaje}</Alert>;
    return (
        <div className="space-y-3"><ol className="pedido-seguimiento" aria-label="Seguimiento del pedido">
            {seg.pasos.map(paso => <li key={paso.clave} className={`pedido-seguimiento__paso ${paso.hecho || paso.actual ? 'pedido-seguimiento__paso--hecho' : ''}`} aria-current={paso.actual ? 'step' : undefined}>
                <span className="pedido-seguimiento__trazo"/><span>{paso.etiqueta}</span>
            </li>)}
        </ol>{seg.tono === 'espera' && <Alert tipo="warning">{seg.titulo}. {seg.mensaje}</Alert>}</div>
    );
}

// Mismo acabado de las tarjetas anteriores (joya, destello y anillo),
// conservando la distribución corregida a una décima solo en Pedidos.
function TarjetaResumenPedido({ estado, titulo, detalle, Icono, tono, cantidad, porcentaje, total, orden, cargando, error }) {
    const reducir = useReducedMotion();
    const [activa, setActiva] = useState(false);
    const [cifra, setCifra] = useState(cantidad);
    const anterior = useRef(0);
    const animar = !cargando && !error && !reducir;
    useEffect(() => {
        if (!animar) return undefined;
        const control = animate(anterior.current, cantidad, { duration: 0.9, ease: [0.16, 1, 0.3, 1], onUpdate: setCifra });
        anterior.current = cantidad;
        return () => control.stop();
    }, [cantidad, animar]);
    const textoPorcentaje = `${porcentaje.toLocaleString('es-PE')}%`;
    return <article
        className={`kpi-card kpi-card--destacada joya ${tono === 'primary' ? '' : `joya--${tono}`} indicador-tarjeta pedido-indicador pedido-estado--${estado} ${cargando ? 'indicador--cargando' : ''}`}
        aria-label={titulo} style={{ '--orden': orden }}
        onPointerEnter={e => { if (e.pointerType === 'mouse') setActiva(true); }} onPointerLeave={() => setActiva(false)}>
        <div className="flex items-start justify-between gap-3"><p className="kpi-label pedido-indicador__titulo">{titulo}</p><span className="kpi-icono" aria-hidden="true"><Icono/></span></div>
        {cargando ? <span className="indicador-esqueleto" aria-hidden="true"/> :
            <p className={`kpi-valor pedido-indicador__valor${error ? ' indicador-valor--texto' : ''}`}>{error ? '—' : Math.round(animar ? cifra : cantidad).toLocaleString('es-PE')}</p>}
        <p className="kpi-descripcion">{detalle}</p>
        {!cargando && !error && (total > 0 ? <div className="indicador-zona"><div className="kpi-zona kpi-zona--anillo">
            <div className="kpi-anillo" role="meter" aria-label={`${titulo} sobre el total`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={cantidad}
                aria-valuetext={`${textoPorcentaje} del total (${cantidad} de ${total} pedidos)`}>
                <svg viewBox="0 0 44 44" aria-hidden="true">
                    <circle className="kpi-anillo-pista" cx="22" cy="22" r="18" pathLength="100"/>
                    <circle className="kpi-anillo-valor" cx="22" cy="22" r="18" pathLength="100" strokeDasharray={`${porcentaje} 100`}/>
                    <motion.circle className="kpi-anillo-brillo" cx="22" cy="22" r="18" pathLength="100" strokeDasharray="12 88" initial={{ opacity: 0, strokeDashoffset: 0 }}
                        animate={activa && !reducir ? { strokeDashoffset: [0, -100], opacity: [0, 1, 0] } : { opacity: 0, strokeDashoffset: 0 }} transition={{ duration: 0.5, ease: 'easeInOut' }}/>
                </svg><span className="kpi-anillo-cifra" aria-hidden="true">{textoPorcentaje}</span>
            </div><p className="kpi-anillo-leyenda pedido-indicador__proporcion"><span className="sr-only">{textoPorcentaje} </span>del total</p>
        </div></div> : <p className="kpi-descripcion pedido-indicador__proporcion">Sin base para calcular porcentaje</p>)}
        {cargando && <><span className="indicador-zona indicador-zona--esqueleto" aria-hidden="true"/><span className="sr-only">Cargando {titulo}</span></>}
        <span className="kpi-destello" aria-hidden="true"/>
    </article>;
}

function ResumenPedidos({ resumen, cargando, error }) {
    const tarjetas = [
        ['pendiente', 'Por preparar', 'Sin salir ni estar listos', FaClock, 'warning'],
        ['listo_recojo', 'Listos para recoger', 'Disponibles en tienda', FaStore, 'primary'],
        ['en_camino', 'En camino', 'Con el repartidor', FaTruck, 'info'],
        ['entregado', 'Entregados', 'Recibidos por el cliente', FaCircleCheck, 'success'],
    ];
    return <><section className="indicadores pedidos-indicadores" aria-label="Indicadores de pedidos" aria-busy={cargando}>
        {tarjetas.map(([estado, titulo, detalle, Icono, tono], orden) => <TarjetaResumenPedido key={estado} estado={estado} titulo={titulo} detalle={detalle} Icono={Icono} tono={tono}
            cantidad={resumen.conteos[estado]} porcentaje={resumen.porcentajes[estado]} total={resumen.total} orden={orden} cargando={cargando} error={error}/>)}
    </section><p className="pedido-resumen-nota">{cargando ? 'Consultando los pedidos...' : error ? 'Indicadores no disponibles. Actualiza para consultar los pedidos.' : <>Base del resumen: {resumen.total} {resumen.total === 1 ? 'pedido pagado y vigente' : 'pedidos pagados y vigentes'}. Se excluyen cancelaciones, reembolsos, devoluciones pendientes y pagos en revisión. El filtro de estado solo cambia la lista.</>}</p></>;
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

export default function PedidosPage() {
    const { exito, error: mostrarError } = useToast();

    const [pedidos, setPedidos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [errorCarga, setErrorCarga] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [filtro, setFiltro] = useState('todos');

    const [detalle, setDetalle] = useState(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);

    // Avance de estado
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
            setErrorCarga(
                e?.response?.data?.mensaje || 'No se pudieron cargar los pedidos'
            );
        } finally {
            if (revision === revisionCarga.current) { consultaActiva.current = false; setCargando(false); }
        }
    };

    const invalidarConsultas = () => { revisionCarga.current++; revisionDetalle.current++; };
    useEffect(() => {
        activo.current = true;
        cargarPedidos();
        const refrescar = () => { if (document.visibilityState === 'visible' && !mutando.current) cargarPedidos(true); };
        const timer = setInterval(refrescar, 60000);
        window.addEventListener('focus', refrescar);
        return () => { activo.current = false; clearInterval(timer); window.removeEventListener('focus', refrescar); invalidarConsultas(); consultaActiva.current = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Abrir detalle
    const verDetalle = async (pedido) => {
        const revision = ++revisionDetalle.current;
        setCargandoDetalle(true);
        setDetalle(pedido);

        try {
            const completo = await obtenerPedido(pedido.id_venta);
            if (completo && revision === revisionDetalle.current) setDetalle(completo);
        } catch (e) {
            if (revision !== revisionDetalle.current) return;
            mostrarError(
                e?.response?.data?.mensaje || 'No se pudo cargar el detalle del pedido'
            );
        } finally {
            if (revision === revisionDetalle.current) setCargandoDetalle(false);
        }
    };

    // ========================================
    // AVANZAR ESTADO LOGÍSTICO
    // ----------------------------------------
    // El backend vuelve a validar la transición y rechaza cualquier
    // salto inválido. Aquí no se toca el estado comercial: cobrar o
    // reembolsar sigue siendo cosa de Ventas.
    // ========================================
    const actualizarPedido = async (objetivo) => {
        if (!objetivo || mutando.current) return;
        // La confirmación pudo abrirse antes de que una actualización automática
        // informara la revisión. Tampoco se envía ese avance desde un modal viejo.
        if (objetivo.destino !== 'cancelado' && [pedidos.find(p => p.id_venta === objetivo.id_venta),
            detalle?.id_venta === objetivo.id_venta ? detalle : null].some(pagoEnRevision)) {
            setPendiente(null);
            mostrarError('El pago está en revisión. Actualiza el pedido antes de avanzar la entrega.');
            return;
        }
        mutando.current = true;
        const revisionAbierta = revisionDetalle.current;

        setProcesando(true);

        try {
            const respuesta = await cambiarEstadoPedido(objetivo.id_venta, objetivo.destino, { confirmado: objetivo.destino !== 'cancelado', estadoAnterior: objetivo.estadoAnterior });
            if (!activo.current) return;
            exito(objetivo.destino === 'cancelado' && respuesta?.mensaje ? respuesta.mensaje
                : `Pedido #${objetivo.id_venta} → ${etiquetaEstado(objetivo.tipo_entrega, objetivo.destino)}`);

            setPendiente(null);
            setCancelacion(null);

            // Refresca la lista y, si el detalle está abierto, el detalle.
            await cargarPedidos(true, true);

            if (detalle?.id_venta === objetivo.id_venta && revisionAbierta === revisionDetalle.current) {
                const actualizado = await obtenerPedido(objetivo.id_venta);
                if (activo.current && revisionAbierta === revisionDetalle.current) setDetalle(actualizado);
            }
        } catch (e) {
            if (!activo.current) return;
            mostrarError(
                e?.response?.data?.mensaje || 'No se pudo actualizar el estado del pedido'
            );
        } finally {
            mutando.current = false;
            if (activo.current) setProcesando(false);
        }
    };
    const confirmarCambio = () => actualizarPedido(pendiente || cancelacion);

    // ========================================
    // FILTROS Y BÚSQUEDA (en pantalla)
    // ========================================
    const pedidosEnAmbito = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();

        return pedidos.filter((p) => {
            if (filtro === 'web' && p.canal_compra !== 'web') return false;
            if (filtro === 'app' && p.canal_compra === 'web') return false;
            if (filtro === 'domicilio' && p.tipo_entrega !== 'domicilio') return false;
            if (filtro === 'tienda' && p.tipo_entrega !== 'tienda') return false;

            if (!texto) return true;

            return [
                `#${p.id_venta}`,
                nombreCliente(p),
                p.correo_usuario,
                p.correo_compra,
                p.distrito,
                p.zona_delivery_nombre,
                p.direccion,
                p.external_reference,
            ]
                .filter(Boolean)
                .some((campo) => String(campo).toLowerCase().includes(texto));
        });
    }, [pedidos, filtro, busqueda]);
    const pedidosFiltrados = useMemo(() => pedidosEnAmbito.filter(p => {
        if (['pendiente', 'listo_recojo', 'en_camino', 'entregado'].includes(filtro)) return estadoContabilizable(p) === filtro;
        if (filtro === 'sin_pago') return p.estado === 'pendiente';
        if (filtro === 'cancelado') return p.estado === 'cancelada' || p.estado_entrega === 'cancelado';
        if (filtro === 'reembolsada') return p.estado === 'reembolsada';
        return true;
    }), [pedidosEnAmbito, filtro]);

    // ========================================
    // INDICADORES
    // ========================================
    const indicadores = useMemo(() => resumirPedidos(pedidosEnAmbito), [pedidosEnAmbito]);

    const columnas = [
        {
            titulo: 'N° pedido',
            campo: 'id_venta',
            render: (p) => (
                <div><span className="font-semibold text-primary-700">#{p.id_venta}</span>
                    <span className="ml-2"><Badge color="neutral">{p.canal_compra === 'web' ? 'Web' : 'App'}</Badge></span>
                    <span className="block text-xs text-slate-500">{formatearFecha(p.fecha_venta)}</span></div>
            ),
        },
        {
            titulo: 'Cliente',
            render: (p) => (
                <div className="min-w-0">
                    <div className="truncate font-medium text-slate-800">
                        {nombreCliente(p)}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                        {p.correo_usuario || p.correo_compra || '—'}
                    </div>
                </div>
            ),
        },
        {
            titulo: 'Total',
            alineacion: 'derecha',
            render: (p) => (
                <span className="whitespace-nowrap font-semibold text-slate-800">
                    {formatearMoneda(p.total)}
                </span>
            ),
        },
        {
            titulo: 'Pago',
            render: (p) => (
                <Badge color={pagoEnRevision(p) ? 'warning' : COLOR_COMERCIAL[p.estado] || 'neutral'}>
                    {etiquetaPagoPedido(p)}
                </Badge>
            ),
        },
        {
            titulo: 'Entrega',
            render: (p) => (
                <div><Badge color={esTipoEntregaValido(p.tipo_entrega) ? (p.tipo_entrega === 'domicilio' ? 'primary' : 'info') : 'danger'}>
                    {descripcionEntrega(p)}
                </Badge><p className="mt-1 max-w-[240px] text-xs text-slate-600">{destino(p)}</p></div>
            ),
        },
        {
            titulo: 'Estado entrega',
            render: (p) => {
                const estado = normalizarEstadoEntrega(p.estado_entrega);
                return <Badge className={`pedido-estado pedido-estado--${estado}`} color={COLOR_ESTADO[estado] || 'neutral'}>{etiquetaEntregaPedido(p)}</Badge>;
            },
        },
    ];

    // Qué puede hacerse con el pedido ahora mismo (igual en la fila y en el detalle).
    const opcionesPedido = (p) => {
        const estado = p.estado_entrega;
        const tipoValido = esTipoEntregaValido(p.tipo_entrega);
        const historico = p.origen === 'panel' || p.origen === 'reserva' || Boolean(p.id_reserva);
        const devolucionPendiente = p.estado_reembolso === 'pendiente_verificacion';
        const revisionPago = pagoEnRevision(p);
        const pagoConfirmado = pagoConfirmadoPedido(p);
        const habilitado = tipoValido && !historico && !devolucionPendiente;
        return {
            tipoValido, historico, devolucionPendiente,
            avance: habilitado && pagoConfirmado && !revisionPago ? accionSiguiente(p.tipo_entrega, estado) : null,
            cancelar: tipoValido && !historico && !['cancelada', 'reembolsada'].includes(p.estado) && puedeCancelar(estado)
                ? accionCancelar(p.tipo_entrega, estado, p.estado, revisionPago) : null,
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

    // Botones del paso actual: en la fila la cancelación es un icono; en el
    // detalle se muestra con su texto ("No lo recogió", "No se pudo entregar").
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
                {cancelar && (compacto ? (
                    <BtnAccion tipo="eliminar" titulo={cancelar.texto} disabled={procesando} onClick={() => pedirCancelacion(p, cancelar)}>
                        <FaXmark aria-hidden="true" />
                        <span className="sr-only">{cancelar.texto}: pedido #{p.id_venta}</span>
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
                {historico && <Badge color="neutral" title="Histórico: solo consulta">Histórico</Badge>}
                {devolucionPendiente && <Badge color="warning" title="Devolución pendiente de verificación">Devolución pendiente</Badge>}
                {!tipoValido && (
                    <span
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700"
                        title="El backend no puede mover este pedido hasta que su tipo de entrega sea 'domicilio' o 'tienda'."
                    >
                        <FaTriangleExclamation aria-hidden="true" />
                        Sin tipo de entrega
                    </span>
                )}

                {botonesPedido(p, true)}

                <BtnAccion
                    tipo="ver"
                    titulo="Ver detalle"
                    onClick={() => verDetalle(p)}
                >
                    <FaEye aria-hidden="true" />
                    <span className="sr-only">Ver detalle del pedido #{p.id_venta}</span>
                </BtnAccion>
            </>
        );
    };

    return (
        <div className="pedidos-pagina space-y-4">
            <PageHeader
                titulo="Pedidos"
                descripcion="Pedidos de la web y la app: pagos, delivery y recojo en Pallasca"
                acciones={<Button variante="secondary" onClick={() => cargarPedidos()} disabled={cargando || procesando}><FaRotate /> Actualizar pedidos</Button>}
            />

            <ResumenPedidos resumen={indicadores} cargando={cargando} error={errorCarga}/>

            <Card className="pedido-lista">
                <CardHeader
                    titulo="Lista de pedidos"
                    subtitulo="Por preparar → En camino o Listo para recoger → Entregado. Confirma cada avance cuando realmente ocurra."
                    acciones={
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <div className="relative">
                                <Input
                                    type="text"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Buscar pedido, cliente o zona"
                                    aria-label="Buscar pedidos"
                                    className="pl-9"
                                />
                                <FaMagnifyingGlass
                                    aria-hidden="true"
                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                            </div>

                            <Select
                                value={filtro}
                                onChange={(e) => {
                                    setFiltro(e.target.value);
                                }}
                                aria-label="Filtrar pedidos"
                            >
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
                            <Alert tipo="error">{errorCarga}</Alert>
                        </div>
                    )}

                    {cargando ? (
                        <TableSkeleton columnas={columnas.length + 1} filas={5} />
                    ) : pedidosFiltrados.length === 0 ? (
                        <EmptyState
                            icono={<FaBoxOpen aria-hidden="true" />}
                            titulo="No hay pedidos"
                            descripcion={
                                pedidos.length === 0
                                    ? 'Todavía no hay compras desde la web o la app.'
                                    : 'Ningún pedido coincide con el filtro o la búsqueda.'
                            }
                        />
                    ) : (
                        <DataTable
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

            {/* ========================================
                DETALLE DEL PEDIDO
                ======================================== */}
            <Modal
                abierto={Boolean(detalle)}
                titulo={detalle ? `Pedido #${detalle.id_venta}` : 'Pedido'}
                subtitulo={detalle ? nombreCliente(detalle) : null}
                onCerrar={() => { revisionDetalle.current++; setDetalle(null); setCargandoDetalle(false); }}
                grande
            >
                {detalle && (
                    <div className="space-y-5">
                        {cargandoDetalle && <TableSkeleton columnas={2} filas={3} />}

                        <Seguimiento pedido={detalle} />

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Ficha icono={<FaBoxOpen aria-hidden="true" />} etiqueta="Estado del pago">
                                <Badge color={COLOR_COMERCIAL[detalle.estado] || 'neutral'}>
                                    {etiquetaPagoPedido(detalle)}
                                </Badge>
                            </Ficha>

                            <Ficha icono={<FaTruck aria-hidden="true" />} etiqueta="Estado de entrega">
                                <Badge className={`pedido-estado pedido-estado--${normalizarEstadoEntrega(detalle.estado_entrega)}`} color={COLOR_ESTADO[normalizarEstadoEntrega(detalle.estado_entrega)] || 'neutral'}>
                                    {etiquetaEntregaPedido(detalle)}
                                </Badge>
                            </Ficha>

                            <Ficha icono={<FaStore aria-hidden="true" />} etiqueta="Tipo de entrega">
                                {descripcionEntrega(detalle)}
                            </Ficha>
                            <Ficha icono={<FaBoxOpen aria-hidden="true" />} etiqueta="Canal de compra">
                                {detalle.canal_compra==='web'?'Web':'App'}
                            </Ficha>

                            <Ficha icono={<FaMapLocationDot aria-hidden="true" />} etiqueta="Destino">
                                {destino(detalle)}
                            </Ficha>
                            <Ficha icono={<FaTruck aria-hidden="true" />} etiqueta="Costo de entrega">
                                {formatearMoneda(detalle.costo_envio)}
                            </Ficha>

                            <Ficha icono={<FaCircleCheck aria-hidden="true" />} etiqueta="Método de pago">
                                {pagoEnRevision(detalle) ? 'Pago en revisión' : ETIQUETA_PAGO[detalle.metodo_pago] || 'PayU'}
                                {detalle.fecha_pago
                                    ? ` · ${formatearFecha(detalle.fecha_pago)}`
                                    : ''}
                            </Ficha>

                            <Ficha icono={<FaBoxOpen aria-hidden="true" />} etiqueta="Total">
                                {formatearMoneda(detalle.total)}
                                {Number(detalle.costo_envio) > 0
                                    ? ` (incluye envío ${formatearMoneda(detalle.costo_envio)})`
                                    : ''}
                            </Ficha>
                        </div>

                        {detalle.direccion && detalle.tipo_entrega === 'domicilio' && (
                            <p className="text-sm text-slate-600">
                                <span className="font-medium text-slate-700">Dirección:</span>{' '}
                                {detalle.direccion}
                                {detalle.distrito ? `, ${detalle.distrito}` : ''}
                                {detalle.referencia ? ` — ref: ${detalle.referencia}` : ''}
                            </p>
                        )}

                        {detalle.estado_entrega === 'preparando' && <p className="text-xs text-slate-600">El registro antiguo “preparando” pertenece al tramo Por preparar. No se ha modificado su historial.</p>}
                        {esFinal(detalle.estado_entrega) ? (
                            <Alert tipo="info">
                                {detalle.estado_entrega === 'entregado'
                                    ? `Pedido entregado ${detalle.tipo_entrega === 'tienda' ? 'en tienda' : 'en domicilio'}. No quedan pasos logísticos.`
                                    : 'Pedido cancelado. No quedan pasos logísticos.'}
                            </Alert>
                        ) : (
                            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                                {botonesPedido(detalle, false)}
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* ========================================
                CONFIRMAR AVANCE / CANCELACIÓN
                ======================================== */}
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
                mensaje={
                    cancelacion
                        ? `Pedido #${cancelacion.id_venta}. ${cancelacion.mensaje}`
                        : ''
                }
                textoConfirmar="Sí, cancelar"
                variante="danger"
                cargando={procesando}
                onConfirmar={confirmarCambio}
                onCerrar={() => setCancelacion(null)}
            />
        </div>
    );
}
