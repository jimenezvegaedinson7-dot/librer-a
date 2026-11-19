import { Link } from 'react-router-dom';
import { CreditCard, MapPin, ShieldCheck, Store, Truck } from 'lucide-react';
import { FaFacebook, FaInstagram, FaTiktok } from 'react-icons/fa6';
import logo from '../../assets/compartido/logo-f-verde-96.webp';
import imgReclamaciones from '../../assets/compartido/libro-reclamaciones.webp';
import { DIRECCION_RECOJO, NAVEGACION, SITIO } from '../../models/config/web/site';
import EnlacesApp from './EnlacesApp';
import MediosPago from './MediosPago';

const ICONOS_REDES = { Instagram: FaInstagram, Facebook: FaFacebook, TikTok: FaTiktok };

const CUENTA = [
    { ruta: '/cuenta', texto: 'Ingresar a mi cuenta' },
    { ruta: '/mis-compras', texto: 'Mis compras' },
    { ruta: '/favoritos', texto: 'Mis favoritos' },
    { ruta: '/carrito', texto: 'Mi carrito' }
];

const SERVICIOS = [
    { Icono: CreditCard, texto: 'Pago PayU', ruta: '/cuenta' },
    { Icono: Truck, texto: 'Delivery en Pallasca', ruta: '/nosotros#tienda' },
    { Icono: Store, texto: 'Recojo en tienda', ruta: '/nosotros#tienda' },
    { Icono: ShieldCheck, texto: 'Libro de reclamaciones', ruta: '/libro-de-reclamaciones' }
];

export default function PublicFooter() {
    const { terminos, privacidad, correo, telefono, redes } = SITIO.enlaces;

    const redesActivas = redes.filter((r) => r.url && ICONOS_REDES[r.nombre]);

    return (
        <footer className="pie">
            <div className="pie__crema">
                <div className="contenedor pie__crema-inner">
                    <div>
                        <p className="pie__crema-titulo">Descubre lo nuevo cada semana</p>
                        <p className="pie__crema-texto">Novedades y ofertas reales de nuestra librería en Pallasca.</p>
                    </div>
                    <Link to="/catalogo" className="pie__crema-cta">
                        Ver novedades
                    </Link>
                </div>
                <div className="contenedor pie__servicios">
                    {SERVICIOS.map(({ Icono, texto, ruta }) => (
                        <Link key={texto} to={ruta} className="pie__servicio">
                            <Icono aria-hidden="true" />
                            <span>{texto}</span>
                        </Link>
                    ))}
                </div>
            </div>
            <div className="contenedor">
                <div className="pie__rejilla">
                    <div className="pie__identidad">
                        <Link to="/" className="marca" aria-label={`${SITIO.nombre}, inicio`}>
                            <img src={logo} alt="" width="36" height="42" />
                            <span>{SITIO.nombre}</span>
                        </Link>
                        <p className="pie__lema">Libros físicos para descubrir en nuestra librería, en el sitio web y en la aplicación.</p>
                        <Link to="/nosotros#tienda" className="pie__direccion">
                            <MapPin aria-hidden="true" />
                            <span>{DIRECCION_RECOJO}</span>
                        </Link>
                        {(correo || telefono) && (
                            <p className="pie__contacto">
                                {correo && <a href={`mailto:${correo}`}>{correo}</a>}
                                {telefono && <a href={`tel:${telefono}`}>{telefono}</a>}
                            </p>
                        )}
                        <EnlacesApp />
                        {redesActivas.length > 0 && (
                            <ul className="pie__redes">
                                {redesActivas.map((r) => {
                                    const Icono = ICONOS_REDES[r.nombre];
                                    return (
                                        <li key={r.nombre}>
                                            <a href={r.url} rel="noopener" target="_blank" aria-label={r.nombre}>
                                                <Icono aria-hidden="true" />
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    <nav aria-label="Pie de página">
                        <h2>La librería</h2>
                        <ul>
                            {NAVEGACION.map(({ ruta, texto }) => (
                                <li key={ruta}>
                                    <Link to={ruta}>{texto}</Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <nav aria-label="Cuenta y compras">
                        <h2>Tu cuenta</h2>
                        <ul>
                            {CUENTA.map(({ ruta, texto }) => (
                                <li key={ruta}>
                                    <Link to={ruta}>{texto}</Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <div className="pie__atencion">
                        <h2>Ayuda</h2>
                        <ul>
                            <li>
                                <Link to="/nosotros#tienda">Nuestra tienda en Pallasca</Link>
                            </li>
                            {terminos && (
                                <li>
                                    <a href={terminos}>Términos y condiciones</a>
                                </li>
                            )}
                            {privacidad && (
                                <li>
                                    <a href={privacidad}>Política de privacidad</a>
                                </li>
                            )}
                        </ul>
                        <a className="pie__reclamaciones" href={SITIO.rutaReclamaciones}>
                            <img src={imgReclamaciones} alt="" width="76" height="39" loading="lazy" />
                            <span>Libro de Reclamaciones</span>
                        </a>
                    </div>
                </div>

                <div className="pie__legal">
                    <p>
                        © {new Date().getFullYear()} {SITIO.nombre}
                    </p>
                    <MediosPago />
                </div>
            </div>
        </footer>
    );
}
