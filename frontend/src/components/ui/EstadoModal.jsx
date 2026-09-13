import { useEffect, useState } from 'react';

import { FaFloppyDisk } from 'react-icons/fa6';

import { Modal } from './Modal';
import { Button } from './Button';
import { Select } from './Form';
import { Alert } from './Alert';

export function EstadoModal({
    abierto,
    onCerrar,
    onActualizado,
    id,
    titulo,
    subtitulo,
    contexto,
    estadoActual,
    renderEstadoActual,
    obtenerOpciones,
    mensajeSinOpciones,
    aviso,
    guardar,
    mensajeError,
}) {
    const [estado, setEstado] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    const opciones = obtenerOpciones ? obtenerOpciones(estadoActual) : [];

    useEffect(() => {
        if (!abierto) return;
        const disponibles = obtenerOpciones ? obtenerOpciones(estadoActual) : [];
        setEstado(disponibles.length > 0 ? disponibles[0].valor : '');
        setError('');
    }, [abierto, estadoActual, obtenerOpciones]);

    if (!abierto) return null;

    const enviar = async (e) => {
        e.preventDefault();
        if (!estado) {
            setError('No hay un estado disponible');
            return;
        }
        try {
            setGuardando(true);
            setError('');
            const respuesta = await guardar(id, estado);
            if (onActualizado) await onActualizado(respuesta?.mensaje);
            onCerrar();
        } catch (err) {
            setError(err.response?.data?.mensaje || mensajeError || 'Error al actualizar el estado');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal abierto={abierto} titulo={titulo || 'Cambiar estado'} subtitulo={subtitulo} onCerrar={onCerrar}>
            {contexto}

            <form onSubmit={enviar} className="mt-4 space-y-3">
                <div>
                    <label className="field-label">Estado actual</label>
                    <div className="mt-2">{renderEstadoActual ? renderEstadoActual() : <span className="capitalize">{estadoActual}</span>}</div>
                </div>

                <div>
                    {opciones.length > 0 ? (
                        <Select label="Nuevo estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
                            {opciones.map((opcion) => (
                                <option key={opcion.valor} value={opcion.valor}>
                                    {opcion.texto}
                                </option>
                            ))}
                        </Select>
                    ) : (
                        <div>
                            <label className="field-label">Nuevo estado</label>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                {mensajeSinOpciones || 'Ya no admite más cambios.'}
                            </div>
                        </div>
                    )}
                </div>

                {typeof aviso === 'function' ? aviso(estado) : aviso}

                {error && <Alert tipo="error">{error}</Alert>}

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                    <Button variante="secondary" type="button" onClick={onCerrar} disabled={guardando}>
                        Cancelar
                    </Button>
                    {opciones.length > 0 && (
                        <Button type="submit" cargando={guardando}>
                            <FaFloppyDisk /> {guardando ? 'Guardando...' : 'Guardar cambio'}
                        </Button>
                    )}
                </div>
            </form>
        </Modal>
    );
}
