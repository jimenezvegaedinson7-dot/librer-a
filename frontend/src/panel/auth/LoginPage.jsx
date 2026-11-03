import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FaArrowLeft, FaEnvelope, FaEye, FaEyeSlash, FaKey, FaLock, FaQrcode, FaRightToBracket } from 'react-icons/fa6';
import { login, verificarLoginOtp, solicitarReseteo, restablecerContrasena } from './authService';
import { useAuth } from '../../app/providers/AuthContext';
import { usePaginaPanel } from '../lib/hooks/usePaginaPanel';
import { Alert } from '../ui/Alert';
import { CargaCorreo, ExitoAnimado } from '../ui/Celebracion';
import { prepararSonido, sonarPagoAprobado } from '../lib/utils/sonido';
import { esPersonalInterno, inicioPorRol } from '../lib/roles';
import logoMarca from '../../compartido/assets/logo-principal-oscuro.png';
import fondoLogin from '../../compartido/assets/fondo-login.webp';
import './login.css';

const MENSAJE_FUERA_DE_PANEL = 'Este panel es solo para administradores';

export default function LoginPage() {
    usePaginaPanel('Acceso administrativo');
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

    const [mostrandoRecuperacion, setMostrandoRecuperacion] = useState(false);
    const [libroAbierto, setLibroAbierto] = useState(false);
    const recuperarRef = useRef(null);
    const [resetStep, setResetStep] = useState(1);
    const [resetEmail, setResetEmail] = useState('');
    const [resetCodigo, setResetCodigo] = useState('');
    const [resetPassword, setResetPassword] = useState('');
    const [resetPassword2, setResetPassword2] = useState('');
    const [resetError, setResetError] = useState('');
    const [resetCargando, setResetCargando] = useState(false);
    const [mostrarResetPass, setMostrarResetPass] = useState(false);
    const [envioCorreo, setEnvioCorreo] = useState(null);
    const [autoInicio, setAutoInicio] = useState('iniciando');

    const reducirMovimiento = useReducedMotion();
    const abriendoLibro = !reducirMovimiento && !libroAbierto;
    const transicionHoja = reducirMovimiento
        ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0 } }
        : {
              initial: { opacity: 0, rotateY: -70 },
              animate: { opacity: 1, rotateY: 0 },
              exit: { opacity: 0, rotateY: -70 },
              transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
          };

    if (autenticado) return <Navigate to={inicioPorRol()} replace />;

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

            if (!esPersonalInterno(data?.rol)) {
                setError(MENSAJE_FUERA_DE_PANEL);
                return;
            }

            iniciarSesion(token, data);
            navigate(inicioPorRol());
        } catch (err) {
            if (err.response?.status === 403 && /verificar tu correo/i.test(err.response?.data?.mensaje || '')) {
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

            const respuesta = await verificarLoginOtp({ two_factor_token: twoFactorToken, codigo });

            const { token, data } = respuesta;

            if (!esPersonalInterno(data?.rol)) {
                setError(MENSAJE_FUERA_DE_PANEL);
                return;
            }

            iniciarSesion(token, data);
            navigate(inicioPorRol());
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

    const abrirRecuperacion = () => {
        setMostrandoRecuperacion(true);
        setResetStep(1);
        setResetEmail(email);
        setResetCodigo('');
        setResetPassword('');
        setResetPassword2('');
        setResetError('');
        setMostrarResetPass(false);
        setEnvioCorreo(null);
    };

    const cerrarRecuperacion = () => {
        setMostrandoRecuperacion(false);
        setResetStep(1);
        setResetError('');
        setEnvioCorreo(null);
        requestAnimationFrame(() => recuperarRef.current?.focus());
    };

    const alTerminarEnvio = () => {
        setEnvioCorreo(null);
        setResetStep(2);
    };

    const iniciarConNuevaContrasena = async (correo, clave) => {
        const pausa = new Promise((resolver) => setTimeout(resolver, 2400));
        try {
            const [respuesta] = await Promise.all([login({ email: correo, password: clave }), pausa]);

            if (respuesta.requires_2fa) {
                cerrarRecuperacion();
                setEmail(correo);
                setTwoFactorToken(respuesta.two_factor_token || '');
                setCodigo('');
                setError('Contraseña actualizada. Ingresa tu código de doble factor para continuar.');
                return;
            }

            if (!esPersonalInterno(respuesta.data?.rol)) {
                setAutoInicio('no-admin');
                return;
            }

            iniciarSesion(respuesta.token, respuesta.data);
            navigate(inicioPorRol());
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

        prepararSonido();
        try {
            setResetCargando(true);
            setResetError('');
            await restablecerContrasena({ email: resetEmail.trim(), codigo: resetCodigo, password: resetPassword });
            setAutoInicio('iniciando');
            setResetStep(3);

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

    const pasoReset = { 1: 'Confirma tu correo para recibir un código', 2: 'Ingresa el código y tu nueva contraseña', 3: 'Proceso completado' }[resetStep];

    return (
        <main className="login-page" style={{ '--login-fondo': `url(${fondoLogin})` }}>
            <div className={`login-libro ${abriendoLibro ? 'login-libro--abriendo' : ''}`} onFocusCapture={() => setLibroAbierto(true)}>
                <aside className="login-marca" aria-labelledby="login-nombre-libreria">
                    <div className="login-identidad">
                        <img src={logoMarca} alt="" className="login-logo" width="226" height="301" />
                        <h2 id="login-nombre-libreria" className="login-nombre">
                            MATIDANA
                        </h2>
                        <p className="login-descripcion">Administra el catálogo, los pedidos y las operaciones de tu librería desde un solo lugar.</p>
                    </div>
                    <p className="login-marca-pie">Panel administrativo</p>
                </aside>

                <div className="login-lado" style={mostrandoRecuperacion ? { display: 'none' } : undefined}>
                    <motion.section initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0 }} className="login-tarjeta" aria-label="Acceso administrativo">
                        <AnimatePresence mode="wait" initial={false}>
                            {!twoFactorToken ? (
                                <motion.div key="login" {...transicionPaso}>
                                    <div className="mb-8">
                                        <h1 className="login-titulo">Iniciar sesión</h1>
                                        <p className="login-entradilla">Bienvenido de nuevo. Ingresa tus credenciales para continuar.</p>
                                    </div>

                                    <MensajeError mensaje={error} />

                                    <form onSubmit={enviar} className="min-w-0 space-y-4">
                                        <Campo id="login-email" etiqueta="Correo electrónico" icono={<FaEnvelope />}>
                                            <input
                                                id="login-email"
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="tu.correo@ejemplo.com"
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
                                                    className="login-ojo">
                                                    {mostrarPassword ? <FaEyeSlash /> : <FaEye />}
                                                </button>
                                            }>
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
                                            <button ref={recuperarRef} type="button" onClick={abrirRecuperacion} className="login-enlace">
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
                                        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#e3cdb2] bg-[#f7f1ea] text-lg text-[#7a5c43]">
                                            <FaQrcode />
                                        </span>
                                        <h1 className="login-titulo">Código de verificación</h1>
                                        <p className="login-entradilla">Ingresa el código de 6 dígitos de tu aplicación de autenticación</p>
                                    </div>

                                    <MensajeError mensaje={error} />

                                    <form onSubmit={enviarCodigo} className="min-w-0 space-y-4">
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

                        <p className="login-nota">
                            <FaLock aria-hidden="true" /> Acceso exclusivo para administradores
                        </p>
                        <Link to="/" className="login-volver">
                            <FaArrowLeft aria-hidden="true" /> Volver a la página principal
                        </Link>
                    </motion.section>
                </div>
                <span className="login-pliegue" aria-hidden="true" />
                {abriendoLibro && (
                    <div className="login-tapa-intro" aria-hidden="true" onAnimationEnd={() => setLibroAbierto(true)}>
                        <div className="login-tapa-frente">
                            <img src={logoMarca} alt="" width="226" height="301" />
                            <span>MATIDANA</span>
                        </div>
                        <div className="login-tapa-dorso" />
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {mostrandoRecuperacion && (
                        <motion.div className="login-lado login-hoja-recuperacion" {...transicionHoja}>
                            <section className="login-tarjeta" aria-label="Recuperar contraseña">
                                <div className="mb-8">
                                    <h1 className="login-titulo">Recuperar contraseña</h1>
                                    <p className="login-entradilla">{pasoReset}</p>
                                </div>
                                <div className="login-reset">
                                    <ol className="mb-5 flex items-center gap-2" aria-label="Progreso">
                                        {[1, 2, 3].map((paso) => (
                                            <li
                                                key={paso}
                                                aria-current={resetStep === paso ? 'step' : undefined}
                                                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${resetStep >= paso ? 'bg-mahogany-700' : 'bg-[#e6e0d7]'}`}
                                            />
                                        ))}
                                    </ol>

                                    <MensajeError mensaje={resetError} />

                                    {resetStep === 1 && envioCorreo && <CargaCorreo enviado={envioCorreo === 'enviado'} onCompleto={alTerminarEnvio} />}

                                    {resetStep === 1 && !envioCorreo && (
                                        <form onSubmit={enviarCodigoReset} className="space-y-4">
                                            <p className="text-sm text-[#766d62]">Se enviará un código de verificación al correo registrado.</p>

                                            <div className="rounded-lg border border-[#e6e0d7] bg-[#faf8f5] px-4 py-3">
                                                <p className="text-xs text-[#766d62]">Correo de recuperación</p>
                                                <p className="mt-0.5 text-sm font-semibold text-[#1c1814]">{resetEmail || 'Introduce el correo de tu cuenta'}</p>
                                            </div>

                                            <Campo id="reset-email" etiqueta="Correo electrónico de tu cuenta" icono={<FaEnvelope />}>
                                                <input
                                                    id="reset-email"
                                                    type="email"
                                                    value={resetEmail}
                                                    onChange={(e) => setResetEmail(e.target.value)}
                                                    placeholder="Escribe tu correo completo"
                                                    autoComplete="email"
                                                    autoFocus
                                                    required
                                                    className="login-input"
                                                />
                                            </Campo>

                                            <BotonPrimario cargando={resetCargando} textoCarga="Enviando..." icono={<FaEnvelope />}>
                                                Enviar código
                                            </BotonPrimario>
                                        </form>
                                    )}

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
                                                        className="login-ojo">
                                                        {mostrarResetPass ? <FaEyeSlash /> : <FaEye />}
                                                    </button>
                                                }>
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

                                    {resetStep === 3 && (
                                        <ExitoAnimado
                                            titulo="Contraseña actualizada"
                                            detalle={
                                                {
                                                    iniciando: 'Iniciando sesión con tu nueva contraseña…',
                                                    'no-admin': MENSAJE_FUERA_DE_PANEL,
                                                    error: 'No se pudo iniciar sesión automáticamente. Ingresa con tu nueva contraseña.'
                                                }[autoInicio]
                                            }>
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
                                                            cerrarRecuperacion();
                                                            setEmail(resetEmail.trim());
                                                            setPassword('');
                                                        }}
                                                        icono={<FaRightToBracket />}>
                                                        Ir al inicio de sesión
                                                    </BotonPrimario>
                                                </div>
                                            )}
                                        </ExitoAnimado>
                                    )}
                                </div>
                                <button type="button" onClick={cerrarRecuperacion} className="login-volver" disabled={resetCargando}>
                                    <FaArrowLeft aria-hidden="true" /> Volver al inicio de sesión
                                </button>
                                <Link to="/" className="login-volver">
                                    <FaArrowLeft aria-hidden="true" /> Volver a la página principal
                                </Link>
                            </section>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}

const transicionPaso = {
    initial: { opacity: 0, x: 16 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.25, 1, 0.5, 1] } },
    exit: { opacity: 0, x: -16, transition: { duration: 0.18, ease: 'easeIn' } }
};

function Campo({ id, etiqueta, icono, accion = null, ayuda = null, children }) {
    return (
        <div>
            <label htmlFor={id} className="mb-2 block text-[13px] font-semibold text-[#433c35]">
                {etiqueta}
            </label>
            <div className="login-campo">
                <span className="login-campo-icono" aria-hidden="true">
                    {icono}
                </span>
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
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                    className="overflow-hidden">
                    <div className="mb-5">
                        <Alert tipo="error">{mensaje}</Alert>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
