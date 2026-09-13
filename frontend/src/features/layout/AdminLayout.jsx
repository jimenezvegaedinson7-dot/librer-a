import { useState } from 'react';

import { Outlet } from 'react-router-dom';

import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Breadcrumbs from './Breadcrumbs';

export default function AdminLayout() {
    const [sidebarAbierto, setSidebarAbierto] = useState(false);

    const abrirSidebar = () => setSidebarAbierto(true);
    const cerrarSidebar = () => setSidebarAbierto(false);

    return (
        <div className="min-h-screen bg-surface">
            <Sidebar abierto={sidebarAbierto} onCerrar={cerrarSidebar} />

            {sidebarAbierto && (
                <button
                    type="button"
                    onClick={cerrarSidebar}
                    aria-label="Cerrar menú"
                    className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px] lg:hidden"
                />
            )}

            <div className="min-h-screen lg:ml-60">
                <Topbar onAbrirMenu={abrirSidebar} />
                <main className="relative px-4 py-4 sm:px-5 sm:py-4 lg:px-6 lg:py-5">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary-50/60 to-transparent" />
                    <div className="relative">
                        <Breadcrumbs />
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
