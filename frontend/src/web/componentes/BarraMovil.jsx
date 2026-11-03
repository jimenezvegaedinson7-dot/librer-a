import { NavLink } from 'react-router-dom';
import { useTienda } from '../tienda/TiendaContext';
import { FaHouse, FaBook, FaCartShopping, FaUser } from 'react-icons/fa6';

const DESTINOS = [
    { ruta: '/', texto: 'Inicio', Icono: FaHouse, fin: true },
    { ruta: '/catalogo', texto: 'Catálogo', Icono: FaBook },
    { ruta: '/carrito', texto: 'Carrito', Icono: FaCartShopping },
    { ruta: '/cuenta', texto: 'Mi cuenta', Icono: FaUser }
];

export default function BarraMovil() {
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
