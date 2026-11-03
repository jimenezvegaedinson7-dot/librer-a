import { useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FaCreditCard, FaReceipt, FaTruck } from 'react-icons/fa6';

import { PageHeader } from '../ui/PageHeader';
import './gestion-ventas.css';

const VISTAS = [
    { ruta: '/ventas', nombre: 'Ventas y pagos', detalle: 'Compras y cobros', Icono: FaCreditCard },
    { ruta: '/ventas/pedidos', nombre: 'Pedidos', detalle: 'Delivery y recojo', Icono: FaTruck },
    { ruta: '/ventas/comprobantes', nombre: 'Comprobantes', detalle: 'Boletas y facturas', Icono: FaReceipt },
];

export default function GestionVentasPage() {
    const { pathname } = useLocation();
    const navegar = useNavigate();
    const enlaces = useRef([]);
    const activa = Math.max(0, VISTAS.findIndex(vista => vista.ruta === pathname));

    const alTeclear = (evento, indice) => {
        let siguiente;
        if (evento.key === 'ArrowRight') siguiente = (indice + 1) % VISTAS.length;
        else if (evento.key === 'ArrowLeft') siguiente = (indice - 1 + VISTAS.length) % VISTAS.length;
        else if (evento.key === 'Home') siguiente = 0;
        else if (evento.key === 'End') siguiente = VISTAS.length - 1;
        else return;
        evento.preventDefault();
        navegar(VISTAS[siguiente].ruta);
        enlaces.current[siguiente]?.focus();
    };

    return (
        <div className="gestion-ventas space-y-4">
            <PageHeader titulo="Gestión de ventas" descripcion="Compras, cobros, entregas y comprobantes en un solo lugar" />
            <div className="pestanas gestion-ventas__pestanas" role="tablist" aria-label="Vistas de gestión de ventas">
                {VISTAS.map(({ ruta, nombre, detalle, Icono }, indice) => (
                    <NavLink key={ruta} to={ruta} end role="tab" id={`gestion-ventas-tab-${indice}`}
                        ref={el => { enlaces.current[indice] = el; }}
                        aria-selected={activa === indice} aria-controls="gestion-ventas-panel"
                        tabIndex={activa === indice ? 0 : -1} onKeyDown={e => alTeclear(e, indice)}
                        className={`pestana${activa === indice ? ' pestana--activa' : ''}`}>
                        <span className="pestana-icono" aria-hidden="true"><Icono /></span>
                        <span><span className="pestana-texto">{nombre}</span><span className="pestana-detalle">{detalle}</span></span>
                    </NavLink>
                ))}
            </div>
            <div id="gestion-ventas-panel" role="tabpanel" aria-labelledby={`gestion-ventas-tab-${activa}`}>
                <Outlet />
            </div>
        </div>
    );
}
