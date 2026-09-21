import { FaUser, FaFlag, FaBookOpen } from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Ficha } from '../../components/ui/Ficha';

export default function AutorViewModal({ autor, abierto, onCerrar }) {
    if (!abierto || !autor) return null;

    const activo = Number(autor.estado) === 1;

    return (
        <Modal abierto={abierto} titulo="Detalle del autor" subtitulo="Información registrada en el sistema" onCerrar={onCerrar}>
            <div className="border-b border-primary-200 pb-4">
                <p className="text-xs font-bold uppercase tracking-wide text-primary-400">Autor</p>
                <h3 className="mt-2 text-2xl font-bold text-mahogany-700">
                    {autor.nombre} {autor.apellido}
                </h3>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Ficha color="rose" icono={<FaFlag />} etiqueta="Nacionalidad">{autor.nacionalidad || 'No registrada'}</Ficha>
                <Ficha color="rose" icono={activo ? <FaUser className="text-success" /> : <FaUser />} etiqueta="Estado">
                    <Badge color={activo ? 'success' : 'neutral'}>{activo ? 'Activo' : 'Inactivo'}</Badge>
                </Ficha>
            </div>

            <div className="mt-5">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-mahogany-700">
                    <FaBookOpen /> Biografía
                </div>
                <div className="min-h-[110px] rounded-xl border border-primary-200 bg-parchment-200 px-4 py-3">
                    <p className="text-sm leading-6 text-primary-500">
                        {autor.biografia || 'No se registró una biografía para este autor.'}
                    </p>
                </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-primary-200 pt-5">
                <Button onClick={onCerrar}>Cerrar</Button>
            </div>
        </Modal>
    );
}
