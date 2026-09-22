import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
    FaCircleCheck,
    FaEnvelope,
    FaEye,
    FaEyeSlash,
    FaKey,
    FaLock,
    FaQrcode,
    FaRightToBracket,
    FaXmark,
} from 'react-icons/fa6';

import { login, verificarLoginOtp, solicitarReseteo, restablecerContrasena } from './authService';
import { useAuth } from './AuthContext';
import { Alert } from '../../components/ui/Alert';
import { Modal } from '../../components/ui/Modal';

import fondoLogin from '../../assets/fondo-login.png';
import logoLibreria from '../../assets/logo-lbl.png';

export default function LoginPage() {
    const navigate = useNavigate();
    const { autenticado, iniciarSesion } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

    const [twoFactorToken, setTwoFactorToken] = useState('');
    const [codigo, setCodigo] = useState('');
    const [verificando, setVerificando] = useState(false);

    // --- Forgot password modal state ---
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetStep, setResetStep] = useState(1); // 1=email, 2=code+pass, 3=done
    const [resetEmail, setResetEmail] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [resetCodigo, setResetCodigo] = useState('');
    const [resetPassword, setResetPassword] = useState('');
    const [resetPassword2, setResetPassword2] = useState('');
    const [resetError, setResetError] = useState('');
    const [resetCargando, setResetCargando] = useState(false);
    const [mostrarResetPass, setMostrarResetPass] = useState(false);

    if (autenticado) return <Navigate to="/dashboard" replace />;

    // --- Login handlers ---
    const enviar = async (e) => {
        e.preventDefault();
        try {
            setCargando(true);
            setError('');

            const respuesta = await login({ email, password });

            if (respuesta.requires_2fa) {
                setTwoFactorToken(respuesta.two_factor_token || '');
                setCodigo('');
                setError(respuesta.mensaje || 'Se requiere el código de doble factor');
                return;
            }

            const { token, data } = respuesta;

            if (data.rol !== 'administrador') {
                setError('Este panel es solo para administradores');
                return;
            }

            iniciarSesion(token, data);
            navigate('/dashboard');
        } catch (err) {
            if (
                err.response?.status === 403 &&
                /verificar tu correo/i.test(err.response?.data?.mensaje || '')
            ) {
                navigate('/verificar-email', { replace: true, state: { email } });
                return;
            }

            setError(err.response?.data?.mensaje || 'Correo o contraseña incorrectos');
        } finally {
            setCargando(false);
        }
    };

    const enviarCodigo = async (e) => {
        e.preventDefault();

        if (!/^\d{6}$/.test(codigo)) {
            setError('El código debe tener 6 dígitos');
            return;
        }

        try {
            setVerificando(true);
            setError('');

            const respuesta = await verificarLoginOtp({
                two_factor_token: twoFactorToken,
                codigo,
            });

            const { token, data } = respuesta;

            if (data.rol !== 'administrador') {
                setError('Este panel es solo para administradores');
                return;
            }

            iniciarSesion(token, data);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Código incorrecto o expirado');
        } finally {
            setVerificando(false);
        }
    };

    const volverAlLogin = () => {
        setTwoFactorToken('');
        setCodigo('');
        setError('');
    };

    // --- Forgot password handlers ---
    const openResetModal = () => {
        setShowResetModal(true);
        setResetStep(1);
        setResetEmail(email);
        setConfirmEmail('');
        setResetCodigo('');
        setResetPassword('');
        setResetPassword2('');
        setResetError('');
        setMostrarResetPass(false);
    };

    const closeResetModal = () => {
        setShowResetModal(false);
        setResetStep(1);
        setResetError('');
    };

    const enviarCodigoReset = async (e) => {
        e.preventDefault();
        if (!resetEmail.trim()) {
            setResetError('Ingresa tu correo electrónico');
            return;
        }
        if (confirmEmail.trim() !== resetEmail.trim()) {
            setResetError('Correo no coincide, intente de nuevo');
            return;
        }
        try {
            setResetCargando(true);
            setResetError('');
            await solicitarReseteo({ email: resetEmail.trim() });
            setResetStep(2);
        } catch (err) {
            setResetError(err.response?.data?.mensaje || 'Error al enviar el código');
        } finally {
            setResetCargando(false);
        }
    };

    const restablecer = async (e) => {
        e.preventDefault();
        if (!/^\d{6}$/.test(resetCodigo)) {
            setResetError('El código debe tener 6 dígitos');
            return;
        }
        if (resetPassword.length < 8) {
            setResetError('La contraseña debe tener al menos 8 caracteres');
            return;
        }
        if (!/[a-zA-Z]/.test(resetPassword)) {
            setResetError('La contraseña debe contener al menos una letra');
            return;
        }
        if (!/\d/.test(resetPassword)) {
            setResetError('La contraseña debe contener al menos un número');
            return;
        }
        if (resetPassword !== resetPassword2) {
            setResetError('Las contraseñas no coinciden');
            return;
        }
        try {
            setResetCargando(true);
            setResetError('');
            await restablecerContrasena({
                email: resetEmail.trim(),
                codigo: resetCodigo,
                password: resetPassword,
            });
            setResetStep(3);
        } catch (err) {
            setResetError(err.response?.data?.mensaje || 'Código incorrecto o expirado');
        } finally {
            setResetCargando(false);
        }
    };

    const resetPaso2Volver = () => {
        setResetStep(1);
        setResetCodigo('');
        setResetPassword('');
        setResetPassword2('');
        setResetError('');
    };

    return (
        <main className="relative min-h-screen bg-parchment-300">
            <div
                className="fixed inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${fondoLogin})` }}
            />
            <div className="fixed inset-0 bg-mahogany-900/45" />

            <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
                <section className="w-full min-w-0 max-w-[440px]">
                    <div className="min-w-0 rounded-lg border border-primary-200 bg-parchment-50 p-7 shadow-xl sm:p-9">
                        <div className="mb-6 flex justify-center border-b border-primary-200 pb-6">
                            <img
                                src={logoLibreria}
                                alt="Logo Librería"
                                className="h-20 w-auto object-contain sm:h-24"
                            />
                        </div>

                        {!twoFactorToken ? (
                            <>
                                <div className="mb-6 text-center">
                                    <h1 className="font-sans text-2xl font-semibold tracking-tight text-[#0f172a]">
                                        Iniciar sesión
                                    </h1>
                                    <p className="mt-2 text-sm text-[#64748b]">
                                        Ingresa tus credenciales de administración
                                    </p>
                                </div>

                                {error && (
                                    <div className="mb-4">
                                        <Alert tipo="error">{error}</Alert>
                                    </div>
                                )}

                                <form onSubmit={enviar} className="min-w-0 space-y-5">
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-mahogany-700">
                                            Correo electrónico
                                        </label>
                                        <div className="flex h-12 min-w-0 items-center overflow-hidden rounded-md border border-primary-200 bg-parchment-50 transition focus-within:border-gold-400 focus-within:ring-2 focus-within:ring-gold-100">
                                            <span className="flex h-full w-11 shrink-0 items-center justify-center border-r border-primary-200 text-primary-400">
                                                <FaEnvelope />
                                            </span>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="admin@libreria.com"
                                                autoComplete="email"
                                                required
                                                className="h-full min-w-0 flex-1 bg-transparent px-4 text-sm text-mahogany-700 outline-none placeholder:text-primary-400"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-mahogany-700">
                                            Contraseña
                                        </label>
                                        <div className="flex h-12 min-w-0 items-center overflow-hidden rounded-md border border-primary-200 bg-parchment-50 transition focus-within:border-gold-400 focus-within:ring-2 focus-within:ring-gold-100">
                                            <span className="flex h-full w-11 shrink-0 items-center justify-center border-r border-primary-200 text-primary-400">
                                                <FaLock />
                                            </span>
                                            <input
                                                type={mostrarPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Ingresa tu contraseña"
                                                autoComplete="current-password"
                                                required
                                                className="h-full min-w-0 flex-1 bg-transparent px-4 text-sm text-mahogany-700 outline-none placeholder:text-primary-400"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setMostrarPassword((v) => !v)}
                                                className="mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-primary-400 transition hover:bg-parchment-200 hover:text-mahogany-700"
                                            >
                                                {mostrarPassword ? <FaEyeSlash /> : <FaEye />}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={cargando}
                                        className="flex h-12 w-full items-center justify-center gap-2 rounded-md border border-mahogany-700 bg-mahogany-700 text-sm font-semibold text-parchment-100 transition-colors hover:bg-mahogany-600 disabled:opacity-60"
                                    >
                                        {cargando ? (
                                            <>
                                                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                                Ingresando...
                                            </>
                                        ) : (
                                            <>
                                                <FaRightToBracket />
                                                Iniciar sesión
                                            </>
                                        )}
                                    </button>
                                </form>

                                <div className="mt-4 text-center">
                                    <button
                                        type="button"
                                        onClick={openResetModal}
                                        className="text-sm font-medium text-primary-400 transition-colors hover:text-mahogany-600"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="mb-6 text-center">
                                    <div className="mb-4 flex justify-center text-2xl text-[#475569]">
                                        <FaQrcode />
                                    </div>
                                    <h1 className="font-sans text-2xl font-semibold tracking-tight text-[#0f172a]">
                                        Código de verificación
                                    </h1>
                                    <p className="mt-2 text-sm text-[#64748b]">
                                        Ingresa el código de 6 dígitos
                                    </p>
                                </div>

                                {error && (
                                    <div className="mb-4">
                                        <Alert tipo="error">{error}</Alert>
                                    </div>
                                )}

                                <form onSubmit={enviarCodigo} className="min-w-0 space-y-5">
                                    <div>
                                        <label className="mb-2 block text-center text-sm font-semibold text-mahogany-700">
                                            Código OTP
                                        </label>
                                        <div className="flex h-14 min-w-0 items-center rounded-md border border-primary-200 bg-parchment-50 px-4 transition focus-within:border-gold-400 focus-within:ring-2 focus-within:ring-gold-100">
                                            <FaKey className="shrink-0 text-mahogany-600" />
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                maxLength="6"
                                                value={codigo}
                                                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                                                placeholder="000000"
                                                autoComplete="one-time-code"
                                                required
                                                className="min-w-0 flex-1 bg-transparent text-center text-2xl font-bold tracking-[.5em] text-mahogany-700 outline-none placeholder:text-primary-200"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={verificando}
                                        className="flex h-12 w-full items-center justify-center gap-2 rounded-md border border-mahogany-700 bg-mahogany-700 text-sm font-semibold text-parchment-100 transition-colors hover:bg-mahogany-600 disabled:opacity-60"
                                    >
                                        {verificando ? (
                                            <>
                                                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                                Verificando...
                                            </>
                                        ) : (
                                            <>
                                                <FaQrcode />
                                                Verificar código
                                            </>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={volverAlLogin}
                                        className="w-full text-center text-sm font-medium text-primary-400 transition-colors hover:text-mahogany-600"
                                    >
                                        ← Volver al inicio de sesión
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </section>
            </div>

            {/* --- Forgot Password Modal --- */}
            <Modal abierto={showResetModal} onCerrar={closeResetModal}>
                <div className="p-6 sm:p-7">
                    <div className="mb-5 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-[#0f172a]">
                            Restablecer contraseña
                        </h2>
                        <button
                            type="button"
                            onClick={closeResetModal}
                            className="rounded-md p-1 text-primary-400 transition hover:bg-parchment-200 hover:text-mahogany-700"
                        >
                            <FaXmark />
                        </button>
                    </div>

                    {resetError && (
                        <div className="mb-4">
                            <Alert tipo="error">{resetError}</Alert>
                        </div>
                    )}

                    {/* Step 1: Confirm email */}
                    {resetStep === 1 && (
                        <form onSubmit={enviarCodigoReset} className="space-y-4">
                            <p className="text-sm text-[#64748b]">
                                Se enviará un código de verificación al correo registrado.
                            </p>

                            <div className="rounded-md border border-primary-200 bg-parchment-100 px-4 py-3">
                                <p className="text-xs text-[#94a3b8]">Correo registrado:</p>
                                <p className="text-sm font-semibold text-mahogany-700">
                                    {resetEmail
                                        ? resetEmail.charAt(0) + '****' + resetEmail.slice(resetEmail.indexOf('@'))
                                        : '****@****.com'}
                                </p>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-mahogany-700">
                                    Confirma tu correo electrónico
                                </label>
                                <div className="flex h-11 min-w-0 items-center overflow-hidden rounded-md border border-primary-200 bg-parchment-50 transition focus-within:border-gold-400 focus-within:ring-2 focus-within:ring-gold-100">
                                    <span className="flex h-full w-10 shrink-0 items-center justify-center border-r border-primary-200 text-primary-400">
                                        <FaEnvelope />
                                    </span>
                                    <input
                                        type="email"
                                        value={confirmEmail}
                                        onChange={(e) => setConfirmEmail(e.target.value)}
                                        placeholder="Escribe tu correo completo"
                                        autoComplete="email"
                                        required
                                        className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-mahogany-700 outline-none placeholder:text-primary-400"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={resetCargando}
                                className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-mahogany-700 bg-mahogany-700 text-sm font-semibold text-parchment-100 transition-colors hover:bg-mahogany-600 disabled:opacity-60"
                            >
                                {resetCargando ? (
                                    <>
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <FaEnvelope />
                                        Enviar código
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Step 2: Enter code + new password */}
                    {resetStep === 2 && (
                        <form onSubmit={restablecer} className="space-y-4">
                            <p className="text-sm text-[#64748b]">
                                Se envió un código a <strong>{resetEmail}</strong>.
                            </p>
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-mahogany-700">
                                    Código de verificación
                                </label>
                                <div className="flex h-11 min-w-0 items-center rounded-md border border-primary-200 bg-parchment-50 px-3 transition focus-within:border-gold-400 focus-within:ring-2 focus-within:ring-gold-100">
                                    <FaKey className="shrink-0 text-mahogany-600" />
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength="6"
                                        value={resetCodigo}
                                        onChange={(e) => setResetCodigo(e.target.value.replace(/\D/g, ''))}
                                        placeholder="000000"
                                        autoComplete="one-time-code"
                                        required
                                        className="min-w-0 flex-1 bg-transparent px-3 text-center text-xl font-bold tracking-[.4em] text-mahogany-700 outline-none placeholder:text-primary-200"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-mahogany-700">
                                    Nueva contraseña
                                </label>
                                <div className="flex h-11 min-w-0 items-center overflow-hidden rounded-md border border-primary-200 bg-parchment-50 transition focus-within:border-gold-400 focus-within:ring-2 focus-within:ring-gold-100">
                                    <span className="flex h-full w-10 shrink-0 items-center justify-center border-r border-primary-200 text-primary-400">
                                        <FaLock />
                                    </span>
                                    <input
                                        type={mostrarResetPass ? 'text' : 'password'}
                                        value={resetPassword}
                                        onChange={(e) => setResetPassword(e.target.value)}
                                        placeholder="Mínimo 8 caracteres, 1 letra y 1 número"
                                        autoComplete="new-password"
                                        required
                                        className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-mahogany-700 outline-none placeholder:text-primary-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setMostrarResetPass((v) => !v)}
                                        className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-primary-400 transition hover:bg-parchment-200 hover:text-mahogany-700"
                                    >
                                        {mostrarResetPass ? <FaEyeSlash /> : <FaEye />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-mahogany-700">
                                    Confirmar contraseña
                                </label>
                                <div className="flex h-11 min-w-0 items-center overflow-hidden rounded-md border border-primary-200 bg-parchment-50 transition focus-within:border-gold-400 focus-within:ring-2 focus-within:ring-gold-100">
                                    <span className="flex h-full w-10 shrink-0 items-center justify-center border-r border-primary-200 text-primary-400">
                                        <FaLock />
                                    </span>
                                    <input
                                        type={mostrarResetPass ? 'text' : 'password'}
                                        value={resetPassword2}
                                        onChange={(e) => setResetPassword2(e.target.value)}
                                        placeholder="Repite la contraseña"
                                        autoComplete="new-password"
                                        required
                                        className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-mahogany-700 outline-none placeholder:text-primary-400"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={resetPaso2Volver}
                                    className="h-11 flex-1 rounded-md border border-primary-200 bg-parchment-50 text-sm font-medium text-mahogany-700 transition hover:bg-parchment-200"
                                >
                                    ← Volver
                                </button>
                                <button
                                    type="submit"
                                    disabled={resetCargando}
                                    className="h-11 flex-1 rounded-md border border-mahogany-700 bg-mahogany-700 text-sm font-semibold text-parchment-100 transition-colors hover:bg-mahogany-600 disabled:opacity-60"
                                >
                                    {resetCargando ? (
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                    ) : (
                                        'Restablecer'
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Step 3: Success */}
                    {resetStep === 3 && (
                        <div className="space-y-4 text-center">
                            <div className="flex justify-center text-4xl text-green-500">
                                <FaCircleCheck />
                            </div>
                            <p className="text-sm text-[#64748b]">
                                Contraseña actualizada correctamente. Ya puedes iniciar sesión.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    closeResetModal();
                                    setPassword('');
                                }}
                                className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-mahogany-700 bg-mahogany-700 text-sm font-semibold text-parchment-100 transition-colors hover:bg-mahogany-600"
                            >
                                <FaRightToBracket />
                                Ir al inicio de sesión
                            </button>
                        </div>
                    )}
                </div>
            </Modal>
        </main>
    );
}
