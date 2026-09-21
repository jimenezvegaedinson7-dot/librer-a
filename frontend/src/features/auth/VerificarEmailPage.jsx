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
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-parchment-300 px-4 py-8">
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${fondoLogin})` }} />
            <div className="absolute inset-0 bg-mahogany-900/45" />

            <div className="relative z-10 w-full max-w-md">
                <div className="mx-auto overflow-hidden rounded-xl border border-primary-200 bg-white p-7 shadow-xl sm:p-9">
                    <div className="mb-6 flex justify-center border-b border-primary-200 pb-6">
                        <img src={logoLibreria} alt="Logo Librería" className="h-20 w-auto object-contain" />
                    </div>

                    <div className="mb-6 text-center">
                        <div className="mb-3 flex justify-center text-xl text-mahogany-600"><FaEnvelopeCircleCheck /></div>
                        <h2 className="text-2xl font-semibold tracking-tight text-mahogany-700">Verifica tu correo</h2>
                        <p className="mt-2 text-sm leading-5 text-primary-400">
                            Ingresa el código de 6 dígitos que enviamos a tu correo para activar tu cuenta.
                        </p>
                    </div>

                    {error && <Alert tipo="error">{error}</Alert>}
                    {info && <Alert tipo="success">{info}</Alert>}

                    <form onSubmit={enviar} className="mt-5 space-y-5">
                        <Input
                            label="Correo electrónico"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@libreria.com"
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
                            required
                            icono={<FaKey />}
                            className="!text-center !text-2xl !font-semibold !tracking-[0.35em]"
                        />

                        <Button type="submit" cargando={cargando} className="mt-2 w-full">
                            {cargando ? 'Verificando...' : 'Verificar y continuar'}
                        </Button>
                    </form>

                    <button
                        type="button"
                        onClick={reenviar}
                        disabled={reenviando || segundos > 0 || cargando}
                        className="mt-4 w-full text-center text-xs text-primary-400 transition-colors hover:text-mahogany-600 disabled:cursor-not-allowed disabled:opacity-50"
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
                        className="mt-2 flex w-full items-center justify-center gap-1 text-center text-xs text-primary-400 transition-colors hover:text-mahogany-600"
                    >
                        <FaArrowLeft className="text-[10px]" /> Volver al inicio de sesión
                    </button>

                    <div className="mt-7 flex items-center justify-center gap-2 border-t border-primary-200 pt-5">
                        <FaEnvelopeCircleCheck className="text-[10px] text-mahogany-600" />
                        <p className="text-xs text-primary-400">La cuenta debe verificarse para poder ingresar</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
