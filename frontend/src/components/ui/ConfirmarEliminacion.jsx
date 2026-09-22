import { useEffect, useState } from 'react';

import { FaLock, FaTriangleExclamation, FaTrash } from 'react-icons/fa6';

import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Form';

export function ConfirmarEliminacion({
    abierto,
    titulo,
    mensaje,
    advertencia,
    eliminando,
    onCerrar,
    onConfirmar,
}) {
    const [password, setPassword] = useState('');
    const [mostrarPassword, setMostrarPassword] = useState(false);

    useEffect(() => {
        if (abierto) {
            setPassword('');
            setMostrarPassword(false);
        }
    }, [abierto]);

    if (!abierto) return null;

    const confirmar = () => {
        if (!password.trim() || eliminando) return;
        onConfirmar(password);
    };

    return (
        <Modal abierto={abierto} titulo={titulo} subtitulo="Esta acción requiere confirmación" onCerrar={onCerrar}>
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-500">
                    <FaTriangleExclamation />
                </div>
                <div>
                    <p className="text-sm leading-6 text-red-600">{mensaje}</p>
                    {advertencia && <p className="mt-2 text-xs leading-5 text-red-400">{advertencia}</p>}
                </div>
            </div>

            <div className="mt-4">
                <Input
                    label="Contrasena del administrador"
                    type={mostrarPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && password.trim() && !eliminando) confirmar();
                    }}
                    placeholder="Ingresa tu contrasena"
                    autoComplete="current-password"
                    disabled={eliminando}
                    icono={<FaLock size={14} />}
                    className="pr-24"
                />
                <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-slate-400">Por seguridad, confirma tu contrasena antes de continuar.</p>
                    <button
                        type="button"
                        onClick={() => setMostrarPassword((a) => !a)}
                        disabled={eliminando}
                        className="text-xs font-semibold text-slate-500 transition hover:text-slate-700 disabled:opacity-50"
                    >
                        {mostrarPassword ? 'Ocultar' : 'Mostrar'}
                    </button>
                </div>
            </div>

            <div className="mt-5 flex justify-end gap-3 border-t border-slate-200 pt-4">
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
