import { useState } from 'react';

import { FaFloppyDisk } from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';

import { formatearMoneda } from '../../lib/utils/format';
import { numeroNoNegativo, requerido } from '../../lib/utils/validaciones';
import { actualizarTarifaDistrito } from './tarifasService';

const validarTarifa = (valor) =>
    requerido(valor, 'La tarifa de envío') || numeroNoNegativo(valor, 'La tarifa de envío');

// El padre le da un `key` por distrito: cada apertura parte de la tarifa
// actual sin necesidad de reiniciar el estado con un efecto.
export default function TarifaEditModal({ distrito, abierto, onCerrar, onActualizado }) {
    const [tarifa, setTarifa] = useState(() =>
        distrito ? Number(distrito.tarifa_envio || 0).toFixed(2) : '',
    );
    const [errorCampo, setErrorCampo] = useState('');
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);

    if (!abierto || !distrito) return null;

    const tarifaActual = Number(distrito.tarifa_envio || 0);
    const sinCambios = tarifa !== '' && Number(tarifa) === tarifaActual;

    const guardar = async (e) => {
        e.preventDefault();
        const mensaje = validarTarifa(tarifa);
        setErrorCampo(mensaje);
        setError('');
        if (mensaje) return;

        try {
            setGuardando(true);
            const actualizado = await actualizarTarifaDistrito(distrito.id_distrito, tarifa);
            if (onActualizado) await onActualizado(actualizado);
            onCerrar();
        } catch (err) {
            setError(err.response?.data?.mensaje || 'No se pudo actualizar la tarifa de envío');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal
            abierto={abierto}
            titulo={`Tarifa de envío · ${distrito.nombre}`}
            subtitulo="El nuevo precio se aplica a los pedidos a domicilio desde ahora. Las ventas ya realizadas conservan su costo de envío."
            onCerrar={onCerrar}
        >
            {error && <div className="mb-5"><Alert tipo="error">{error}</Alert></div>}

            <form onSubmit={guardar} className="space-y-5">
                <div className="flex items-center justify-between rounded-xl border border-primary-200 bg-parchment-100 px-4 py-3">
                    <span className="text-sm text-slate-600">Tarifa actual</span>
                    <span className="font-title text-lg font-semibold tabular-nums text-slate-800">
                        {formatearMoneda(tarifaActual)}
                    </span>
                </div>

                <div className="form-grid">
                    <Input
                        ancho={12}
                        prefijo="S/"
                        label="Nueva tarifa de envío"
                        name="tarifa_envio"
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        value={tarifa}
                        error={errorCampo}
                        onChange={(e) => {
                            setTarifa(e.target.value);
                            setErrorCampo(validarTarifa(e.target.value));
                            setError('');
                        }}
                        autoFocus
                        required
                    />
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-primary-200 pt-5 sm:flex-row sm:justify-end">
                    <Button variante="secondary" type="button" onClick={onCerrar} disabled={guardando}>
                        Cancelar
                    </Button>
                    <Button type="submit" cargando={guardando} disabled={sinCambios || Boolean(errorCampo)}>
                        <FaFloppyDisk /> {guardando ? 'Guardando...' : 'Guardar tarifa'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
