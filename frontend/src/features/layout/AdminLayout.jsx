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

            <div className="min-h-screen lg:ml-64">
                <Topbar onAbrirMenu={abrirSidebar} />
                <main className="relative px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-6">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary-100/40 via-primary-50/20 to-transparent" />
                    <div className="pointer-events-none absolute -left-32 top-24 h-72 w-72 rounded-full bg-primary-200/20 blur-3xl" />
                    <div className="relative">
                        <Breadcrumbs />
                        <div className="pt-1">
                            <Outlet />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}