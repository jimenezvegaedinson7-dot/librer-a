import { Link } from 'react-router-dom';

import logo from '../assets/logo-f-blanco-96.webp';
import imgReclamaciones from '../../assets/img_futter/libro-reclamaciones.webp';
import imgVisaMastercard from '../../assets/img_futter/visa-mastercard.webp';
import imgTarjetaBcp from '../../assets/img_futter/tarjeta-bcp.webp';
import imgYapePlin from '../../assets/img_futter/yape-plin.webp';
import { NAVEGACION, SITIO } from '../config/site';

export default function PublicFooter() {
    const { terminos, privacidad, correo, telefono, redes } = SITIO.enlaces;

    return (
        <footer className="pie">
            <div className="contenedor">
                <div className="pie__rejilla">
                    <div>
                        <Link to="/" className="marca" aria-label={`${SITIO.nombre}, inicio`}>
                            <img src={logo} alt="" width="30" height="35" />
                            <span>{SITIO.nombre}</span>
                        </Link>
                        <p className="pie__lema">Compra libros físicos desde la web o la app. Delivery dentro de Pallasca y recojo sin costo en Pallasca.</p>
                        {(correo || telefono) && (
                            <p className="pie__contacto">
                                {correo && <a href={`mailto:${correo}`}>{correo}</a>}
                                {correo && telefono && ' · '}
                                {telefono && <a href={`tel:${telefono}`}>{telefono}</a>}
                            </p>
                        )}
                    </div>
                    <nav aria-label="Pie de página">
                        <h2>Navegación</h2>
                        <ul>
                            {NAVEGACION.filter(({ ruta }) => ruta !== '/descargar').map(({ ruta, texto }) => (
                                <li key={ruta}><Link to={ruta}>{texto}</Link></li>
                            ))}
                        </ul>
                    </nav>
                    <div>
                        <h2>La app y atención</h2>
                        <ul>
                            <li><Link to="/descargar">Descargar la app</Link></li>
                            {terminos && <li><a href={terminos}>Términos y condiciones</a></li>}
                            {privacidad && <li><a href={privacidad}>Política de privacidad</a></li>}
                            {redes.map((r) => <li key={r.url}><a href={r.url} rel="noopener">{r.nombre}</a></li>)}
                        </ul>
                    </div>
                </div>
                {/* Libro de Reclamaciones y métodos de pago aceptados (reales: PayU en
                    línea con tarjeta; Yape y Plin en la tienda). */}
                <div className="pie__confianza">
                    <a className="pie__reclamaciones" href={SITIO.rutaReclamaciones} aria-label="Libro de Reclamaciones">
                        <img src={imgReclamaciones} alt="" width="120" height="62" loading="lazy" />
                        <span>Libro de<br />Reclamaciones</span>
                    </a>
                    <div className="pie__pagos">
                        <h2>Métodos de pago</h2>
                        <div className="pie__pagos-grupos">
                            <div>
                                <p>Pago en línea con PayU</p>
                                <ul>
                                    <li><img src={imgVisaMastercard} alt="Visa y Mastercard" width="60" height="60" loading="lazy" /></li>
                                    <li><img src={imgTarjetaBcp} alt="Tarjeta de débito Visa" width="90" height="60" loading="lazy" /></li>
                                </ul>
                            </div>
                            <div>
                                <p>En tienda</p>
                                <ul>
                                    <li><img src={imgYapePlin} alt="Yape y Plin" width="90" height="60" loading="lazy" /></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="pie__legal">
                    <p>© {new Date().getFullYear()} {SITIO.nombre}</p>
                    <a className="pie__admin" href={SITIO.rutaLoginAdmin}>Acceso administrativo</a>
                </div>
            </div>
        </footer>
    );
}
