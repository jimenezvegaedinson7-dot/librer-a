import { NavLink } from 'react-router-dom';

import { X } from 'lucide-react';

import { useTema } from '../../components/providers/ThemeContext';
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
    const { colorAcento, colores } = useTema();

    const cerrarEnMovil = () => {
        if (window.innerWidth < 1024) onCerrar?.();
    };

    return (
        <aside
            style={{
                backgroundColor: colores.sidebarBg,
                borderColor: colores.sidebarBorder,
                color: colores.sidebarText,
            }}
            className={`
                admin-sidebar
                fixed left-0 top-0 z-50
                flex h-screen flex-col
                border-r
                transition-all duration-300 ease-in-out
                lg:translate-x-0
                ${abierto ? 'translate-x-0' : '-translate-x-full'}
                ${colapsado ? 'w-[72px]' : 'w-[250px]'}
            `}
        >
            {/* Logo */}
            <div
                style={{ borderBottomColor: colores.sidebarBorder }}
                className="relative flex items-center border-b px-4 py-4"
            >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden">
                    <img src={logoLibreria} alt="Logo" className="h-full w-full object-contain" />
                </div>
                {!colapsado && (
                    <div className="ml-3 min-w-0">
                        <p className="truncate text-[16px] font-semibold tracking-tight" style={{ color: colores.primary }}>Libreria del Saber</p>
                        <p className="mt-0.5 text-[12px] opacity-60">Panel administrativo</p>
                    </div>
                )}
                <button
                    type="button"
                    onClick={onCerrar}
                    aria-label="Cerrar menu"
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg opacity-60 transition-colors hover:opacity-100 lg:hidden"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Navegacion */}
            <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 pt-3 [scrollbar-width:thin]">
                {secciones.map((seccion) => (
                    <div key={seccion.nombre} className="mb-3 last:mb-0">
                        {!colapsado && (
                            <p
                                style={{ color: colores.sidebarSection }}
                                className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.08em]"
                            >
                                {seccion.nombre}
                            </p>
                        )}
                        {colapsado && (
                            <div
                                style={{ borderBottomColor: colores.sidebarBorder }}
                                className="mb-2 border-b mx-2"
                            />
                        )}
                        <div className={colapsado ? 'space-y-1' : 'space-y-0.5'}>
                            {seccion.items.map(({ nombre, ruta, icono: Icono }) => (
                                <NavLink
                                    key={ruta}
                                    to={ruta}
                                    onClick={cerrarEnMovil}
                                    title={colapsado ? nombre : undefined}
                                    style={({ isActive }) => {
                                        const base = {
                                            borderRadius: '0.5rem',
                                            transition: 'all 0.15s',
                                        };
                                        if (isActive) {
                                            return {
                                                ...base,
                                                backgroundColor: colores.primarySoft,
                                                color: colores.primary,
                                            };
                                        }
                                        return base;
                                    }}
                                    className={({ isActive }) =>
                                        `group relative flex items-center transition-all duration-150 ${
                                            colapsado
                                                ? 'justify-center px-0 py-2.5'
                                                : 'gap-3 px-3 py-2.5'
                                        } ${
                                            isActive
                                                ? 'sidebar-nav-active font-semibold'
                                                : 'hover:opacity-100'
                                        }`
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            {isActive && !colapsado && (
                                                <span
                                                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                                                    style={{ backgroundColor: colores.primary }}
                                                />
                                            )}
                                            <Icono
                                                strokeWidth={1.8}
                                                className={`shrink-0 transition-colors duration-150 ${
                                                    colapsado ? 'h-5 w-5' : 'h-[18px] w-[18px]'
                                                }`}
                                                style={{
                                                    color: isActive ? colores.primary : undefined,
                                                }}
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
            <div
                style={{
                    borderTopColor: colores.sidebarBorder,
                    backgroundColor: colores.sidebarBg,
                }}
                className={`border-t ${colapsado ? 'px-2 py-3' : 'px-5 py-3'}`}
            >
                {!colapsado && (
                    <p
                        style={{ color: colores.sidebarSection }}
                        className="text-[10px] font-bold uppercase tracking-[0.08em]"
                    >
                        Sistema de gestion
                    </p>
                )}
                {colapsado && (
                    <div className="flex justify-center">
                        <div
                            style={{ backgroundColor: colores.sidebarSection }}
                            className="h-1.5 w-1.5 rounded-full opacity-40"
                        />
                    </div>
                )}
            </div>
        </aside>
    );
}

export default Sidebar;
