import { NavLink } from 'react-router-dom';
import { useTienda } from '../tienda/TiendaContext';
import { FaHouse, FaBook, FaCartShopping, FaUser } from 'react-icons/fa6';

// ============================================================
// BARRA INFERIOR EN EL CELULAR
// Como en las tiendas en línea: los cuatro destinos principales siempre a
// mano con el pulgar. Solo se ve en pantallas angostas; en escritorio la
// navegación está en la cabecera.
// ============================================================
const DESTINOS = [
    { ruta: '/', texto: 'Inicio', Icono: FaHouse, fin: true },
    { ruta: '/catalogo', texto: 'Catálogo', Icono: FaBook },
    { ruta: '/carrito', texto: 'Carrito', Icono: FaCartShopping },
    { ruta: '/cuenta', texto: 'Mi cuenta', Icono: FaUser },
];

export default function BarraMovil() {
    // Sin sesión y con el carrito vacío no se muestra el carrito.
    const tienda = useTienda();
    const verCarrito = Boolean(tienda.usuario) || tienda.items.some((i) => i.cantidad > 0);
    const destinos = DESTINOS.filter((d) => d.ruta !== '/carrito' || verCarrito);
    return (
        <nav className="barra-movil" aria-label="Accesos rápidos">
            {destinos.map(({ ruta, texto, Icono, fin }) => (
                <NavLink key={ruta} to={ruta} end={fin} className="barra-movil__enlace">
                    <Icono aria-hidden="true" />
                    <span>{texto}</span>
                </NavLink>
            ))}
        </nav>
    );
}
