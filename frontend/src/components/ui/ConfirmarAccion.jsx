import { FaCircleQuestion } from 'react-icons/fa6';

import { Modal } from './Modal';
import { Button } from './Button';

export function ConfirmarAccion({
    abierto,
    titulo,
    mensaje,
    advertencia = null,
    icono = null,
    textoConfirmar = 'Confirmar',
    variante = 'primary',
    onCerrar,
    onConfirmar,
    cargando = false,
}) {
    if (!abierto) return null;

    return (
        <Modal abierto={abierto} titulo={titulo || 'Confirmar acción'} onCerrar={onCerrar}>
            <div className="flex items-start gap-3 rounded-lg border border-primary-200 bg-parchment-200 p-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                    {icono || <FaCircleQuestion />}
                </div>
                <div>
                    <p className="text-sm leading-6 text-mahogany-700">{mensaje}</p>
                    {advertencia && <p className="mt-2 text-xs leading-5 text-primary-400">{advertencia}</p>}
                </div>
            </div>

            <div className="mt-5 flex justify-end gap-3 border-t border-primary-200 pt-4">
                <Button variante="secondary" onClick={onCerrar} disabled={cargando}>
                    Cancelar
                </Button>
                <Button variante={variante} onClick={onConfirmar} cargando={cargando} disabled={cargando}>
                    {cargando ? 'Procesando...' : textoConfirmar}
                </Button>
            </div>
        </Modal>
    );
}