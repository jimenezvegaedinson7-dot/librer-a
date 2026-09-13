import { useEffect, useMemo, useState } from 'react';

import { FaMagnifyingGlass, FaRotate, FaXmark } from 'react-icons/fa6';

import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { CargandoPantalla } from '../../components/ui/Spinner';
import { ConfirmarEliminacion } from '../../components/ui/ConfirmarEliminacion';
import { DataTable } from '../../components/ui/DataTable';
import { EstadoActivo } from '../../components/ui/Badge';
import { BtnAccion } from '../../components/ui/Acciones';

import { FaEye, FaPenToSquare, FaTrash } from 'react-icons/fa6';

import { useToast } from '../../components/providers/ToastProvider';

import { listarCategorias, obtenerCategoria, eliminarCategoria } from './categoriasService';
import CategoriaForm from './CategoriaForm';
import CategoriaViewModal from './CategoriaViewModal';
import CategoriaEditModal from './CategoriaEditModal';

const POR_PAGINA = 10;

const columnasCategorias = [
    { titulo: 'ID', alineacion: 'centro', render: (fila) => <span className="text-slate-700">{fila.id_categoria}</span> },
    { titulo: 'Nombre', render: (fila) => <span className="font-semibold text-slate-800">{fila.nombre}</span> },
    { titulo: 'Descripción', render: (fila) => <span className="text-slate-700">{fila.descripcion || 'Sin descripción'}</span> },
    { titulo: 'Estado', alineacion: 'centro', render: (fila) => <EstadoActivo activo={fila.estado} /> },
];

function accionesCategoria(fila, { onVer, onEditar, onEliminar }) {
    return (
        <>
            <BtnAccion tipo="ver" onClick={() => onVer(fila)} titulo="Ver categoría"><FaEye /></BtnAccion>
            <BtnAccion tipo="editar" onClick={() => onEditar(fila)} titulo="Editar categoría"><FaPenToSquare /></BtnAccion>
            <BtnAccion tipo="eliminar" onClick={() => onEliminar(fila)} titulo="Eliminar categoría"><FaTrash /></BtnAccion>
        </>
    );
}

function Contador({ total, activas, inactivas }) {
    return (
        <div className="flex flex-wrap gap-2">
            <span className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">
                Total: <span className="font-bold text-slate-900">{total}</span>
            </span>
            <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                Activas: <span className="font-bold text-emerald-800">{activas}</span>
            </span>
            <span className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-600">
                Inactivas: <span className="font-bold text-slate-800">{inactivas}</span>
            </span>
        </div>
    );
}

function TablaCategorias({ titulo, subtitulo, paginadas, contador, pagina, totalPaginas, onCambiarPagina, color, onVer, onEditar, onEliminar }) {
    return (
        <Card>
            <CardHeader
                titulo={titulo}
                subtitulo={subtitulo}
                acciones={<span className={`rounded-full px-3 py-1 text-xs font-bold ${color}`}>{contador}</span>}
            />
            <CardBody className="p-0">
                <DataTable
                    columnas={columnasCategorias}
                    filas={paginadas}
                    keyExtractor={(fila) => fila.id_categoria}
                    acciones={(fila) => accionesCategoria(fila, { onVer, onEditar, onEliminar })}
                />
            </CardBody>
            <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiarPagina={onCambiarPagina} />
        </Card>
    );
}

