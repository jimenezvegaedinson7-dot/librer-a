import { FaBuildingColumns, FaCreditCard, FaMobileScreenButton, FaMoneyBill } from 'react-icons/fa6';

import { Input } from '../../components/ui/Form';

import { METODOS_PAGO } from './metodosPago';

const ICONOS = {
    efectivo: <FaMoneyBill />,
    yape: <FaMobileScreenButton />,
    plin: <FaMobileScreenButton />,
    tarjeta: <FaCreditCard />,
    transferencia: <FaBuildingColumns />,
};

// Selector de método de cobro + referencia de la operación.
export default function SelectorCobro({ metodo, onMetodo, referencia, onReferencia, deshabilitado }) {
    const requiereReferencia = metodo && metodo !== 'efectivo';
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Método de pago">
                {METODOS_PAGO.map((m) => {
                    const activo = metodo === m.valor;
                    return (
                        <button
                            key={m.valor}
                            type="button"
                            role="radio"
                            aria-checked={activo}
                            onClick={() => onMetodo(m.valor)}
                            disabled={deshabilitado}
                            className={`venta-opcion ${activo ? 'venta-opcion--activa' : ''}`}
                        >
                            <span className="venta-opcion-icono" aria-hidden="true">{ICONOS[m.valor]}</span>
                            <span className="text-sm font-semibold text-slate-800">{m.texto}</span>
                        </button>
                    );
                })}
            </div>
            {requiereReferencia && (
                <Input
                    label="N.° de operación (opcional)"
                    type="text"
                    value={referencia}
                    onChange={(e) => onReferencia(e.target.value)}
                    maxLength={100}
                    placeholder="Ej. 123456"
                    disabled={deshabilitado}
                />
            )}
        </div>
    );
}
