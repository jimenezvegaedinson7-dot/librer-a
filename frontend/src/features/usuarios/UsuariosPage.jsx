import { useEffect, useMemo, useState } from 'react';

import {
    FaEye,
    FaFileCsv,
    FaMagnifyingGlass,
    FaRotate,
    FaUserCheck,
    FaUserSlash,
    FaUsers,
    FaXmark,
} from 'react-icons/fa6';

import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/TableSkeleton';
import { DataTable } from '../../components/ui/DataTable';
import { Badge, EstadoActivo } from '../../components/ui/Badge';
import { BtnAccion } from '../../components/ui/Acciones';
import { ConfirmarAccion } from '../../components/ui/ConfirmarAccion';

import { formatearMoneda, formatearFecha } from '../../lib/utils/format';
import { exportarCsv } from '../../lib/utils/exportarCsv';

import { useToast } from '../../components/providers/ToastProvider';
import { useAuth } from '../auth/AuthContext';

import { listarUsuarios, actualizarUsuario } from './usuariosService';
import UsuarioViewModal from './UsuarioViewModal';

const POR_PAGINA = 10;

function rolBadge(rol) {
    if (rol === 'administrador') return <Badge color="primary">Administrador</Badge>;
    if (rol === 'cliente') return <Badge color="info">Cliente</Badge>;
    return <Badge color="neutral">{rol || 'Sin rol'}</Badge>;
}

const columnasUsuarios = [
    { titulo: 'ID', alineacion: 'centro', render: (fila) => <span className="text-slate-700">{fila.id_usuario}</span> },
    {
        titulo: 'Usuario',
        render: (fila) => (
            <p className="text-sm">
                <span className="font-semibold text-slate-700">{`${fila.nombre || ''} ${fila.apellido || ''}`.trim() || 'Sin nombre'}</span>
                <span className="block text-xs text-slate-500">{fila.email || 'Sin correo'}</span>
            </p>
        ),
    },
    { titulo: 'Rol', alineacion: 'centro', render: (fila) => rolBadge(fila.rol) },
    { titulo: 'Estado', alineacion: 'centro', render: (fila) => <EstadoActivo activo={fila.estado} /> },
    {
        titulo: 'Registro',
        alineacion: 'centro',
        render: (fila) => <span className="text-xs font-medium text-slate-700">{formatearFecha(fila.fecha_registro, { soloDia: true }) || 'Sin fecha'}</span>,
    },
    {
        titulo: 'Compras',
        alineacion: 'centro',
        render: (fila) => <span className="font-semibold text-slate-700">{Number(fila.total_compras || 0)}</span>,
    },
    {
        titulo: 'Total gastado',
        alineacion: 'centro',
        render: (fila) => <span className="font-bold text-slate-700">{formatearMoneda(Number(fila.total_gastado || 0))}</span>,
    },
];

function accionesUsuario(fila, { onVer, onCambiarEstado, onCambiarRol, esPropio }) {
    const activo = Number(fila.estado) === 1;
    return (
        <>
            <BtnAccion tipo="ver" onClick={() => onVer(fila)} titulo="Ver usuario">
                <FaEye />
            </BtnAccion>

            <BtnAccion
                tipo={activo ? 'eliminar' : 'editar'}
                onClick={() => !esPropio && onCambiarEstado(fila, activo ? 0 : 1)}
                titulo={esPropio ? 'No puedes cambiar tu propio estado' : activo ? 'Desactivar usuario' : 'Activar usuario'}
                disabled={esPropio}
            >
                {activo ? <FaUserSlash /> : <FaUserCheck />}
            </BtnAccion>

            <select
                value={fila.rol || ''}
                onChange={(e) => !esPropio && onCambiarRol(fila, e.target.value)}
                disabled={esPropio}
                title={esPropio ? 'No puedes cambiar tu propio rol' : 'Cambiar rol'}
                className="h-8 rounded-lg border border-primary-200 bg-white px-2 text-xs font-semibold text-slate-700 shadow-sm transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:bg-parchment-200 disabled:text-primary-400"
            >
                <option value="cliente">Cliente</option>
                <option value="administrador">Admin</option>
            </select>
        </>
    );
}

