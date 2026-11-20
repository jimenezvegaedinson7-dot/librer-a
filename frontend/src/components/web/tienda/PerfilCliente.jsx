import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    FiBookOpen,
    FiCalendar,
    FiCamera,
    FiCheckCircle,
    FiClock,
    FiEdit2,
    FiFileText,
    FiHeart,
    FiLoader,
    FiLogOut,
    FiMail,
    FiMapPin,
    FiMenu,
    FiPackage,
    FiPhone,
    FiShoppingCart,
    FiSmartphone,
    FiUser,
    FiX,
    FiZoomIn
} from 'react-icons/fi';
import { useDatosCliente } from '../../../hooks/web/tienda/useDatosCliente';
import { urlPortada } from '../../../services/web/formato';
import { clienteApi } from '../../../services/web/tienda/clienteApi';
import './perfil.css';

const fecha = (valor) => {
    if (!valor) return null;
    const d = new Date(valor);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
};

function Dato({ Icono, etiqueta, children }) {
    return (
        <div className="pf-dato">
            <span className="pf-dato__icono" aria-hidden="true">
                <Icono />
            </span>
            <dt>{etiqueta}</dt>
            <dd>{children}</dd>
        </div>
    );
}

function GrupoMenu({ titulo, children }) {
    return (
        <details className="pf-grupo">
            <summary>{titulo}</summary>
            <div className="pf-grupo__lista">{children}</div>
        </details>
    );
}

function EditarDatos({ tienda, alTerminar }) {
    const u = tienda.usuario;
    const [form, setForm] = useState({ nombre: u.nombre || '', apellido: u.apellido || '', telefono: u.telefono || '' });
    const [estado, setEstado] = useState({ guardando: false, error: '' });
    const cambiar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

    const guardar = async (e) => {
        e.preventDefault();
        const nombre = form.nombre.trim(),
            apellido = form.apellido.trim(),
            telefono = form.telefono.trim();
        if (!nombre || !apellido) {
            setEstado({ guardando: false, error: 'Escribe tu nombre y tus apellidos.' });
            return;
        }
        if (telefono && !/^[0-9+\s-]{6,20}$/.test(telefono)) {
            setEstado({ guardando: false, error: 'Revisa el teléfono: solo números, de 6 a 20 dígitos.' });
            return;
        }
        setEstado({ guardando: true, error: '' });
        try {
            const json = await clienteApi.actualizarPerfil(tienda.sesion, { nombre, apellido, telefono: telefono || null });
            tienda.actualizarUsuario(json.data || { id_usuario: u.id_usuario, nombre, apellido, telefono: telefono || null });
            alTerminar('Tus datos se guardaron correctamente.');
        } catch (error) {
            setEstado({ guardando: false, error: error.message || 'No se pudieron guardar tus datos. Inténtalo otra vez.' });
        }
    };

    return (
        <form className="pf-editar" onSubmit={guardar} noValidate>
            <label>
                Nombre
                <input value={form.nombre} onChange={cambiar('nombre')} maxLength={80} autoComplete="given-name" required />
            </label>
            <label>
                Apellidos completos
                <input value={form.apellido} onChange={cambiar('apellido')} maxLength={80} autoComplete="family-name" required />
            </label>
            <label>
                Teléfono
                <input value={form.telefono} onChange={cambiar('telefono')} maxLength={20} inputMode="tel" autoComplete="tel" placeholder="Opcional" />
            </label>
            {estado.error && (
                <p className="pf-editar__error" role="alert">
                    {estado.error}
                </p>
            )}
            <div className="pf-editar__acciones">
                <button type="button" className="pf-boton pf-boton--suave" onClick={() => alTerminar('')} disabled={estado.guardando}>
                    Cancelar
                </button>
                <button type="submit" className="pf-boton pf-boton--oscuro" disabled={estado.guardando}>
                    {estado.guardando ? 'Guardando…' : 'Guardar cambios'}
                </button>
            </div>
        </form>
    );
}

