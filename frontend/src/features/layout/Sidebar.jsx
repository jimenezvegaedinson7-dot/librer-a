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
            className={`admin-sidebar fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-950 px-3 py-4 text-white transition-transform duration-200 ease-in-out lg:translate-x-0 ${
                abierto ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
            <div className="relative mb-3 flex items-center gap-3 border-b border-slate-800 px-2 pb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center p-1">
                    <img src={logoLibreria} alt="Logo Librería" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">Librería del Saber</p>
                    <p className="mt-0.5 text-xs text-slate-400">Panel administrativo</p>
                </div>
                <button
                    type="button"
                    onClick={onCerrar}
                    aria-label="Cerrar menú"
                    className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
                >
                    <FaXmark />
                </button>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto pb-2 pr-1 [scrollbar-width:thin] [scrollbar-color:#475569_transparent]">
                {secciones.map((seccion) => (
                    <div key={seccion.nombre} className="mb-3 last:mb-0">
                        <p className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
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
                                                ? 'sidebar-nav-active border-primary-400 bg-white/10 font-semibold text-white'
                                                : 'border-transparent font-medium text-slate-300 hover:bg-white/[0.05] hover:text-white'
                                        }`
                                    }
                                >
                                    <Icono className="admin-nav-icon w-4 shrink-0 text-sm text-slate-400" />
                                    <span className="truncate">{nombre}</span>
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            <p className="mt-2 border-t border-slate-800 px-2 pt-3 text-xs text-slate-500">Sistema de gestión</p>
        </aside>
    );
}

export default Sidebar;
