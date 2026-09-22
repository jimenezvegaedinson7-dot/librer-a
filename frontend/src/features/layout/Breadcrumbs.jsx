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
        <nav aria-label="Ruta de navegación" className="admin-breadcrumbs mb-4 flex items-center gap-2 text-xs text-slate-500">
            <Link to="/dashboard" className="rounded transition-colors hover:text-slate-900">
                Panel
            </Link>
            <FaChevronRight className="text-[9px] text-slate-400" aria-hidden="true" />
            <span className="font-medium text-slate-800" aria-current="page">{nombre}</span>
        </nav>
    );
}
