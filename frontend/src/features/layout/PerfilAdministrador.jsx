import { useEffect, useRef, useState } from 'react';

import {
    FaCamera,
    FaCircleCheck,
    FaCircleXmark,
    FaEnvelope,
    FaEye,
    FaEyeSlash,
    FaFloppyDisk,
    FaKey,
    FaLock,
    FaPhone,
    FaShieldHalved,
    FaUser,
} from 'react-icons/fa6';

import { construirUrlArchivo } from '../../lib/api/client';
import {
    actualizarFoto,
    actualizarPerfil,
    cambiarPassword,
    obtenerPerfil,
} from '../auth/perfilService';
import { confirmar2fa, desactivar2fa, setup2fa } from '../auth/authService';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/providers/ToastProvider';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Form';

function Avatar({ foto, inicial, className = 'h-10 w-10' }) {
    return (
        <div className={`overflow-hidden rounded-full bg-mahogany-200 ring-1 ring-mahogany-300 ${className}`}>
            {foto ? (
                <img src={foto} alt="Foto del administrador" className="h-full w-full object-cover" />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-mahogany-700 text-sm font-bold text-parchment-100">
                    {inicial}
                </div>
            )}
        </div>
    );
}

function Dato({ icono, etiqueta, valor }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-primary-200 bg-parchment-200 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-parchment-50 text-slate-600 shadow-sm">
                {icono}
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-400">{etiqueta}</p>
                <p className="truncate text-xs font-semibold text-slate-700">{valor}</p>
            </div>
        </div>
    );
}

function CampoPassword({ label, name, value, mostrar, onMostrar, onChange }) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
            <div className="flex items-center rounded-lg border border-primary-200 px-3 focus-within:ring-2 focus-within:ring-gold-100">
                <input
                    type={mostrar ? 'text' : 'password'}
                    name={name}
                    value={value}
                    onChange={onChange}
                    className="w-full py-2.5 text-sm text-slate-700 outline-none"
                />
                <button type="button" onClick={onMostrar} className="text-primary-400">
                    {mostrar ? <FaEyeSlash /> : <FaEye />}
                </button>
            </div>
        </div>
    );
}

