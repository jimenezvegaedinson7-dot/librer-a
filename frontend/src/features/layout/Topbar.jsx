import { useEffect, useMemo, useRef, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import {
    FaBars,
    FaBell,
    FaChevronDown,
    FaGear,
    FaMagnifyingGlass,
    FaMoon,
    FaRightFromBracket,
    FaSun,
    FaUser,
    FaXmark,
} from 'react-icons/fa6';

import { construirUrlArchivo } from '../../lib/api/client';
import PanelNotificaciones from '../notificaciones/PanelNotificaciones';
import { esPrimeraVez, leerVistas, marcarVistas, obtenerNotificaciones } from '../notificaciones/notificacionesService';
import { useAuth } from '../auth/AuthContext';
import PerfilAdministrador from './PerfilAdministrador';
import { navPrincipal } from './navConfig';

function Avatar({ foto, inicial, className = 'h-9 w-9' }) {
    return (
        <div className={`overflow-hidden rounded-full bg-mahogany-200 ring-2 ring-[#eedcae] ${className}`}>
            {foto ? (
                <img src={foto} alt="Foto del administrador" className="h-full w-full object-cover" />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-mahogany-700 text-sm font-semibold text-parchment-100">
                    {inicial}
                </div>
            )}
        </div>
    );
}

import { Palette } from 'lucide-react';
import { useTema } from '../../components/providers/ThemeContext';

export default function Topbar({ onAbrirMenu, onToggleSidebar }) {
    const navigate = useNavigate();
    const { usuario, cerrarSesion } = useAuth();
    const { tema, cambiarTema, getColorZona } = useTema();
    const topbarColor = getColorZona('topbar');

    const [busqueda, setBusqueda] = useState('');
    const [buscadorAbierto, setBuscadorAbierto] = useState(false);

    const [notificaciones, setNotificaciones] = useState([]);
    const [vistas, setVistas] = useState(() => leerVistas());
    const [resaltadas, setResaltadas] = useState(() => new Set());
    const [cargandoNotif, setCargandoNotif] = useState(false);
    const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);

    const [menuAbierto, setMenuAbierto] = useState(false);
    const [perfilAbierto, setPerfilAbierto] = useState(false);
    const [configAbierta, setConfigAbierta] = useState(false);

    const buscadorRef = useRef(null);
    const buscadorInputRef = useRef(null);
    const notifRef = useRef(null);
    const menuRef = useRef(null);

    const nombre = `${usuario?.nombre || ''} ${usuario?.apellido || ''}`.trim() || 'Administrador';
    const inicial = usuario?.nombre?.charAt(0)?.toUpperCase() || 'A';
    const foto = construirUrlArchivo(usuario?.foto_perfil);
    const cantidadNuevas = notificaciones.filter((n) => !vistas.has(n.clave)).length;

    const resultadosBusqueda = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        if (!texto) return [];
        return navPrincipal.filter(
            (m) => m.nombre.toLowerCase().includes(texto) || m.descripcion.toLowerCase().includes(texto),
        );
    }, [busqueda]);

    // Solo eventos que requieren atención: pagos aprobados, reservas pendientes y stock bajo.
    const cargarNotificaciones = async () => {
        try {
            setCargandoNotif(true);
            const lista = await obtenerNotificaciones();
            if (esPrimeraVez()) marcarVistas(lista.map((n) => n.clave));
            setVistas(leerVistas());
            setNotificaciones(lista);
            return lista;
        } catch {
            return [];
        } finally {
            setCargandoNotif(false);
        }
    };

    useEffect(() => {
        cargarNotificaciones();
        const intervalo = setInterval(() => cargarNotificaciones(), 60000);
        return () => clearInterval(intervalo);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const cerrarPaneles = (event) => {
            if (buscadorRef.current && !buscadorRef.current.contains(event.target)) setBuscadorAbierto(false);
            if (notifRef.current && !notifRef.current.contains(event.target)) setNotificacionesAbiertas(false);
            if (menuRef.current && !menuRef.current.contains(event.target)) setMenuAbierto(false);
        };
        document.addEventListener('mousedown', cerrarPaneles);
        return () => document.removeEventListener('mousedown', cerrarPaneles);
    }, []);

    useEffect(() => {
        const manejarAtajo = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setBuscadorAbierto(true);
                requestAnimationFrame(() => buscadorInputRef.current?.focus());
            }

            if (event.key === 'Escape' && document.activeElement === buscadorInputRef.current) {
                setBusqueda('');
                setBuscadorAbierto(false);
                buscadorInputRef.current?.blur();
            }
        };

        window.addEventListener('keydown', manejarAtajo);
        return () => window.removeEventListener('keydown', manejarAtajo);
    }, []);

    const abrirNotificaciones = async () => {
        const abrir = !notificacionesAbiertas;
        setNotificacionesAbiertas(abrir);
        setMenuAbierto(false);
        if (!abrir) return;
        const lista = await cargarNotificaciones();
        // Se resaltan las que eran nuevas y quedan marcadas como vistas.
        const vistasAntes = leerVistas();
        setResaltadas(new Set(lista.filter((n) => !vistasAntes.has(n.clave)).map((n) => n.clave)));
        marcarVistas(lista.map((n) => n.clave));
        setVistas(leerVistas());
    };

    const irANotificacion = (notificacion) => {
        setNotificacionesAbiertas(false);
        navigate(notificacion.destino);
    };

    const manejarHamburguesa = () => {
        const esDesktop = window.innerWidth >= 1024;
        if (esDesktop) {
            onToggleSidebar?.();
        } else {
            onAbrirMenu?.();
        }
    };

    const salir = () => {
        cerrarSesion();
        navigate('/', { replace: true });
    };

    const navegarModulo = (ruta) => {
        setBusqueda('');
        setBuscadorAbierto(false);
        navigate(ruta);
    };

    return (
        <>
            <header
                className="admin-topbar sticky top-0 z-30 flex h-16 w-full items-center border-b bg-white/80 backdrop-blur-md px-3 sm:px-4 lg:px-6"
                style={{
                    borderColor: topbarColor ? topbarColor.primary + '30' : '#e6e0d7',
                }}
            >
                <div className="flex w-full items-center justify-between gap-4">

                    {/* Hamburger — visible en mobile Y desktop */}
                    <button
                        type="button"
                        onClick={manejarHamburguesa}
                        aria-label="Alternar menú"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e6e0d7] bg-white text-[#766d62] transition-colors hover:bg-[#faf8f5] hover:text-[#1c1814]"
                    >
                        <FaBars className="text-sm" />
                    </button>

                    {/* Buscador */}
                    <div ref={buscadorRef} className="relative hidden w-full max-w-md sm:block">
                        <div className="admin-search flex items-center gap-2.5 rounded-xl border border-[#e6e0d7] bg-[#faf8f5] px-3.5 py-2 transition-all focus-within:bg-white focus-within:shadow-sm">
                            <FaMagnifyingGlass className="text-sm text-[#a39a8e]" />
                            <input
                                ref={buscadorInputRef}
                                type="text"
                                value={busqueda}
                                onFocus={() => setBuscadorAbierto(true)}
                                onChange={(e) => {
                                    setBusqueda(e.target.value);
                                    setBuscadorAbierto(true);
                                }}
                                placeholder="Buscar módulo..."
                                className="w-full bg-transparent text-sm text-[#1c1814] outline-none placeholder:text-[#a39a8e]"
                            />
                            {!busqueda && (
                                <kbd className="hidden shrink-0 rounded-md border border-[#e6e0d7] bg-[#f3efe9] px-1.5 py-0.5 text-[10px] font-medium text-[#a39a8e] lg:inline-flex">
                                    Ctrl K
                                </kbd>
                            )}
                            {busqueda && (
                                <button type="button" onClick={() => setBusqueda('')} aria-label="Limpiar" className="shrink-0">
                                    <FaXmark className="text-sm text-[#a39a8e]" />
                                </button>
                            )}
                        </div>

                        {buscadorAbierto && busqueda && (
                            <div className="animate-suave absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-[#e6e0d7] bg-white shadow-[0_18px_40px_-16px_rgba(28,24,20,0.28)]">
                                {resultadosBusqueda.length === 0 ? (
                                    <div className="p-5 text-center text-sm text-[#a39a8e]">Sin resultados</div>
                                ) : (
                                    resultadosBusqueda.map((modulo) => {
                                        const Icono = modulo.icono;
                                        return (
                                            <button
                                                key={modulo.ruta}
                                                type="button"
                                                onClick={() => navegarModulo(modulo.ruta)}
                                                className="flex w-full items-center gap-3 border-b border-[#f3efe9] px-4 py-3 text-left transition last:border-0 hover:bg-[#faf8f5]"
                                            >
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fbf5f4] text-[#8a2c36]">
                                                    <Icono className="text-sm" />
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block text-sm font-semibold text-[#1c1814]">{modulo.nombre}</span>
                                                    <span className="block text-xs text-[#a39a8e]">{modulo.descripcion}</span>
                                                </span>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    {/* Acciones derecha */}
                    <div className="flex items-center gap-2">

                        {/* Toggle tema */}
                        <button
                            type="button"
                            onClick={cambiarTema}
                            aria-label={tema === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
                            aria-pressed={tema === 'dark'}
                            title={tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e6e0d7] bg-white text-[#766d62] transition-all hover:border-[#d3cbbf] hover:text-[#1c1814]"
                        >
                            <span key={tema} className="theme-icon">
                                {tema === 'dark' ? <FaSun className="text-sm" /> : <FaMoon className="text-sm" />}
                            </span>
                        </button>

                        {/* Personalizar colores */}
                        <button
                            type="button"
                            onClick={() => navigate('/personalizacion')}
                            aria-label="Personalizar colores"
                            title="Personalizar colores"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e6e0d7] bg-white text-[#766d62] transition-all hover:border-[#d3cbbf] hover:text-[#1c1814]"
                        >
                            <Palette className="h-4 w-4" />
                        </button>

                        {/* Notificaciones */}
                        <div ref={notifRef} className="relative">
                            <button
                                type="button"
                                onClick={abrirNotificaciones}
                                aria-label="Notificaciones"
                                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#e6e0d7] bg-white text-[#766d62] transition-all hover:border-[#d3cbbf] hover:text-[#1c1814]"
                            >
                                <FaBell className="text-sm" />
                                {cantidadNuevas > 0 && (
                                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full admin-notif-badge px-1 text-[9px] font-bold text-white ring-2 ring-white">
                                        {cantidadNuevas > 99 ? '99+' : cantidadNuevas}
                                    </span>
                                )}
                            </button>

                            {notificacionesAbiertas && (
                                <div className="animate-suave fixed left-3 right-3 top-16 z-50 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[440px]">
                                    <PanelNotificaciones
                                        notificaciones={notificaciones}
                                        nuevas={resaltadas}
                                        cargando={cargandoNotif}
                                        onAbrir={irANotificacion}
                                        onActualizar={() => cargarNotificaciones()}
                                        onMarcarLeidas={() => setResaltadas(new Set())}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Menú admin */}
                        <div ref={menuRef} className="relative">
                            <button
                                type="button"
                                onClick={() => {
                                    setMenuAbierto(!menuAbierto);
                                    setNotificacionesAbiertas(false);
                                }}
                                aria-haspopup="menu"
                                aria-expanded={menuAbierto}
                                className="flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-[#faf8f5]"
                            >
                                <Avatar foto={foto} inicial={inicial} />
                                <div className="hidden max-w-[170px] text-left md:block">
                                    <p className="truncate text-sm font-semibold text-[#1c1814]">{nombre}</p>
                                    <p className="truncate text-[11px] text-[#a39a8e]">{usuario?.email || 'Administrador'}</p>
                                </div>
                                <FaChevronDown className={`hidden text-[10px] text-[#a39a8e] transition-transform sm:block ${menuAbierto ? 'rotate-180' : ''}`} />
                            </button>

                            {menuAbierto && (
                                <div className="animate-suave absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-[#e6e0d7] bg-white shadow-[0_18px_40px_-16px_rgba(28,24,20,0.28)]">
                                    <div className="border-b border-[#f3efe9] px-4 py-3">
                                        <p className="text-sm font-semibold text-[#1c1814]">{nombre}</p>
                                        <p className="text-[11px] text-[#a39a8e]">{usuario?.email || 'Administrador'}</p>
                                    </div>
                                    <div className="py-1.5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPerfilAbierto(true);
                                                setMenuAbierto(false);
                                            }}
                                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[#766d62] transition hover:bg-[#faf8f5] hover:text-[#1c1814]"
                                        >
                                            <FaUser className="text-sm" /> Datos del administrador
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setConfigAbierta(true);
                                                setMenuAbierto(false);
                                            }}
                                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[#766d62] transition hover:bg-[#faf8f5] hover:text-[#1c1814]"
                                        >
                                            <FaGear className="text-sm" /> Configuración
                                        </button>
                                    </div>
                                    <div className="border-t border-[#f3efe9] py-1.5">
                                        <button
                                            type="button"
                                            onClick={salir}
                                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-[#b91c1c] transition hover:bg-[#fef2f2]"
                                        >
                                            <FaRightFromBracket className="text-sm" /> Cerrar sesión
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <PerfilAdministrador
                perfilAbierto={perfilAbierto}
                onCerrarPerfil={() => setPerfilAbierto(false)}
                configAbierta={configAbierta}
                onCerrarConfig={() => setConfigAbierta(false)}
            />
        </>
    );
}
