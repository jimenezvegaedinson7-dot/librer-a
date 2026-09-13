import { useEffect, useState } from 'react';

import { FaLock, FaTriangleExclamation, FaTrash } from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Form';

export default function LibroDeleteModal({ libro, abierto, eliminando, onCerrar, onConfirmar }) {
    const [password, setPassword] = useState('');
    const [mostrarPassword, setMostrarPassword] = useState(false);

    useEffect(() => {
        if (abierto) {
            setPassword('');
            setMostrarPassword(false);
        }
    }, [abierto, libro]);

    if (!abierto || !libro) return null;

    const confirmar = () => {
        if (!password.trim() || eliminando) return;
        onConfirmar(password);
    };

    return (
        <Modal abierto={abierto} titulo="Eliminar libro" subtitulo="Esta acción requiere confirmación" onCerrar={onCerrar}>
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                    <FaTriangleExclamation />
                </div>
                <div>
                    <p className="text-sm leading-6 text-red-700">
                        ¿Estás seguro de que deseas eliminar el libro <span className="font-bold">"{libro.titulo}"</span>?
                    </p>
                    <p className="mt-2 text-xs leading-5 text-red-600">
                        Si el libro tiene ventas, reservas u otros registros relacionados, el sistema no permitirá eliminarlo.
                    </p>
                </div>
            </div>

            <div className="mt-5">
                <Input
                    label="Contraseña del administrador"
                    type={mostrarPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && password.trim() && !eliminando) confirmar();
                    }}
                    placeholder="Ingresa tu contraseña"
                    autoComplete="current-password"
                    disabled={eliminando}
                    icono={<FaLock size={14} />}
                    className="pr-24"
                />
                <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-slate-600">Por seguridad, confirma tu contraseña antes de continuar.</p>
                    <button
                        type="button"
                        onClick={() => setMostrarPassword((a) => !a)}
                        disabled={eliminando}
                        className="text-xs font-semibold text-slate-600 transition hover:text-slate-800 disabled:opacity-50"
                    >
                        {mostrarPassword ? 'Ocultar' : 'Mostrar'}
                    </button>
                </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
                <Button variante="secondary" onClick={onCerrar} disabled={eliminando}>
                    Cancelar
                </Button>
                <Button variante="danger" onClick={confirmar} disabled={eliminando || !password.trim()}>
                    <FaTrash /> {eliminando ? 'Verificando...' : 'Confirmar eliminación'}
                </Button>
            </div>
        </Modal>
    );
}
