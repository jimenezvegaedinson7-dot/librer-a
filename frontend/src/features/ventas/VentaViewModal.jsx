import { FaUser, FaCalendarDays, FaMoneyBillWave, FaBook, FaLocationDot, FaShop, FaEnvelope, FaTruckFast } from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Ficha } from '../../components/ui/Ficha';

import { formatearMoneda, formatearFecha } from '../../lib/utils/format';

const estados = {
    pendiente: { texto: 'Pendiente', color: 'warning' },
    pagada: { texto: 'Pagada', color: 'success' },
    entregada: { texto: 'Entregada', color: 'info' },
    cancelada: { texto: 'Cancelada', color: 'danger' },
};

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
            <div className="border-b border-slate-100 pb-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Venta</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">Venta #{venta.id_venta}</h3>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Ficha icono={<FaUser />} etiqueta="Usuario">
                    {venta.nombre_usuario} {venta.apellido_usuario}
                </Ficha>
                <Ficha icono={<FaCalendarDays />} etiqueta="Fecha de venta">
                    <span className="text-sm">{formatearFecha(venta.fecha_venta) || 'Sin fecha'}</span>
                </Ficha>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Ficha icono={iconoEntrega(venta)} etiqueta="Tipo de entrega">
                    {entrega}
                </Ficha>
                <Ficha icono={<FaEnvelope />} etiqueta="Correo de la compra">
                    {venta.correo_compra || venta.correo_usuario || 'Sin correo'}
                </Ficha>
            </div>

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
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                        <FaTruckFast /> Envío a agencia
                    </div>
                    <p className="mt-2 text-sm font-semibold text-amber-900">{venta.agencia || 'Sin agencia seleccionada'}</p>
                </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                        <FaMoneyBillWave /> Total
                    </div>
                    <p className="mt-2 text-2xl font-bold text-emerald-800">{formatearMoneda(venta.total)}</p>
                    {Number(venta.costo_envio || 0) > 0 && (
                        <p className="mt-1 text-xs text-emerald-700">
                            Incluye envío: {formatearMoneda(venta.costo_envio)}
                        </p>
                    )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                        Estado
                    </div>
                    <div className="mt-3">
                        <Badge color={estado.color}>{estado.texto}</Badge>
                    </div>
                </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border-2 border-slate-300">
                <div className="flex items-center gap-2 border-b-2 border-slate-300 bg-slate-100 px-5 py-4">
                    <FaBook className="text-slate-600" />
                    <h3 className="font-bold text-slate-800">Libros vendidos</h3>
                </div>

                {Array.isArray(venta.detalles) && venta.detalles.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50">
                                <tr className="border-b-2 border-slate-400">
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-700">Libro</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-700">Precio</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-700">Cantidad</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-700">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-300">
                                {venta.detalles.map((detalle) => (
                                    <tr key={detalle.id_detalle} className="hover:bg-slate-50">
                                        <td className="px-4 py-4 text-sm font-semibold text-slate-800">{detalle.titulo}</td>
                                        <td className="px-4 py-4 text-center text-sm text-slate-700">{formatearMoneda(detalle.precio_unitario)}</td>
                                        <td className="px-4 py-4 text-center text-sm font-semibold text-slate-700">{detalle.cantidad}</td>
                                        <td className="px-4 py-4 text-center text-sm font-bold text-slate-900">{formatearMoneda(detalle.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="px-5 py-8 text-center text-sm text-slate-600">No hay detalles registrados para esta venta.</div>
                )}
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
                <Button onClick={onCerrar}>Cerrar</Button>
            </div>
        </Modal>
    );
}
