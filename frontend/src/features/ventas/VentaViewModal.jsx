import { FaUser, FaCalendarDays, FaMoneyBillWave, FaBook, FaLocationDot, FaShop, FaEnvelope, FaTruckFast, FaCashRegister, FaRotateLeft } from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Ficha } from '../../components/ui/Ficha';

import { formatearMoneda, formatearFecha } from '../../lib/utils/format';
import { textoMetodoPago, textoOrigen } from './metodosPago';
import { correoVisible } from '../../lib/utils/cuentas';
import { descripcionEntrega, ubicacionEntrega } from '../../lib/utils/entrega';

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

function iconoEntrega(venta) {
    if (venta.tipo_entrega === 'domicilio') return <FaLocationDot />;
    if (venta.tipo_entrega === 'agencia') return <FaTruckFast />;
    return <FaShop />;
}

export default function VentaViewModal({ venta, abierto, onCerrar }) {
    if (!abierto || !venta) return null;

    const estado = estados[venta.estado] || { texto: venta.estado || 'Sin estado', color: 'neutral' };
    const entrega = descripcionEntrega(venta);
    const ubicacion = ubicacionEntrega(venta);

    return (
        <Modal abierto={abierto} titulo="Detalle de la venta" subtitulo="Información completa de la operación" onCerrar={onCerrar} grande>
            <div className="flex items-center justify-between gap-3 border-b border-primary-200 pb-3">
                <h3 className="font-title text-[20px] font-semibold leading-tight text-slate-900">Venta #{venta.id_venta}</h3>
                <Badge color={estado.color}>{estado.texto}</Badge>
            </div>

            <div className="mt-2 grid grid-cols-1 gap-x-8 md:grid-cols-2">
                <Ficha icono={<FaUser />} etiqueta="Cliente">
                    {venta.origen === 'panel'
                        ? venta.cliente_nombre || 'Cliente de mostrador'
                        : venta.cliente_nombre || `${venta.nombre_usuario || ''} ${venta.apellido_usuario || ''}`.trim()}
                    {venta.cliente_documento && (
                        <span className="block text-xs font-normal text-slate-500">
                            {venta.cliente_tipo_documento || 'Doc.'} {venta.cliente_documento}
                        </span>
                    )}
                </Ficha>
                <Ficha icono={<FaCalendarDays />} etiqueta="Fecha de venta">
                    {formatearFecha(venta.fecha_venta) || 'Sin fecha'}
                </Ficha>
                <Ficha icono={iconoEntrega(venta)} etiqueta="Tipo de entrega">
                    {entrega}
                </Ficha>
                <Ficha icono={<FaEnvelope />} etiqueta="Correo de la compra">
                    <span className="break-all">{correoVisible(venta.correo_compra) || (venta.origen === 'panel' ? '' : correoVisible(venta.correo_usuario)) || 'Sin correo'}</span>
                </Ficha>
                <Ficha icono={<FaCashRegister />} etiqueta={`Origen: ${textoOrigen(venta)}`}>
                    {descripcionCobro(venta)}
                    {venta.fecha_pago && (
                        <span className="block text-xs font-normal text-slate-500">Cobrada el {formatearFecha(venta.fecha_pago)}</span>
                    )}
                </Ficha>
                {venta.origen === 'panel' && venta.nombre_usuario && (
                    <Ficha icono={<FaUser />} etiqueta="Registrada por">
                        {venta.nombre_usuario} {venta.apellido_usuario}
                    </Ficha>
                )}
                {venta.tipo_entrega === 'domicilio' && (
                    <div className="md:col-span-2">
                        <Ficha icono={<FaLocationDot />} etiqueta="Dirección de envío">
                            <span className="block">{venta.direccion || 'Sin dirección registrada'}</span>
                            {ubicacion && <span className="block text-xs font-normal text-slate-500">{ubicacion}</span>}
                            {venta.referencia && <span className="block text-xs font-normal text-slate-500">Referencia: {venta.referencia}</span>}
                        </Ficha>
                    </div>
                )}
                {venta.tipo_entrega === 'agencia' && (
                    <div className="md:col-span-2">
                        <Ficha icono={<FaTruckFast />} etiqueta="Envío a agencia">
                            {venta.agencia || 'Sin agencia seleccionada'}
                        </Ficha>
                    </div>
                )}
                {venta.estado === 'reembolsada' && (
                    <div className="md:col-span-2">
                        <Ficha icono={<FaRotateLeft />} etiqueta={`Reembolsada${venta.fecha_reembolso ? ` el ${formatearFecha(venta.fecha_reembolso)}` : ''}`}>
                            <span className="font-normal">{venta.motivo_reembolso || 'Sin motivo registrado'}</span>
                        </Ficha>
                    </div>
                )}
            </div>

            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-primary-200 py-4">
                <div>
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
                        <FaMoneyBillWave aria-hidden="true" /> Total
                    </p>
                    <p className="mt-1 text-[26px] font-bold leading-none text-slate-900">{formatearMoneda(venta.total)}</p>
                </div>
                {(venta.cobertura_entrega === 'pallasca' || Number(venta.costo_envio || 0) > 0) && (
                    <p className="text-[13px] text-slate-500">
                        Incluye envío: {formatearMoneda(venta.costo_envio)}
                    </p>
                )}
            </div>

            <div className="pt-4">
                <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
                    <FaBook aria-hidden="true" /> Libros vendidos
                </h3>

                {Array.isArray(venta.detalles) && venta.detalles.length > 0 ? (
                    <div className="mt-2 overflow-x-auto">
                        <table className="min-w-full text-[13px]">
                            <thead>
                                <tr className="border-b border-primary-200 text-[11px] uppercase tracking-[0.05em] text-slate-500">
                                    <th className="py-2 pr-4 text-left font-bold">Libro</th>
                                    <th className="px-4 py-2 text-right font-bold">Precio</th>
                                    <th className="px-4 py-2 text-center font-bold">Cantidad</th>
                                    <th className="py-2 pl-4 text-right font-bold">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-primary-200">
                                {venta.detalles.map((detalle) => (
                                    <tr key={detalle.id_detalle}>
                                        <td className="py-2.5 pr-4 font-semibold text-slate-800">{detalle.titulo}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{formatearMoneda(detalle.precio_unitario)}</td>
                                        <td className="px-4 py-2.5 text-center tabular-nums text-slate-700">{detalle.cantidad}</td>
                                        <td className="py-2.5 pl-4 text-right font-semibold tabular-nums text-slate-900">{formatearMoneda(detalle.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="py-6 text-center text-sm text-primary-500">No hay detalles registrados para esta venta.</p>
                )}
            </div>

            <div className="mt-5 flex justify-end border-t border-primary-200 pt-4">
                <Button variante="secondary" onClick={onCerrar}>Cerrar</Button>
            </div>
        </Modal>
    );
}
