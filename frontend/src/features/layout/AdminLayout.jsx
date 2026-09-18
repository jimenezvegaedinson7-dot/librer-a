import { useEffect, useState } from 'react';

import { Outlet, useLocation } from 'react-router-dom';

import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Breadcrumbs from './Breadcrumbs';

const CLAVE_TEMA = 'libreria-admin-theme';

function obtenerTemaInicial() {
    const temaGuardado = window.localStorage.getItem(CLAVE_TEMA);
    if (temaGuardado === 'light' || temaGuardado === 'dark') return temaGuardado;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function AdminLayout() {
    const [sidebarAbierto, setSidebarAbierto] = useState(false);
    const [tema, setTema] = useState(obtenerTemaInicial);
    const { pathname } = useLocation();

    const abrirSidebar = () => setSidebarAbierto(true);
    const cerrarSidebar = () => setSidebarAbierto(false);
    const cambiarTema = () => setTema((actual) => (actual === 'dark' ? 'light' : 'dark'));

    useEffect(() => {
        window.localStorage.setItem(CLAVE_TEMA, tema);
    }, [tema]);

    return (
        <div data-theme={tema} className="admin-shell min-h-screen bg-surface">
            <Sidebar abierto={sidebarAbierto} onCerrar={cerrarSidebar} />

            {sidebarAbierto && (
                <button
                    type="button"
                    onClick={cerrarSidebar}
                    aria-label="Cerrar menú"
                    className="animate-solapa fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px] lg:hidden"
                />
            )}

            <div className="min-h-screen lg:ml-64">
                <Topbar onAbrirMenu={abrirSidebar} tema={tema} onCambiarTema={cambiarTema} />
                <main className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-6">
                    <Breadcrumbs />
                    <div key={pathname} className="page-enter pt-1">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
