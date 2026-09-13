import { useEffect } from 'react';

import { Link, useLocation } from 'react-router-dom';

import { FaChevronRight } from 'react-icons/fa6';

import { navPrincipal } from './navConfig';

export default function Breadcrumbs() {
    const { pathname } = useLocation();

    const modulo = navPrincipal
        .filter((item) => pathname === item.ruta || pathname.startsWith(`${item.ruta}/`))
        .sort((a, b) => b.ruta.length - a.ruta.length)[0];

    const nombre = modulo?.nombre || 'Panel';

    useEffect(() => {
        document.title = modulo ? `${modulo.nombre} · Panel Librería` : 'Panel Librería';
    }, [modulo]);

    return (
        <nav aria-label="Ruta de navegación" className="mb-4 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Link to="/dashboard" className="transition hover:text-primary-600 hover:underline">
                Panel
            </Link>
            <FaChevronRight className="text-[10px] text-slate-400" />
            <span className="font-semibold text-slate-700">{nombre}</span>
        </nav>
    );
}