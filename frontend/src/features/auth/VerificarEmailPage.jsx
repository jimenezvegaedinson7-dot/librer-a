import { useEffect, useState } from 'react';

import { useLocation, useNavigate } from 'react-router-dom';

import { FaArrowLeft, FaEnvelopeCircleCheck, FaKey } from 'react-icons/fa6';

import { reenviarCodigo, verificarEmail } from './authService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';

import fondoLogin from '../../assets/fondo-login.png';
import logoLibreria from '../../assets/logo-lbl.png';

const SEGUNDOS_REINTENTO = 60;

export default function VerificarEmailPage() {
    const navigate = useNavigate();
    const location = useLocation();

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
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-8">
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${fondoLogin})` }} />
            <div className="absolute inset-0 bg-slate-950/40" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-950/20 to-slate-950/50" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[700px] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />

            <div className="relative z-10 w-full max-w-md">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-400/30 bg-primary-400/10 text-primary-300 shadow-lg shadow-primary-500/10 backdrop-blur-md">
                    <FaEnvelopeCircleCheck />
                </div>

                <div className="mx-auto overflow-hidden rounded-[28px] border border-white/20 bg-slate-950/20 p-6 shadow-2xl shadow-black/30 backdrop-blur-md sm:p-8">
                    <div className="mb-4 flex justify-center">
                        <img src={logoLibreria} alt="Logo Librería" className="h-20 w-20 object-contain drop-shadow-xl" />
                    </div>

                    <div className="mb-6 text-center">
                        <p className="text-sm font-bold text-primary-300">Verificación de cuenta</p>
                        <h2 className="mt-1 text-3xl font-bold tracking-tight text-white">Verifica tu correo</h2>
                        <p className="mt-2 text-xs leading-5 text-slate-300">
                            Ingresa el código de 6 dígitos que enviamos a tu correo para activar tu cuenta.
                        </p>
                    </div>

                    {error && <Alert tipo="error">{error}</Alert>}
                    {info && <Alert tipo="success">{info}</Alert>}

                    <form onSubmit={enviar} className="mt-5 space-y-5">
                        <Input
                            label={<span className="text-white">Correo electrónico</span>}
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@libreria.com"
                            required
                            icono={<FaEnvelopeCircleCheck />}
                            className="!border-white/30 !bg-white/10 !text-white !placeholder:text-slate-400"
                        />

                        <Input
                            label={<span className="text-white">Código de verificación</span>}
                            type="text"
                            inputMode="numeric"
                            maxLength="6"
                            value={codigo}
                            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                            placeholder="000000"
                            required
                            icono={<FaKey />}
                            className="!border-white/30 !bg-white/10 !text-center !text-2xl !font-bold !tracking-[0.35em] !text-white !placeholder:text-slate-400"
                        />

                        <Button type="submit" cargando={cargando} className="mt-2 w-full">
                            {cargando ? 'Verificando...' : 'Verificar y continuar'}
                        </Button>
                    </form>

                    <button
                        type="button"
                        onClick={reenviar}
                        disabled={reenviando || segundos > 0 || cargando}
                        className="mt-4 w-full text-center text-xs text-slate-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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
                        className="mt-2 flex w-full items-center justify-center gap-1 text-center text-xs text-slate-300 transition hover:text-white"
                    >
                        <FaArrowLeft className="text-[10px]" /> Volver al inicio de sesión
                    </button>

                    <div className="mt-7 flex items-center justify-center gap-2 border-t border-white/10 pt-5">
                        <FaEnvelopeCircleCheck className="text-[10px] text-primary-300" />
                        <p className="text-[10px] font-medium text-slate-300">La cuenta debe verificarse para poder ingresar</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
