import { FaUser, FaCalendarDays, FaMoneyBillWave, FaBook, FaLocationDot, FaShop, FaEnvelope, FaTruckFast, FaCashRegister, FaRotateLeft } from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Ficha } from '../../components/ui/Ficha';

import { formatearMoneda, formatearFecha } from '../../lib/utils/format';
import { textoMetodoPago, textoOrigen } from './metodosPago';

const estados = {
    pendiente: { texto: 'Pendiente', color: 'warning' },
    pagada: { texto: 'Pagada', color: 'success' },
    entregada: { texto: 'Entregada', color: 'info' },
    cancelada: { texto: 'Cancelada', color: 'danger' },
    reembolsada: { texto: 'Reembolsada', color: 'neutral' },
};

// Cómo se cobró: PayU en pedidos de la app; en tienda, el medio anotado.
function descripcionCobro(venta) {
    if (venta.origen === 'panel' || venta.origen === 'reserva') {
        const metodo = textoMetodoPago(venta.metodo_pago) || 'Sin registrar';
        return venta.referencia_pago ? `${metodo} · Op. ${venta.referencia_pago}` : metodo;
    }
    return venta.payu_order_id ? `PayU · Orden ${venta.payu_order_id}` : 'PayU';
}

function descripcionEntrega(venta) {
    if (venta.tipo_entrega === 'domicilio') return 'A domicilio';
    if (venta.tipo_entrega === 'agencia') return 'Agencia courier';
    if (venta.tipo_entrega === 'tienda') return 'Recoger en tienda';
    return 'Sin especificar';
}

function iconoEntrega(venta) {
    if (venta.tipo_entrega === 'domicilio') return <FaLocationDot />;
    if (venta.tipo_entrega === 'agencia') return <FaTruckFast />;
    return <FaShop />;
}

function ubicacionEntrega(venta) {
    const partes = [venta.distrito, venta.provincia].filter(Boolean);
    return partes.length > 0 ? partes.join(', ') : null;
}

