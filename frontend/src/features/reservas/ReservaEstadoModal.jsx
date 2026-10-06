import { EstadoModal } from '../../components/ui/EstadoModal';
import { actualizarEstadoReserva } from './reservasService';

const opciones = estado => ['pendiente', 'confirmada'].includes(estado)
    ? [{ valor: 'cancelada', texto: 'Cancelar y liberar stock' }] : [];

export default function ReservaEstadoModal({ reserva, abierto, onCerrar, onActualizado }) {
    return <EstadoModal abierto={abierto} onCerrar={onCerrar} onActualizado={onActualizado}
        id={reserva?.id_reserva} titulo="Cancelar reserva histórica" subtitulo={reserva?.titulo}
        estadoActual={reserva?.estado} obtenerOpciones={opciones}
        mensajeSinOpciones="Esta reserva está cerrada y solo admite consulta."
        aviso={() => 'La cancelación libera el stock apartado una sola vez. No genera ventas ni cobros.'}
        guardar={(id, estado) => actualizarEstadoReserva(id, estado)} mensajeError="No se pudo cancelar la reserva" />;
}
