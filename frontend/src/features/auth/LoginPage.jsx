import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
    FaEnvelope,
    FaEye,
    FaEyeSlash,
    FaKey,
    FaLock,
    FaQrcode,
    FaRightToBracket,
} from 'react-icons/fa6';

import { login, verificarLoginOtp } from './authService';
import { useAuth } from './AuthContext';
import { Alert } from '../../components/ui/Alert';

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

    if (autenticado) return <Navigate to="/dashboard" replace />;

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
        </main>
    );
}
