import { FaArrowsRotate } from 'react-icons/fa6';

import { EstadoModal } from '../../components/ui/EstadoModal';
import { Badge } from '../../components/ui/Badge';

import { formatearMoneda } from '../../lib/utils/format';

import { cambiarEstadoVenta } from './ventasService';

const coloresEstado = {
    pendiente: 'warning',
    pagada: 'success',
    entregada: 'info',
    cancelada: 'danger',
};

function obtenerEstadosDisponibles(estadoActual) {
    switch (estadoActual) {
        case 'pendiente':
            return [
                { valor: 'pagada', texto: 'Pagada' },
                { valor: 'cancelada', texto: 'Cancelada' },
            ];
        case 'pagada':
            return [
                { valor: 'entregada', texto: 'Entregada' },
                { valor: 'cancelada', texto: 'Cancelada' },
            ];
        case 'entregada':
            return [];
        default:
            return [];
    }
}

export default function VentaEstadoModal({ venta, abierto, onCerrar, onActualizado }) {
    return (
        <EstadoModal
            abierto={abierto}
            onCerrar={onCerrar}
            onActualizado={onActualizado}
            id={venta?.id_venta}
            titulo="Cambiar estado"
            subtitulo={venta ? `Venta #${venta.id_venta}` : ''}
            estadoActual={venta?.estado}
            contexto={
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-bg text-warning">
                        <FaArrowsRotate />
                    </div>
                    <div className="rounded-xl border border-primary-200 bg-parchment-200 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-primary-400">Total de la venta</p>
                        <p className="mt-2 text-xl font-bold text-mahogany-700">{formatearMoneda(venta?.total)}</p>
                    </div>
                </div>
            }
            renderEstadoActual={() => <Badge color={coloresEstado[venta?.estado] || 'neutral'}>{venta?.estado}</Badge>}
            obtenerOpciones={obtenerEstadosDisponibles}
            mensajeSinOpciones="Esta venta ya está cerrada y no admite más cambios."
            aviso={(estado) =>
                estado === 'cancelada' && (
                    <div className="rounded-lg border border-crimson-200 bg-crimson-50 px-4 py-3">
                        <p className="text-sm font-semibold text-crimson-500">Cancelación de venta</p>
                        <p className="mt-1 text-xs leading-5 text-crimson-500">
                            Al cancelar la venta, el stock de los libros será devuelto automáticamente al inventario.
                        </p>
                    </div>
                )
            }
            guardar={cambiarEstadoVenta}
            mensajeError="Error al actualizar el estado de la venta"
        />
    );
}
