import { Link } from 'react-router-dom';
import {
    FaArrowRightFromBracket, FaBook, FaBoxOpen, FaCartShopping, FaChevronRight, FaHeart, FaMobileScreen,
    FaCircleCheck, FaClock,
} from 'react-icons/fa6';
import { urlPortada } from '../lib/formato';

// ============================================================
// PERFIL DEL CLIENTE (Mi cuenta con sesión iniciada)
// Tarjeta del perfil con sus datos registrados y, al lado, los accesos.
// Tonos crema y dorado; solo muestra datos que devuelve el servidor.
// ============================================================
const fecha = (valor) => {
    if (!valor) return null;
    const d = new Date(valor);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function PerfilCliente({ tienda }) {
    const { nombre = '', apellido = '', email, telefono, foto_perfil: foto, fecha_registro: registro, email_verified_at: verificado } = tienda.usuario;
    const iniciales = `${nombre.trim()[0] || ''}${apellido.trim()[0] || ''}`.toUpperCase() || '?';
    const unidades = tienda.items.reduce((s, i) => s + i.cantidad, 0);
    const desde = fecha(registro);
    const foto_url = foto ? urlPortada(foto, 160) : null;

    const accesos = [
        { to: '/mis-compras', Icono: FaBoxOpen, titulo: 'Mis compras', texto: 'Estado del pago y de la entrega' },
        { to: '/favoritos', Icono: FaHeart, titulo: 'Mis favoritos', texto: 'Los libros que guardaste' },
        { to: '/carrito', Icono: FaCartShopping, titulo: 'Mi carrito', texto: unidades ? `${unidades} ${unidades === 1 ? 'libro' : 'libros'} por comprar` : 'Tu carrito está vacío', etiqueta: 'Ver carrito' },
        { to: '/catalogo', Icono: FaBook, titulo: 'Catálogo', texto: 'Precios y stock actuales' },
        { to: '/descargar', Icono: FaMobileScreen, titulo: 'La app', texto: 'Compras e historial con la misma cuenta' },
    ];

    return (
        <section className="compra-pagina contenedor perfil">
            <h1>Mi cuenta</h1>
            <div className="perfil__rejilla">
                <div className="perfil__columna">
                    <div className="perfil__tarjeta">
                        <span className="perfil__avatar" aria-hidden="true">
                            {foto_url ? <img src={foto_url} alt="" width="76" height="76" /> : iniciales}
                        </span>
                        <div className="perfil__quien">
                            <p className="perfil__nombre">{`${nombre} ${apellido}`.trim()}</p>
                            <p className="perfil__correo">{email}</p>
                            {desde && <p className="perfil__desde">Cliente desde el {desde}</p>}
                        </div>
                        <button type="button" className="perfil__salir" onClick={tienda.cerrarSesion} aria-label="Cerrar sesión de cliente">
                            <FaArrowRightFromBracket aria-hidden="true" /> Cerrar sesión
                        </button>
                    </div>

                    <section className="perfil__datos" aria-labelledby="perfil-datos-titulo">
                        <h2 id="perfil-datos-titulo">Mis datos</h2>
                        <dl>
                            <div><dt>Nombre</dt><dd>{nombre || '—'}</dd></div>
                            <div><dt>Apellido</dt><dd>{apellido || '—'}</dd></div>
                            <div className="perfil__dato-ancho"><dt>Correo electrónico</dt><dd>{email}
                                {verificado
                                    ? <span className="perfil__estado perfil__estado--ok"><FaCircleCheck aria-hidden="true" /> Verificado</span>
                                    : <span className="perfil__estado"><FaClock aria-hidden="true" /> Sin verificar</span>}</dd></div>
                            <div><dt>Teléfono</dt><dd>{telefono || <span className="perfil__vacio">No registrado</span>}</dd></div>
                            {desde && <div><dt>Fecha de registro</dt><dd>{desde}</dd></div>}
                        </dl>
                    </section>
                </div>

                <nav className="perfil__accesos" aria-label="Accesos de mi cuenta">
                    <h2>Accesos rápidos</h2>
                    {accesos.map(({ to, Icono, titulo, texto, etiqueta }) => (
                        <Link key={to} to={to} className="perfil__acceso" aria-label={etiqueta}>
                            <span className="perfil__acceso-icono" aria-hidden="true"><Icono /></span>
                            <span><strong>{titulo}</strong><small>{texto}</small></span>
                            <FaChevronRight aria-hidden="true" />
                        </Link>
                    ))}
                </nav>
            </div>
        </section>
    );
}
