import { useEffect, useMemo, useRef, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import {
    FaBars,
    FaBell,
    FaChevronDown,
    FaCirclePlus,
    FaGear,
    FaMagnifyingGlass,
    FaPenToSquare,
    FaRightFromBracket,
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

const operacionEstilo = (item) => {
    const tipo = String(item.tipo_operacion || '').toUpperCase();
    const descripcion = String(item.descripcion || '').toLowerCase();
    if (descripcion.includes('cancelad')) return { icono: <FaXmark />, clase: 'bg-red-100 text-red-600' };
    if (descripcion.includes('pagada') || descripcion.includes('completada') || descripcion.includes('confirmada'))
        return { icono: <FaCirclePlus />, clase: 'bg-emerald-100 text-emerald-600' };
    if (tipo === 'CREAR') return { icono: <FaCirclePlus />, clase: 'bg-emerald-100 text-emerald-600' };
    if (tipo === 'ACTUALIZAR') return { icono: <FaPenToSquare />, clase: 'bg-amber-100 text-amber-600' };
    if (tipo === 'ELIMINAR') return { icono: <FaTrash />, clase: 'bg-red-100 text-red-600' };
    return { icono: <FaBell />, clase: 'bg-slate-100 text-slate-600' };
};

function Avatar({ foto, inicial, className = 'h-9 w-9' }) {
    return (
        <div className={`overflow-hidden rounded-full bg-slate-200 ring-1 ring-slate-300 ${className}`}>
            {foto ? (
                <img src={foto} alt="Foto del administrador" className="h-full w-full object-cover" />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-800 text-sm font-semibold text-white">
                    {inicial}
                </div>
            )}
        </div>
    );
}

export default function Topbar({ onAbrirMenu }) {
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

    const abrirNotificaciones = async () => {
        const abrir = !notificacionesAbiertas;
        setNotificacionesAbiertas(abrir);
        setMenuAbierto(false);
        if (!abrir) return;
        const registros = await cargarNotificaciones();
        if (registros.length > 0) storage.setUltimoHistorialVisto(registros[0].id_historial);
        setCantidadNuevas(0);
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
            <header className="sticky top-0 z-30 flex h-16 w-full items-center border-b border-slate-200 bg-white px-3 sm:px-4 lg:px-6">
                <div className="flex w-full items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onAbrirMenu}
                        aria-label="Abrir menú"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 lg:hidden"
                    >
                        <FaBars />
                    </button>

                    {/* BUSCADOR */}
                    <div ref={buscadorRef} className="relative hidden w-full max-w-sm sm:block">
                        <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 transition focus-within:border-primary-400 focus-within:bg-white">
                            <FaMagnifyingGlass className="text-slate-400" />
                            <input
                                type="text"
                                value={busqueda}
                                onFocus={() => setBuscadorAbierto(true)}
                                onChange={(e) => {
                                    setBusqueda(e.target.value);
                                    setBuscadorAbierto(true);
                                }}
                                placeholder="Buscar módulo..."
                                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                            />
                            {busqueda && (
                                <button type="button" onClick={() => setBusqueda('')} aria-label="Limpiar">
                                    <FaXmark className="text-slate-400" />
                                </button>
                            )}
                        </div>
                        {buscadorAbierto && busqueda && (
                            <div className="animate-suave absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                                {resultadosBusqueda.length === 0 ? (
                                    <div className="p-5 text-center text-sm text-slate-600">Sin resultados</div>
                                ) : (
                                    resultadosBusqueda.map((modulo) => {
                                        const Icono = modulo.icono;
                                        return (
                                            <button
                                                key={modulo.ruta}
                                                type="button"
                                                onClick={() => navegarModulo(modulo.ruta)}
                                                className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left transition last:border-0 hover:bg-slate-50"
                                            >
                                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                                                    <Icono />
                                                </span>
                                                <span>
                                                    <span className="block text-sm font-bold text-slate-700">{modulo.nombre}</span>
                                                    <span className="block text-xs text-slate-600">{modulo.descripcion}</span>
                                                </span>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        {/* NOTIFICACIONES */}
                        <div ref={notifRef} className="relative">
                            <button
                                type="button"
                                onClick={abrirNotificaciones}
                                aria-label="Notificaciones"
                                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
                            >
                                <FaBell />
                                {cantidadNuevas > 0 && (
                                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">
                                        {cantidadNuevas > 99 ? '99+' : cantidadNuevas}
                                    </span>
                                )}
                            </button>
                            {notificacionesAbiertas && (
                                <div className="animate-suave fixed left-3 right-3 top-16 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[380px]">
                                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-800">Notificaciones</h3>
                                            <p className="text-xs text-slate-500">Actividades recientes</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => cargarNotificaciones()}
                                            className="text-xs font-semibold text-slate-600"
                                        >
                                            Actualizar
                                        </button>
                                    </div>
                                    <div className="max-h-[380px] overflow-y-auto">
                                        {cargandoNotif && notificaciones.length === 0 ? (
                                            <div className="p-6 text-center text-sm text-slate-500">Cargando...</div>
                                        ) : notificaciones.length === 0 ? (
                                            <div className="p-6 text-center text-sm text-slate-600">Sin notificaciones</div>
                                        ) : (
                                            notificaciones.map((item) => {
                                                const op = operacionEstilo(item);
                                                return (
                                                    <div
                                                        key={item.id_historial}
                                                        className="flex gap-3 border-b border-slate-100 px-4 py-3 last:border-0"
                                                    >
                                                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${op.clase}`}>
                                                            {op.icono}
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex justify-between gap-2">
                                                                <p className="truncate text-sm font-bold capitalize text-slate-700">
                                                                    {item.modulo || 'Sistema'}
                                                                </p>
                                                                <span className="whitespace-nowrap text-xs text-slate-400">{formatearFecha(item.fecha_registro)}</span>
                                                            </div>
                                                            <p className="mt-1 text-sm leading-snug text-slate-500">{item.descripcion}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNotificacionesAbiertas(false);
                                            navigate('/historial');
                                        }}
                                        className="w-full border-t border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-700"
                                    >
                                        Ver historial completo
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* MENÚ ADMIN */}
                        <div ref={menuRef} className="relative">
                            <button
                                type="button"
                                onClick={() => {
                                    setMenuAbierto(!menuAbierto);
                                    setNotificacionesAbiertas(false);
                                }}
                                className="flex items-center gap-2 rounded-lg py-1.5 pl-1 pr-2 transition hover:bg-slate-100"
                            >
                                <Avatar foto={foto} inicial={inicial} />
                                <div className="hidden max-w-[170px] text-left md:block">
                                    <p className="truncate text-sm font-bold text-slate-800">{nombre}</p>
                                    <p className="truncate text-xs text-slate-500">{usuario?.email || 'Administrador'}</p>
                                </div>
                                <FaChevronDown className={`hidden text-xs text-slate-400 transition-transform sm:block ${menuAbierto ? 'rotate-180' : ''}`} />
                            </button>
                            {menuAbierto && (
                                <div className="animate-suave absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPerfilAbierto(true);
                                            setMenuAbierto(false);
                                        }}
                                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
                                    >
                                        <FaUser /> Datos del administrador
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setConfigAbierta(true);
                                            setMenuAbierto(false);
                                        }}
                                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
                                    >
                                        <FaGear /> Configuración
                                    </button>
                                    <button
                                        type="button"
                                        onClick={salir}
                                        className="flex w-full items-center gap-2.5 border-t border-slate-100 px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
                                    >
                                        <FaRightFromBracket /> Cerrar sesión
                                    </button>
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