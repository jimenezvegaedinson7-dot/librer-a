import { useEffect, useState } from 'react';

import { FaArrowRightArrowLeft, FaMagnifyingGlass } from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/TableSkeleton';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';

import { formatearFecha } from '../../lib/utils/format';

import { listarMovimientos, listarLibros } from './inventarioService';

const POR_PAGINA = 8;

function tipoBadge(tipo) {
    const esEntrada = String(tipo) === 'entrada';
    return <Badge color={esEntrada ? 'success' : 'danger'}>{esEntrada ? 'Entrada' : 'Salida'}</Badge>;
}

const columnasMovimientos = [
    {
        titulo: 'Fecha',
        alineacion: 'centro',
        render: (fila) => <span className="text-xs font-medium text-slate-700">{formatearFecha(fila.fecha_movimiento) || 'Sin fecha'}</span>,
    },
    { titulo: 'Libro', render: (fila) => <span className="font-semibold text-slate-700">{fila.titulo || 'Sin título'}</span> },
    { titulo: 'Tipo', alineacion: 'centro', render: (fila) => tipoBadge(fila.tipo) },
    {
        titulo: 'Cantidad',
        alineacion: 'centro',
        render: (fila) => <span className="font-semibold text-slate-700">{Number(fila.cantidad || 0)}</span>,
    },
    {
        titulo: 'Stock resultante',
        alineacion: 'centro',
        render: (fila) => <span className="font-bold text-slate-700">{Number(fila.stock_resultante || 0)}</span>,
    },
    { titulo: 'Motivo', render: (fila) => <span className="text-xs text-primary-500">{fila.motivo || 'Sin motivo'}</span> },
    { titulo: 'Usuario', render: (fila) => <span className="text-xs font-medium text-slate-700">{fila.usuario || '—'}</span> },
];

export default function MovimientosModal({ abierto, onCerrar }) {
    const [movimientos, setMovimientos] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalPaginas, setTotalPaginas] = useState(0);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');

    const [libros, setLibros] = useState([]);
    const [filtroLibro, setFiltroLibro] = useState('');
    const [filtroLibroAplicado, setFiltroLibroAplicado] = useState('');
    const [paginaActual, setPaginaActual] = useState(1);

    useEffect(() => {
        if (!abierto) return undefined;
        let activo = true;
        setLibros([]);
        listarLibros()
            .then((datos) => {
                if (activo) setLibros(datos);
            })
            .catch(() => {
                // El filtro por libro es opcional; si no se pueden cargar, se ignora.
            });
        return () => {
            activo = false;
        };
    }, [abierto]);

    useEffect(() => {
        if (!abierto) return undefined;
        setFiltroLibro('');
        setFiltroLibroAplicado('');
        setPaginaActual(1);
        return undefined;
    }, [abierto]);

    const cargarMovimientos = async () => {
        try {
            setCargando(true);
            setError('');
            const resultado = await listarMovimientos({
                pagina: paginaActual,
                por_pagina: POR_PAGINA,
                id_libro: filtroLibroAplicado || undefined,
            });
            setMovimientos(resultado.movimientos);
            setTotal(resultado.total);
            setTotalPaginas(resultado.paginas);
            if (paginaActual > resultado.paginas) {
                setPaginaActual(resultado.paginas);
            }
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al cargar los movimientos');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        if (abierto) {
            cargarMovimientos();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [abierto, filtroLibroAplicado, paginaActual]);

    const cambiarLibro = (valor) => {
        setFiltroLibro(valor);
        setFiltroLibroAplicado(valor);
        setPaginaActual(1);
    };

    const limpiarFiltros = () => {
        setFiltroLibro('');
        setFiltroLibroAplicado('');
        setPaginaActual(1);
    };

    return (
        <Modal
            abierto={abierto}
            titulo="Movimientos de inventario"
            subtitulo="Kardex de entradas y salidas de stock"
            onCerrar={onCerrar}
            grande
            footer={
                <>
                    <Button variante="secondary" onClick={cargarMovimientos} disabled={cargando}>
                        Actualizar
                    </Button>
                    <Button onClick={onCerrar}>Cerrar</Button>
                </>
            }
        >
            <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <Select
                        label="Filtrar por libro"
                        value={filtroLibro}
                        onChange={(e) => cambiarLibro(e.target.value)}
                        className="sm:w-80"
                    >
                        <option value="">Todos los libros</option>
                        {libros.map((libro) => (
                            <option key={libro.id_libro} value={libro.id_libro}>
                                {libro.titulo}
                            </option>
                        ))}
                    </Select>

                    {filtroLibroAplicado && (
                        <Button variante="secondary" tamano="sm" onClick={limpiarFiltros}>
                            Limpiar filtro
                        </Button>
                    )}
                </div>

                {cargando && <TableSkeleton columnas={7} filas={8} titulo />}

                {!cargando && error && <Alert tipo="error">{error}</Alert>}

                {!cargando && !error && total === 0 && (
                    <EmptyState
                        titulo="No hay movimientos registrados"
                        descripcion="Los movimientos de stock se generan al registrar o ajustar inventario."
                        icono={<FaArrowRightArrowLeft />}
                    />
                )}

                {!cargando && !error && total > 0 && movimientos.length === 0 && (
                    <EmptyState
                        titulo="No se encontraron movimientos"
                        descripcion="Cambia el filtro seleccionado."
                        icono={<FaMagnifyingGlass />}
                        acciones={
                            <Button variante="secondary" onClick={limpiarFiltros}>
                                Limpiar filtros
                            </Button>
                        }
                    />
                )}

                {!cargando && !error && movimientos.length > 0 && (
                    <Card>
                        <CardHeader
                            titulo="Últimos movimientos"
                            subtitulo={`${total} ${total === 1 ? 'movimiento' : 'movimientos'} en total`}
                        />
                        <CardBody className="p-0">
                            <DataTable
                                columnas={columnasMovimientos}
                                filas={movimientos}
                                keyExtractor={(fila) => fila.id_movimiento}
                                vacio="Sin movimientos para el filtro seleccionado."
                            />
                        </CardBody>
                        <Pagination pagina={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
                    </Card>
                )}
            </div>
        </Modal>
    );
}