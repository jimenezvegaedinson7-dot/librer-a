import { FaUser, FaBook, FaCalendarDays, FaClock, FaCircleCheck, FaTriangleExclamation, FaCircleXmark } from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Ficha } from '../../components/ui/Ficha';

function formatearFecha(fecha) {
    if (!fecha) return 'Sin fecha';
    return new Date(fecha).toLocaleString('es-PE', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

function obtenerEstado(estado) {
    switch (estado) {
        case 'pendiente':
            return {
                texto: 'Pendiente',
                color: 'warning',
                icono: <FaTriangleExclamation className="text-amber-600" />,
            };
        case 'confirmada':
            return {
                texto: 'Confirmada',
                color: 'info',
                icono: <FaCircleCheck className="text-sky-600" />,
            };
        case 'cancelada':
            return {
                texto: 'Cancelada',
                color: 'danger',
                icono: <FaCircleXmark className="text-red-600" />,
            };
        case 'completada':
            return {
                texto: 'Completada',
                color: 'success',
                icono: <FaCircleCheck className="text-emerald-600" />,
            };
        default:
            return {
                texto: estado || 'Sin estado',
                color: 'neutral',
                icono: <FaCircleXmark className="text-slate-500" />,
            };
    }
}

export default function ReservaViewModal({ reserva, abierto, onCerrar }) {
    if (!abierto || !reserva) return null;

    const estado = obtenerEstado(reserva.estado);

    return (
        <Modal abierto={abierto} titulo="Detalle de la reserva" subtitulo="Información registrada en el sistema" onCerrar={onCerrar}>
            <div className="border-b border-slate-100 pb-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Reserva</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">Reserva #{reserva.id_reserva}</h3>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Ficha icono={<FaUser />} etiqueta="Usuario">
                    {reserva.nombre_usuario} {reserva.apellido_usuario}
                </Ficha>
                <Ficha icono={<FaBook />} etiqueta="Libro">
                    {reserva.titulo}
                </Ficha>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Ficha etiqueta="Cantidad">
                    <span className="text-2xl font-bold">{reserva.cantidad}</span>
                </Ficha>
                <Ficha icono={estado.icono} etiqueta="Estado">
                    <Badge color={estado.color}>{estado.texto}</Badge>
                </Ficha>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <FaCalendarDays /> Fecha de reserva
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-800">{formatearFecha(reserva.fecha_reserva)}</p>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <FaClock /> Fecha de vencimiento
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-800">{formatearFecha(reserva.fecha_vencimiento)}</p>
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
                <Button onClick={onCerrar}>Cerrar</Button>
            </div>
        </Modal>
    );
}