export default function VentaViewModal({ venta, abierto, onCerrar }) {
    if (!abierto || !venta) return null;

    const estado = estados[venta.estado] || { texto: venta.estado || 'Sin estado', color: 'neutral' };
    const entrega = descripcionEntrega(venta);
    const ubicacion = ubicacionEntrega(venta);

    return (
        <Modal abierto={abierto} titulo="Detalle de la venta" subtitulo="Información completa de la venta" onCerrar={onCerrar} grande>
            <div className="border-b border-primary-200 pb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-700">Venta</p>
                <h3 className="mt-2 font-title text-[26px] font-semibold leading-tight tracking-[-0.015em] text-slate-900">Venta #{venta.id_venta}</h3>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Ficha color="violet" icono={<FaUser />} etiqueta="Cliente">
                    {venta.origen === 'panel'
                        ? venta.cliente_nombre || 'Cliente de mostrador'
                        : venta.cliente_nombre || `${venta.nombre_usuario || ''} ${venta.apellido_usuario || ''}`.trim()}
                    {venta.cliente_documento && (
                        <span className="block text-xs font-normal text-slate-500">
                            {venta.cliente_tipo_documento || 'Doc.'} {venta.cliente_documento}
                        </span>
                    )}
                </Ficha>
                <Ficha color="violet" icono={<FaCalendarDays />} etiqueta="Fecha de venta">
                    <span className="text-sm">{formatearFecha(venta.fecha_venta) || 'Sin fecha'}</span>
                </Ficha>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Ficha color="violet" icono={iconoEntrega(venta)} etiqueta="Tipo de entrega">
                    {entrega}
                </Ficha>
                <Ficha color="violet" icono={<FaEnvelope />} etiqueta="Correo de la compra">
                    {venta.correo_compra || (venta.origen === 'panel' ? '' : venta.correo_usuario) || 'Sin correo'}
                </Ficha>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Ficha color="violet" icono={<FaCashRegister />} etiqueta={`Origen: ${textoOrigen(venta)}`}>
                    {descripcionCobro(venta)}
                    {venta.fecha_pago && (
                        <span className="block text-xs font-normal text-slate-500">Cobrada el {formatearFecha(venta.fecha_pago)}</span>
                    )}
                </Ficha>
                {venta.origen === 'panel' && venta.nombre_usuario && (
                    <Ficha color="violet" icono={<FaUser />} etiqueta="Registrada por">
                        {venta.nombre_usuario} {venta.apellido_usuario}
                    </Ficha>
                )}
            </div>

            {venta.estado === 'reembolsada' && (
                <div className="mt-4 rounded-xl border border-slate-300 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <FaRotateLeft /> Reembolsada{venta.fecha_reembolso ? ` el ${formatearFecha(venta.fecha_reembolso)}` : ''}
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{venta.motivo_reembolso || 'Sin motivo registrado'}</p>
                </div>
            )}

            {venta.tipo_entrega === 'domicilio' && (
                <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
                        <FaLocationDot /> Dirección de envío
                    </div>
                    <p className="mt-2 text-sm font-semibold text-indigo-900">{venta.direccion || 'Sin dirección registrada'}</p>
                    {ubicacion && (
                        <p className="mt-1 text-xs font-semibold text-indigo-700">{ubicacion}</p>
                    )}
                </div>
            )}

            {venta.tipo_entrega === 'agencia' && (
                <div className="mt-4 rounded-xl border border-warning/20 bg-warning-bg p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-warning">
                        <FaTruckFast /> Envío a agencia
                    </div>
                    <p className="mt-2 text-sm font-semibold text-amber-900">{venta.agencia || 'Sin agencia seleccionada'}</p>
                </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-primary-200 bg-parchment-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary-500">
                        <FaMoneyBillWave /> Total
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-slate-700">{formatearMoneda(venta.total)}</p>
                    {Number(venta.costo_envio || 0) > 0 && (
                        <p className="mt-1 text-xs text-slate-500">
                            Incluye envío: {formatearMoneda(venta.costo_envio)}
                        </p>
                    )}
                </div>

                <div className="rounded-xl border border-primary-200 bg-parchment-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary-500">
                        Estado
                    </div>
                    <div className="mt-3">
                        <Badge color={estado.color}>{estado.texto}</Badge>
                    </div>
                </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border-2 border-primary-200">
                <div className="flex items-center gap-2 border-b-2 border-primary-200 bg-parchment-300 px-5 py-4">
                    <FaBook className="text-primary-500" />
                    <h3 className="font-title text-[17px] font-semibold text-slate-900">Libros vendidos</h3>
                </div>

                {Array.isArray(venta.detalles) && venta.detalles.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-parchment-200">
                                <tr className="border-b-2 border-primary-300">
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-700">Libro</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-700">Precio</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-700">Cantidad</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-700">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-primary-200">
                                {venta.detalles.map((detalle) => (
                                    <tr key={detalle.id_detalle} className="hover:bg-parchment-200">
                                        <td className="px-4 py-4 text-sm font-semibold text-slate-700">{detalle.titulo}</td>
                                        <td className="px-4 py-4 text-center text-sm text-slate-700">{formatearMoneda(detalle.precio_unitario)}</td>
                                        <td className="px-4 py-4 text-center text-sm font-semibold text-slate-700">{detalle.cantidad}</td>
                                        <td className="px-4 py-4 text-center text-sm font-bold text-slate-700">{formatearMoneda(detalle.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="px-5 py-8 text-center text-sm text-primary-500">No hay detalles registrados para esta venta.</div>
                )}
            </div>

            <div className="mt-6 flex justify-end border-t border-primary-200 pt-5">
                <Button variante="secondary" onClick={onCerrar}>Cerrar</Button>
            </div>
        </Modal>
    );
}
