import {
    FaUser,
    FaEnvelope,
    FaTruckFast,
    FaMoneyBillWave,
    FaReceipt,
    FaBarcode,
    FaIdBadge,
    FaCreditCard,
    FaClockRotateLeft,
    FaTag,
} from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Ficha } from '../../components/ui/Ficha';

import { formatearMoneda, formatearFecha } from '../../lib/utils/format';

const estadosVenta = {
    pendiente: { texto: 'Pendiente', color: 'warning' },
    pagada: { texto: 'Pagada', color: 'success' },
    entregada: { texto: 'Entregada', color: 'info' },
    cancelada: { texto: 'Cancelada', color: 'danger' },
};

const estadosPago = {
    approved: { texto: 'Aprobado', color: 'success' },
    pending: { texto: 'Pendiente', color: 'warning' },
    in_process: { texto: 'En proceso', color: 'warning' },
    rejected: { texto: 'Rechazado', color: 'danger' },
    refunded: { texto: 'Reembolsado', color: 'warning' },
    cancelled: { texto: 'Cancelado', color: 'neutral' },
};

function estadoPagoBadge(estado) {
    const dato = estadosPago[estado] || estadosPago[estado?.toLowerCase()];
    return <Badge color={dato?.color || 'neutral'}>{dato?.texto || estado || 'Sin pago'}</Badge>;
}

function entregaBadge(tipo) {
    switch (tipo) {
        case 'domicilio':
            return <Badge color="primary">A domicilio</Badge>;
        case 'agencia':
            return <Badge color="warning">Agencia courier</Badge>;
        case 'tienda':
            return <Badge color="neutral">Recoger en tienda</Badge>;
        default:
            return <Badge color="neutral">Sin especificar</Badge>;
    }
}

export default function PagoViewModal({ pago, abierto, onCerrar }) {
    if (!abierto || !pago) return null;

    const estado = estadosVenta[pago.estado_venta] || {
        texto: pago.estado_venta || 'Sin estado',
        color: 'neutral',
    };
    const cliente = pago.cliente || {};

    return (
        <Modal abierto={abierto} titulo="Detalle del pago" subtitulo="Información completa del pago y la venta" onCerrar={onCerrar} grande>
            <div className="border-b border-primary-200 pb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-700">Pago</p>
                <h3 className="mt-2 font-title text-[26px] font-semibold leading-tight tracking-[-0.015em] text-slate-900">Pago de la venta #{pago.id_venta}</h3>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Ficha color="amber" icono={<FaUser />} etiqueta="Cliente">
                    {cliente.nombre_completo || 'Sin nombre'}
                </Ficha>
                <Ficha color="amber" icono={<FaEnvelope />} etiqueta="Correo">
                    {cliente.email || 'Sin correo'}
                </Ficha>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Ficha color="amber" icono={<FaTruckFast />} etiqueta="Tipo de entrega">
                    {entregaBadge(pago.tipo_entrega)}
                </Ficha>
                <Ficha color="amber" icono={<FaCreditCard />} etiqueta="Método de pago">
                    {pago.metodo_pago || 'Sin método'}
                </Ficha>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-primary-200 bg-parchment-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary-500">
                        <FaMoneyBillWave /> Monto total
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-slate-700">{formatearMoneda(pago.monto_total)}</p>
                </div>

                <div className="rounded-xl border border-primary-200 bg-parchment-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary-500">
                        <FaClockRotateLeft /> Fecha
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                        {formatearFecha(pago.fecha_creacion) || 'Sin fecha'}
                    </p>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-primary-200 bg-parchment-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary-500">
                        <FaTag /> Estado de la venta
                    </div>
                    <div className="mt-3">
                        <Badge color={estado.color}>{estado.texto}</Badge>
                    </div>
                </div>

                <div className="rounded-xl border border-primary-200 bg-parchment-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary-500">
                        <FaReceipt /> Estado del pago
                    </div>
                    <div className="mt-3">{estadoPagoBadge(pago.estado_pago)}</div>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Ficha color="amber" icono={<FaIdBadge />} etiqueta="Referencias de la venta">
                    <div className="space-y-2">
                        <p className="text-sm">Venta #{pago.id_venta}</p>
                        {pago.id_pago && (
                            <p className="text-xs font-normal text-primary-500">
                                Transacción PayU <span className="font-semibold text-slate-700">{pago.id_pago}</span>
                            </p>
                        )}
                        <p className="text-xs font-normal text-primary-500">
                            Cliente <span className="font-semibold text-slate-700">#{cliente.id_usuario || '—'}</span>
                        </p>
                    </div>
                </Ficha>

                <Ficha color="amber" icono={<FaBarcode />} etiqueta="Referencia externa / orden PayU">
                    <div className="space-y-2">
                        <p className="break-all text-sm" title={pago.external_reference}>
                            {pago.external_reference || 'Sin referencia'}
                        </p>
                        <p className="break-all text-xs font-normal text-primary-500" title={pago.payu_order_id}>
                            {pago.payu_order_id || 'Sin orden PayU'}
                        </p>
                    </div>
                </Ficha>
            </div>

            <div className="mt-6 flex justify-end border-t border-primary-200 pt-5">
                <Button variante="secondary" onClick={onCerrar}>Cerrar</Button>
            </div>
        </Modal>
    );
}
