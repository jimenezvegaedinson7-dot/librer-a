import { NavLink } from 'react-router-dom';

import { FaBookOpen, FaXmark } from 'react-icons/fa6';

import logoLibreria from '../../assets/logo-lbl.png';
import { navPrincipal } from './navConfig';

function Sidebar({ abierto = false, onCerrar }) {
    const cerrarEnMovil = () => {
        if (window.innerWidth < 1024) onCerrar?.();
    };

    return (
        <aside
            className={`admin-sidebar fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-950 px-3 py-5 text-white shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 lg:shadow-none ${
                abierto ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
            {/* LOGO */}
            <div className="relative flex items-center justify-center pb-4 pt-1">
                <div className="flex h-24 w-24 items-center justify-center">
                    <img src={logoLibreria} alt="Logo Librería" className="h-full w-full object-contain" />
                </div>
                <button
                    type="button"
                    onClick={onCerrar}
                    aria-label="Cerrar menú"
                    className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
                >
                    <FaXmark />
                </button>
            </div>

            <div className="mb-2 px-2.5">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Menú principal
                </p>
            </div>

            <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pb-2 pr-1 [scrollbar-width:thin] [scrollbar-color:#475569_transparent]">
                {navPrincipal.map(({ nombre, ruta, icono: Icono }) => (
                    <NavLink
                        key={ruta}
                        to={ruta}
                        onClick={cerrarEnMovil}
                        className={({ isActive }) =>
                            `admin-nav-item group flex items-center gap-3 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition ${
                                isActive
                                    ? 'bg-primary-600 text-white shadow-sm'
                                    : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <span
                                    className={`admin-nav-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm transition ${
                                        isActive
                                            ? 'bg-white/15'
                                            : 'bg-white/[0.04] text-slate-400 group-hover:text-white'
                                    }`}
                                >
                                    <Icono />
                                </span>
                                <span className="flex-1 truncate">{nombre}</span>
                                {isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" />}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="mt-2 rounded-lg border border-slate-800 bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-primary-400">
                        <FaBookOpen />
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-200">Librería del Saber</p>
                        <p className="text-[10px] text-slate-500">Panel de administración</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
