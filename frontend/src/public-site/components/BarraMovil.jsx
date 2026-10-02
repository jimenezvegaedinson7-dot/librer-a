import { NavLink } from 'react-router-dom';
import { FaHouse, FaBookOpen, FaStore, FaMobileScreenButton } from 'react-icons/fa6';

// ============================================================
// BARRA INFERIOR EN EL CELULAR
// Como en las tiendas en línea: los cuatro destinos principales siempre a
// mano con el pulgar. Solo se ve en pantallas angostas; en escritorio la
// navegación está en la cabecera.
// ============================================================
const DESTINOS = [
    { ruta: '/', texto: 'Inicio', Icono: FaHouse, fin: true },
    { ruta: '/catalogo', texto: 'Catálogo', Icono: FaBookOpen },
    { ruta: '/nosotros#tienda', texto: 'Tienda', Icono: FaStore },
    { ruta: '/descargar', texto: 'App', Icono: FaMobileScreenButton },
];

export default function BarraMovil() {
    return (
        <nav className="barra-movil" aria-label="Accesos rápidos">
            {DESTINOS.map(({ ruta, texto, Icono, fin }) => (
                <NavLink key={ruta} to={ruta} end={fin} className="barra-movil__enlace">
                    <Icono aria-hidden="true" />
                    <span>{texto}</span>
                </NavLink>
            ))}
        </nav>
    );
}
