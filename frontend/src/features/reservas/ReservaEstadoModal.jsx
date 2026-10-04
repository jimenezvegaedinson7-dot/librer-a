import { useCallback, useEffect, useState } from 'react';

import { EstadoModal } from '../../components/ui/EstadoModal';
import { formatearMoneda } from '../../lib/utils/format';

import { actualizarEstadoReserva } from './reservasService';
import SelectorCobro from '../ventas/SelectorCobro';
import { obtenerLibro } from '../libros/librosService';
import { precioReserva } from './precioReserva';

function obtenerEstadosDisponibles(estadoActual) {
    switch (estadoActual) {
        case 'pendiente':
            return [
                { valor: 'confirmada', texto: 'Confirmada' },
                { valor: 'cancelada', texto: 'Cancelada' },
            ];
        case 'confirmada':
            return [
                { valor: 'completada', texto: 'Completada (recogió y pagó)' },
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
    // Se monta al abrirla (ReservasPage): el cobro empieza vacío.
    const [metodo, setMetodo] = useState('');
    const [referencia, setReferencia] = useState('');
    const [precio, setPrecio] = useState(null);
    const [errorPrecio, setErrorPrecio] = useState('');
    const idLibro = reserva?.id_libro;
    useEffect(() => {
        if (!abierto || reserva?.estado !== 'confirmada') return undefined;
        let vigente = true;
        obtenerLibro(reserva.id_libro).then(libro => {
            const actual = precioReserva(libro);
            if (vigente) { setPrecio(actual); setErrorPrecio(''); }
        }).catch(err => { if (vigente) setErrorPrecio(err.message || 'No se pudo consultar el importe de cobro'); });
        return () => { vigente = false; };
    }, [abierto, reserva?.id_libro, reserva?.estado]);

    // Completar exige el cobro: el backend registra la venta en la misma operación.
    const guardar = useCallback(
        async (id, estado) => {
            if (estado === 'completada' && !metodo) {
                return Promise.reject({ response: { data: { mensaje: 'Indica cómo pagó el cliente' } } });
            }
            let esperado;
            if (estado === 'completada') {
                esperado = precioReserva(await obtenerLibro(idLibro));
                if (precio === null || esperado !== precio) {
                    setPrecio(esperado); setErrorPrecio('');
                    throw { response: { data: { mensaje: 'El importe se actualizó. Revisa el nuevo total antes de confirmar el cobro.' } } };
                }
            }
            return actualizarEstadoReserva(id, estado, { metodo, referencia: metodo !== 'efectivo' ? referencia.trim() : '', precio_unitario_esperado: esperado });
        },
        [metodo, referencia, precio, idLibro],
    );

    const importe = precio === null ? null : precio * Number(reserva?.cantidad || 0);

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
                    {reserva?.cantidad && (
                        <p className="mt-1 text-xs text-slate-500">
                            {reserva.cantidad} {Number(reserva.cantidad) === 1 ? 'unidad' : 'unidades'}
                            {importe !== null ? ` · ${formatearMoneda(importe)}` : ''}
                        </p>
                    )}
                </div>
            }
            renderEstadoActual={() => <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${colorEstadoActual(reserva?.estado)}`}>{reserva?.estado}</span>}
            obtenerOpciones={obtenerEstadosDisponibles}
            mensajeSinOpciones="Esta reserva ya está cerrada y no admite más cambios."
            aviso={(estado) =>
                estado === 'completada' ? (
                    <div className="space-y-2">
                        <p className="text-sm" role="status">{errorPrecio || (importe === null ? 'Consultando el precio final vigente…' : `Importe de cobro: ${formatearMoneda(importe)}`)}</p>
                        <p className="field-label">¿Cómo pagó el cliente?</p>
                        <SelectorCobro metodo={metodo} onMetodo={setMetodo} referencia={referencia} onReferencia={setReferencia} />
                        <p className="text-xs text-slate-500">Se registrará la venta ya cobrada, a nombre del cliente de la reserva.</p>
                    </div>
                ) : null
            }
            guardar={guardar}
            mensajeError="Error al actualizar el estado de la reserva"
        />
    );
}