export default function PerfilAdministrador({ perfilAbierto, onCerrarPerfil, configAbierta, onCerrarConfig }) {
    const { usuario, actualizarUsuario } = useAuth();
    const toast = useToast();

    const [perfil, setPerfil] = useState(null);

    const [formularioPerfil, setFormularioPerfil] = useState({ nombre: '', apellido: '', email: '', telefono: '' });
    const [guardandoPerfil, setGuardandoPerfil] = useState(false);

    const [fotoSeleccionada, setFotoSeleccionada] = useState(null);
    const [previewFoto, setPreviewFoto] = useState(null);
    const [subiendoFoto, setSubiendoFoto] = useState(false);
    const inputFotoRef = useRef(null);

    const [formularioPassword, setFormularioPassword] = useState({
        password_actual: '',
        password_nueva: '',
        confirmar_password: '',
    });
    const [mostrarPwd, setMostrarPwd] = useState({ actual: false, nueva: false, confirmar: false });
    const [cambiandoPassword, setCambiandoPassword] = useState(false);

    const [setupInfo, setSetupInfo] = useState(null);
    const [configurando2FA, setConfigurando2FA] = useState(false);
    const [codigoConfirmar, setCodigoConfirmar] = useState('');
    const [confirmando2FA, setConfirmando2FA] = useState(false);
    const [desactivando2FA, setDesactivando2FA] = useState(false);
    const [mostrarFormDesactivar, setMostrarFormDesactivar] = useState(false);
    const [codigoDesactivar, setCodigoDesactivar] = useState('');
    const [passwordDesactivar, setPasswordDesactivar] = useState('');
    const [mostrarPwdDesactivar, setMostrarPwdDesactivar] = useState(false);

    const cargarPerfil = async () => {
        const datos = await obtenerPerfil();
        if (!datos) return;
        setPerfil(datos);
        actualizarUsuario(datos);
        setFormularioPerfil({
            nombre: datos.nombre || '',
            apellido: datos.apellido || '',
            email: datos.email || '',
            telefono: datos.telefono || '',
        });
    };

    useEffect(() => {
        cargarPerfil();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const inicial = (perfil?.nombre || usuario?.nombre || 'A').charAt(0).toUpperCase();
    const foto = construirUrlArchivo(perfil?.foto_perfil || usuario?.foto_perfil);

    const cerrarConfig = () => {
        onCerrarConfig();
        if (previewFoto) URL.revokeObjectURL(previewFoto);
        setPreviewFoto(null);
        setFotoSeleccionada(null);
        setSetupInfo(null);
        setCodigoConfirmar('');
        setCodigoDesactivar('');
        setPasswordDesactivar('');
        setMostrarFormDesactivar(false);
    };

    const seleccionarFoto = (e) => {
        const archivo = e.target.files?.[0];
        if (!archivo) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) {
            toast.error('Solo se permiten imágenes JPG, PNG o WEBP');
            e.target.value = '';
            return;
        }
        if (archivo.size > 5 * 1024 * 1024) {
            toast.error('La imagen no puede superar los 5 MB');
            e.target.value = '';
            return;
        }
        if (previewFoto) URL.revokeObjectURL(previewFoto);
        setFotoSeleccionada(archivo);
        setPreviewFoto(URL.createObjectURL(archivo));
    };

    const subirFoto = async () => {
        if (!fotoSeleccionada) {
            toast.error('Selecciona una foto primero');
            return;
        }
        try {
            setSubiendoFoto(true);
            const { datos } = await actualizarFoto(fotoSeleccionada);
            if (datos) {
                actualizarUsuario(datos);
                setPerfil(datos);
            }
            toast.exito('Foto actualizada correctamente');
            setFotoSeleccionada(null);
            if (previewFoto) URL.revokeObjectURL(previewFoto);
            setPreviewFoto(null);
            if (inputFotoRef.current) inputFotoRef.current.value = '';
        } catch (error) {
            toast.error(error.response?.data?.mensaje || 'Error al actualizar la foto');
        } finally {
            setSubiendoFoto(false);
        }
    };

    const guardarPerfil = async (e) => {
        e.preventDefault();
        try {
            setGuardandoPerfil(true);
            const { datos } = await actualizarPerfil(formularioPerfil);
            if (datos) {
                actualizarUsuario(datos);
                setPerfil(datos);
            }
            toast.exito('Perfil actualizado correctamente');
        } catch (error) {
            toast.error(error.response?.data?.mensaje || 'Error al actualizar el perfil');
        } finally {
            setGuardandoPerfil(false);
        }
    };

    const guardarPassword = async (e) => {
        e.preventDefault();
        try {
            setCambiandoPassword(true);
            const mensaje = await cambiarPassword(formularioPassword);
            toast.exito(mensaje);
            setFormularioPassword({ password_actual: '', password_nueva: '', confirmar_password: '' });
        } catch (error) {
            toast.error(error.response?.data?.mensaje || 'Error al cambiar la contraseña');
        } finally {
            setCambiandoPassword(false);
        }
    };

    const estado2FA = Number(perfil?.two_factor_enabled ?? usuario?.two_factor_enabled ?? 0) === 1;

    const refrescarPerfil2FA = async () => {
        const datos = await obtenerPerfil();
        if (datos) {
            setPerfil(datos);
            actualizarUsuario(datos);
        }
    };

    const iniciarConfiguracion2FA = async () => {
        try {
            setConfigurando2FA(true);
            const respuesta = await setup2fa();
            setSetupInfo(respuesta?.data || null);
            setCodigoConfirmar('');
        } catch (error) {
            toast.error(error.response?.data?.mensaje || 'Error al iniciar la configuración del doble factor');
        } finally {
            setConfigurando2FA(false);
        }
    };

    const confirmarActivacion2FA = async (e) => {
        e.preventDefault();
        if (!/^\d{6}$/.test(codigoConfirmar)) {
            toast.error('El código debe tener 6 dígitos');
            return;
        }
        try {
            setConfirmando2FA(true);
            const respuesta = await confirmar2fa(codigoConfirmar);
            setSetupInfo(null);
            setCodigoConfirmar('');
            await refrescarPerfil2FA();
            toast.exito(respuesta?.mensaje || 'Doble factor activado correctamente');
        } catch (error) {
            toast.error(error.response?.data?.mensaje || 'El código es incorrecto o ha expirado');
        } finally {
            setConfirmando2FA(false);
        }
    };

    const enviarDesactivacion2FA = async (e) => {
        e.preventDefault();
        if (!/^\d{6}$/.test(codigoDesactivar)) {
            toast.error('El código debe tener 6 dígitos');
            return;
        }
        try {
            setDesactivando2FA(true);
            const respuesta = await desactivar2fa({ password: passwordDesactivar, codigo: codigoDesactivar });
            setCodigoDesactivar('');
            setPasswordDesactivar('');
            await refrescarPerfil2FA();
            toast.exito(respuesta?.mensaje || 'Doble factor desactivado correctamente');
        } catch (error) {
            toast.error(error.response?.data?.mensaje || 'Error al desactivar el doble factor');
        } finally {
            setDesactivando2FA(false);
        }
    };

    const cambioCampo = (e, setter) => {
        const { name, value } = e.target;
        setter((anterior) => ({ ...anterior, [name]: value }));
    };

    const fuentePerfil = perfil || usuario || {};

    return (
        <>
            {/* MODAL DATOS DEL ADMINISTRADOR */}
            <Modal titulo="Datos del administrador" subtitulo="Información registrada en el sistema" abierto={perfilAbierto} onCerrar={onCerrarPerfil}>
                <div className="mb-5 flex justify-center">
                    <Avatar foto={foto} inicial={inicial} className="h-24 w-24" />
                </div>
                <div className="space-y-2">
                    <Dato icono={<FaUser />} etiqueta="Nombre" valor={fuentePerfil.nombre || 'No registrado'} />
                    <Dato icono={<FaUser />} etiqueta="Apellido" valor={fuentePerfil.apellido || 'No registrado'} />
                    <Dato icono={<FaEnvelope />} etiqueta="Correo electrónico" valor={fuentePerfil.email || 'No registrado'} />
                    <Dato icono={<FaPhone />} etiqueta="Teléfono" valor={fuentePerfil.telefono || 'No registrado'} />
                    <Dato icono={<FaShieldHalved />} etiqueta="Rol" valor={fuentePerfil.rol || 'Administrador'} />
                </div>
            </Modal>

            {/* MODAL CONFIGURACIÓN */}
            <Modal
                titulo="Configuración"
                subtitulo="Administra tu perfil y seguridad"
                grande
                abierto={configAbierta}
                onCerrar={cerrarConfig}
            >
                <div className="space-y-6">
                    {/* FOTO */}
                    <section>
                        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-primary-400">Foto de perfil</h3>
                        <div className="flex flex-col items-center gap-4 rounded-xl border border-primary-200 bg-parchment-200 p-4 sm:flex-row">
                            <Avatar foto={previewFoto || foto} inicial={inicial} className="h-20 w-20" />
                            <div className="flex-1">
                                <input
                                    ref={inputFotoRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={seleccionarFoto}
                                    className="hidden"
                                />
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variante="secondary"
                                        icono={<FaCamera />}
                                        onClick={() => inputFotoRef.current?.click()}
                                    >
                                        Seleccionar foto
                                    </Button>
                                    {fotoSeleccionada && (
                                        <Button variante="primary" cargando={subiendoFoto} onClick={subirFoto}>
                                            {subiendoFoto ? 'Subiendo foto...' : 'Guardar foto'}
                                        </Button>
                                    )}
                                </div>
                                {subiendoFoto && <div className="upload-progress mt-3" role="progressbar" aria-label="Subiendo foto"><span /></div>}
                                <p className="mt-2 text-xs text-primary-400">JPG, PNG o WEBP. Máximo 5 MB.</p>
                            </div>
                        </div>
                    </section>

                    {/* DATOS PERSONALES */}
                    <section>
                        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-primary-400">Información personal</h3>
                        <form onSubmit={guardarPerfil} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Input label="Nombre" name="nombre" value={formularioPerfil.nombre} onChange={(e) => cambioCampo(e, setFormularioPerfil)} />
                            <Input label="Apellido" name="apellido" value={formularioPerfil.apellido} onChange={(e) => cambioCampo(e, setFormularioPerfil)} />
                            <Input label="Correo electrónico" type="email" name="email" value={formularioPerfil.email} onChange={(e) => cambioCampo(e, setFormularioPerfil)} />
                            <Input label="Teléfono" name="telefono" value={formularioPerfil.telefono} onChange={(e) => cambioCampo(e, setFormularioPerfil)} />
                            <div className="flex justify-end sm:col-span-2">
                                <Button type="submit" cargando={guardandoPerfil} icono={<FaFloppyDisk />}>
                                    Guardar cambios
                                </Button>
                            </div>
                        </form>
                    </section>

                    {/* SEGURIDAD */}
                    <section className="border-t border-primary-200 pt-5">
                        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-primary-400">Seguridad</h3>
                        <form onSubmit={guardarPassword} className="space-y-4">
                            <CampoPassword
                                label="Contraseña actual"
                                name="password_actual"
                                value={formularioPassword.password_actual}
                                mostrar={mostrarPwd.actual}
                                onMostrar={() => setMostrarPwd((p) => ({ ...p, actual: !p.actual }))}
                                onChange={(e) => cambioCampo(e, setFormularioPassword)}
                            />
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <CampoPassword
                                    label="Nueva contraseña"
                                    name="password_nueva"
                                    value={formularioPassword.password_nueva}
                                    mostrar={mostrarPwd.nueva}
                                    onMostrar={() => setMostrarPwd((p) => ({ ...p, nueva: !p.nueva }))}
                                    onChange={(e) => cambioCampo(e, setFormularioPassword)}
                                />
                                <CampoPassword
                                    label="Confirmar contraseña"
                                    name="confirmar_password"
                                    value={formularioPassword.confirmar_password}
                                    mostrar={mostrarPwd.confirmar}
                                    onMostrar={() => setMostrarPwd((p) => ({ ...p, confirmar: !p.confirmar }))}
                                    onChange={(e) => cambioCampo(e, setFormularioPassword)}
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button type="submit" variante="primary" cargando={cambiandoPassword} icono={<FaLock />}>
                                    Cambiar contraseña
                                </Button>
                            </div>
                        </form>
                    </section>

                    {/* DOBLE FACTOR */}
                    <section className="border-t border-primary-200 pt-5">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-wide text-primary-400">Doble factor de autenticación</h3>
                            {estado2FA ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-1 text-[11px] font-semibold text-success ring-1 ring-success/20">
                                    <FaCircleCheck /> Activado
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-parchment-300 px-2.5 py-1 text-[11px] font-semibold text-primary-400 ring-1 ring-primary-200">
                                    <FaCircleXmark /> Desactivado
                                </span>
                            )}
                        </div>

                        {!setupInfo && !estado2FA && (
                            <Button icono={<FaShieldHalved />} cargando={configurando2FA} onClick={iniciarConfiguracion2FA}>
                                Activar doble factor
                            </Button>
                        )}

                        {setupInfo && !estado2FA && (
                            <div className="space-y-4">
                                <div className="flex flex-col items-center gap-4 rounded-xl border border-primary-200 bg-parchment-200 p-4 sm:flex-row">
                                    {setupInfo.qr && (
                                        <img
                                            src={setupInfo.qr}
                                            alt="Código QR del doble factor"
                                            className="h-44 w-44 rounded-lg border border-primary-200 bg-parchment-50 p-1"
                                        />
                                    )}
                                    <div className="flex-1 space-y-2 text-sm text-primary-500">
                                        <p className="text-xs text-primary-400">
                                            Escanea el código QR con tu app de autenticación (Google Authenticator, Authy, etc.). Si no puedes escanearlo, ingresa el código secreto manualmente.
                                        </p>
                                        <div className="rounded-lg border border-dashed border-primary-300 bg-parchment-50 px-3 py-2">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-400">Código secreto</p>
                                            <p className="font-mono text-sm font-semibold tracking-wider text-slate-700">{setupInfo.secret}</p>
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={confirmarActivacion2FA} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto]">
                                    <Input
                                        label="Código de verificación"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength="6"
                                        value={codigoConfirmar}
                                        onChange={(e) => setCodigoConfirmar(e.target.value.replace(/\D/g, ''))}
                                        placeholder="000000"
                                        required
                                        icono={<FaKey />}
                                    />
                                    <div className="flex gap-2">
                                        <Button type="submit" variante="primary" cargando={confirmando2FA} icono={<FaCircleCheck />}>
                                            Confirmar y activar
                                        </Button>
                                        <Button type="button" variante="ghost" onClick={() => setSetupInfo(null)}>
                                            Cancelar
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {estado2FA && (
                            <div className="space-y-3">
                                <p className="text-sm text-primary-400">
                                    La verificación en dos pasos está activa. Cada inicio de sesión requerirá un código de tu app de autenticación.
                                </p>
                                {!mostrarFormDesactivar ? (
                                    <Button variante="danger" icono={<FaCircleXmark />} onClick={() => setMostrarFormDesactivar(true)}>
                                        Desactivar doble factor
                                    </Button>
                                ) : (
                                    <form onSubmit={enviarDesactivacion2FA} className="space-y-3 rounded-xl border border-primary-200 bg-parchment-200 p-4">
                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Contraseña actual</label>
                                            <div className="flex items-center rounded-lg border border-primary-200 px-3 focus-within:ring-2 focus-within:ring-gold-100">
                                                <input
                                                    type={mostrarPwdDesactivar ? 'text' : 'password'}
                                                    value={passwordDesactivar}
                                                    onChange={(e) => setPasswordDesactivar(e.target.value)}
                                                    required
                                                    autoComplete="current-password"
                                                    className="w-full py-2.5 text-sm text-slate-700 outline-none"
                                                />
                                                <button type="button" onClick={() => setMostrarPwdDesactivar((v) => !v)} className="text-primary-400">
                                                    {mostrarPwdDesactivar ? <FaEyeSlash /> : <FaEye />}
                                                </button>
                                            </div>
                                        </div>
                                        <Input
                                            label="Código de verificación"
                                            type="text"
                                            inputMode="numeric"
                                            maxLength="6"
                                            value={codigoDesactivar}
                                            onChange={(e) => setCodigoDesactivar(e.target.value.replace(/\D/g, ''))}
                                            placeholder="000000"
                                            required
                                            icono={<FaKey />}
                                        />
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                type="button"
                                                variante="ghost"
                                                onClick={() => {
                                                    setMostrarFormDesactivar(false);
                                                    setPasswordDesactivar('');
                                                    setCodigoDesactivar('');
                                                }}
                                            >
                                                Cancelar
                                            </Button>
                                            <Button type="submit" variante="danger" cargando={desactivando2FA} icono={<FaCircleXmark />}>
                                                Desactivar
                                            </Button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </Modal>
        </>
    );
}
