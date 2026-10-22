import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { FaFacebook, FaInstagram, FaTiktok } from 'react-icons/fa6';

import logo from '../../compartido/assets/logo-f-verde-96.webp';
import imgReclamaciones from '../../compartido/assets/libro-reclamaciones.webp';

import { DIRECCION_RECOJO, NAVEGACION, SITIO } from '../config/site';
import EnlacesApp from './EnlacesApp';
import MediosPago from './MediosPago';

// El estilo del pie se carga en PublicLayout, al final de la web, para que
// sea la última capa y no dependa del orden de los temas.

const ICONOS_REDES = {
    Instagram: FaInstagram,
    Facebook: FaFacebook,
    TikTok: FaTiktok,
};

const CUENTA = [
    { ruta: '/cuenta', texto: 'Ingresar a mi cuenta' },
    { ruta: '/mis-compras', texto: 'Mis compras' },
    { ruta: '/favoritos', texto: 'Mis favoritos' },
    { ruta: '/carrito', texto: 'Mi carrito' },
];

export default function PublicFooter() {
    const { terminos, privacidad, correo, telefono, redes } = SITIO.enlaces;
    // Solo se muestran las redes con dirección real (ver config/site.js).
    const redesActivas = redes.filter((r) => r.url && ICONOS_REDES[r.nombre]);

    return (
        <footer className="pie">
            <div className="contenedor">
                <div className="pie__rejilla">
                    <div className="pie__identidad">
                        <Link to="/" className="marca" aria-label={`${SITIO.nombre}, inicio`}>
                            <img src={logo} alt="" width="36" height="42" />
                            <span>{SITIO.nombre}</span>
                        </Link>
                        <p className="pie__lema">
                            Libros físicos para descubrir en nuestra librería,
                            en el sitio web y en la aplicación.
                        </p>
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
                                    return <li key={r.nombre}>
                                        <a href={r.url} rel="noopener" target="_blank" aria-label={r.nombre}><Icono aria-hidden="true" /></a>
                                    </li>;
                                })}
                            </ul>
                        )}
                    </div>

                    <nav aria-label="Pie de página">
                        <h2>La librería</h2>
                        <ul>
                            {NAVEGACION.map(({ ruta, texto }) => (
                                <li key={ruta}><Link to={ruta}>{texto}</Link></li>
                            ))}
                        </ul>
                    </nav>

                    <nav aria-label="Cuenta y compras">
                        <h2>Tu cuenta</h2>
                        <ul>
                            {CUENTA.map(({ ruta, texto }) => (
                                <li key={ruta}><Link to={ruta}>{texto}</Link></li>
                            ))}
                        </ul>
                    </nav>

                    <div className="pie__atencion">
                        <h2>Ayuda</h2>
                        <ul>
                            <li><Link to="/nosotros#tienda">Nuestra tienda en Pallasca</Link></li>
                            {terminos && <li><a href={terminos}>Términos y condiciones</a></li>}
                            {privacidad && <li><a href={privacidad}>Política de privacidad</a></li>}
                        </ul>
                        <a className="pie__reclamaciones" href={SITIO.rutaReclamaciones}>
                            <img src={imgReclamaciones} alt="" width="76" height="39" loading="lazy" />
                            <span>Libro de Reclamaciones</span>
                        </a>
                    </div>
                </div>

                <div className="pie__legal">
                    <p>© {new Date().getFullYear()} {SITIO.nombre}</p>
                    <MediosPago />
                    <a className="pie__admin" href={SITIO.rutaLoginAdmin}>Acceso administrativo</a>
                </div>
            </div>
        </footer>
    );
}
