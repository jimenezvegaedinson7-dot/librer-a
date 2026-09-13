import { FaUser, FaEnvelope, FaPhone, FaCalendarDays, FaCartShopping, FaMoneyBillWave, FaIdBadge } from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge, EstadoActivo } from '../../components/ui/Badge';
import { Ficha } from '../../components/ui/Ficha';

import { formatearMoneda, formatearFecha } from '../../lib/utils/format';

function rolBadge(rol) {
    if (rol === 'administrador') return <Badge color="primary">Administrador</Badge>;
    if (rol === 'cliente') return <Badge color="info">Cliente</Badge>;
    return <Badge color="neutral">{rol || 'Sin rol'}</Badge>;
}

export default function UsuarioViewModal({ usuario, abierto, onCerrar }) {
    if (!abierto || !usuario) return null;

    return (
        <Modal abierto={abierto} titulo="Detalle del usuario" subtitulo="Información del usuario registrado" onCerrar={onCerrar}>
            <div className="border-b border-slate-100 pb-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Usuario</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">{`${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || 'Sin nombre'}</h3>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Ficha icono={<FaIdBadge />} etiqueta="ID de usuario">
                    #{usuario.id_usuario}
                </Ficha>
                <Ficha icono={<FaEnvelope />} etiqueta="Correo electrónico">
                    {usuario.email || 'Sin correo'}
                </Ficha>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Ficha icono={<FaPhone />} etiqueta="Teléfono">
                    {usuario.telefono || 'Sin teléfono'}
                </Ficha>
                <Ficha icono={<FaCalendarDays />} etiqueta="Fecha de registro">
                    <span className="text-sm">{formatearFecha(usuario.fecha_registro) || 'Sin fecha'}</span>
                </Ficha>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Ficha icono={<FaUser />} etiqueta="Rol">
                    {rolBadge(usuario.rol)}
                </Ficha>
                <Ficha icono={<FaUser />} etiqueta="Estado">
                    <EstadoActivo activo={usuario.estado} />
                </Ficha>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-sky-700">
                        <FaCartShopping /> Compras realizadas
                    </div>
                    <p className="mt-2 text-2xl font-bold text-sky-800">{Number(usuario.total_compras || 0)}</p>
                </div>

                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                        <FaMoneyBillWave /> Total gastado
                    </div>
                    <p className="mt-2 text-2xl font-bold text-emerald-800">{formatearMoneda(Number(usuario.total_gastado || 0))}</p>
                </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
                <Button onClick={onCerrar}>Cerrar</Button>
            </div>
        </Modal>
    );
}