export default function PerfilCliente({ tienda }) {
    const { nombre = '', apellido = '', email, telefono, foto_perfil: foto, fecha_registro: registro, email_verified_at: verificado } = tienda.usuario;
    const datos = useDatosCliente(tienda);
    const fotoInputRef = useRef(null);
    const [editando, setEditando] = useState(false);
    const [mensaje, setMensaje] = useState('');
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [foto_estado, setFotoEstado] = useState({ subiendo: false, error: '' });
    const [verFoto, setVerFoto] = useState(false);

    const nombreCompleto = `${nombre} ${apellido}`.trim();
    const inicial = (nombre.trim()[0] || apellido.trim()[0] || '?').toUpperCase();
    const desde = fecha(registro);
    const foto_url = foto ? urlPortada(foto, 180) : null;
    const direccion = datos.direccion || '';

    useEffect(() => {
        if (!verFoto) return undefined;
        const alEsc = (e) => {
            if (e.key === 'Escape') setVerFoto(false);
        };
        window.addEventListener('keydown', alEsc);
        const anterior = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', alEsc);
            document.body.style.overflow = anterior;
        };
    }, [verFoto]);

    const abrirEdicion = () => {
        setEditando(true);
        setMensaje('');
        setMenuAbierto(false);
    };
    const verDatos = () => {
        setEditando(false);
        setMensaje('');
        setMenuAbierto(false);
    };
    const terminar = (texto) => {
        setEditando(false);
        setMensaje(texto);
    };
    const cambiarFoto = async (e) => {
        const archivo = e.target.files?.[0];
        e.target.value = '';
        if (!archivo) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) {
            setFotoEstado({ subiendo: false, error: 'Elige una imagen JPG, PNG o WebP.' });
            return;
        }
        if (archivo.size > 5 * 1024 * 1024) {
            setFotoEstado({ subiendo: false, error: 'La imagen pesa más de 5 MB. Elige una más liviana.' });
            return;
        }
        setFotoEstado({ subiendo: true, error: '' });
        try {
            const json = await clienteApi.subirFoto(tienda.sesion, archivo);
            if (json.data) tienda.actualizarUsuario(json.data);
            setFotoEstado({ subiendo: false, error: '' });
            setMensaje('Tu foto de perfil se actualizó.');
        } catch (error) {
            setFotoEstado({ subiendo: false, error: error.message || 'No se pudo subir la foto. Inténtalo otra vez.' });
        }
    };

    const enlaceMenu = (props) => ({ ...props, onClick: () => setMenuAbierto(false) });

    return (
        <section className="compra-pagina contenedor perfil pf">
            <div className="pf-shell">
                <aside className="pf-sidebar">
                    <h1 className="pf-sr-only">Mi cuenta</h1>

                    <div className="pf-hero">
                        <div className="pf-hero__avatar" data-subiendo={foto_estado.subiendo || undefined}>
                            <button
                                type="button"
                                className="pf-hero__avatar-btn"
                                onClick={() => setVerFoto(true)}
                                title="Ver foto de perfil completa"
                                aria-label="Ver foto de perfil completa">
                                <span className="pf-hero__avatar-marco">
                                    {foto_url ? (
                                        <img src={foto_url} alt="" className="pf-hero__avatar-img" />
                                    ) : (
                                        <span className="pf-hero__inicial" aria-hidden="true">
                                            {inicial}
                                        </span>
                                    )}
                                    {foto_estado.subiendo && (
                                        <span className="pf-hero__avatar-spinner" role="status" aria-label="Subiendo foto de perfil">
                                            <FiLoader className="pf-hero__spinner-icono" aria-hidden="true" />
                                        </span>
                                    )}
                                </span>
                                <span className="pf-hero__avatar-lupa" aria-hidden="true">
                                    <FiZoomIn />
                                </span>
                            </button>
                            <button
                                type="button"
                                className="pf-hero__camara"
                                onClick={() => fotoInputRef.current?.click()}
                                aria-label="Elegir foto de perfil"
                                title="Elegir foto de perfil"
                                disabled={foto_estado.subiendo}>
                                <FiCamera aria-hidden="true" />
                            </button>
                            <input
                                ref={fotoInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={cambiarFoto}
                                disabled={foto_estado.subiendo}
                                className="pf-input-archivo"
                                aria-label={foto_estado.subiendo ? 'Subiendo foto de perfil' : 'Actualizar foto de perfil'}
                                hidden
                            />
                            {foto_estado.error && (
                                <p className="pf-hero__error" role="alert">
                                    {foto_estado.error}
                                </p>
                            )}
                        </div>
                        <div className="pf-hero__identidad">
                            <button
                                type="button"
                                className="pf-hero__cambiar"
                                onClick={() => fotoInputRef.current?.click()}
                                disabled={foto_estado.subiendo}>
                                <FiCamera aria-hidden="true" /> Actualizar foto de perfil
                            </button>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="pf-menu-toggle"
                        aria-label="Menú"
                        aria-expanded={menuAbierto}
                        aria-controls="pf-menu"
                        onClick={() => setMenuAbierto((abierto) => !abierto)}>
                        <FiMenu aria-hidden="true" />
                    </button>

                    <nav id="pf-menu" className={`pf-menu${menuAbierto ? ' pf-menu--abierto' : ''}`} aria-label="Accesos de mi cuenta">
                        <GrupoMenu titulo="Mis actividades">
                            <Link to="/mis-compras" className="pf-nav-item" {...enlaceMenu()}>
                                <FiPackage aria-hidden="true" /> Mis compras
                            </Link>
                            <Link to="/favoritos" className="pf-nav-item" {...enlaceMenu()}>
                                <FiHeart aria-hidden="true" /> Mis favoritos
                            </Link>
                            <Link to="/carrito" className="pf-nav-item" {...enlaceMenu()}>
                                <FiShoppingCart aria-hidden="true" /> Mi carrito
                            </Link>
                            <Link to="/catalogo" className="pf-nav-item" {...enlaceMenu()}>
                                <FiBookOpen aria-hidden="true" /> Catálogo
                            </Link>
                        </GrupoMenu>
                        <GrupoMenu titulo="Información de cuenta">
                            <button type="button" className="pf-nav-item" onClick={verDatos}>
                                <FiUser aria-hidden="true" /> Mis datos
                            </button>
                            <button type="button" className="pf-nav-item" onClick={abrirEdicion}>
                                <FiEdit2 aria-hidden="true" /> Editar datos personales
                            </button>
                        </GrupoMenu>
                        <GrupoMenu titulo="Otras opciones">
                            <Link to="/descargar" className="pf-nav-item" {...enlaceMenu()}>
                                <FiSmartphone aria-hidden="true" /> Descargar aplicación móvil
                            </Link>
                            <Link to="/libro-de-reclamaciones" className="pf-nav-item" {...enlaceMenu()}>
                                <FiFileText aria-hidden="true" /> Libro de Reclamaciones
                            </Link>
                        </GrupoMenu>
                    </nav>

                    <div className="pf-sidebar__pie">
                        <button type="button" className="pf-hero__salir" onClick={tienda.cerrarSesion} aria-label="Cerrar sesión de cliente" title="Cerrar sesión">
                            <FiLogOut aria-hidden="true" /> Salir
                        </button>
                    </div>
                </aside>

                <div className="pf-contenido">
                    <section className="pf-vista" aria-labelledby="perfil-datos-titulo">
                        <div className="pf-vista__cabeza">
                            <div>
                                <h2 id="perfil-datos-titulo">Mis datos</h2>
                                <p>Información de tu cuenta MATIDANA.</p>
                            </div>
                        </div>
                        {mensaje && (
                            <p className="pf-aviso" role="status">
                                <FiCheckCircle aria-hidden="true" /> {mensaje}
                            </p>
                        )}
                        {editando ? (
                            <EditarDatos tienda={tienda} alTerminar={terminar} />
                        ) : (
                            <dl className="pf-datos">
                                <Dato Icono={FiUser} etiqueta="Nombre">
                                    {nombre || '—'}
                                </Dato>
                                <Dato Icono={FiUser} etiqueta="Apellido">
                                    {apellido || '—'}
                                </Dato>
                                <Dato Icono={FiMail} etiqueta="Correo electrónico">
                                    <span className="pf-dato__correo">{email}</span>
                                    <span className={`pf-estado${verificado ? ' pf-estado--ok' : ''}`}>
                                        {verificado ? <FiCheckCircle aria-hidden="true" /> : <FiClock aria-hidden="true" />}
                                        {verificado ? 'Verificado' : 'Sin verificar'}
                                    </span>
                                </Dato>
                                <Dato Icono={FiPhone} etiqueta="Teléfono">
                                    {telefono || <span className="pf-vacio">No registrado</span>}
                                </Dato>
                                {desde && (
                                    <Dato Icono={FiCalendar} etiqueta="Fecha de registro">
                                        {desde}
                                    </Dato>
                                )}
                                {direccion && (
                                    <Dato Icono={FiMapPin} etiqueta="Dirección">
                                        {direccion}
                                    </Dato>
                                )}
                            </dl>
                        )}
                    </section>
                </div>
            </div>

            {verFoto && (
                <div
                    className="pf-modal-visor"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Foto de perfil completa"
                    onClick={() => setVerFoto(false)}>
                    <div className="pf-modal-visor__caja" onClick={(e) => e.stopPropagation()}>
                        <div className="pf-modal-visor__barra">
                            <span className="pf-modal-visor__titulo">Foto de perfil</span>
                            <button
                                type="button"
                                className="pf-modal-visor__cerrar"
                                onClick={() => setVerFoto(false)}
                                aria-label="Cerrar vista de foto">
                                <FiX aria-hidden="true" />
                            </button>
                        </div>
                        <div className="pf-modal-visor__contenido">
                            {foto_url ? (
                                <img src={urlPortada(foto, 1024) || foto_url} alt={`Foto de ${nombre}`} className="pf-modal-visor__img" />
                            ) : (
                                <div className="pf-modal-visor__inicial-grande" aria-hidden="true">
                                    {inicial}
                                </div>
                            )}
                        </div>
                        <div className="pf-modal-visor__pie">
                            <div className="pf-modal-visor__datos">
                                <strong>{nombreCompleto}</strong>
                                <small>{email}</small>
                            </div>
                            <label className="pf-boton pf-boton--suave pf-modal-visor__subir">
                                <FiCamera aria-hidden="true" /> Actualizar foto de perfil
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(e) => {
                                        setVerFoto(false);
                                        cambiarFoto(e);
                                    }}
                                    className="pf-input-archivo"
                                    hidden
                                />
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
