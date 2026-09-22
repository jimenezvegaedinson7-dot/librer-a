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
            <div className="aviso-peligro flex items-start gap-3.5 rounded-xl border border-red-200 bg-red-50/70 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700" aria-hidden="true">
                    <FaTriangleExclamation />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-medium leading-6 text-red-900">{mensaje}</p>
                    {advertencia && <p className="mt-1.5 text-[13px] leading-5 text-red-800/80">{advertencia}</p>}
                </div>
            </div>

            <div className="mt-4">
                <Input
                    label="Contraseña del administrador"
                    type={mostrarPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && password.trim() && !eliminando) confirmar();
                    }}
                    placeholder="Ingresa tu contraseña"
                    autoFocus
                    aria-describedby="confirmar-eliminacion-ayuda"
                    autoComplete="current-password"
                    disabled={eliminando}
                    icono={<FaLock size={14} />}
                    className="pr-24"
                />
                <div className="mt-1 flex items-center justify-between">
                    <p id="confirmar-eliminacion-ayuda" className="text-xs text-slate-500">Por seguridad, confirma tu contraseña antes de continuar.</p>
                    <button
                        type="button"
                        onClick={() => setMostrarPassword((a) => !a)}
                        disabled={eliminando}
                        aria-pressed={mostrarPassword}
                        aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        className="rounded px-1 text-xs font-semibold text-slate-600 transition hover:text-slate-900 disabled:opacity-50"
                    >
                        {mostrarPassword ? 'Ocultar' : 'Mostrar'}
                    </button>
                </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
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
