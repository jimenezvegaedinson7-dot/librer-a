import { NavLink } from 'react-router-dom';

import { FaXmark } from 'react-icons/fa6';

import logoLibreria from '../../assets/logo-lbl.png';
import { navPrincipal } from './navConfig';

const secciones = navPrincipal.reduce((grupos, item) => {
    const nombre = item.seccion || 'General';
    const grupo = grupos.find((actual) => actual.nombre === nombre);
    if (grupo) grupo.items.push(item);
    else grupos.push({ nombre, items: [item] });
    return grupos;
}, []);

function Sidebar({ abierto = false, onCerrar }) {
    const cerrarEnMovil = () => {
        if (window.innerWidth < 1024) onCerrar?.();
    };

    return (
        <aside
            className={`admin-sidebar fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-mahogany-700 text-parchment-100 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
                abierto ? 'translate-x-0' : '-translate-x-full'
            }`}
        >

            {/* Logo */}
            <div className="relative flex items-center gap-3 px-5 py-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10 p-1.5">
                    <img src={logoLibreria} alt="Logo" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0">
                    <p className="truncate text-sm font-bold tracking-tight text-parchment-100">Librería del Saber</p>
                    <p className="mt-0.5 text-[10px] font-medium text-mahogany-300">Panel administrativo</p>
                </div>
                <button
                    type="button"
                    onClick={onCerrar}
                    aria-label="Cerrar menú"
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg text-mahogany-300 transition-colors hover:bg-white/10 hover:text-parchment-100 lg:hidden"
                >
                    <FaXmark className="text-sm" />
                </button>
            </div>

            {/* Navegación */}
            <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 [scrollbar-width:thin] [scrollbar-color:#5a4137_transparent]">
                {secciones.map((seccion) => (
                    <div key={seccion.nombre} className="mb-4 last:mb-0">
                        <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-mahogany-400">
                            {seccion.nombre}
                        </p>
                        <div className="space-y-0.5">
                            {seccion.items.map(({ nombre, ruta, icono: Icono }) => (
                                <NavLink
                                    key={ruta}
                                    to={ruta}
                                    onClick={cerrarEnMovil}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                                            isActive
                                                ? 'sidebar-nav-active bg-white/10 font-semibold text-parchment-100 shadow-sm shadow-black/10'
                                                : 'text-mahogany-200 hover:bg-white/[0.06] hover:text-parchment-100'
                                        }`
                                    }
                                >
                                    <Icono className="w-4 shrink-0 text-sm opacity-70" />
                                    <span className="truncate">{nombre}</span>
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="border-t border-mahogany-600/50 px-5 py-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-mahogany-400">Sistema de gestión</p>
            </div>
        </aside>
    );
}

export default Sidebar;
