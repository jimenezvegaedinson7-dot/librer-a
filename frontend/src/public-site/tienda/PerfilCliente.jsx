import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    FaArrowRightFromBracket, FaBook, FaBoxOpen, FaCartShopping, FaChevronRight, FaHeart, FaMobileScreen,
    FaCircleCheck, FaClock, FaFileLines, FaRegUser, FaRegEnvelope, FaPhone, FaRegCalendar, FaPen, FaBolt, FaIdCard, FaCamera,
} from 'react-icons/fa6';
import { urlPortada } from '../lib/formato';
import { clienteApi } from './clienteApi';
import cabecera from '../assets/perfil/cabecera-biblioteca.webp';
import imgCompras from '../assets/perfil/acceso-compras.webp';
import imgFavoritos from '../assets/perfil/acceso-favoritos.webp';
import imgCarrito from '../assets/perfil/acceso-carrito.webp';
import imgCatalogo from '../assets/perfil/acceso-catalogo.webp';
import './perfil.css';

// ============================================================
// PERFIL DEL CLIENTE (Mi cuenta con sesión iniciada)
// Tarjetas de vidrio sobre un fondo cálido: presentación, "Mis datos"
// (editable: nombre, apellidos y teléfono) y accesos rápidos ilustrados.
// Solo muestra datos que devuelve el servidor.
// ============================================================
const fecha = (valor) => {
    if (!valor) return null;
    const d = new Date(valor);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
};

function Dato({ Icono, etiqueta, children }) {
    return (
        <div className="pf-dato">
            <span className="pf-dato__icono" aria-hidden="true"><Icono /></span>
            <dt>{etiqueta}</dt>
            <dd>{children}</dd>
        </div>
    );
}

function EditarDatos({ tienda, alTerminar }) {
    const u = tienda.usuario;
    const [form, setForm] = useState({ nombre: u.nombre || '', apellido: u.apellido || '', telefono: u.telefono || '' });
    const [estado, setEstado] = useState({ guardando: false, error: '' });
    const cambiar = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }));

    const guardar = async (e) => {
        e.preventDefault();
        const nombre = form.nombre.trim(), apellido = form.apellido.trim(), telefono = form.telefono.trim();
        if (!nombre || !apellido) { setEstado({ guardando: false, error: 'Escribe tu nombre y tus apellidos.' }); return; }
        if (telefono && !/^[0-9+\s-]{6,20}$/.test(telefono)) { setEstado({ guardando: false, error: 'Revisa el teléfono: solo números, de 6 a 20 dígitos.' }); return; }
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
            <label>Nombre<input value={form.nombre} onChange={cambiar('nombre')} maxLength={80} autoComplete="given-name" required /></label>
            <label>Apellidos completos<input value={form.apellido} onChange={cambiar('apellido')} maxLength={80} autoComplete="family-name" required /></label>
            <label>Teléfono<input value={form.telefono} onChange={cambiar('telefono')} maxLength={20} inputMode="tel" autoComplete="tel" placeholder="Opcional" /></label>
            {estado.error && <p className="pf-editar__error" role="alert">{estado.error}</p>}
            <div className="pf-editar__acciones">
                <button type="button" className="pf-boton pf-boton--suave" onClick={() => alTerminar('')} disabled={estado.guardando}>Cancelar</button>
                <button type="submit" className="pf-boton pf-boton--oscuro" disabled={estado.guardando}>{estado.guardando ? 'Guardando…' : 'Guardar cambios'}</button>
            </div>
        </form>
    );
}

