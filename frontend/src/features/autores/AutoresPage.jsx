import { useEffect, useMemo, useState } from 'react';

import { FaMagnifyingGlass, FaRotate, FaXmark } from 'react-icons/fa6';

import { FaFeather, FaCircleCheck, FaBan } from 'react-icons/fa6';
import { StatCard } from '../dashboard/StatCard';
import { Indicadores } from '../../components/ui/Indicadores';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/TableSkeleton';
import { ConfirmarEliminacion } from '../../components/ui/ConfirmarEliminacion';
import { DataTable } from '../../components/ui/DataTable';
import { EstadoActivo } from '../../components/ui/Badge';
import { BtnAccion } from '../../components/ui/Acciones';

import { FaEye, FaPenToSquare, FaTrash } from 'react-icons/fa6';

import { useToast } from '../../components/providers/ToastProvider';

import { listarAutores, obtenerAutor, eliminarAutor } from './autoresService';
import AutorForm from './AutorForm';
import AutorViewModal from './AutorViewModal';
import AutorEditModal from './AutorEditModal';

const POR_PAGINA = 10;

const columnasAutores = [
    { titulo: 'ID', alineacion: 'centro', render: (fila) => <span className="text-slate-700">{fila.id_autor}</span> },
    { titulo: 'Autor', render: (fila) => <span className="font-semibold text-slate-700">{fila.nombre} {fila.apellido}</span> },
    { titulo: 'Nacionalidad', render: (fila) => <span className="text-slate-700">{fila.nacionalidad || 'No registrada'}</span> },
    { titulo: 'Estado', alineacion: 'centro', render: (fila) => <EstadoActivo activo={fila.estado} /> },
];

function accionesAutor(fila, { onVer, onEditar, onEliminar }) {
    return (
        <>
            <BtnAccion tipo="ver" onClick={() => onVer(fila)} titulo="Ver autor"><FaEye /></BtnAccion>
            <BtnAccion tipo="editar" onClick={() => onEditar(fila)} titulo="Editar autor"><FaPenToSquare /></BtnAccion>
            <BtnAccion tipo="eliminar" onClick={() => onEliminar(fila)} titulo="Eliminar autor"><FaTrash /></BtnAccion>
        </>
    );
}

function Contador({ total, activos, inactivos }) {
    return (
        <Indicadores etiqueta="Resumen de autores">
            <StatCard titulo="Autores" valor={total} icono={<FaFeather />} color="primary" detalle="Registrados en la librería" />
            <StatCard titulo="Activos" valor={activos} icono={<FaCircleCheck />} color="success" detalle="Visibles en el catálogo" />
            <StatCard titulo="Inactivos" valor={inactivos} icono={<FaBan />} color="rose" detalle="Ocultos al público" />
        </Indicadores>
    );
}

function TablaAutores({ titulo, subtitulo, paginados, contador, pagina, totalPaginas, onCambiarPagina, color, onVer, onEditar, onEliminar }) {
    return (
        <Card>
            <CardHeader
                titulo={titulo}
                subtitulo={subtitulo}
                acciones={<span className={`rounded-full px-3 py-1 text-xs font-bold ${color}`}>{contador}</span>}
            />
            <CardBody className="p-0">
                <DataTable
                    columnas={columnasAutores}
                    filas={paginados}
                    keyExtractor={(fila) => fila.id_autor}
                    acciones={(fila) => accionesAutor(fila, { onVer, onEditar, onEliminar })}
                />
            </CardBody>
            <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiarPagina={onCambiarPagina} />
        </Card>
    );
}

