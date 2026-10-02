import { useRef, useState } from 'react';

import { FaFloppyDisk } from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';

import { formatearMoneda } from '../../lib/utils/format';
import { guardarZonaDelivery } from './tarifasService';

const validarTarifa = (valor) => {
    const numero = Number(valor);
    return valor === '' || !Number.isFinite(numero) || numero < 0.01 || numero > 99999999.99 ||
        Math.abs(numero * 100 - Math.round(numero * 100)) > 0.00001
        ? 'Indica una tarifa positiva con hasta dos decimales' : '';
};

// Cada apertura usa la zona actual; una nueva zona no inventa una tarifa.
export default function TarifaEditModal({ zona, abierto, onCerrar, onActualizado }) {
    const [nombre, setNombre] = useState(zona?.nombre || '');
    const [estado, setEstado] = useState(String(zona?.estado ?? 1));
    const [tarifa, setTarifa] = useState(() =>
        zona ? Number(zona.tarifa).toFixed(2) : '',
    );
    const [errorCampo, setErrorCampo] = useState('');
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);
    const guardandoRef = useRef(false);

    if (!abierto) return null;

    const tarifaActual = zona ? Number(zona.tarifa) : null;
    const sinCambios = Boolean(zona) && nombre.trim() === zona.nombre &&
        Number(estado) === Number(zona.estado) && tarifa !== '' && Number(tarifa) === tarifaActual;

    const guardar = async (e) => {
        e.preventDefault();
        if (guardandoRef.current) return;
        const mensaje = validarTarifa(tarifa);
        setErrorCampo(mensaje);
        setError('');
        if (mensaje) return;
        if (!nombre.trim()) { setError('Indica el nombre de la zona'); return; }

        try {
            guardandoRef.current = true;
            setGuardando(true);
            const actualizado = await guardarZonaDelivery(zona?.id_zona, { nombre, tarifa, estado });
            if (onActualizado) await onActualizado(actualizado);
            onCerrar();
        } catch (err) {
            setError(err.response?.data?.mensaje || 'No se pudo guardar la zona de delivery');
        } finally {
            guardandoRef.current = false;
            setGuardando(false);
        }
    };

    return (
        <Modal
            abierto={abierto}
            titulo={zona ? `Zona de delivery · ${zona.nombre}` : 'Nueva zona de delivery'}
            subtitulo="Cobertura dentro de Pallasca. Los cambios solo se aplican a compras nuevas; las anteriores conservan su zona y costo."
            onCerrar={onCerrar}
        >
            {error && <div className="mb-5"><Alert tipo="error">{error}</Alert></div>}

            <form onSubmit={guardar} className="space-y-5">
                {zona && <div className="flex items-center justify-between rounded-xl border border-primary-200 bg-parchment-100 px-4 py-3">
                    <span className="text-sm text-slate-600">Tarifa actual</span>
                    <span className="font-title text-lg font-semibold tabular-nums text-slate-800">
                        {formatearMoneda(tarifaActual)}
                    </span>
                </div>}

                <div className="form-grid">
                    <Input ancho={12} label="Nombre de la zona" name="nombre" value={nombre}
                        maxLength={80} onChange={(e) => setNombre(e.target.value)} autoFocus required />
                    <Input
                        ancho={12}
                        prefijo="S/"
                        label="Tarifa de delivery"
                        name="tarifa"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="99999999.99"
                        inputMode="decimal"
                        value={tarifa}
                        error={errorCampo}
                        onChange={(e) => {
                            setTarifa(e.target.value);
                            setErrorCampo(validarTarifa(e.target.value));
                            setError('');
                        }}
                        required
                    />
                    <Select ancho={12} label="Estado de la zona" name="estado" value={estado}
                        onChange={(e) => setEstado(e.target.value)}>
                        <option value="1">Activa · disponible para delivery</option>
                        <option value="0">Inactiva · no disponible para nuevas compras</option>
                    </Select>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-primary-200 pt-5 sm:flex-row sm:justify-end">
                    <Button variante="secondary" type="button" onClick={onCerrar} disabled={guardando}>
                        Cancelar
                    </Button>
                    <Button type="submit" cargando={guardando} disabled={sinCambios || Boolean(errorCampo)}>
                        <FaFloppyDisk /> {guardando ? 'Guardando...' : 'Guardar zona'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
