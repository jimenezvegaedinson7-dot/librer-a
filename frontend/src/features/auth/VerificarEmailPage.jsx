import { useEffect, useState } from 'react';

import { useLocation, useNavigate } from 'react-router-dom';

import { FaArrowLeft, FaEnvelopeCircleCheck, FaKey } from 'react-icons/fa6';
import { motion, useReducedMotion } from 'motion/react';

import { reenviarCodigo, verificarEmail } from './authService';
import { Input } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';

import fondoLogin from '../../assets/fondo-login.png';
import logoLibreria from '../../assets/logo-lbl.png';

const SEGUNDOS_REINTENTO = 60;

export default function VerificarEmailPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const reducirMovimiento = useReducedMotion();

    const emailInicial = location.state?.email || '';

    const [email, setEmail] = useState(emailInicial);
    const [codigo, setCodigo] = useState('');
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [cargando, setCargando] = useState(false);
    const [reenviando, setReenviando] = useState(false);
    const [segundos, setSegundos] = useState(0);

    useEffect(() => {
        if (segundos <= 0) return undefined;
        const intervalo = setInterval(() => {
            setSegundos((s) => (s <= 1 ? 0 : s - 1));
        }, 1000);
        return () => clearInterval(intervalo);
    }, [segundos]);

    const volverAlLogin = () => navigate('/', { replace: true });

    const enviar = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');
        const emailLimpio = email.trim();

        if (!/^\d{6}$/.test(codigo)) {
            setError('El código debe tener 6 dígitos');
            return;
        }
        if (!emailLimpio) {
            setError('Ingresa tu correo electrónico');
            return;
        }
        try {
            setCargando(true);
            await verificarEmail({ email: emailLimpio, codigo });
            setInfo('Cuenta verificada correctamente. Ya puedes iniciar sesión.');
            setTimeout(() => volverAlLogin(), 1500);
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Código incorrecto o expirado');
        } finally {
            setCargando(false);
        }
    };

    const reenviar = async (e) => {
        e.preventDefault();
        if (reenviando || segundos > 0) return;
        if (!email.trim()) {
            setError('Ingresa tu correo electrónico');
            return;
        }
        setError('');
        setInfo('');
        try {
            setReenviando(true);
            await reenviarCodigo({ email: email.trim() });
            setInfo('Se envió un nuevo código a tu correo.');
            setSegundos(SEGUNDOS_REINTENTO);
        } catch (err) {
            setError(err.response?.data?.mensaje || 'No se pudo reenviar el código');
        } finally {
            setReenviando(false);
        }
    };

    return (
        <main className="login-page relative flex min-h-screen items-center justify-center overflow-hidden bg-[#1c1814] px-4 py-10">
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${fondoLogin})` }} aria-hidden="true" />
            <div className="login-velo absolute inset-0" aria-hidden="true" />

            <motion.section
                initial={reducirMovimiento ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
                className="verificar-tarjeta relative z-10 w-full max-w-[440px]"
            >
                <div className="mb-7 flex flex-col items-center text-center">
                    <img src={logoLibreria} alt="Librería del Saber" className="h-14 w-auto object-contain" />
                    <p className="mt-2 font-title text-base font-semibold text-[#1c1814]">Librería del Saber</p>
                </div>

                <div className="mb-6">
                    <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#eedcae] bg-[#fcf8ef] text-lg text-[#7a5827]" aria-hidden="true">
                        <FaEnvelopeCircleCheck />
                    </span>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9a7231]">Activación de cuenta</p>
                    <h1 className="mt-1.5 font-title text-[28px] font-semibold leading-tight tracking-[-0.015em] text-[#1c1814]">Verifica tu correo</h1>
                    <p className="mt-2 text-sm leading-6 text-[#766d62]">
                        Ingresa el código de 6 dígitos que enviamos a tu correo para activar tu cuenta.
                    </p>
                </div>

                <div aria-live="polite" className="space-y-3 empty:hidden">
                    {error && <Alert tipo="error">{error}</Alert>}
                    {info && <Alert tipo="success">{info}</Alert>}
                </div>

                <form onSubmit={enviar} className="mt-5 space-y-5">
                    <Input
                        label="Correo electrónico"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@libreria.com"
                        autoComplete="email"
                        required
                        icono={<FaEnvelopeCircleCheck />}
                    />

                    <Input
                        label="Código de verificación"
                        type="text"
                        inputMode="numeric"
                        maxLength="6"
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        autoComplete="one-time-code"
                        required
                        icono={<FaKey />}
                        className="!h-14 !text-center !text-2xl !font-semibold !tracking-[0.35em] tabular-nums"
                    />

                    <button type="submit" disabled={cargando} aria-busy={cargando} className="login-boton w-full">
                        {cargando ? (
                            <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden="true" />
                                Verificando...
                            </>
                        ) : (
                            'Verificar y continuar'
                        )}
                    </button>
                </form>

                <div className="mt-5 flex flex-col items-center gap-2.5">
                    <button
                        type="button"
                        onClick={reenviar}
                        disabled={reenviando || segundos > 0 || cargando}
                        className="login-enlace tabular-nums disabled:cursor-not-allowed disabled:text-[#a39a8e] disabled:no-underline"
                    >
                        {reenviando
                            ? 'Reenviando...'
                            : segundos > 0
                              ? `Reenviar código en ${segundos}s`
                              : '¿No recibiste el código? Reenviar'}
                    </button>

                    <button
                        type="button"
                        onClick={volverAlLogin}
                        className="flex items-center gap-1.5 rounded text-[13px] font-medium text-[#766d62] transition-colors hover:text-[#1c1814]"
                    >
                        <FaArrowLeft className="text-[10px]" aria-hidden="true" /> Volver al inicio de sesión
                    </button>
                </div>

                <p className="mt-7 border-t border-[#e6e0d7] pt-5 text-center text-xs text-[#766d62]">
                    La cuenta debe verificarse para poder ingresar.
                </p>
            </motion.section>
        </main>
    );
}
