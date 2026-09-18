import { useEffect, useState } from 'react';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
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
    const reducirMovimiento = useReducedMotion();

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
                <main className="admin-main px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
                    <div className="mx-auto w-full max-w-[1600px]">
                        <Breadcrumbs />
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={pathname}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: reducirMovimiento ? 0 : 0.2, ease: 'easeOut' }}
                                className="pt-1"
                            >
                                <Outlet />
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>
    );
}