export default function CategoriaPage() {
    const { exito, error: mostrarError } = useToast();

    const [categorias, setCategorias] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [busqueda, setBusqueda] = useState('');

    const [paginaActivas, setPaginaActivas] = useState(1);
    const [paginaInactivas, setPaginaInactivas] = useState(1);

    const [categoriaVer, setCategoriaVer] = useState(null);
    const [categoriaEditar, setCategoriaEditar] = useState(null);
    const [categoriaEliminar, setCategoriaEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);

    const cargarCategorias = async () => {
        try {
            setCargando(true);
            setError('');
            setCategorias(await listarCategorias());
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al cargar las categorías');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarCategorias();
    }, []);

    const categoriasFiltradas = useMemo(() => {
        const texto = busqueda.toLowerCase().trim();
        return categorias.filter((categoria) => {
            const nombre = String(categoria.nombre || '').toLowerCase();
            const descripcion = String(categoria.descripcion || '').toLowerCase();
            return !texto || nombre.includes(texto) || descripcion.includes(texto);
        });
    }, [categorias, busqueda]);

    const categoriasActivas = useMemo(() => categoriasFiltradas.filter((c) => Number(c.estado) === 1), [categoriasFiltradas]);
    const categoriasInactivas = useMemo(() => categoriasFiltradas.filter((c) => Number(c.estado) !== 1), [categoriasFiltradas]);

    const totalActivas = Math.ceil(categoriasActivas.length / POR_PAGINA);
    const totalInactivas = Math.ceil(categoriasInactivas.length / POR_PAGINA);
    const activasPaginadas = categoriasActivas.slice((paginaActivas - 1) * POR_PAGINA, paginaActivas * POR_PAGINA);
    const inactivasPaginadas = categoriasInactivas.slice((paginaInactivas - 1) * POR_PAGINA, paginaInactivas * POR_PAGINA);

    useEffect(() => {
        setPaginaActivas(1);
        setPaginaInactivas(1);
    }, [busqueda]);

    useEffect(() => {
        if (totalActivas > 0 && paginaActivas > totalActivas) setPaginaActivas(totalActivas);
    }, [paginaActivas, totalActivas]);

    useEffect(() => {
        if (totalInactivas > 0 && paginaInactivas > totalInactivas) setPaginaInactivas(totalInactivas);
    }, [paginaInactivas, totalInactivas]);

    const verCategoria = async (categoria) => {
        try {
            setCategoriaVer(await obtenerCategoria(categoria.id_categoria));
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || 'Error al obtener la categoría');
        }
    };

    const editarCategoria = async (categoria) => {
        try {
            setCategoriaEditar(await obtenerCategoria(categoria.id_categoria));
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || 'Error al obtener la categoría');
        }
    };

    const confirmarEliminar = async (password) => {
        if (!categoriaEliminar || eliminando) return;
        const seleccionada = { ...categoriaEliminar };
        try {
            setEliminando(true);
            const respuesta = await eliminarCategoria(seleccionada.id_categoria, password);
            setCategoriaEliminar(null);
            await cargarCategorias();
            exito(respuesta?.mensaje || `Categoría "${seleccionada.nombre}" eliminada correctamente`);
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || err.response?.data?.error || 'Error al eliminar la categoría');
        } finally {
            setEliminando(false);
        }
    };

    const categoriaCreada = async () => {
        await cargarCategorias();
        exito('Categoría registrada correctamente');
    };

    const categoriaActualizada = async () => {
        await cargarCategorias();
        exito('Categoría actualizada correctamente');
    };

    return (
        <div className="space-y-4">
            <PageHeader
                titulo="Categorías"
                descripcion="Administra las categorías de los libros"
                acciones={<Contador total={categorias.length} activas={categoriasActivas.length} inactivas={categoriasInactivas.length} />}
            />

            <CategoriaForm onCategoriaCreada={categoriaCreada} />

            <Card>
                <CardHeader
                    titulo="Catálogo de categorías"
                    subtitulo="Busca categorías por nombre o descripción"
                    acciones={
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <div className="relative">
                                <Input
                                    type="text"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Buscar categoría..."
                                    icono={<FaMagnifyingGlass />}
                                    className="pr-8 sm:w-72"
                                />
                                {busqueda && (
                                    <button
                                        type="button"
                                        onClick={() => setBusqueda('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 hover:text-slate-700"
                                    >
                                        <FaXmark />
                                    </button>
                                )}
                            </div>
                            <Button variante="secondary" onClick={cargarCategorias} disabled={cargando}>
                                <FaRotate /> {cargando ? 'Actualizando...' : 'Actualizar'}
                            </Button>
                        </div>
                    }
                />
            </Card>

            {cargando && <Card><CargandoPantalla texto="Cargando categorías..." /></Card>}

            {!cargando && error && <Alert tipo="error">{error}</Alert>}

            {!cargando && !error && categorias.length === 0 && (
                <EmptyState
                    titulo="No hay categorías registradas"
                    descripcion="Registra una categoría utilizando el formulario."
                    icono={<FaMagnifyingGlass />}
                />
            )}

            {!cargando && !error && categorias.length > 0 && categoriasFiltradas.length === 0 && (
                <EmptyState
                    titulo="No se encontraron categorías"
                    descripcion="Cambia la búsqueda o limpia los filtros."
                    icono={<FaMagnifyingGlass />}
                />
            )}

            {!cargando && !error && categoriasActivas.length > 0 && (
                <TablaCategorias
                    titulo="Categorías activas"
                    subtitulo="Categorías disponibles actualmente"
                    paginadas={activasPaginadas}
                    contador={categoriasActivas.length}
                    pagina={paginaActivas}
                    totalPaginas={totalActivas}
                    onCambiarPagina={setPaginaActivas}
                    color="bg-emerald-100 text-emerald-700"
                    onVer={verCategoria}
                    onEditar={editarCategoria}
                    onEliminar={setCategoriaEliminar}
                />
            )}

            {!cargando && !error && categoriasInactivas.length > 0 && (
                <TablaCategorias
                    titulo="Categorías inactivas"
                    subtitulo="Categorías retiradas temporalmente"
                    paginadas={inactivasPaginadas}
                    contador={categoriasInactivas.length}
                    pagina={paginaInactivas}
                    totalPaginas={totalInactivas}
                    onCambiarPagina={setPaginaInactivas}
                    color="bg-slate-200 text-slate-700"
                    onVer={verCategoria}
                    onEditar={editarCategoria}
                    onEliminar={setCategoriaEliminar}
                />
            )}

            <CategoriaViewModal categoria={categoriaVer} abierto={Boolean(categoriaVer)} onCerrar={() => setCategoriaVer(null)} />
            <CategoriaEditModal categoria={categoriaEditar} abierto={Boolean(categoriaEditar)} onCerrar={() => setCategoriaEditar(null)} onActualizado={categoriaActualizada} />
            <ConfirmarEliminacion
                abierto={Boolean(categoriaEliminar)}
                titulo="Eliminar categoría"
                mensaje={
                    <>
                        ¿Estás seguro de que deseas eliminar la categoría{' '}
                        <span className="font-bold">"{categoriaEliminar?.nombre}"</span>?
                    </>
                }
                advertencia="Si la categoría tiene libros relacionados, el sistema no permitirá eliminarla."
                eliminando={eliminando}
                onCerrar={() => {
                    if (!eliminando) setCategoriaEliminar(null);
                }}
                onConfirmar={confirmarEliminar}
            />
        </div>
    );
}

