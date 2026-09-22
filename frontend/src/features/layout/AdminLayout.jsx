import { useState } from 'react';

import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

import { ThemeProvider, useTema } from '../../components/providers/ThemeContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Breadcrumbs from './Breadcrumbs';

function AdminLayoutInner() {
    const [sidebarAbierto, setSidebarAbierto] = useState(false);
    const [sidebarColapsado, setSidebarColapsado] = useState(false);
    const { tema } = useTema();
    const { pathname } = useLocation();
    const reducirMovimiento = useReducedMotion();

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

            <AnimatePresence>
                {sidebarAbierto && (
                    <motion.button
                        type="button"
                        onClick={cerrarSidebar}
                        aria-label="Cerrar menú"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-40 bg-[#1c1814]/50 backdrop-blur-[2px] lg:hidden"
                    />
                )}
            </AnimatePresence>

            <div className={`min-h-screen transition-[margin] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${mlClase}`}>
                <Topbar
                    onAbrirMenu={abrirSidebar}
                    onToggleSidebar={toggleSidebar}
                />
                <main className="admin-main px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-6">
                    <div className="mx-auto w-full max-w-[1600px]">
                        <Breadcrumbs />
                        <motion.div
                            key={pathname}
                            className="pt-1"
                            initial={reducirMovimiento ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.32, ease: [0.25, 1, 0.5, 1] }}
                        >
                            <Outlet />
                        </motion.div>
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
