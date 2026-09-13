import { EstadoModal } from '../../components/ui/EstadoModal';

import { actualizarEstadoReserva } from './reservasService';

function obtenerEstadosDisponibles(estadoActual) {
    switch (estadoActual) {
        case 'pendiente':
            return [
                { valor: 'confirmada', texto: 'Confirmada' },
                { valor: 'cancelada', texto: 'Cancelada' },
            ];
        case 'confirmada':
            return [
                { valor: 'completada', texto: 'Completada' },
                { valor: 'cancelada', texto: 'Cancelada' },
            ];
        default:
            return [];
    }
}

function colorEstadoActual(estado) {
    switch (estado) {
        case 'pendiente':
            return 'bg-amber-100 text-amber-700';
        case 'confirmada':
            return 'bg-sky-100 text-sky-700';
        case 'cancelada':
            return 'bg-red-100 text-red-700';
        case 'completada':
            return 'bg-emerald-100 text-emerald-700';
        default:
            return 'bg-slate-200 text-slate-700';
    }
}

export default function ReservaEstadoModal({ reserva, abierto, onCerrar, onActualizado }) {
    return (
        <EstadoModal
            abierto={abierto}
            onCerrar={onCerrar}
            onActualizado={onActualizado}
            id={reserva?.id_reserva}
            titulo="Cambiar estado"
            subtitulo={reserva ? `Reserva #${reserva.id_reserva}` : ''}
            estadoActual={reserva?.estado}
            contexto={
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Libro</p>
                    <p className="mt-2 font-semibold text-slate-800">{reserva?.titulo}</p>
                </div>
            }
            renderEstadoActual={() => <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${colorEstadoActual(reserva?.estado)}`}>{reserva?.estado}</span>}
            obtenerOpciones={obtenerEstadosDisponibles}
            mensajeSinOpciones="Esta reserva ya está cerrada y no admite más cambios."
            guardar={actualizarEstadoReserva}
            mensajeError="Error al actualizar el estado de la reserva"
        />
    );
}
