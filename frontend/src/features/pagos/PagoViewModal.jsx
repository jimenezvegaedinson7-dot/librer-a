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
            <div className="border-b border-slate-100 pb-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Pago</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">Pago #{pago.id_pago}</h3>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Ficha icono={<FaUser />} etiqueta="Cliente">
                    {cliente.nombre_completo || 'Sin nombre'}
                </Ficha>
                <Ficha icono={<FaEnvelope />} etiqueta="Correo">
                    {cliente.email || 'Sin correo'}
                </Ficha>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Ficha icono={<FaTruckFast />} etiqueta="Tipo de entrega">
                    {entregaBadge(pago.tipo_entrega)}
                </Ficha>
                <Ficha icono={<FaCreditCard />} etiqueta="Método de pago">
                    {pago.metodo_pago || 'Sin método'}
                </Ficha>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                        <FaMoneyBillWave /> Monto total
                    </div>
                    <p className="mt-2 text-2xl font-bold text-emerald-800">{formatearMoneda(pago.monto_total)}</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                        <FaClockRotateLeft /> Fecha
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                        {formatearFecha(pago.fecha_creacion) || 'Sin fecha'}
                    </p>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                        <FaTag /> Estado de la venta
                    </div>
                    <div className="mt-3">
                        <Badge color={estado.color}>{estado.texto}</Badge>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                        <FaReceipt /> Estado del pago
                    </div>
                    <div className="mt-3">{estadoPagoBadge(pago.estado_pago)}</div>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Ficha icono={<FaIdBadge />} etiqueta="Referencias de la venta">
                    <div className="space-y-2">
                        <p className="text-sm">Venta #{pago.id_venta}</p>
                        <p className="text-xs font-normal text-slate-600">
                            Cliente <span className="font-semibold text-slate-700">#{cliente.id_usuario || '—'}</span>
                        </p>
                    </div>
                </Ficha>

                <Ficha icono={<FaBarcode />} etiqueta="Referencia externa / preferencia MP">
                    <div className="space-y-2">
                        <p className="break-all text-sm" title={pago.external_reference}>
                            {pago.external_reference || 'Sin referencia'}
                        </p>
                        <p className="break-all text-xs font-normal text-slate-600" title={pago.mp_preference_id}>
                            {pago.mp_preference_id || 'Sin preferencia MP'}
                        </p>
                    </div>
                </Ficha>
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
                <Button onClick={onCerrar}>Cerrar</Button>
            </div>
        </Modal>
    );
}