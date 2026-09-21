import { useEffect, useMemo, useRef, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import {
    FaArrowRight,
    FaBars,
    FaBell,
    FaChevronDown,
    FaCirclePlus,
    FaClockRotateLeft,
    FaGear,
    FaMagnifyingGlass,
    FaMoon,
    FaPenToSquare,
    FaRightFromBracket,
    FaRotate,
    FaSun,
    FaTrash,
    FaUser,
    FaXmark,
} from 'react-icons/fa6';

import { construirUrlArchivo } from '../../lib/api/client';
import storage from '../../lib/storage';
import { formatearFecha } from '../../lib/utils/format';
import { obtenerHistorial } from '../historial/historialService';
import { useAuth } from '../auth/AuthContext';
import PerfilAdministrador from './PerfilAdministrador';
import { navPrincipal } from './navConfig';

const operacionConfig = (item) => {
    const tipo = String(item.tipo_operacion || '').toUpperCase();
    const descripcion = String(item.descripcion || '').toLowerCase();
    if (descripcion.includes('cancelad')) return { icono: <FaXmark />, color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: '#f87171', label: 'Cancelada' };
    if (descripcion.includes('pagada') || descripcion.includes('completada') || descripcion.includes('confirmada'))
        return { icono: <FaCirclePlus />, color: '#6cbf7b', bg: 'rgba(108,191,123,0.12)', border: '#6cbf7b', label: 'Completada' };
    if (tipo === 'CREAR') return { icono: <FaCirclePlus />, color: '#b98a4a', bg: 'rgba(185,138,74,0.12)', border: '#b98a4a', label: 'Crear' };
    if (tipo === 'ACTUALIZAR') return { icono: <FaPenToSquare />, color: '#d6b08c', bg: 'rgba(214,176,140,0.10)', border: '#d6b08c', label: 'Actualizar' };
    if (tipo === 'ELIMINAR') return { icono: <FaTrash />, color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: '#f87171', label: 'Eliminar' };
    return { icono: <FaBell />, color: '#c9b8ae', bg: 'rgba(201,184,174,0.10)', border: '#c9b8ae', label: 'Actividad' };
};

function Avatar({ foto, inicial, className = 'h-9 w-9' }) {
    return (
        <div className={`overflow-hidden rounded-full bg-mahogany-200 ring-2 ring-white ${className}`}>
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

export default function Topbar({ onAbrirMenu, onToggleSidebar, tema, onCambiarTema }) {
    const navigate = useNavigate();
    const { usuario, cerrarSesion } = useAuth();

    const [busqueda, setBusqueda] = useState('');
    const [buscadorAbierto, setBuscadorAbierto] = useState(false);

    const [notificaciones, setNotificaciones] = useState([]);
    const [cantidadNuevas, setCantidadNuevas] = useState(0);
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

    const resultadosBusqueda = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        if (!texto) return [];
        return navPrincipal.filter(
            (m) => m.nombre.toLowerCase().includes(texto) || m.descripcion.toLowerCase().includes(texto),
        );
    }, [busqueda]);

    const cargarNotificaciones = async (primeraCarga = false) => {
        try {
            setCargandoNotif(true);
            const registros = await obtenerHistorial();
            setNotificaciones(registros);
            const ultimoId = registros.length > 0 ? Number(registros[0].id_historial) : 0;
            const ultimoVisto = storage.getUltimoHistorialVisto();
            if (primeraCarga && !ultimoVisto) {
                storage.setUltimoHistorialVisto(ultimoId);
                setCantidadNuevas(0);
                return;
            }
            const nuevos = registros.filter((r) => Number(r.id_historial) > Number(ultimoVisto || 0));
            setCantidadNuevas(nuevos.length);
            return registros;
        } catch {
            setNotificaciones([]);
            return [];
        } finally {
            setCargandoNotif(false);
        }
    };

    useEffect(() => {
        cargarNotificaciones(true);
        const intervalo = setInterval(() => cargarNotificaciones(), 30000);
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
        const registros = await cargarNotificaciones();
        if (registros.length > 0) storage.setUltimoHistorialVisto(registros[0].id_historial);
        setCantidadNuevas(0);
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
            <header className="admin-topbar sticky top-0 z-30 flex h-16 w-full items-center border-b border-[#e5eaf2] bg-white/80 backdrop-blur-md px-3 sm:px-4 lg:px-6">
                <div className="flex w-full items-center justify-between gap-4">

                    {/* Hamburger — visible en mobile Y desktop */}
                    <button
                        type="button"
                        onClick={manejarHamburguesa}
                        aria-label="Alternar menú"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e5eaf2] bg-white text-[#66738c] transition-colors hover:bg-[#f5f7fb] hover:text-[#10213f]"
                    >
                        <FaBars className="text-sm" />
                    </button>

                    {/* Buscador */}
                    <div ref={buscadorRef} className="relative hidden w-full max-w-md sm:block">
                        <div className="flex items-center gap-2.5 rounded-xl border border-[#e5eaf2] bg-[#f8fafd] px-3.5 py-2 transition-all focus-within:border-[#0877e8] focus-within:bg-white focus-within:shadow-sm">
                            <FaMagnifyingGlass className="text-sm text-[#7b879d]" />
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
                                className="w-full bg-transparent text-sm text-[#10213f] outline-none placeholder:text-[#7b879d]"
                            />
                            {!busqueda && (
                                <kbd className="hidden shrink-0 rounded-md border border-[#e5eaf2] bg-[#f1f5fb] px-1.5 py-0.5 text-[10px] font-medium text-[#7b879d] lg:inline-flex">
                                    Ctrl K
                                </kbd>
                            )}
                            {busqueda && (
                                <button type="button" onClick={() => setBusqueda('')} aria-label="Limpiar" className="shrink-0">
                                    <FaXmark className="text-sm text-[#7b879d]" />
                                </button>
                            )}
                        </div>

                        {buscadorAbierto && busqueda && (
                            <div className="animate-suave absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-[#e5eaf2] bg-white shadow-lg">
                                {resultadosBusqueda.length === 0 ? (
                                    <div className="p-5 text-center text-sm text-[#7b879d]">Sin resultados</div>
                                ) : (
                                    resultadosBusqueda.map((modulo) => {
                                        const Icono = modulo.icono;
                                        return (
                                            <button
                                                key={modulo.ruta}
                                                type="button"
                                                onClick={() => navegarModulo(modulo.ruta)}
                                                className="flex w-full items-center gap-3 border-b border-[#f1f5fb] px-4 py-3 text-left transition last:border-0 hover:bg-[#f8fafd]"
                                            >
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#edf5ff] text-[#0877e8]">
                                                    <Icono className="text-sm" />
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block text-sm font-semibold text-[#10213f]">{modulo.nombre}</span>
                                                    <span className="block text-xs text-[#7b879d]">{modulo.descripcion}</span>
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
                            onClick={onCambiarTema}
                            aria-label={tema === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
                            aria-pressed={tema === 'dark'}
                            title={tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5eaf2] bg-white text-[#66738c] transition-all hover:border-[#d0d7e3] hover:text-[#10213f]"
                        >
                            <span key={tema} className="theme-icon">
                                {tema === 'dark' ? <FaSun className="text-sm" /> : <FaMoon className="text-sm" />}
                            </span>
                        </button>

                        {/* Notificaciones */}
                        <div ref={notifRef} className="relative">
                            <button
                                type="button"
                                onClick={abrirNotificaciones}
                                aria-label="Notificaciones"
                                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5eaf2] bg-white text-[#66738c] transition-all hover:border-[#d0d7e3] hover:text-[#10213f]"
                            >
                                <FaBell className="text-sm" />
                                {cantidadNuevas > 0 && (
                                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f43f5e] px-1 text-[8px] font-bold text-white shadow-sm">
                                        {cantidadNuevas > 99 ? '99+' : cantidadNuevas}
                                    </span>
                                )}
                            </button>

                            {notificacionesAbiertas && (
                                <div className="animate-suave fixed left-3 right-3 top-16 z-50 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1F1612] shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[420px]">

                                    {/* Header */}
                                    <div className="border-b border-white/[0.06] px-6 py-5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3.5">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D6B08C]/15">
                                                    <FaBell className="text-[15px] text-[#D6B08C]" />
                                                </div>
                                                <div>
                                                    <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[#F5EFE9]">
                                                        Notificaciones
                                                    </h3>
                                                    <p className="mt-0.5 text-[11px] text-[#8A7968]">
                                                        Actividades recientes del sistema
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => cargarNotificaciones()}
                                                className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-[11px] font-medium text-[#C9B8AE] transition-all hover:border-[#D6B08C]/30 hover:bg-[#D6B08C]/10 hover:text-[#D6B08C]"
                                            >
                                                <FaRotate className="text-[10px]" />
                                                Actualizar
                                            </button>
                                        </div>
                                    </div>

                                    {/* Lista */}
                                    <div className="max-h-[420px] overflow-y-auto scrollbar-dark">
                                        {cargandoNotif && notificaciones.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-14 text-center">
                                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D6B08C]/10">
                                                    <FaBell className="text-[18px] text-[#D6B08C]/50" />
                                                </div>
                                                <p className="text-[13px] font-medium text-[#F5EFE9]/60">Cargando...</p>
                                            </div>
                                        ) : notificaciones.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-14 text-center">
                                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D6B08C]/10">
                                                    <FaBell className="text-[18px] text-[#D6B08C]/40" />
                                                </div>
                                                <p className="text-[13px] font-semibold text-[#F5EFE9]/70">Sin notificaciones</p>
                                                <p className="mt-1 text-[11px] text-[#8A7968]">No hay actividad reciente</p>
                                            </div>
                                        ) : (
                                            notificaciones.slice(0, 15).map((item, index) => {
                                                const op = operacionConfig(item);
                                                return (
                                                    <div
                                                        key={item.id_historial}
                                                        className={`group flex gap-3.5 px-6 py-4 transition-all duration-200 hover:bg-white/[0.03] ${
                                                            index < 14 ? 'border-b border-white/[0.04]' : ''
                                                        }`}
                                                    >
                                                        <div
                                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[13px]"
                                                            style={{ backgroundColor: op.bg, color: op.color }}
                                                        >
                                                            {op.icono}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[12px] font-semibold capitalize text-[#F5EFE9]">
                                                                        {item.modulo || 'Sistema'}
                                                                    </span>
                                                                    <span
                                                                        className="rounded-md px-1.5 py-px text-[9px] font-bold uppercase tracking-wider"
                                                                        style={{ backgroundColor: op.bg, color: op.color }}
                                                                    >
                                                                        {op.label}
                                                                    </span>
                                                                </div>
                                                                <FaArrowRight className="text-[9px] text-[#8A7968]/0 transition-all group-hover:text-[#D6B08C]/40 group-hover:translate-x-0.5" />
                                                            </div>
                                                            <p className="mt-1.5 text-[11px] leading-relaxed text-[#C9B8AE]/80">
                                                                {item.descripcion}
                                                            </p>
                                                            <p className="mt-1.5 text-[10px] text-[#8A7968]">
                                                                {formatearFecha(item.fecha_registro)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="border-t border-white/[0.06]">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setNotificacionesAbiertas(false);
                                                navigate('/historial');
                                            }}
                                            className="group flex w-full items-center justify-center gap-2.5 bg-[#2A1D18] py-3.5 text-[12px] font-semibold text-[#D6B08C] transition-all hover:bg-[#332419]"
                                        >
                                            <FaClockRotateLeft className="text-[11px] text-[#D6B08C]/60 transition-colors group-hover:text-[#D6B08C]" />
                                            Ver historial completo
                                            <FaArrowRight className="text-[9px] opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
                                        </button>
                                    </div>
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
                                className="flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-[#f5f7fb]"
                            >
                                <Avatar foto={foto} inicial={inicial} />
                                <div className="hidden max-w-[170px] text-left md:block">
                                    <p className="truncate text-sm font-semibold text-[#10213f]">{nombre}</p>
                                    <p className="truncate text-[11px] text-[#7b879d]">{usuario?.email || 'Administrador'}</p>
                                </div>
                                <FaChevronDown className={`hidden text-[10px] text-[#7b879d] transition-transform sm:block ${menuAbierto ? 'rotate-180' : ''}`} />
                            </button>

                            {menuAbierto && (
                                <div className="animate-suave absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-[#e5eaf2] bg-white shadow-xl">
                                    <div className="border-b border-[#f1f5fb] px-4 py-3">
                                        <p className="text-sm font-semibold text-[#10213f]">{nombre}</p>
                                        <p className="text-[11px] text-[#7b879d]">{usuario?.email || 'Administrador'}</p>
                                    </div>
                                    <div className="py-1.5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPerfilAbierto(true);
                                                setMenuAbierto(false);
                                            }}
                                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[#55637b] transition hover:bg-[#f8fafd] hover:text-[#10213f]"
                                        >
                                            <FaUser className="text-sm" /> Datos del administrador
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setConfigAbierta(true);
                                                setMenuAbierto(false);
                                            }}
                                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[#55637b] transition hover:bg-[#f8fafd] hover:text-[#10213f]"
                                        >
                                            <FaGear className="text-sm" /> Configuración
                                        </button>
                                    </div>
                                    <div className="border-t border-[#f1f5fb] py-1.5">
                                        <button
                                            type="button"
                                            onClick={salir}
                                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-[#f43f5e] transition hover:bg-[#fef2f2]"
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
