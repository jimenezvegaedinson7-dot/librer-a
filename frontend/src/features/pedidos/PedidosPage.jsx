import { useEffect, useMemo, useRef, useState } from 'react';
import {
    FaBoxesPacking,
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

import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Input, Select } from '../../components/ui/Form';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/TableSkeleton';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { BtnAccion } from '../../components/ui/Acciones';
import { Modal } from '../../components/ui/Modal';
import { ConfirmarAccion } from '../../components/ui/ConfirmarAccion';
import { Ficha } from '../../components/ui/Ficha';
import { Indicador, Indicadores } from '../../components/ui/Indicadores';
import { useToast } from '../../components/providers/ToastProvider';
import { formatearMoneda, formatearFecha } from '../../lib/utils/format';
import { descripcionEntrega, esEntregaPallasca, ubicacionEntrega } from '../../lib/utils/entrega';

import {
    listarPedidos,
    obtenerPedido,
    cambiarEstadoPedido,
} from './pedidosService';
import {
    COLOR_ESTADO,
    ETIQUETA_COMERCIAL,
    COLOR_COMERCIAL,
    ETIQUETA_PAGO,
    FLUJO,
    accionSiguiente,
    accionCancelar,
    etiquetaEstado,
    etiquetaEntregaPedido,
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
//   comercial (pagada/entregada/reembolsada). Solo mueve el estado
//   logístico estado_entrega, que es lo que el backend valida.
// ============================================================

// Un pedido real es el que viene de la app con su orden de PayU.
const esPedido = (fila) =>
    fila?.origen === 'app' && Boolean(fila?.external_reference || fila?.payu_order_id);

const FILTROS = [
    { valor: 'todos', etiqueta: 'Todos' },
    { valor: 'web', etiqueta: 'Compras web' },
    { valor: 'app', etiqueta: 'Compras app' },
    { valor: 'domicilio', etiqueta: 'Delivery' },
    { valor: 'tienda', etiqueta: 'Recojo en tienda' },
    { valor: 'pendiente', etiqueta: 'Pendientes' },
    { valor: 'preparando', etiqueta: 'Preparando' },
    { valor: 'listo_recojo', etiqueta: 'Listos para recojo' },
    { valor: 'en_camino', etiqueta: 'En camino' },
    { valor: 'entregado', etiqueta: 'Entregados' },
];

// Icono del botón según el paso al que lleva.
const ICONO_DESTINO = {
    preparando: <FaBoxesPacking aria-hidden="true" />,
    listo_recojo: <FaStore aria-hidden="true" />,
    en_camino: <FaTruck aria-hidden="true" />,
    entregado: <FaCircleCheck aria-hidden="true" />,
};

// Seguimiento visual del pedido: los pasos de su tipo de entrega con el
// actual resaltado. Un pedido cancelado lo indica debajo.
function Seguimiento({ pedido }) {
    const flujo = FLUJO[pedido.tipo_entrega];
    if (!flujo) return null;
    const estado = pedido.estado_entrega || 'pendiente';
    const cancelado = estado === 'cancelado';
    const sinPago = pedido.estado === 'pendiente';
    const indice = cancelado || sinPago ? -1 : flujo.pasos.indexOf(estado);
    return (
        <ol className="grid grid-cols-4 gap-2" aria-label="Seguimiento del pedido">
            {flujo.pasos.map((paso, i) => {
                const hecho = i <= indice;
                const actual = i === indice;
                return (
                    <li key={paso} className="flex flex-col items-center gap-1.5 text-center" aria-current={actual ? 'step' : undefined}>
                        <span className={`h-1.5 w-full rounded-full ${hecho ? 'bg-primary-600' : 'bg-slate-200'}`} />
                        <span className={`text-[11px] leading-tight ${actual ? 'font-semibold text-primary-700' : hecho ? 'text-slate-700' : 'text-slate-400'}`}>
                            {flujo.etiquetas[paso]}
                        </span>
                    </li>
                );
            })}
            {cancelado && <li className="col-span-4"><Badge color="danger">Pedido cancelado</Badge></li>}
            {sinPago && !cancelado && <li className="col-span-4"><Badge color="warning">Esperando pago: la preparación empieza al confirmarse</Badge></li>}
        </ol>
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
        mutando.current = true;
        const revisionAbierta = revisionDetalle.current;

        setProcesando(true);

        try {
            await cambiarEstadoPedido(objetivo.id_venta, objetivo.destino);
            if (!activo.current) return;
            exito(`Pedido #${objetivo.id_venta} → ${etiquetaEstado(objetivo.tipo_entrega, objetivo.destino)}`);

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
    const pedidosFiltrados = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();

        return pedidos.filter((p) => {
            if (filtro === 'web' && p.canal_compra !== 'web') return false;
            if (filtro === 'app' && p.canal_compra === 'web') return false;
            if (filtro === 'domicilio' && p.tipo_entrega !== 'domicilio') return false;
            if (filtro === 'tienda' && p.tipo_entrega !== 'tienda') return false;

            if (
                ['pendiente', 'preparando', 'listo_recojo', 'en_camino', 'entregado'].includes(filtro)
                && (p.estado_entrega || 'pendiente') !== filtro
            ) {
                return false;
            }

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

    // ========================================
    // INDICADORES
    // ========================================
    const indicadores = useMemo(() => {
        const porEstado = (e) =>
            pedidosFiltrados.filter((p) => (p.estado_entrega || 'pendiente') === e).length;

        return {
            total: pedidosFiltrados.length,
            porHacer: pedidosFiltrados.filter((p) => ['pagada', 'entregada'].includes(p.estado)
                && ['pendiente', 'preparando'].includes(p.estado_entrega || 'pendiente')).length,
            enRuta: porEstado('en_camino'),
            listos: porEstado('listo_recojo'),
            entregados: porEstado('entregado'),
        };
    }, [pedidosFiltrados]);

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
                <Badge color={COLOR_COMERCIAL[p.estado] || 'neutral'}>
                    {p.estado === 'pagada' || p.estado === 'entregada' ? 'Confirmado · PayU' : ETIQUETA_COMERCIAL[p.estado] || p.estado}
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
                const estado = p.estado_entrega || 'pendiente';
                return <Badge color={COLOR_ESTADO[estado] || 'neutral'}>{etiquetaEntregaPedido(p)}</Badge>;
            },
        },
    ];

    // Qué puede hacerse con el pedido ahora mismo (igual en la fila y en el detalle).
    const opcionesPedido = (p) => {
        const estado = p.estado_entrega || 'pendiente';
        const tipoValido = esTipoEntregaValido(p.tipo_entrega);
        const historico = p.origen === 'panel' || p.origen === 'reserva';
        const devolucionPendiente = p.estado_reembolso === 'pendiente_verificacion';
        const pagoConfirmado = ['pagada', 'entregada'].includes(p.estado);
        const habilitado = tipoValido && !historico && !devolucionPendiente;
        return {
            tipoValido, historico, devolucionPendiente,
            avance: habilitado && pagoConfirmado ? accionSiguiente(p.tipo_entrega, estado) : null,
            cancelar: habilitado && !['cancelada', 'reembolsada'].includes(p.estado) && puedeCancelar(estado)
                ? accionCancelar(p.tipo_entrega, estado) : null,
        };
    };

    const avanzar = (p, accion) => {
        const objetivo = { id_venta: p.id_venta, destino: accion.destino, tipo_entrega: p.tipo_entrega };
        if (accion.confirmar) {
            setPendiente({ ...objetivo, titulo: accion.confirmar.titulo, mensaje: accion.confirmar.mensaje(p), boton: accion.confirmar.boton });
        } else {
            actualizarPedido(objetivo);
        }
    };

    const pedirCancelacion = (p, cancelar) =>
        setCancelacion({ id_venta: p.id_venta, destino: 'cancelado', tipo_entrega: p.tipo_entrega, ...cancelar });

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
        <div className="space-y-4">
            <PageHeader
                titulo="Pedidos"
                descripcion="Pedidos de la web y la app: pagos, delivery y recojo en Pallasca"
                acciones={<Button variante="secondary" onClick={() => cargarPedidos()} disabled={cargando || procesando}><FaRotate /> Actualizar pedidos</Button>}
            />

            <Indicadores etiqueta="Indicadores de pedidos" cargando={cargando}>
                <Indicador titulo="Por preparar" valor={indicadores.porHacer} icono={<FaClock />} tono="warning" detalle="Pagados, aún sin salir" de={indicadores.total} />
                <Indicador titulo="Listos para recoger" valor={indicadores.listos} icono={<FaStore />} tono="primary" detalle="Esperando al cliente en tienda" de={indicadores.total} />
                <Indicador titulo="En camino" valor={indicadores.enRuta} icono={<FaTruck />} tono="info" detalle="Delivery en ruta" de={indicadores.total} />
                <Indicador titulo="Entregados" valor={indicadores.entregados} icono={<FaCircleCheck />} tono="success" detalle="Completados" de={indicadores.total} />
            </Indicadores>

            <Card>
                <CardHeader
                    titulo="Lista de pedidos"
                    subtitulo="Recojo: preparar → listo para recoger → entregar en tienda. Delivery: preparar → despachar → confirmar entrega. El cliente recibe cada aviso por correo y en la app."
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
                            <Ficha icono={<FaBoxOpen aria-hidden="true" />} etiqueta="Estado comercial">
                                <Badge color={COLOR_COMERCIAL[detalle.estado] || 'neutral'}>
                                    {ETIQUETA_COMERCIAL[detalle.estado] || detalle.estado}
                                </Badge>
                            </Ficha>

                            <Ficha icono={<FaTruck aria-hidden="true" />} etiqueta="Estado de entrega">
                                <Badge color={COLOR_ESTADO[detalle.estado_entrega || 'pendiente'] || 'neutral'}>
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

                            <Ficha icono={<FaCircleCheck aria-hidden="true" />} etiqueta="Pago">
                                {ETIQUETA_PAGO[detalle.metodo_pago] || 'PayU'}
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

                        {esFinal(detalle.estado_entrega || 'pendiente') ? (
                            <Alert tipo="info">
                                {detalle.estado_entrega === 'entregado'
                                    ? `Pedido ${detalle.tipo_entrega === 'tienda' ? 'recogido en tienda' : 'entregado en domicilio'}. No quedan pasos logísticos.`
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
                        ? `Pedido #${cancelacion.id_venta}. ${cancelacion.mensaje} Esto no genera reembolso: el dinero se devuelve con el flujo de Devoluciones.`
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