export default function PerfilCliente({ tienda }) {
    const { nombre = '', apellido = '', email, telefono, foto_perfil: foto, fecha_registro: registro, email_verified_at: verificado } = tienda.usuario;
    const [editando, setEditando] = useState(false);
    const [mensaje, setMensaje] = useState('');
    const inicial = (nombre.trim()[0] || apellido.trim()[0] || '?').toUpperCase();
    const unidades = tienda.items.reduce((s, i) => s + i.cantidad, 0);
    const desde = fecha(registro);
    const foto_url = foto ? urlPortada(foto, 180) : null;

    const accesos = [
        { to: '/mis-compras', Icono: FaBoxOpen, tono: 'ambar', img: imgCompras, titulo: 'Mis compras', texto: 'Estado del pago y de la entrega' },
        { to: '/favoritos', Icono: FaHeart, tono: 'rosa', img: imgFavoritos, titulo: 'Mis favoritos', texto: 'Los libros que guardaste' },
        { to: '/carrito', Icono: FaCartShopping, tono: 'verde', img: imgCarrito, titulo: 'Mi carrito', texto: unidades ? `${unidades} ${unidades === 1 ? 'libro' : 'libros'} por comprar` : 'Tu carrito está vacío', etiqueta: 'Ver carrito' },
        { to: '/catalogo', Icono: FaBook, tono: 'azul', img: imgCatalogo, titulo: 'Catálogo', texto: 'Precios y stock actuales' },
    ];
    const terminar = (texto) => { setEditando(false); setMensaje(texto); };
    const [foto_estado, setFotoEstado] = useState({ subiendo: false, error: '' });
    const cambiarFoto = async (e) => {
        const archivo = e.target.files?.[0];
        e.target.value = '';
        if (!archivo) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) { setFotoEstado({ subiendo: false, error: 'Elige una imagen JPG, PNG o WebP.' }); return; }
        if (archivo.size > 5 * 1024 * 1024) { setFotoEstado({ subiendo: false, error: 'La imagen pesa más de 5 MB. Elige una más liviana.' }); return; }
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

    return (
        <section className="compra-pagina contenedor perfil pf">
            <h1 className="visualmente-oculto">Mi cuenta</h1>

            <header className="pf-tarjeta pf-hero">
                <label className="pf-hero__avatar" data-subiendo={foto_estado.subiendo || undefined} title="Cambiar foto de perfil">
                    {foto_url ? <img src={foto_url} alt="" width="84" height="84" /> : <span className="pf-hero__inicial" aria-hidden="true">{inicial}</span>}
                    <span className="pf-hero__camara" aria-hidden="true"><FaCamera /></span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={cambiarFoto} disabled={foto_estado.subiendo}
                        aria-label={foto_estado.subiendo ? 'Subiendo foto de perfil' : 'Cambiar foto de perfil'} />
                </label>
                <div className="pf-hero__quien">
                    <p className="pf-hero__nombre">{`${nombre} ${apellido}`.trim()}</p>
                    <p className="pf-hero__correo">{email}</p>
                    {desde && <p className="pf-hero__desde"><FaRegCalendar aria-hidden="true" /> Cliente desde el {desde}</p>}
                    {foto_estado.error && <p className="pf-hero__error" role="alert">{foto_estado.error}</p>}
                </div>
                <img className="pf-hero__foto" src={cabecera} alt="" width="452" height="184" />
                <button type="button" className="pf-hero__salir" onClick={tienda.cerrarSesion} aria-label="Cerrar sesión de cliente">
                    <FaArrowRightFromBracket aria-hidden="true" /> Cerrar sesión
                </button>
            </header>

            <section className="pf-tarjeta pf-seccion" aria-labelledby="perfil-datos-titulo">
                <div className="pf-seccion__cabeza">
                    <span className="pf-seccion__icono" aria-hidden="true"><FaRegUser /></span>
                    <div>
                        <h2 id="perfil-datos-titulo">Mis datos</h2>
                        <p>Aquí puedes ver la información de tu cuenta.</p>
                    </div>
                    {!editando && (
                        <button type="button" className="pf-boton pf-boton--borde" onClick={() => { setEditando(true); setMensaje(''); }}>
                            <FaPen aria-hidden="true" /> Editar datos
                        </button>
                    )}
                </div>
                {mensaje && <p className="pf-aviso" role="status"><FaCircleCheck aria-hidden="true" /> {mensaje}</p>}
                {editando
                    ? <EditarDatos tienda={tienda} alTerminar={terminar} />
                    : (
                        <dl className="pf-datos">
                            <Dato Icono={FaRegUser} etiqueta="Nombre">{nombre || '—'}</Dato>
                            <Dato Icono={FaIdCard} etiqueta="Apellido">{apellido || '—'}</Dato>
                            <Dato Icono={FaRegEnvelope} etiqueta="Correo electrónico">
                                <span className="pf-dato__correo">{email}</span>
                                {verificado
                                    ? <span className="pf-estado pf-estado--ok"><FaCircleCheck aria-hidden="true" /> Verificado</span>
                                    : <span className="pf-estado"><FaClock aria-hidden="true" /> Sin verificar</span>}
                            </Dato>
                            <Dato Icono={FaPhone} etiqueta="Teléfono">{telefono || <span className="pf-vacio">No registrado</span>}</Dato>
                            {desde && <Dato Icono={FaRegCalendar} etiqueta="Fecha de registro">{desde}</Dato>}
                        </dl>
                    )}
            </section>

            <nav className="pf-tarjeta pf-seccion" aria-label="Accesos de mi cuenta">
                <div className="pf-seccion__cabeza">
                    <span className="pf-seccion__icono" aria-hidden="true"><FaBolt /></span>
                    <div>
                        <h2>Accesos rápidos</h2>
                        <p>Todo lo que necesitas, en un solo lugar.</p>
                    </div>
                </div>
                <div className="pf-accesos">
                    {accesos.map(({ to, Icono, tono, img, titulo, texto, etiqueta }) => (
                        <Link key={to} to={to} className={`pf-acceso pf-acceso--${tono}`} aria-label={etiqueta}>
                            <span className="pf-acceso__icono" aria-hidden="true"><Icono /></span>
                            <span className="pf-acceso__texto"><strong>{titulo}</strong><small>{texto}</small></span>
                            <FaChevronRight className="pf-acceso__flecha" aria-hidden="true" />
                            <img className="pf-acceso__img" src={img} alt="" width="310" height="104" loading="lazy" />
                        </Link>
                    ))}
                </div>
                <div className="pf-secundarios">
                    <Link to="/descargar"><FaMobileScreen aria-hidden="true" /> Descarga la app</Link>
                    <Link to="/libro-de-reclamaciones"><FaFileLines aria-hidden="true" /> Libro de Reclamaciones</Link>
                </div>
            </nav>
        </section>
    );
}
