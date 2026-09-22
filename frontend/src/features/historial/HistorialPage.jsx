import { useEffect, useMemo, useState } from 'react';

import {
    FaClockRotateLeft,
    FaMagnifyingGlass,
    FaFilter,
    FaRotate,
    FaCirclePlus,
    FaPenToSquare,
    FaTrash,
    FaCircleInfo,
    FaCircleCheck,
    FaCircleXmark,
} from 'react-icons/fa6';

import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/TableSkeleton';

import { obtenerHistorial } from './historialService';

const POR_PAGINA = 10;

const COLORS = {
    danger: 'danger',
    success: 'success',
    warning: 'warning',
    info: 'info',
    neutral: 'neutral',
};

function obtenerOperacion(item) {
    const tipo = String(item.tipo_operacion || '').toUpperCase();
    const descripcion = String(item.descripcion || '').toLowerCase();

    if (
        descripcion.includes('a "cancelada"') ||
        descripcion.includes("a 'cancelada'") ||
        descripcion.includes('estado "cancelada"') ||
        descripcion.includes('estado cancelada')
    ) {
        return { texto: 'Cancelado', valorFiltro: 'ACTUALIZAR', color: 'danger', icono: <FaCircleXmark /> };
    }

    if (
        descripcion.includes('a "completada"') ||
        descripcion.includes("a 'completada'") ||
        descripcion.includes('estado "completada"') ||
        descripcion.includes('estado completada')
    ) {
        return { texto: 'Completado', valorFiltro: 'ACTUALIZAR', color: 'success', icono: <FaCircleCheck /> };
    }

    if (
        descripcion.includes('a "confirmada"') ||
        descripcion.includes("a 'confirmada'") ||
        descripcion.includes('estado "confirmada"') ||
        descripcion.includes('estado confirmada')
    ) {
        return { texto: 'Confirmado', valorFiltro: 'ACTUALIZAR', color: 'info', icono: <FaCircleCheck /> };
    }

    if (
        descripcion.includes('a "pagada"') ||
        descripcion.includes("a 'pagada'") ||
        descripcion.includes('estado "pagada"') ||
        descripcion.includes('estado pagada')
    ) {
        return { texto: 'Pagado', valorFiltro: 'ACTUALIZAR', color: 'success', icono: <FaCircleCheck /> };
    }

    if (tipo === 'CREAR') {
        return { texto: 'Creado', valorFiltro: 'CREAR', color: 'success', icono: <FaCirclePlus /> };
    }

    if (tipo === 'ACTUALIZAR') {
        return { texto: 'Actualizado', valorFiltro: 'ACTUALIZAR', color: 'warning', icono: <FaPenToSquare /> };
    }

    if (tipo === 'ELIMINAR') {
        return { texto: 'Eliminado', valorFiltro: 'ELIMINAR', color: 'danger', icono: <FaTrash /> };
    }

    return { texto: tipo || 'Registro', valorFiltro: tipo || 'OTRO', color: 'neutral', icono: <FaCircleInfo /> };
}

