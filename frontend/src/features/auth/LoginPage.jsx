import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
    FaArrowLeft,
    FaEnvelope,
    FaEye,
    FaEyeSlash,
    FaKey,
    FaLock,
    FaQrcode,
    FaRightToBracket,
} from 'react-icons/fa6';

import { login, verificarLoginOtp, solicitarReseteo, restablecerContrasena } from './authService';
import { useAuth } from './AuthContext';
import { Alert } from '../../components/ui/Alert';
import { Modal } from '../../components/ui/Modal';
import { CargaCorreo, ExitoAnimado } from '../../components/ui/Celebracion';
import { prepararSonido, sonarPagoAprobado } from '../../lib/utils/sonido';

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
    const [envioCorreo, setEnvioCorreo] = useState(null); // null | 'enviando' | 'enviado'
    const [autoInicio, setAutoInicio] = useState('iniciando'); // 'iniciando' | 'no-admin' | 'error'

    const reducirMovimiento = useReducedMotion();

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
        setEnvioCorreo(null);
    };

    const closeResetModal = () => {
        setShowResetModal(false);
        setResetStep(1);
        setResetError('');
        setEnvioCorreo(null);
    };

    // Tras llenarse el cargador y mostrar "Correo enviado", pasa al código.
    const alTerminarEnvio = () => {
        setEnvioCorreo(null);
        setResetStep(2);
    };

    // Inicia sesión con la contraseña recién creada mientras se ve la confirmación.
    const iniciarConNuevaContrasena = async (correo, clave) => {
        const pausa = new Promise((resolver) => setTimeout(resolver, 2400));
        try {
            const [respuesta] = await Promise.all([login({ email: correo, password: clave }), pausa]);

            if (respuesta.requires_2fa) {
                closeResetModal();
                setEmail(correo);
                setTwoFactorToken(respuesta.two_factor_token || '');
                setCodigo('');
                setError('Contraseña actualizada. Ingresa tu código de doble factor para continuar.');
                return;
            }

            if (respuesta.data?.rol !== 'administrador') {
                setAutoInicio('no-admin');
                return;
            }

            iniciarSesion(respuesta.token, respuesta.data);
            navigate('/dashboard');
        } catch (err) {
            await pausa;
            if (err.response?.status === 403 && /verificar tu correo/i.test(err.response?.data?.mensaje || '')) {
                navigate('/verificar-email', { replace: true, state: { email: correo } });
                return;
            }
            setAutoInicio('error');
        }
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
            setEnvioCorreo('enviando');
            await solicitarReseteo({ email: resetEmail.trim() });
            setEnvioCorreo('enviado');
        } catch (err) {
            setEnvioCorreo(null);
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
        // El audio debe habilitarse durante el clic del usuario.
        prepararSonido();
        try {
            setResetCargando(true);
            setResetError('');
            await restablecerContrasena({
                email: resetEmail.trim(),
                codigo: resetCodigo,
                password: resetPassword,
            });
            setAutoInicio('iniciando');
            setResetStep(3);
            // Suena cuando el check termina de dibujarse.
            setTimeout(sonarPagoAprobado, 600);
            iniciarConNuevaContrasena(resetEmail.trim(), resetPassword);
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


    const pasoReset = {
        1: 'Confirma tu correo para recibir un código',
        2: 'Ingresa el código y tu nueva contraseña',
        3: 'Proceso completado',
    }[resetStep];

    return (
        <main className="login-page relative min-h-screen bg-[#f6f3ee] lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(460px,0.9fr)]">
            {/* Panel de marca (en móvil actúa como fondo) */}
            <aside className="login-marca fixed inset-0 overflow-hidden lg:relative lg:inset-auto lg:min-h-screen">
                <motion.div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${fondoLogin})` }}
                    initial={reducirMovimiento ? false : { scale: 1.06 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 1.6, ease: [0.25, 1, 0.5, 1] }}
                    aria-hidden="true"
                />
                <div className="login-velo absolute inset-0" aria-hidden="true" />

                <div className="relative z-10 hidden h-full flex-col justify-between p-12 xl:p-16 lg:flex">
                    <div className="flex items-center gap-3">
                        <img src={logoLibreria} alt="" className="h-12 w-12 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)]" />
                        <div>
                            <p className="font-title text-lg font-semibold leading-tight text-[#f5eedf]">Librería del Saber</p>
                            <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#dcbb7a]">Administración</p>
                        </div>
                    </div>

                    <motion.div
                        initial={reducirMovimiento ? false : { opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 1, 0.5, 1] }}
                        className="max-w-lg"
                    >
                        <span className="mb-6 block h-px w-16 bg-[#dcbb7a]/70" />
                        <h2 className="font-title text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#fffaf0] xl:text-[46px]">
                            Cada libro en su lugar,
                            <span className="block italic text-[#eedcae]">cada venta en orden.</span>
                        </h2>
                        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[#e9e0d2]/85">
                            Gestiona catálogo, inventario, reservas y ventas desde un solo lugar.
                        </p>
                    </motion.div>

                    <p className="text-xs text-[#e9e0d2]/60">
                        © {new Date().getFullYear()} Librería del Saber · Panel de uso interno
                    </p>
                </div>
            </aside>

            {/* Formulario */}
            <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
                <motion.section
                    initial={reducirMovimiento ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
                    className="login-tarjeta w-full min-w-0 max-w-[420px]"
                >
                    {/* Marca en móvil / tablet */}
                    <div className="mb-7 flex flex-col items-center text-center lg:hidden">
                        <img src={logoLibreria} alt="Librería del Saber" className="h-16 w-auto object-contain" />
                        <p className="mt-2 font-title text-lg font-semibold text-[#1c1814]">Librería del Saber</p>
                        <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#9a7231]">Administración</p>
                    </div>

                    <AnimatePresence mode="wait" initial={false}>
                        {!twoFactorToken ? (
                            <motion.div key="login" {...transicionPaso}>
                                <div className="mb-8">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9a7231]">Acceso seguro</p>
                                    <h1 className="mt-2 font-title text-[30px] font-semibold leading-tight tracking-[-0.015em] text-[#1c1814]">
                                        Iniciar sesión
                                    </h1>
                                    <p className="mt-2 text-sm text-[#766d62]">
                                        Ingresa tus credenciales de administración
                                    </p>
                                </div>

                                <MensajeError mensaje={error} />

                                <form onSubmit={enviar} className="min-w-0 space-y-5">
                                    <Campo id="login-email" etiqueta="Correo electrónico" icono={<FaEnvelope />}>
                                        <input
                                            id="login-email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="admin@libreria.com"
                                            autoComplete="email"
                                            required
                                            className="login-input"
                                        />
                                    </Campo>

                                    <Campo
                                        id="login-password"
                                        etiqueta="Contraseña"
                                        icono={<FaLock />}
                                        accion={
                                            <button
                                                type="button"
                                                onClick={() => setMostrarPassword((v) => !v)}
                                                aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                                aria-pressed={mostrarPassword}
                                                className="login-ojo"
                                            >
                                                {mostrarPassword ? <FaEyeSlash /> : <FaEye />}
                                            </button>
                                        }
                                    >
                                        <input
                                            id="login-password"
                                            type={mostrarPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Ingresa tu contraseña"
                                            autoComplete="current-password"
                                            required
                                            className="login-input"
                                        />
                                    </Campo>

                                    <div className="flex justify-end">
                                        <button type="button" onClick={openResetModal} className="login-enlace">
                                            ¿Olvidaste tu contraseña?
                                        </button>
                                    </div>

                                    <BotonPrimario cargando={cargando} textoCarga="Ingresando..." icono={<FaRightToBracket />}>
                                        Iniciar sesión
                                    </BotonPrimario>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div key="otp" {...transicionPaso}>
                                <div className="mb-8">
                                    <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#eedcae] bg-[#fcf8ef] text-lg text-[#7a5827]">
                                        <FaQrcode />
                                    </span>
                                    <h1 className="font-title text-[30px] font-semibold leading-tight tracking-[-0.015em] text-[#1c1814]">
                                        Código de verificación
                                    </h1>
                                    <p className="mt-2 text-sm text-[#766d62]">
                                        Ingresa el código de 6 dígitos de tu aplicación de autenticación
                                    </p>
                                </div>

                                <MensajeError mensaje={error} />

                                <form onSubmit={enviarCodigo} className="min-w-0 space-y-5">
                                    <Campo id="login-otp" etiqueta="Código OTP" icono={<FaKey />}>
                                        <input
                                            id="login-otp"
                                            type="text"
                                            inputMode="numeric"
                                            maxLength="6"
                                            value={codigo}
                                            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                                            placeholder="000000"
                                            autoComplete="one-time-code"
                                            autoFocus
                                            required
                                            className="login-input login-input--codigo"
                                        />
                                    </Campo>

                                    <BotonPrimario cargando={verificando} textoCarga="Verificando..." icono={<FaQrcode />}>
                                        Verificar código
                                    </BotonPrimario>

                                    <button type="button" onClick={volverAlLogin} className="login-enlace mx-auto flex items-center gap-2">
                                        <FaArrowLeft className="text-xs" /> Volver al inicio de sesión
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <p className="mt-10 text-center text-xs text-[#a39a8e] lg:hidden">
                        © {new Date().getFullYear()} Librería del Saber
                    </p>
                </motion.section>
            </div>

            {/* --- Modal de recuperación de contraseña --- */}
            <Modal abierto={showResetModal} onCerrar={closeResetModal} titulo="Restablecer contraseña" subtitulo={pasoReset}>
                <div className="login-reset">
                    <ol className="mb-5 flex items-center gap-2" aria-label="Progreso">
                        {[1, 2, 3].map((paso) => (
                            <li
                                key={paso}
                                aria-current={resetStep === paso ? 'step' : undefined}
                                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                                    resetStep >= paso ? 'bg-[#74212c]' : 'bg-[#e6e0d7]'
                                }`}
                            />
                        ))}
                    </ol>

                    <MensajeError mensaje={resetError} />

                    {/* Paso 1: confirmar correo */}
                    {resetStep === 1 && envioCorreo && (
                        <CargaCorreo enviado={envioCorreo === 'enviado'} onCompleto={alTerminarEnvio} />
                    )}

                    {resetStep === 1 && !envioCorreo && (
                        <form onSubmit={enviarCodigoReset} className="space-y-4">
                            <p className="text-sm text-[#766d62]">
                                Se enviará un código de verificación al correo registrado.
                            </p>

                            <div className="rounded-lg border border-[#e6e0d7] bg-[#faf8f5] px-4 py-3">
                                <p className="text-xs text-[#766d62]">Correo registrado</p>
                                <p className="mt-0.5 text-sm font-semibold text-[#1c1814]">
                                    {resetEmail
                                        ? resetEmail.charAt(0) + '****' + resetEmail.slice(resetEmail.indexOf('@'))
                                        : '****@****.com'}
                                </p>
                            </div>

                            <Campo id="reset-email" etiqueta="Confirma tu correo electrónico" icono={<FaEnvelope />}>
                                <input
                                    id="reset-email"
                                    type="email"
                                    value={confirmEmail}
                                    onChange={(e) => setConfirmEmail(e.target.value)}
                                    placeholder="Escribe tu correo completo"
                                    autoComplete="email"
                                    required
                                    className="login-input"
                                />
                            </Campo>

                            <BotonPrimario cargando={resetCargando} textoCarga="Enviando..." icono={<FaEnvelope />}>
                                Enviar código
                            </BotonPrimario>
                        </form>
                    )}

                    {/* Paso 2: código + nueva contraseña */}
                    {resetStep === 2 && (
                        <form onSubmit={restablecer} className="space-y-4">
                            <p className="text-sm text-[#766d62]">
                                Se envió un código a <strong className="font-semibold text-[#1c1814]">{resetEmail}</strong>.
                            </p>

                            <Campo id="reset-codigo" etiqueta="Código de verificación" icono={<FaKey />}>
                                <input
                                    id="reset-codigo"
                                    type="text"
                                    inputMode="numeric"
                                    maxLength="6"
                                    value={resetCodigo}
                                    onChange={(e) => setResetCodigo(e.target.value.replace(/\D/g, ''))}
                                    placeholder="000000"
                                    autoComplete="one-time-code"
                                    required
                                    className="login-input login-input--codigo"
                                />
                            </Campo>

                            <Campo
                                id="reset-password"
                                etiqueta="Nueva contraseña"
                                icono={<FaLock />}
                                ayuda="Mínimo 8 caracteres, con al menos una letra y un número."
                                accion={
                                    <button
                                        type="button"
                                        onClick={() => setMostrarResetPass((v) => !v)}
                                        aria-label={mostrarResetPass ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
                                        aria-pressed={mostrarResetPass}
                                        className="login-ojo"
                                    >
                                        {mostrarResetPass ? <FaEyeSlash /> : <FaEye />}
                                    </button>
                                }
                            >
                                <input
                                    id="reset-password"
                                    type={mostrarResetPass ? 'text' : 'password'}
                                    value={resetPassword}
                                    onChange={(e) => setResetPassword(e.target.value)}
                                    placeholder="Nueva contraseña"
                                    autoComplete="new-password"
                                    required
                                    className="login-input"
                                />
                            </Campo>

                            <Campo id="reset-password2" etiqueta="Confirmar contraseña" icono={<FaLock />}>
                                <input
                                    id="reset-password2"
                                    type={mostrarResetPass ? 'text' : 'password'}
                                    value={resetPassword2}
                                    onChange={(e) => setResetPassword2(e.target.value)}
                                    placeholder="Repite la contraseña"
                                    autoComplete="new-password"
                                    required
                                    className="login-input"
                                />
                            </Campo>

                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={resetPaso2Volver} className="login-boton-secundario">
                                    <FaArrowLeft className="text-xs" /> Volver
                                </button>
                                <BotonPrimario cargando={resetCargando} textoCarga="Guardando..." className="flex-1">
                                    Restablecer
                                </BotonPrimario>
                            </div>
                        </form>
                    )}

                    {/* Paso 3: listo */}
                    {resetStep === 3 && (
                        <ExitoAnimado
                            titulo="Contraseña actualizada"
                            detalle={{
                                iniciando: 'Iniciando sesión con tu nueva contraseña…',
                                'no-admin': 'Este panel es solo para administradores.',
                                error: 'No se pudo iniciar sesión automáticamente. Ingresa con tu nueva contraseña.',
                            }[autoInicio]}
                        >
                            {autoInicio === 'iniciando' ? (
                                <div className="login-autoinicio" aria-hidden="true">
                                    <motion.span
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        transition={{ duration: reducirMovimiento ? 0 : 2.4, ease: 'easeInOut' }}
                                    />
                                </div>
                            ) : (
                                <div className="mt-5">
                                    <BotonPrimario
                                        type="button"
                                        onClick={() => {
                                            closeResetModal();
                                            setEmail(resetEmail.trim());
                                            setPassword('');
                                        }}
                                        icono={<FaRightToBracket />}
                                    >
                                        Ir al inicio de sesión
                                    </BotonPrimario>
                                </div>
                            )}
                        </ExitoAnimado>
                    )}
                </div>
            </Modal>
        </main>
    );
}

