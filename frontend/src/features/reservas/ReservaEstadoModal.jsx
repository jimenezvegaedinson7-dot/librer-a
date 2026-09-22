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
            return 'bg-warning-bg text-warning';
        case 'confirmada':
            return 'bg-sky-100 text-sky-700';
        case 'cancelada':
            return 'bg-crimson-100 text-crimson-500';
        case 'completada':
            return 'bg-success-bg text-success';
        default:
            return 'bg-parchment-400 text-slate-700';
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
                <div className="rounded-xl border border-primary-200 bg-parchment-200 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Libro</p>
                    <p className="mt-2 font-semibold text-slate-700">{reserva?.titulo}</p>
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
