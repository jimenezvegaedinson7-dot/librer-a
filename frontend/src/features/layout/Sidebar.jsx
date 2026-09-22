import { NavLink } from 'react-router-dom';

import { X } from 'lucide-react';

import logoLibreria from '../../assets/logo-lbl.png';
import { navPrincipal } from './navConfig';

const secciones = navPrincipal.reduce((grupos, item) => {
    const nombre = item.seccion || 'General';
    const grupo = grupos.find((actual) => actual.nombre === nombre);
    if (grupo) grupo.items.push(item);
    else grupos.push({ nombre, items: [item] });
    return grupos;
}, []);

function Sidebar({ abierto = false, onCerrar, colapsado = false }) {
    const cerrarEnMovil = () => {
        if (window.innerWidth < 1024) onCerrar?.();
    };

    return (
        <aside
            className={`
                admin-sidebar
                fixed left-0 top-0 z-50
                flex h-screen flex-col
                border-r border-[#E2E8F0]
                bg-white text-[#334155]
                transition-all duration-300 ease-in-out
                lg:translate-x-0
                ${abierto ? 'translate-x-0' : '-translate-x-full'}
                ${colapsado ? 'w-[72px]' : 'w-[250px]'}
            `}
        >

            {/* Logo */}
            <div className="relative flex items-center border-b border-[#E2E8F0] px-4 py-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden">
                    <img src={logoLibreria} alt="Logo" className="h-full w-full object-contain" />
                </div>
                {!colapsado && (
                    <div className="ml-3 min-w-0">
                        <p className="truncate text-[16px] font-semibold tracking-tight text-[#0f172a]">Librería del Saber</p>
                        <p className="mt-0.5 text-[12px] text-[#94a3b8]">Panel administrativo</p>
                    </div>
                )}
                <button
                    type="button"
                    onClick={onCerrar}
                    aria-label="Cerrar menú"
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg text-[#94a3b8] transition-colors hover:bg-[#f1f5f9] hover:text-[#334155] lg:hidden"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Navegación */}
            <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 pt-3 [scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent]">
                {secciones.map((seccion) => (
                    <div key={seccion.nombre} className="mb-3 last:mb-0">
                        {!colapsado && (
                            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#94a3b8]">
                                {seccion.nombre}
                            </p>
                        )}
                        {colapsado && <div className="mb-2 border-b border-[#E2E8F0] mx-2" />}
                        <div className={colapsado ? 'space-y-1' : 'space-y-0.5'}>
                            {seccion.items.map(({ nombre, ruta, icono: Icono }) => (
                                <NavLink
                                    key={ruta}
                                    to={ruta}
                                    onClick={cerrarEnMovil}
                                    title={colapsado ? nombre : undefined}
                                    className={({ isActive }) =>
                                        `group relative flex items-center rounded-lg transition-all duration-150 ${
                                            colapsado
                                                ? 'justify-center px-0 py-2.5'
                                                : 'gap-3 px-3 py-2.5'
                                        } ${
                                            isActive
                                                ? 'sidebar-nav-active bg-[#eff6ff] text-[#2563eb]'
                                                : 'text-[#475569] hover:bg-[#f8fafc] hover:text-[#0f172a]'
                                        }`
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            {isActive && !colapsado && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#2563eb]" />
                                            )}
                                            <Icono
                                                strokeWidth={1.8}
                                                className={`shrink-0 transition-colors duration-150 ${
                                                    colapsado ? 'h-5 w-5' : 'h-[18px] w-[18px]'
                                                } ${
                                                    isActive
                                                        ? 'text-[#2563eb]'
                                                        : 'text-[#64748b] group-hover:text-[#2563eb]'
                                                }`}
                                            />
                                            {!colapsado && (
                                                <span className={`truncate text-[14px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                                                    {nombre}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className={`border-t border-[#E2E8F0] bg-white ${colapsado ? 'px-2 py-3' : 'px-5 py-3'}`}>
                {!colapsado && (
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#94a3b8]">Sistema de gestión</p>
                )}
                {colapsado && (
                    <div className="flex justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#CBD5E1]" />
                    </div>
                )}
            </div>
        </aside>
    );
}

export default Sidebar;
