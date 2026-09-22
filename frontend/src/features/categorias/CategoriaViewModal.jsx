import { FaAlignLeft, FaCircleCheck, FaCircleXmark } from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Ficha } from '../../components/ui/Ficha';

export default function CategoriaViewModal({ categoria, abierto, onCerrar }) {
    if (!abierto || !categoria) return null;

    const activa = Number(categoria.estado) === 1;

    return (
        <Modal abierto={abierto} titulo="Detalle de la categoría" subtitulo="Información registrada en el sistema" onCerrar={onCerrar}>
            <div className="border-b border-primary-200 pb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-700">Categoría</p>
                <h3 className="mt-2 font-title text-[26px] font-semibold leading-tight tracking-[-0.015em] text-slate-900">{categoria.nombre}</h3>
            </div>

            <div className="mt-5">
                <Ficha
                    icono={activa ? <FaCircleCheck className="text-success" /> : <FaCircleXmark className="text-slate-500" />}
                    etiqueta="Estado"
                >
                    <Badge color={activa ? 'success' : 'neutral'}>{activa ? 'Activa' : 'Inactiva'}</Badge>
                </Ficha>
            </div>

            <div className="mt-5">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                    <FaAlignLeft /> Descripción
                </div>
                <div className="min-h-[110px] rounded-xl border border-primary-200 bg-parchment-200 px-4 py-3">
                    <p className="text-sm leading-6 text-primary-500">
                        {categoria.descripcion || 'No se registró una descripción para esta categoría.'}
                    </p>
                </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-primary-200 pt-5">
                <Button variante="secondary" onClick={onCerrar}>Cerrar</Button>
            </div>
        </Modal>
    );
}
