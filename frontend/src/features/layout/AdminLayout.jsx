import { useState } from 'react';

import { Outlet } from 'react-router-dom';

import { ThemeProvider, useTema } from '../../components/providers/ThemeContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Breadcrumbs from './Breadcrumbs';

function AdminLayoutInner() {
    const [sidebarAbierto, setSidebarAbierto] = useState(false);
    const [sidebarColapsado, setSidebarColapsado] = useState(false);
    const { tema } = useTema();

    const abrirSidebar = () => setSidebarAbierto(true);
    const cerrarSidebar = () => setSidebarAbierto(false);
    const toggleSidebar = () => setSidebarColapsado((prev) => !prev);

    const mlClase = sidebarColapsado ? 'lg:ml-[72px]' : 'lg:ml-[250px]';

    return (
        <div data-theme={tema} className="admin-shell min-h-screen bg-surface">
            <Sidebar
                abierto={sidebarAbierto}
                onCerrar={cerrarSidebar}
                colapsado={sidebarColapsado}
            />

            {sidebarAbierto && (
                <button
                    type="button"
                    onClick={cerrarSidebar}
                    aria-label="Cerrar menu"
                    className="animate-solapa fixed inset-0 z-40 bg-mahogany-900/40 backdrop-blur-sm lg:hidden"
                />
            )}

            <div className={`min-h-screen transition-all duration-300 ease-in-out ${mlClase}`}>
                <Topbar
                    onAbrirMenu={abrirSidebar}
                    onToggleSidebar={toggleSidebar}
                />
                <main className="admin-main px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-6">
                    <div className="mx-auto w-full max-w-[1600px]">
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

export default function AdminLayout() {
    return (
        <ThemeProvider>
            <AdminLayoutInner />
        </ThemeProvider>
    );
}