const transicionPaso = {
    initial: { opacity: 0, x: 16 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.25, 1, 0.5, 1] } },
    exit: { opacity: 0, x: -16, transition: { duration: 0.18, ease: 'easeIn' } },
};

function Campo({ id, etiqueta, icono, accion = null, ayuda = null, children }) {
    return (
        <div>
            <label htmlFor={id} className="mb-2 block text-[13px] font-semibold text-[#433c35]">
                {etiqueta}
            </label>
            <div className="login-campo">
                <span className="login-campo-icono" aria-hidden="true">{icono}</span>
                {children}
                {accion}
            </div>
            {ayuda && <p className="mt-1.5 text-xs text-[#766d62]">{ayuda}</p>}
        </div>
    );
}

function BotonPrimario({ children, cargando = false, textoCarga, icono = null, type = 'submit', className = 'w-full', ...props }) {
    return (
        <button type={type} disabled={cargando} aria-busy={cargando} className={`login-boton ${className}`} {...props}>
            {cargando ? (
                <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden="true" />
                    {textoCarga}
                </>
            ) : (
                <>
                    {icono}
                    {children}
                </>
            )}
        </button>
    );
}

function MensajeError({ mensaje }) {
    return (
        <AnimatePresence initial={false}>
            {mensaje && (
                <motion.div
                    key={mensaje}
                    role="alert"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                    className="overflow-hidden"
                >
                    <div className="mb-5">
                        <Alert tipo="error">{mensaje}</Alert>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