export default function AutoresPage() {
    const { exito, error: mostrarError } = useToast();

    const [autores, setAutores] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [busqueda, setBusqueda] = useState('');

    const [paginaActivos, setPaginaActivos] = useState(1);
    const [paginaInactivos, setPaginaInactivos] = useState(1);

    const [autorVer, setAutorVer] = useState(null);
    const [autorEditar, setAutorEditar] = useState(null);
    const [autorEliminar, setAutorEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);

    const cargarAutores = async () => {
        try {
            setCargando(true);
            setError('');
            setAutores(await listarAutores());
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al cargar los autores');
        } finally {
            setCargando(false);
        }
    };

    // Carga inicial. `cargando` ya nace en true, así que este efecto no
    // enciende el spinner: solo espera la respuesta y entonces actualiza.
    // El bandera `vigente` evita fijar estado si el componente se desmonta.
    useEffect(() => {
        let vigente = true;

        (async () => {
            try {
                const datos = await listarAutores();
                if (vigente) setAutores(datos);
            } catch (err) {
                if (vigente) {
                    setError(err.response?.data?.mensaje || 'Error al cargar los autores');
                }
            } finally {
                if (vigente) setCargando(false);
            }
        })();

        return () => {
            vigente = false;
        };
    }, []);

    // Al buscar se vuelve a la primera página: se hace aquí, en el
    // evento, y no en un efecto que la reinicie después del render.
    const alBuscar = (valor) => {
        setBusqueda(valor);
        setPaginaActivos(1);
        setPaginaInactivos(1);
    };

    const autoresFiltrados = useMemo(() => {
        const texto = busqueda.toLowerCase().trim();
        return autores.filter((autor) => {
            const nombre = String(autor.nombre || '').toLowerCase();
            const apellido = String(autor.apellido || '').toLowerCase();
            const nacionalidad = String(autor.nacionalidad || '').toLowerCase();
            const nombreCompleto = `${nombre} ${apellido}`;
            return !texto || nombre.includes(texto) || apellido.includes(texto) || nombreCompleto.includes(texto) || nacionalidad.includes(texto);
        });
    }, [autores, busqueda]);

    const autoresActivos = useMemo(() => autoresFiltrados.filter((a) => Number(a.estado) === 1), [autoresFiltrados]);
    const autoresInactivos = useMemo(() => autoresFiltrados.filter((a) => Number(a.estado) !== 1), [autoresFiltrados]);

    const totalActivos = Math.ceil(autoresActivos.length / POR_PAGINA);
    const totalInactivos = Math.ceil(autoresInactivos.length / POR_PAGINA);

    // Si la lista se acorta (búsqueda o borrado) la página se recorta
    // durante el render en vez de corregirse después con un efecto.
    const paginaActivosActual = totalActivos > 0 ? Math.min(paginaActivos, totalActivos) : 1;
    const paginaInactivosActual = totalInactivos > 0 ? Math.min(paginaInactivos, totalInactivos) : 1;

    const activosPaginados = autoresActivos.slice((paginaActivosActual - 1) * POR_PAGINA, paginaActivosActual * POR_PAGINA);
    const inactivosPaginados = autoresInactivos.slice((paginaInactivosActual - 1) * POR_PAGINA, paginaInactivosActual * POR_PAGINA);

    const verAutor = async (autor) => {
        try {
            setAutorVer(await obtenerAutor(autor.id_autor));
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || 'Error al obtener el autor');
        }
    };

    const editarAutor = async (autor) => {
        try {
            setAutorEditar(await obtenerAutor(autor.id_autor));
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || 'Error al obtener el autor');
        }
    };

    const confirmarEliminar = async (password) => {
        if (!autorEliminar || eliminando) return;
        const seleccionado = { ...autorEliminar };
        try {
            setEliminando(true);
            const respuesta = await eliminarAutor(seleccionado.id_autor, password);
            setAutorEliminar(null);
            await cargarAutores();
            exito(respuesta?.mensaje || `Autor "${seleccionado.nombre} ${seleccionado.apellido}" eliminado correctamente`);
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || err.response?.data?.error || 'Error al eliminar el autor');
        } finally {
            setEliminando(false);
        }
    };

    const autorCreado = async () => {
        await cargarAutores();
        exito('Autor registrado correctamente');
    };

    const autorActualizado = async () => {
        await cargarAutores();
        exito('Autor actualizado correctamente');
    };

    return (
        <div className="space-y-4">
            <PageHeader
                titulo="Autores"
                descripcion="Administra los autores registrados en la librería"
            />
            <Contador total={autores.length} activos={autoresActivos.length} inactivos={autoresInactivos.length} />

            <AutorForm onAutorCreado={autorCreado} />

            <Card>
                <CardHeader
                    titulo="Catálogo de autores"
                    subtitulo="Busca autores por nombre, apellido o nacionalidad"
                    acciones={
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <div className="relative">
                                <Input
                                    type="text"
                                    value={busqueda}
                                    onChange={(e) => alBuscar(e.target.value)}
                                    placeholder="Buscar autor..."
                                    icono={<FaMagnifyingGlass />}
                                    className="pr-8 sm:w-72"
                                />
                                {busqueda && (
                                    <button
                                        type="button"
                                        onClick={() => alBuscar('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 hover:text-slate-700"
                                    >
                                        <FaXmark />
                                    </button>
                                )}
                            </div>
                            <Button variante="secondary" onClick={cargarAutores} disabled={cargando}>
                                <FaRotate /> {cargando ? 'Actualizando...' : 'Actualizar'}
                            </Button>
                        </div>
                    }
                />
            </Card>

            {cargando && <TableSkeleton columnas={5} filas={8} titulo />}

            {!cargando && error && <Alert tipo="error">{error}</Alert>}

            {!cargando && !error && autores.length === 0 && (
                <EmptyState titulo="No hay autores registrados" descripcion="Registra el primer autor con el formulario superior." />
            )}

            {!cargando && !error && autores.length > 0 && autoresFiltrados.length === 0 && (
                <EmptyState
                    titulo="No se encontraron autores"
                    descripcion="Cambia la búsqueda o limpia los filtros."
                    icono={<FaMagnifyingGlass />}
                />
            )}

            {!cargando && !error && autoresActivos.length > 0 && (
                <TablaAutores
                    titulo="Autores activos"
                    subtitulo="Autores disponibles actualmente"
                    paginados={activosPaginados}
                    contador={autoresActivos.length}
                    pagina={paginaActivosActual}
                    totalPaginas={totalActivos}
                    onCambiarPagina={setPaginaActivos}
                    color="bg-success-bg text-success"
                    onVer={verAutor}
                    onEditar={editarAutor}
                    onEliminar={setAutorEliminar}
                />
            )}

            {!cargando && !error && autoresInactivos.length > 0 && (
                <TablaAutores
                    titulo="Autores inactivos"
                    subtitulo="Autores retirados temporalmente"
                    paginados={inactivosPaginados}
                    contador={autoresInactivos.length}
                    pagina={paginaInactivosActual}
                    totalPaginas={totalInactivos}
                    onCambiarPagina={setPaginaInactivos}
                    color="bg-parchment-400 text-slate-700"
                    onVer={verAutor}
                    onEditar={editarAutor}
                    onEliminar={setAutorEliminar}
                />
            )}

            <AutorViewModal autor={autorVer} abierto={Boolean(autorVer)} onCerrar={() => setAutorVer(null)} />
            <AutorEditModal
                key={autorEditar?.id_autor}
                autor={autorEditar}
                abierto={Boolean(autorEditar)}
                onCerrar={() => setAutorEditar(null)}
                onActualizado={autorActualizado}
            />
            <ConfirmarEliminacion
                abierto={Boolean(autorEliminar)}
                titulo="Eliminar autor"
                mensaje={
                    <>
                        ¿Estás seguro de que deseas eliminar al autor{' '}
                        <span className="font-bold">"{autorEliminar?.nombre} {autorEliminar?.apellido}"</span>?
                    </>
                }
                advertencia="Si el autor tiene libros relacionados, el sistema no permitirá eliminarlo."
                eliminando={eliminando}
                onCerrar={() => {
                    if (!eliminando) setAutorEliminar(null);
                }}
                onConfirmar={confirmarEliminar}
            />
        </div>
    );
}

