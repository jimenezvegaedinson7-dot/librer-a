import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
    FaArrowRight,
    FaBoxOpen,
    FaCircleCheck,
    FaClock,
    FaEye,
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
import { Alert } from '../../components/ui/Alert';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/TableSkeleton';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { BtnAccion } from '../../components/ui/Acciones';
import { Modal } from '../../components/ui/Modal';
import { ConfirmarAccion } from '../../components/ui/ConfirmarAccion';
import { Ficha } from '../../components/ui/Ficha';
import { StatCard } from '../dashboard/StatCard';
import { useToast } from '../../components/providers/ToastProvider';
import { formatearMoneda, formatearFecha } from '../../lib/utils/format';
import { descripcionEntrega, esEntregaPallasca, ubicacionEntrega } from '../../lib/utils/entrega';

import {
    listarPedidos,
    obtenerPedido,
    cambiarEstadoPedido,
} from './pedidosService';
import {
    ETIQUETA_ESTADO,
    COLOR_ESTADO,
    ETIQUETA_COMERCIAL,
    COLOR_COMERCIAL,
    ETIQUETA_PAGO,
    siguienteEstado,
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
    { valor: 'domicilio', etiqueta: 'Delivery' },
    { valor: 'tienda', etiqueta: 'Recojo en tienda' },
    { valor: 'pendiente', etiqueta: 'Pendientes' },
    { valor: 'preparando', etiqueta: 'Preparando' },
    { valor: 'listo_recojo', etiqueta: 'Listos para recojo' },
    { valor: 'en_camino', etiqueta: 'En camino' },
    { valor: 'entregado', etiqueta: 'Entregados' },
];

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

    const cargarPedidos = async () => {
        setCargando(true);
        setErrorCarga(null);

        try {
            const datos = await listarPedidos();
            setPedidos(Array.isArray(datos) ? datos.filter(esPedido) : []);
        } catch (e) {
            setErrorCarga(
                e?.response?.data?.mensaje || 'No se pudieron cargar los pedidos'
            );
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarPedidos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Abrir detalle
    const verDetalle = async (pedido) => {
        setCargandoDetalle(true);
        setDetalle(pedido);

        try {
            const completo = await obtenerPedido(pedido.id_venta);
            if (completo) setDetalle(completo);
        } catch (e) {
            mostrarError(
                e?.response?.data?.mensaje || 'No se pudo cargar el detalle del pedido'
            );
        } finally {
            setCargandoDetalle(false);
        }
    };

    // ========================================
    // AVANZAR ESTADO LOGÍSTICO
    // ----------------------------------------
    // El backend vuelve a validar la transición y rechaza cualquier
    // salto inválido. Aquí no se toca el estado comercial: cobrar o
    // reembolsar sigue siendo cosa de Ventas.
    // ========================================
    const confirmarCambio = async () => {
        // El mismo manejador sirve a los dos diálogos: el de avance
        // (pendiente) y el de cancelación (cancelacion).
        const objetivo = pendiente || cancelacion;

        if (!objetivo) return;

        setProcesando(true);

        try {
            await cambiarEstadoPedido(objetivo.id_venta, objetivo.destino);
            exito(`Pedido #${objetivo.id_venta} → ${ETIQUETA_ESTADO[objetivo.destino]}`);

            setPendiente(null);
            setCancelacion(null);

            // Refresca la lista y, si el detalle está abierto, el detalle.
            await cargarPedidos();

            if (detalle?.id_venta === objetivo.id_venta) {
                const actualizado = await obtenerPedido(objetivo.id_venta);
                setDetalle(actualizado);
            }
        } catch (e) {
            mostrarError(
                e?.response?.data?.mensaje || 'No se pudo actualizar el estado del pedido'
            );
        } finally {
            setProcesando(false);
        }
    };

    // ========================================
    // FILTROS Y BÚSQUEDA (en pantalla)
    // ========================================
    const pedidosFiltrados = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();

        return pedidos.filter((p) => {
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
            porHacer: porEstado('pendiente') + porEstado('preparando'),
            enRuta: porEstado('en_camino'),
            entregados: porEstado('entregado'),
        };
    }, [pedidosFiltrados]);

    const columnas = [
        {
            titulo: 'N° pedido',
            campo: 'id_venta',
            render: (p) => (
                <span className="font-semibold text-primary-700">#{p.id_venta}</span>
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
            titulo: 'Fecha',
            render: (p) => (
                <span className="whitespace-nowrap text-slate-600">
                    {formatearFecha(p.fecha_venta)}
                </span>
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
                <Badge color={p.estado === 'pagada' || p.estado === 'entregada' ? 'success' : 'warning'}>
                    {ETIQUETA_PAGO[p.metodo_pago] || (p.payu_order_id ? 'PayU' : 'PayU')}
                </Badge>
            ),
        },
        {
            titulo: 'Entrega',
            render: (p) => (
                <Badge color={esTipoEntregaValido(p.tipo_entrega) ? (p.tipo_entrega === 'domicilio' ? 'primary' : 'info') : 'danger'}>
                    {descripcionEntrega(p)}
                </Badge>
            ),
        },
        {
            titulo: 'Dirección',
            render: (p) => (
                <div className="min-w-0 max-w-[220px]">
                    <div className="truncate text-slate-600">{destino(p)}</div>
                </div>
            ),
        },
        {
            titulo: 'Pago (estado)',
            render: (p) => (
                <Badge color={COLOR_COMERCIAL[p.estado] || 'neutral'}>
                    {ETIQUETA_COMERCIAL[p.estado] || p.estado}
                </Badge>
            ),
        },
        {
            titulo: 'Estado entrega',
            render: (p) => {
                const estado = p.estado_entrega || 'pendiente';
                return <Badge color={COLOR_ESTADO[estado] || 'neutral'}>{ETIQUETA_ESTADO[estado] || estado}</Badge>;
            },
        },
    ];

    const accionesFila = (p) => {
        const estado = p.estado_entrega || 'pendiente';
        const tipoValido = esTipoEntregaValido(p.tipo_entrega);
        const destino_ = tipoValido ? siguienteEstado(p.tipo_entrega, estado) : null;

        return (
            <>
                {!tipoValido && (
                    <span
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700"
                        title="El backend no puede mover este pedido hasta que su tipo de entrega sea 'domicilio' o 'tienda'."
                    >
                        <FaTriangleExclamation aria-hidden="true" />
                        Sin tipo de entrega
                    </span>
                )}

                {destino_ && (
                    <BtnAccion
                        tipo="editar"
                        titulo={`Marcar como ${ETIQUETA_ESTADO[destino_]}`}
                        onClick={() =>
                            setPendiente({ id_venta: p.id_venta, destino: destino_ })
                        }
                    >
                        <FaArrowRight aria-hidden="true" />
                        <span className="sr-only">
                            Pedido #{p.id_venta}: avanzar a {ETIQUETA_ESTADO[destino_]}
                        </span>
                    </BtnAccion>
                )}

                {tipoValido && puedeCancelar(estado) && (
                    <BtnAccion
                        tipo="eliminar"
                        titulo="Cancelar pedido"
                        onClick={() => setCancelacion({ id_venta: p.id_venta, destino: 'cancelado' })}
                    >
                        <FaXmark aria-hidden="true" />
                        <span className="sr-only">Cancelar pedido #{p.id_venta}</span>
                    </BtnAccion>
                )}

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
                descripcion="Seguimiento logístico de las ventas de la app: delivery y recojo en tienda"
            />

            <motion.section
                aria-label="Indicadores de pedidos"
                initial="oculto"
                animate="visible"
                variants={{ oculto: {}, visible: { transition: { staggerChildren: 0.06 } } }}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5"
            >
                <StatCard titulo="Pedidos" valor={indicadores.total} icono={<FaBoxOpen />} color="primary" detalle="En el filtro actual" />
                <StatCard titulo="Por preparar" valor={indicadores.porHacer} icono={<FaClock />} color="warning" detalle="Pendientes o preparando" />
                <StatCard titulo="En camino" valor={indicadores.enRuta} icono={<FaTruck />} color="info" detalle="Delivery en ruta" />
                <StatCard titulo="Entregados" valor={indicadores.entregados} icono={<FaCircleCheck />} color="success" detalle="Completados" />
            </motion.section>

            <Card>
                <CardHeader
                    titulo="Lista de pedidos"
                    subtitulo="Filtra por tipo de entrega o estado logístico"
                    acciones={
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <div className="relative">
                                <Input
                                    type="text"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Buscar pedido, cliente o distrito"
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
                                    ? 'Todavía no hay ventas desde la app. Los pedidos aparecen cuando un cliente paga desde la aplicación.'
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
                onCerrar={() => setDetalle(null)}
                grande
            >
                {detalle && (
                    <div className="space-y-5">
                        {cargandoDetalle && <TableSkeleton columnas={2} filas={3} />}

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Ficha icono={<FaBoxOpen aria-hidden="true" />} etiqueta="Estado comercial">
                                <Badge color={COLOR_COMERCIAL[detalle.estado] || 'neutral'}>
                                    {ETIQUETA_COMERCIAL[detalle.estado] || detalle.estado}
                                </Badge>
                            </Ficha>

                            <Ficha icono={<FaTruck aria-hidden="true" />} etiqueta="Estado de entrega">
                                <Badge color={COLOR_ESTADO[detalle.estado_entrega || 'pendiente'] || 'neutral'}>
                                    {ETIQUETA_ESTADO[detalle.estado_entrega || 'pendiente']}
                                </Badge>
                            </Ficha>

                            <Ficha icono={<FaStore aria-hidden="true" />} etiqueta="Tipo de entrega">
                                {descripcionEntrega(detalle)}
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

                        {esFinal(detalle.estado_entrega || 'pendiente') && (
                            <Alert tipo="info">
                                {detalle.estado_entrega === 'entregado'
                                    ? 'Pedido entregado. No quedan pasos logísticos.'
                                    : 'Pedido cancelado. No quedan pasos logísticos.'}
                            </Alert>
                        )}
                    </div>
                )}
            </Modal>

            {/* ========================================
                CONFIRMAR AVANCE / CANCELACIÓN
                ======================================== */}
            <ConfirmarAccion
                abierto={Boolean(pendiente)}
                titulo="Avanzar pedido"
                mensaje={
                    pendiente
                        ? `¿Marcar el pedido #${pendiente.id_venta} como "${ETIQUETA_ESTADO[pendiente.destino]}"? Solo cambia el estado de entrega: no se cobra nada ni se crea otra venta.`
                        : ''
                }
                textoConfirmar="Sí, avanzar"
                variante="primary"
                cargando={procesando}
                onConfirmar={confirmarCambio}
                onCerrar={() => setPendiente(null)}
            />

            <ConfirmarAccion
                abierto={Boolean(cancelacion)}
                titulo="Cancelar pedido"
                mensaje={
                    cancelacion
                        ? `¿Cancelar el pedido #${cancelacion.id_venta}? La entrega se detiene. Esto no genera reembolso: el dinero se devuelve con el flujo de Devoluciones.`
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
