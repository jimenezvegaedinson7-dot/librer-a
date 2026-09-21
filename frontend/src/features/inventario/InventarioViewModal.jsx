import { FaBook, FaBoxesStacked, FaLocationDot, FaClockRotateLeft } from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Ficha } from '../../components/ui/Ficha';

import { formatearFecha } from '../../lib/utils/format';

export default function InventarioViewModal({ inventario, abierto, onCerrar }) {
    if (!abierto || !inventario) return null;

    const stock = Number(inventario.stock);
    const stockMinimo = Number(inventario.stock_minimo);

    return (
        <Modal abierto={abierto} titulo="Detalle del inventario" subtitulo="Información registrada en el sistema" onCerrar={onCerrar}>
            <div className="border-b border-primary-200 pb-4">
                <p className="text-xs font-bold uppercase tracking-wide text-primary-400">Libro</p>
                <h3 className="mt-2 text-2xl font-bold text-mahogany-700">{inventario.titulo}</h3>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Ficha color="emerald" icono={<FaBoxesStacked />} etiqueta="Stock">{stock}</Ficha>
                <Ficha color="emerald" icono={<FaBoxesStacked />} etiqueta="Stock mínimo">{stockMinimo}</Ficha>
                <Ficha color="emerald" icono={<FaLocationDot />} etiqueta="Ubicación">{inventario.ubicacion || 'No registrada'}</Ficha>
                <Ficha color="emerald" icono={<FaClockRotateLeft />} etiqueta="Última actualización">
                    {formatearFecha(inventario.ultima_actualizacion) || 'Sin registro'}
                </Ficha>
            </div>

            <div className="mt-5">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-mahogany-700">
                    <FaBook /> ID de inventario
                </div>
                <div className="rounded-xl border border-primary-200 bg-parchment-200 px-4 py-3">
                    <p className="text-sm leading-6 text-primary-500">#{inventario.id_inventario}</p>
                </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-primary-200 pt-5">
                <Button onClick={onCerrar}>Cerrar</Button>
            </div>
        </Modal>
    );
}
