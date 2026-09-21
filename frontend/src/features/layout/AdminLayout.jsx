import { useEffect, useState } from 'react';

import { Outlet } from 'react-router-dom';

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
    const [sidebarColapsado, setSidebarColapsado] = useState(false);
    const [tema, setTema] = useState(obtenerTemaInicial);

    const abrirSidebar = () => setSidebarAbierto(true);
    const cerrarSidebar = () => setSidebarAbierto(false);
    const toggleSidebar = () => setSidebarColapsado((prev) => !prev);
    const cambiarTema = () => setTema((actual) => (actual === 'dark' ? 'light' : 'dark'));

    useEffect(() => {
        window.localStorage.setItem(CLAVE_TEMA, tema);
    }, [tema]);

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
                    aria-label="Cerrar menú"
                    className="animate-solapa fixed inset-0 z-40 bg-mahogany-900/40 backdrop-blur-sm lg:hidden"
                />
            )}

            <div className={`min-h-screen transition-all duration-300 ease-in-out ${mlClase}`}>
                <Topbar
                    onAbrirMenu={abrirSidebar}
                    onToggleSidebar={toggleSidebar}
                    tema={tema}
                    onCambiarTema={cambiarTema}
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
