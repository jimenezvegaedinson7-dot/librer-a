import { Link } from 'react-router-dom';

import logo from '../assets/logo-f-blanco-96.webp';
import { NAVEGACION, SITIO } from '../config/site';

export default function PublicFooter({ legal }) {
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
                        <p className="pie__lema">Libros físicos con catálogo en la app. Entrega a domicilio en Lima y recojo sin costo en Pallasca.</p>
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
                            <li><a href={SITIO.rutaReclamaciones}>Libro de Reclamaciones</a></li>
                            {terminos && <li><a href={terminos}>Términos y condiciones</a></li>}
                            {privacidad && <li><a href={privacidad}>Política de privacidad</a></li>}
                            {redes.map((r) => <li key={r.url}><a href={r.url} rel="noopener">{r.nombre}</a></li>)}
                        </ul>
                    </div>
                </div>
                <div className="pie__legal">
                    <p>© {new Date().getFullYear()} {SITIO.nombre} · {legal.nombreComercial} · {legal.razonSocial} · RUC {legal.ruc}</p>
                </div>
            </div>
        </footer>
    );
}