function formatearModulo(modulo) {
    if (!modulo) return 'Sin módulo';
    const texto = String(modulo).replace(/_/g, ' ');
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatearFecha(fecha) {
    if (!fecha) return { fecha: 'Sin fecha', hora: '' };
    const fechaObjeto = new Date(fecha);
    if (Number.isNaN(fechaObjeto.getTime())) return { fecha: 'Fecha no válida', hora: '' };
    return {
        fecha: fechaObjeto.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        hora: fechaObjeto.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
    };
}

function Contador({ titulo, valor, clase }) {
    return (
        <span className="rounded-xl border border-[#ecccc8] bg-[#fbf5f4] px-4 py-2.5 text-sm font-medium text-[#8a2c36] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <span className="block text-xs font-semibold opacity-80">{titulo}</span>
            <span className="mt-0.5 block text-xl font-bold text-[#8a2c36]">{valor}</span>
        </span>
    );
}

function FilaHistorial({ item }) {
    const operacion = obtenerOperacion(item);
    const usuario = `${item.nombre_usuario || ''} ${item.apellido_usuario || ''}`.trim();
    const fecha = formatearFecha(item.fecha_registro);

    return (
        <tr className="border-b border-primary-200 transition last:border-0 hover:bg-parchment-200">
            <td className="px-4 py-4 text-center text-sm font-medium text-slate-700">{item.id_historial}</td>
            <td className="px-4 py-4">
                <p className="text-sm font-semibold text-slate-700">{usuario || 'Sistema'}</p>
                {item.id_usuario && <p className="mt-0.5 text-xs text-primary-500">Usuario #{item.id_usuario}</p>}
            </td>
            <td className="px-4 py-4 text-center">
                <Badge color={COLORS[operacion.color]} className="gap-1.5 py-1">
                    <span>{operacion.icono}</span>
                    {operacion.texto}
                </Badge>
            </td>
            <td className="px-4 py-4 text-center">
                <Badge color="neutral">{formatearModulo(item.modulo)}</Badge>
            </td>
            <td className="max-w-xl px-4 py-4">
                <p className="text-sm leading-6 text-slate-700">{item.descripcion || 'Sin descripción'}</p>
            </td>
            <td className="whitespace-nowrap px-4 py-4 text-center">
                <p className="text-xs font-semibold text-slate-700">{fecha.fecha}</p>
                {fecha.hora && <p className="mt-1 text-xs text-primary-500">{fecha.hora}</p>}
            </td>
        </tr>
    );
}

function TablaHistorial({ registros }) {
    return (
        <div className="overflow-x-auto rounded-xl border border-primary-200">
            <table className="min-w-full border-collapse bg-white">
                <thead className="bg-parchment-200">
                    <tr className="border-b border-primary-200">
                        <th className="border-r border-primary-200 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-700">ID</th>
                        <th className="border-r border-primary-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-700">Usuario</th>
                        <th className="border-r border-primary-200 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-700">Acción realizada</th>
                        <th className="border-r border-primary-200 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-700">Módulo</th>
                        <th className="border-r border-primary-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-700">Detalle de la operación</th>
                        <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-700">Fecha y hora</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-primary-200">
                    {registros.map((item) => (
                        <FilaHistorial key={item.id_historial} item={item} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function HistorialPage() {
    const [historial, setHistorial] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const [busqueda, setBusqueda] = useState('');
    const [filtroModulo, setFiltroModulo] = useState('todos');
    const [filtroOperacion, setFiltroOperacion] = useState('todos');
    const [paginaActual, setPaginaActual] = useState(1);

    const cargarHistorial = async () => {
        try {
            setCargando(true);
            setError('');
            setHistorial(await obtenerHistorial());
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al cargar el historial');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarHistorial();
    }, []);

    const modulos = useMemo(() => {
        const lista = historial.map((item) => item.modulo).filter(Boolean);
        return [...new Set(lista)].sort();
    }, [historial]);

    const historialFiltrado = useMemo(() => {
        const texto = busqueda.toLowerCase().trim();
        return historial.filter((item) => {
            const usuario = `${item.nombre_usuario || ''} ${item.apellido_usuario || ''}`.toLowerCase();
            const descripcion = String(item.descripcion || '').toLowerCase();
            const modulo = String(item.modulo || '').toLowerCase();
            const id = String(item.id_historial || '');
            const accion = obtenerOperacion(item);

            const coincideBusqueda =
                !texto ||
                usuario.includes(texto) ||
                descripcion.includes(texto) ||
                modulo.includes(texto) ||
                accion.texto.toLowerCase().includes(texto) ||
                id.includes(texto);

            const coincideModulo = filtroModulo === 'todos' || item.modulo === filtroModulo;
            const coincideOperacion = filtroOperacion === 'todos' || accion.valorFiltro === filtroOperacion;

            return coincideBusqueda && coincideModulo && coincideOperacion;
        });
    }, [historial, busqueda, filtroModulo, filtroOperacion]);

    const totalPaginas = Math.ceil(historialFiltrado.length / POR_PAGINA);
    const inicio = (paginaActual - 1) * POR_PAGINA;
    const historialPaginado = historialFiltrado.slice(inicio, inicio + POR_PAGINA);

    useEffect(() => {
        setPaginaActual(1);
    }, [busqueda, filtroModulo, filtroOperacion]);

    useEffect(() => {
        if (totalPaginas > 0 && paginaActual > totalPaginas) setPaginaActual(totalPaginas);
    }, [paginaActual, totalPaginas]);

    const totalRegistros = historial.length;
    const totalCreaciones = historial.filter((item) => item.tipo_operacion === 'CREAR').length;
    const totalActualizaciones = historial.filter((item) => item.tipo_operacion === 'ACTUALIZAR').length;
    const totalEliminaciones = historial.filter((item) => item.tipo_operacion === 'ELIMINAR').length;

    const limpiarFiltros = () => {
        setBusqueda('');
        setFiltroModulo('todos');
        setFiltroOperacion('todos');
        setPaginaActual(1);
    };

    const hayFiltros = Boolean(busqueda) || filtroModulo !== 'todos' || filtroOperacion !== 'todos';

    return (
        <div className="space-y-4">
            <PageHeader
                titulo="Gestión de Historial"
                descripcion="Consulta y supervisa las actividades registradas en el sistema"
                acciones={
                    <Button variante="secondary" icono={<FaRotate />} onClick={cargarHistorial} disabled={cargando}>
                        {cargando ? 'Actualizando...' : 'Actualizar historial'}
                    </Button>
                }
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Contador titulo="Total de registros" valor={totalRegistros} clase="border-primary-200 bg-white text-slate-700" />
                <Contador titulo="Registros creados" valor={totalCreaciones} clase="border-primary-200 bg-white text-slate-700" />
                <Contador titulo="Registros actualizados" valor={totalActualizaciones} clase="border-warning/20 bg-warning-bg text-warning" />
                <Contador titulo="Registros eliminados" valor={totalEliminaciones} clase="border-crimson-200 bg-crimson-50 text-crimson-500" />
            </div>

            <Card>
                <CardHeader
                    titulo="Filtros del historial"
                    subtitulo="Busca por usuario, módulo, descripción o acción realizada"
                    acciones={
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <Input
                                type="text"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Buscar registro..."
                                icono={<FaMagnifyingGlass />}
                                className="pr-8 sm:w-64"
                            />
                            <Select value={filtroModulo} onChange={(e) => setFiltroModulo(e.target.value)} className="sm:w-52">
                                <option value="todos">Todos los módulos</option>
                                {modulos.map((modulo) => (
                                    <option key={modulo} value={modulo}>
                                        {formatearModulo(modulo)}
                                    </option>
                                ))}
                            </Select>
                            <Select value={filtroOperacion} onChange={(e) => setFiltroOperacion(e.target.value)} className="sm:w-56">
                                <option value="todos">Todas las acciones</option>
                                <option value="CREAR">Creados</option>
                                <option value="ACTUALIZAR">Actualizados / estados</option>
                                <option value="ELIMINAR">Eliminados</option>
                            </Select>
                            {hayFiltros && (
                                <Button variante="secondary" onClick={limpiarFiltros}>
                                    Limpiar
                                </Button>
                            )}
                        </div>
                    }
                />
            </Card>

            {cargando && <TableSkeleton columnas={5} filas={8} titulo />}

            {!cargando && error && <Alert tipo="error">{error}</Alert>}

            {!cargando && !error && historial.length === 0 && (
                <EmptyState
                    titulo="No hay registros de historial"
                    descripcion="Las actividades realizadas aparecerán aquí."
                    icono={<FaClockRotateLeft />}
                />
            )}

            {!cargando && !error && historial.length > 0 && historialFiltrado.length === 0 && (
                <EmptyState
                    titulo="No se encontraron registros"
                    descripcion="Modifica los filtros seleccionados."
                    icono={<FaFilter />}
                />
            )}

            {!cargando && !error && historialPaginado.length > 0 && (
                <Card>
                    <CardHeader
                        titulo="Historial de operaciones"
                        subtitulo="Registro cronológico de las actividades realizadas"
                        acciones={
                            <span className="rounded-full border border-primary-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                                {historialFiltrado.length} {historialFiltrado.length === 1 ? 'registro' : 'registros'}
                            </span>
                        }
                    />
                    <CardBody className="p-4">
                        <TablaHistorial registros={historialPaginado} />
                    </CardBody>
                    <Pagination pagina={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
                </Card>
            )}
        </div>
    );
}

