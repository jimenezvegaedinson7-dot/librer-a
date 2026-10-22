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
            <div className="flex items-start gap-3.5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="ficha-icono flex h-10 w-10 shrink-0 items-center justify-center rounded-full" aria-hidden="true">
                    {icono || <FaCircleQuestion />}
                </div>
                <div>
                    <p className="text-sm leading-6 text-slate-700">{mensaje}</p>
                    {advertencia && <p className="mt-1.5 text-[13px] leading-5 text-slate-500">{advertencia}</p>}
                </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
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