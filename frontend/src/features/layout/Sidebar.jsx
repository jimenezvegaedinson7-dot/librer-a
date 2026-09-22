import { NavLink } from 'react-router-dom';

import { X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

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

const resorte = { type: 'spring', stiffness: 420, damping: 36, mass: 0.8 };

function Sidebar({ abierto = false, onCerrar, colapsado = false }) {
    const { getSidebarColores } = useTema();
    const colores = getSidebarColores('sidebar');
    const reducirMovimiento = useReducedMotion();
    const acento = colores.primary || colores.sidebarText;

    const cerrarEnMovil = () => {
        if (window.innerWidth < 1024) onCerrar?.();
    };

    return (
        <aside
            aria-label="Navegación principal"
            style={{
                backgroundColor: colores.sidebarBg,
                borderColor: colores.sidebarBorder,
                color: colores.sidebarText,
                '--sb-hover': colores.sidebarHover,
            }}
            className={`
                admin-sidebar ${colores.oscuro ? 'admin-sidebar-marca' : ''}
                fixed left-0 top-0 z-50
                flex h-screen flex-col
                border-r
                transition-[width,transform] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]
                lg:translate-x-0
                ${abierto ? 'translate-x-0' : '-translate-x-full'}
                ${colapsado ? 'w-[72px]' : 'w-[250px]'}
            `}
        >
            {/* Marca */}
            <div
                style={{ borderBottomColor: colores.sidebarBorder }}
                className={`relative flex h-16 shrink-0 items-center border-b ${colapsado ? 'justify-center px-2' : 'px-4'}`}
            >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                    <img src={logoLibreria} alt="Librería del Saber" className="h-full w-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]" />
                </div>
                {!colapsado && (
                    <div className="ml-3 min-w-0">
                        <p
                            className="truncate font-title text-[17px] font-semibold leading-tight tracking-[-0.01em]"
                            style={{ color: colores.brandTitle || acento }}
                        >
                            Librería del Saber
                        </p>
                        <p className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.14em]" style={{ color: acento, opacity: 0.85 }}>
                            Administración
                        </p>
                    </div>
                )}
                <button
                    type="button"
                    onClick={onCerrar}
                    aria-label="Cerrar menú"
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg opacity-70 transition-opacity hover:opacity-100 lg:hidden"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Navegación */}
            <nav className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-4">
                {secciones.map((seccion) => (
                    <div key={seccion.nombre} className="mb-5 last:mb-0">
                        {!colapsado ? (
                            <p
                                style={{ color: colores.sidebarSection }}
                                className="mb-2 px-3 text-[10.5px] font-semibold uppercase tracking-[0.14em]"
                            >
                                {seccion.nombre}
                            </p>
                        ) : (
                            <div style={{ borderBottomColor: colores.sidebarBorder }} className="mx-2 mb-2 border-b" />
                        )}
                        <div className="space-y-0.5">
                            {seccion.items.map(({ nombre, ruta, icono: Icono }) => (
                                <NavLink
                                    key={ruta}
                                    to={ruta}
                                    onClick={cerrarEnMovil}
                                    title={colapsado ? nombre : undefined}
                                    aria-label={colapsado ? nombre : undefined}
                                    className={({ isActive }) =>
                                        `group relative flex items-center rounded-lg outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#dcbb7a]/60 ${
                                            colapsado ? 'h-10 justify-center' : 'h-10 gap-3 px-3'
                                        } ${isActive ? 'sidebar-nav-active' : 'hover:bg-[var(--sb-hover)]'}`
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            {isActive && (
                                                <motion.span
                                                    layoutId="sidebar-activo"
                                                    transition={reducirMovimiento ? { duration: 0 } : resorte}
                                                    className="absolute inset-0 rounded-lg"
                                                    style={{ backgroundColor: colores.sidebarHover || colores.primarySoft }}
                                                >
                                                    {!colapsado && (
                                                        <span
                                                            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                                                            style={{ backgroundColor: acento }}
                                                        />
                                                    )}
                                                </motion.span>
                                            )}
                                            <Icono
                                                strokeWidth={isActive ? 2 : 1.7}
                                                className={`relative shrink-0 transition-[color,opacity] duration-150 ${
                                                    colapsado ? 'h-5 w-5' : 'h-[18px] w-[18px]'
                                                } ${isActive ? '' : 'opacity-75 group-hover:opacity-100'}`}
                                                style={{ color: isActive ? acento : undefined }}
                                            />
                                            {!colapsado && (
                                                <span
                                                    className={`relative truncate text-[13.5px] ${isActive ? 'font-semibold' : 'font-medium'}`}
                                                    style={{ color: isActive ? (colores.brandTitle || acento) : undefined }}
                                                >
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

            {/* Pie */}
            <div
                style={{ borderTopColor: colores.sidebarBorder }}
                className={`shrink-0 border-t ${colapsado ? 'px-2 py-3.5' : 'px-5 py-3.5'}`}
            >
                {colapsado ? (
                    <div className="flex justify-center">
                        <span className="h-1 w-6 rounded-full" style={{ backgroundColor: acento, opacity: 0.35 }} />
                    </div>
                ) : (
                    <div className="flex items-center gap-2.5">
                        <span className="h-px flex-1" style={{ backgroundColor: acento, opacity: 0.25 }} />
                        <p style={{ color: colores.sidebarSection }} className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                            Sistema de gestión
                        </p>
                        <span className="h-px flex-1" style={{ backgroundColor: acento, opacity: 0.25 }} />
                    </div>
                )}
            </div>
        </aside>
    );
}

export default Sidebar;
