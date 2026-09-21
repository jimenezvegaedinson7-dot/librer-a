import { FaCartShopping, FaEnvelope, FaMoneyBillWave, FaCalendarDays, FaUser } from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Ficha } from '../../components/ui/Ficha';

import { formatearMoneda, formatearFecha } from '../../lib/utils/format';

export default function ClienteViewModal({ cliente, abierto, onCerrar }) {
    if (!abierto || !cliente) return null;

    return (
        <Modal abierto={abierto} titulo="Detalle del cliente" subtitulo="Información del cliente y su actividad de compras" onCerrar={onCerrar}>
            <div className="border-b border-primary-200 pb-4">
                <p className="text-xs font-bold uppercase tracking-wide text-primary-400">Cliente</p>
                <h3 className="mt-2 text-2xl font-bold text-mahogany-700">{cliente.nombre_completo || 'Sin nombre'}</h3>
                <p className="mt-1 text-sm text-primary-500">{cliente.email || 'Sin correo'}</p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Ficha icono={<FaUser />} etiqueta="Cliente">
                    <span className="text-sm">#{cliente.id_usuario}</span>
                </Ficha>
                <Ficha icono={<FaEnvelope />} etiqueta="Correo electrónico">
                    <span className="break-all text-sm">{cliente.email || 'Sin correo'}</span>
                </Ficha>
                <Ficha icono={<FaCalendarDays />} etiqueta="Última compra">
                    <span className="text-sm">{formatearFecha(cliente.ultima_compra, { soloDia: true }) || 'Sin compras'}</span>
                </Ficha>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-sky-700">
                        <FaCartShopping /> Compras realizadas
                    </div>
                    <p className="mt-2 text-2xl font-bold text-sky-800">{Number(cliente.numero_compras || 0)}</p>
                </div>

                <div className="rounded-lg border border-primary-200 bg-parchment-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary-500">
                        <FaMoneyBillWave /> Total gastado
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-mahogany-700">{formatearMoneda(Number(cliente.total_gastado || 0))}</p>
                </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-primary-200 pt-5">
                <Button onClick={onCerrar}>Cerrar</Button>
            </div>
        </Modal>
    );
}
