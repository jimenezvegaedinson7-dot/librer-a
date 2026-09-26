import { FaUser, FaEnvelope, FaPhone, FaCalendarDays, FaCartShopping, FaMoneyBillWave, FaIdBadge } from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge, EstadoActivo } from '../../components/ui/Badge';
import { Ficha } from '../../components/ui/Ficha';

import { formatearMoneda, formatearFecha } from '../../lib/utils/format';
import { correoVisible, esCuentaEliminada } from '../../lib/utils/cuentas';

function rolBadge(rol) {
    if (rol === 'administrador') return <Badge color="primary">Administrador</Badge>;
    if (rol === 'cliente') return <Badge color="info">Cliente</Badge>;
    return <Badge color="neutral">{rol || 'Sin rol'}</Badge>;
}

export default function UsuarioViewModal({ usuario, abierto, onCerrar }) {
    if (!abierto || !usuario) return null;

    return (
        <Modal abierto={abierto} titulo="Detalle del usuario" subtitulo="Información del usuario registrado" onCerrar={onCerrar}>
            <div className="border-b border-primary-200 pb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-700">Usuario</p>
                <h3 className="mt-2 font-title text-[26px] font-semibold leading-tight tracking-[-0.015em] text-slate-900">{`${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || 'Sin nombre'}</h3>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Ficha color="slate" icono={<FaIdBadge />} etiqueta="ID de usuario">
                    #{usuario.id_usuario}
                </Ficha>
                <Ficha color="slate" icono={<FaEnvelope />} etiqueta="Correo electrónico">
                    {esCuentaEliminada(usuario) ? 'Cuenta eliminada por su titular (datos anonimizados)' : correoVisible(usuario.email) || 'Sin correo'}
                </Ficha>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Ficha color="slate" icono={<FaPhone />} etiqueta="Teléfono">
                    {usuario.telefono || 'Sin teléfono'}
                </Ficha>
                <Ficha color="slate" icono={<FaCalendarDays />} etiqueta="Fecha de registro">
                    <span className="text-sm">{formatearFecha(usuario.fecha_registro) || 'Sin fecha'}</span>
                </Ficha>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Ficha color="slate" icono={<FaUser />} etiqueta="Rol">
                    {rolBadge(usuario.rol)}
                </Ficha>
                <Ficha color="slate" icono={<FaUser />} etiqueta="Estado">
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

                <div className="rounded-lg border border-primary-200 bg-parchment-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary-500">
                        <FaMoneyBillWave /> Total gastado
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-slate-700">{formatearMoneda(Number(usuario.total_gastado || 0))}</p>
                </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-primary-200 pt-5">
                <Button variante="secondary" onClick={onCerrar}>Cerrar</Button>
            </div>
        </Modal>
    );
}