function Contador({ total, administradores, clientes, activos, inactivos }) {
    return (
        <div className="summary-strip flex flex-wrap gap-2">
            <span className="rounded-xl border border-[#e6e0d7] bg-white px-4 py-2.5 text-sm font-medium text-[#433c35] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Total: <span className="font-bold text-[#1c1814]">{total}</span>
            </span>
            <span className="rounded-xl border border-[#c7d2fe] bg-[#eef2ff] px-4 py-2.5 text-sm font-medium text-[#4f46e5] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Administradores: <span className="font-bold text-[#4f46e5]">{administradores}</span>
            </span>
            <span className="rounded-xl border border-[#ecccc8] bg-[#fbf5f4] px-4 py-2.5 text-sm font-medium text-[#8a2c36] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Clientes: <span className="font-bold text-[#8a2c36]">{clientes}</span>
            </span>
            <span className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-2.5 text-sm font-medium text-[#15803d] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Activos: <span className="font-bold text-[#15803d]">{activos}</span>
            </span>
            <span className="rounded-xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-2.5 text-sm font-medium text-[#e11d48] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                Inactivos: <span className="font-bold text-[#e11d48]">{inactivos}</span>
            </span>
        </div>
    );
}

export default function UsuariosPage({ incrustado = false }) {
    const { exito, error: mostrarError } = useToast();
    const { usuario: usuarioSesion } = useAuth();

    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const [busqueda, setBusqueda] = useState('');
    const [filtroRol, setFiltroRol] = useState('todos');
    const [filtroEstado, setFiltroEstado] = useState('todos');

    const [paginaActual, setPaginaActual] = useState(1);

    const [usuarioVer, setUsuarioVer] = useState(null);
    const [accionPendiente, setAccionPendiente] = useState(null);
    const [ejecutando, setEjecutando] = useState(false);

    const idUsuarioSesion = Number(usuarioSesion?.id_usuario);

    const cargarUsuarios = async () => {
        try {
            setCargando(true);
            setError('');
            setUsuarios(await listarUsuarios(true));
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al cargar los usuarios');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarUsuarios();
    }, []);

    const usuariosFiltrados = useMemo(() => {
        const texto = busqueda.toLowerCase().trim();
        return usuarios.filter((usuario) => {
            const nombre = `${usuario.nombre || ''} ${usuario.apellido || ''}`.toLowerCase();
            const email = String(usuario.email || '').toLowerCase();
            const coincideBusqueda = !texto || nombre.includes(texto) || email.includes(texto);
            const coincideRol = filtroRol === 'todos' || usuario.rol === filtroRol;
            const coincideEstado = filtroEstado === 'todos' || String(usuario.estado) === filtroEstado;
            return coincideBusqueda && coincideRol && coincideEstado;
        });
    }, [usuarios, busqueda, filtroRol, filtroEstado]);

    const totalAdministradores = usuarios.filter((u) => u.rol === 'administrador').length;
    const totalClientes = usuarios.filter((u) => u.rol === 'cliente').length;
    const totalActivos = usuarios.filter((u) => Number(u.estado) === 1).length;
    const totalInactivos = usuarios.filter((u) => Number(u.estado) !== 1).length;

    const totalPaginas = Math.ceil(usuariosFiltrados.length / POR_PAGINA);
    const usuariosPaginados = usuariosFiltrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

    useEffect(() => {
        setPaginaActual(1);
    }, [busqueda, filtroRol, filtroEstado]);

    useEffect(() => {
        if (totalPaginas > 0 && paginaActual > totalPaginas) setPaginaActual(totalPaginas);
    }, [paginaActual, totalPaginas]);

    const limpiarFiltros = () => {
        setBusqueda('');
        setFiltroRol('todos');
        setFiltroEstado('todos');
        setPaginaActual(1);
    };

    const hayFiltros = busqueda || filtroRol !== 'todos' || filtroEstado !== 'todos';

    const verUsuario = (usuario) => setUsuarioVer(usuario);

    const pedirCambioEstado = (usuario, estado) => {
        setAccionPendiente({
            tipo: 'estado',
            usuario,
            valor: estado,
            titulo: estado === 1 ? 'Activar usuario' : 'Desactivar usuario',
            mensaje: `¿Deseas ${estado === 1 ? 'activar' : 'desactivar'} a "${usuario.nombre || 'este usuario'}"?`,
            advertencia:
                estado === 0
                    ? 'El usuario no podrá iniciar sesión mientras esté desactivado.'
                    : 'El usuario volverá a disponer de acceso a la aplicación.',
            textoConfirmar: estado === 1 ? 'Activar' : 'Desactivar',
            variante: estado === 1 ? 'primary' : 'danger',
        });
    };

    const pedirCambioRol = (usuario, rol) => {
        setAccionPendiente({
            tipo: 'rol',
            usuario,
            valor: rol,
            titulo: 'Cambiar rol',
            mensaje: `¿Quieres cambiar el rol de "${usuario.nombre || 'este usuario'}" a ${rol === 'administrador' ? 'Administrador' : 'Cliente'}?`,
            advertencia:
                rol === 'administrador'
                    ? 'El usuario podrá acceder a este panel administrativo.'
                    : 'El usuario perderá el acceso a este panel administrativo.',
            textoConfirmar: 'Cambiar rol',
            variante: 'primary',
        });
    };

    const confirmarAccionUsuario = async () => {
        if (!accionPendiente) return;
        const { tipo, usuario, valor } = accionPendiente;
        try {
            setEjecutando(true);
            const datos = tipo === 'estado' ? { estado: valor } : { rol: valor };
            await actualizarUsuario(usuario.id_usuario, datos);
            setAccionPendiente(null);
            if (tipo === 'estado') {
                exito(`Usuario ${valor === 1 ? 'activado' : 'desactivado'} correctamente`);
            } else {
                exito(`Rol de ${usuario.nombre || 'usuario'} actualizado a ${valor}`);
            }
            await cargarUsuarios();
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || 'Error al actualizar el usuario');
        } finally {
            setEjecutando(false);
        }
    };

    const exportar = () => {
        exportarCsv({
            nombreArchivo: `usuarios_${new Date().toISOString().slice(0, 10)}`,
            columnas: [
                { titulo: 'ID', exportar: (f) => f.id_usuario },
                { titulo: 'Nombre', exportar: (f) => `${f.nombre || ''} ${f.apellido || ''}`.trim() },
                { titulo: 'Email', exportar: (f) => f.email || '' },
                { titulo: 'Rol', exportar: (f) => f.rol || '' },
                { titulo: 'Estado', exportar: (f) => (Number(f.estado) === 1 ? 'Activo' : 'Inactivo') },
                { titulo: 'Compras', exportar: (f) => f.total_compras || 0 },
                { titulo: 'Total gastado', exportar: (f) => f.total_gastado || 0 },
            ],
            filas: usuariosFiltrados,
        });
    };

    return (
        <div className="space-y-4">
            {incrustado ? (
                <div className="flex justify-end">
                    <Contador
                        total={usuarios.length}
                        administradores={totalAdministradores}
                        clientes={totalClientes}
                        activos={totalActivos}
                        inactivos={totalInactivos}
                    />
                </div>
            ) : (
                <PageHeader
                    titulo="Usuarios"
                    descripcion="Control de usuarios registrados en la aplicación"
                    icono={<FaUsers />}
                    acciones={
                        <Contador
                            total={usuarios.length}
                            administradores={totalAdministradores}
                            clientes={totalClientes}
                            activos={totalActivos}
                            inactivos={totalInactivos}
                        />
                    }
                />
            )}

            <Card>
                <CardHeader
                    titulo="Usuarios registrados"
                    subtitulo="Busca usuarios por nombre o correo"
                    acciones={
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <div className="relative">
                                <Input
                                    type="text"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Buscar usuario..."
                                    icono={<FaMagnifyingGlass />}
                                    className="pr-8 sm:w-72"
                                />
                                {busqueda && (
                                    <button
                                        type="button"
                                        onClick={() => setBusqueda('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 transition hover:text-slate-700"
                                        title="Limpiar búsqueda"
                                    >
                                        <FaXmark />
                                    </button>
                                )}
                            </div>

                            <Select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)} className="sm:w-44">
                                <option value="todos">Todos los roles</option>
                                <option value="administrador">Administradores</option>
                                <option value="cliente">Clientes</option>
                            </Select>

                            <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="sm:w-44">
                                <option value="todos">Todos los estados</option>
                                <option value="1">Activos</option>
                                <option value="0">Inactivos</option>
                            </Select>

                            {hayFiltros && (
                                <Button variante="secondary" onClick={limpiarFiltros}>Limpiar</Button>
                            )}

                            <Button variante="secondary" onClick={cargarUsuarios} disabled={cargando}>
                                <FaRotate /> {cargando ? 'Actualizando...' : 'Actualizar'}
                            </Button>
                        </div>
                    }
                />
            </Card>

            {cargando && <TableSkeleton columnas={6} filas={8} titulo />}

            {!cargando && error && <Alert tipo="error">{error}</Alert>}

            {!cargando && !error && usuarios.length === 0 && (
                <EmptyState
                    titulo="No hay usuarios registrados"
                    descripcion="Cuando los usuarios se registren en la aplicación aparecerán aquí."
                    icono={<FaUsers />}
                />
            )}

            {!cargando && !error && usuarios.length > 0 && usuariosFiltrados.length === 0 && (
                <EmptyState
                    titulo="No se encontraron usuarios"
                    descripcion="Cambia la búsqueda o el filtro seleccionado."
                    icono={<FaMagnifyingGlass />}
                    acciones={<Button variante="secondary" onClick={limpiarFiltros}>Limpiar filtros</Button>}
                />
            )}

            {!cargando && !error && usuariosPaginados.length > 0 && (
                <Card>
                    <CardHeader
                        titulo="Lista de usuarios"
                        subtitulo="Usuarios registrados y su actividad de compras"
                        acciones={
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-primary-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                                    {usuariosFiltrados.length} {usuariosFiltrados.length === 1 ? 'usuario' : 'usuarios'}
                                </span>
                                <Button variante="secondary" tamano="sm" onClick={exportar}>
                                    <FaFileCsv /> Exportar CSV
                                </Button>
                            </div>
                        }
                    />
                    <CardBody className="p-0">
                        <DataTable
                            columnas={columnasUsuarios}
                            filas={usuariosPaginados}
                            keyExtractor={(fila) => fila.id_usuario}
                            acciones={(fila) =>
                                accionesUsuario(fila, {
                                    onVer: verUsuario,
                                    onCambiarEstado: pedirCambioEstado,
                                    onCambiarRol: pedirCambioRol,
                                    esPropio: Number(fila.id_usuario) === idUsuarioSesion,
                                })
                            }
                        />
                    </CardBody>
                    <Pagination pagina={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
                </Card>
            )}

            <UsuarioViewModal usuario={usuarioVer} abierto={Boolean(usuarioVer)} onCerrar={() => setUsuarioVer(null)} />

            <ConfirmarAccion
                abierto={Boolean(accionPendiente)}
                titulo={accionPendiente?.titulo}
                mensaje={accionPendiente?.mensaje}
                advertencia={accionPendiente?.advertencia}
                textoConfirmar={accionPendiente?.textoConfirmar}
                variante={accionPendiente?.variante}
                onCerrar={() => setAccionPendiente(null)}
                onConfirmar={confirmarAccionUsuario}
                cargando={ejecutando}
            />
        </div>
    );
}
