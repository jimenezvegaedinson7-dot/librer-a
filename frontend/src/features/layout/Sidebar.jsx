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
            className={`admin-sidebar fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-mahogany-800 bg-mahogany-700 px-3 py-4 text-parchment-100 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
                abierto ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
            <div className="relative mb-3 flex items-center gap-3 border-b border-mahogany-600 px-2 pb-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center">
                    <img src={logoLibreria} alt="Logo Librería" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0">
                    <p className="truncate font-serif text-sm font-semibold text-parchment-100">Librería del Saber</p>
                    <p className="mt-0.5 text-xs text-mahogany-300">Panel administrativo</p>
                </div>
                <button
                    type="button"
                    onClick={onCerrar}
                    aria-label="Cerrar menú"
                    className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-md text-mahogany-300 transition-colors hover:bg-white/10 hover:text-parchment-100 lg:hidden"
                >
                    <FaXmark />
                </button>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto pb-2 pr-1 [scrollbar-width:thin] [scrollbar-color:#5a4137_transparent]">
                {secciones.map((seccion) => (
                    <div key={seccion.nombre} className="mb-3 last:mb-0">
                        <p className="mb-1 px-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-mahogany-400">
                            {seccion.nombre}
                        </p>
                        <div className="space-y-0.5">
                            {seccion.items.map(({ nombre, ruta, icono: Icono }) => (
                                <NavLink
                                    key={ruta}
                                    to={ruta}
                                    onClick={cerrarEnMovil}
                                    className={({ isActive }) =>
                                        `admin-nav-item flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition-colors ${
                                            isActive
                                                ? 'sidebar-nav-active border-gold-400 bg-white/10 font-semibold text-parchment-100'
                                                : 'border-transparent font-medium text-mahogany-200 hover:bg-white/[0.06] hover:text-parchment-100'
                                        }`
                                    }
                                >
                                    <Icono className="admin-nav-icon w-4 shrink-0 text-sm text-mahogany-300" />
                                    <span className="truncate">{nombre}</span>
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            <p className="mt-2 border-t border-mahogany-600 px-2 pt-3 text-[10px] font-medium uppercase tracking-wider text-mahogany-400">Sistema de gestión</p>
        </aside>
    );
}

export default Sidebar;
