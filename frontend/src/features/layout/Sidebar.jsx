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
            className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 px-3 py-5 text-white shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 lg:shadow-none ${
                abierto ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary-500/15 to-transparent" />

            {/* LOGO */}
            <div className="relative flex items-center justify-center pb-4 pt-1">
                <div className="flex h-24 w-24 items-center justify-center">
                    <img src={logoLibreria} alt="Logo Librería" className="h-full w-full object-contain drop-shadow-lg" />
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

            <div className="mb-2 flex items-center gap-2 px-2.5">
                <span className="h-px flex-1 bg-white/10" />
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
                    Menú principal
                </p>
                <span className="h-px flex-1 bg-white/10" />
            </div>

            <nav className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pb-2 pr-1 [scrollbar-width:thin] [scrollbar-color:#475569_transparent]">
                {navPrincipal.map(({ nombre, ruta, icono: Icono }) => (
                    <NavLink
                        key={ruta}
                        to={ruta}
                        onClick={cerrarEnMovil}
                        className={({ isActive }) =>
                            `group relative flex items-center gap-3 rounded-xl px-2 py-1.5 text-[13px] font-semibold transition ${
                                isActive
                                    ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-900/40'
                                    : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <span
                                    className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-white transition ${
                                        isActive ? 'opacity-100' : 'opacity-0'
                                    }`}
                                />
                                <span
                                    className={`ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm transition ${
                                        isActive
                                            ? 'bg-white/15 text-white'
                                            : 'bg-white/[0.04] text-slate-400 group-hover:bg-white/[0.08] group-hover:text-white'
                                    }`}
                                >
                                    <Icono />
                                </span>
                                <span className="flex-1 truncate">{nombre}</span>
                                {isActive && <span className="mr-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white shadow-sm" />}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="mt-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/15 text-primary-300">
                        <FaBookOpen />
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-200">Librería del Saber</p>
                        <p className="text-[10px] text-slate-500">Panel de administración</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;