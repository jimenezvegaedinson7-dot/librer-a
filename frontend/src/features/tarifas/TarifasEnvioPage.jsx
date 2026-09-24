import { useEffect, useMemo, useState } from 'react';

import { motion } from 'motion/react';
import {
    FaArrowDownWideShort,
    FaArrowUpWideShort,
    FaMagnifyingGlass,
    FaPenToSquare,
    FaRotate,
    FaScaleBalanced,
    FaTruckFast,
    FaXmark,
} from 'react-icons/fa6';

import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/TableSkeleton';
import { DataTable } from '../../components/ui/DataTable';
import { BtnAccion } from '../../components/ui/Acciones';
import { useToast } from '../../components/providers/ToastProvider';

import { StatCard } from '../dashboard/StatCard';
import { formatearMoneda } from '../../lib/utils/format';
import { listarDistritosLima } from './tarifasService';
import TarifaEditModal from './TarifaEditModal';

const escalonado = {
    oculto: {},
    visible: { transition: { staggerChildren: 0.06 } },
};

const tarifaDe = (distrito) => Number(distrito.tarifa_envio || 0);

// Resumen calculado solo con las tarifas reales recibidas del backend.
function resumirTarifas(distritos) {
    if (distritos.length === 0) return null;
    const tarifas = distritos.map(tarifaDe);
    const minima = Math.min(...tarifas);
    const maxima = Math.max(...tarifas);
    const promedio = tarifas.reduce((a, b) => a + b, 0) / tarifas.length;
    const cuantos = (valor) => tarifas.filter((t) => t === valor).length;
    return { minima, maxima, promedio, conMinima: cuantos(minima), conMaxima: cuantos(maxima) };
}

const distritosTexto = (n) => `${n} ${n === 1 ? 'distrito' : 'distritos'}`;

function EstadoTarifa({ tarifa, actualizada }) {
    if (actualizada) return <Badge color="primary">Actualizada</Badge>;
    if (tarifa === 0) return <Badge color="success">Envío gratuito</Badge>;
    return <Badge color="neutral">Vigente</Badge>;
}

export default function TarifasEnvioPage() {
    const { exito } = useToast();

    const [distritos, setDistritos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [orden, setOrden] = useState({ campo: 'nombre', direccion: 'asc' });
    const [distritoEditar, setDistritoEditar] = useState(null);
    const [actualizados, setActualizados] = useState(() => new Set());

    // Lee las tarifas desde PostgreSQL (vía API). `vigente` evita actualizar
    // el estado si la página se cerró antes de recibir la respuesta.
    const obtener = (vigente = () => true) =>
        listarDistritosLima()
            .then((lista) => {
                if (!vigente()) return;
                setDistritos(lista);
                setError('');
            })
            .catch((err) => {
                if (vigente()) setError(err.response?.data?.mensaje || 'No se pudieron cargar las tarifas de envío');
            })
            .finally(() => {
                if (vigente()) setCargando(false);
            });

    // Botón "Actualizar".
    const cargar = () => {
        setCargando(true);
        obtener();
    };

    // Carga inicial (cargando ya empieza en true).
    useEffect(() => {
        let activo = true;
        obtener(() => activo);
        return () => {
            activo = false;
        };
    }, []);

    const resumen = useMemo(() => resumirTarifas(distritos), [distritos]);

    const filas = useMemo(() => {
        const texto = busqueda.toLowerCase().trim();
        const filtradas = distritos.filter(
            (d) => !texto || String(d.nombre || '').toLowerCase().includes(texto),
        );
        const signo = orden.direccion === 'asc' ? 1 : -1;
        return [...filtradas].sort((a, b) => {
            if (orden.campo === 'tarifa_envio') {
                return (tarifaDe(a) - tarifaDe(b)) * signo || a.nombre.localeCompare(b.nombre, 'es');
            }
            return a.nombre.localeCompare(b.nombre, 'es') * signo;
        });
    }, [distritos, busqueda, orden]);

    const ordenar = (campo) =>
        setOrden((actual) => ({
            campo,
            direccion: actual.campo === campo && actual.direccion === 'asc' ? 'desc' : 'asc',
        }));

    // Refleja al instante el precio guardado, sin recargar toda la tabla.
    const tarifaActualizada = (actualizado) => {
        if (!actualizado) return;
        setDistritos((lista) =>
            lista.map((d) =>
                Number(d.id_distrito) === Number(actualizado.id_distrito)
                    ? { ...d, tarifa_envio: actualizado.tarifa_envio }
                    : d,
            ),
        );
        setActualizados((previos) => new Set(previos).add(Number(actualizado.id_distrito)));
        exito('Tarifa de envío actualizada correctamente');
    };

    const columnas = [
        {
            titulo: 'Distrito',
            campo: 'nombre',
            ordenable: true,
            render: (fila) => <span className="font-semibold text-slate-800">{fila.nombre}</span>,
        },
        {
            titulo: 'Tarifa actual',
            campo: 'tarifa_envio',
            ordenable: true,
            alineacion: 'derecha',
            render: (fila) => (
                <span className="font-title text-[15px] font-semibold tabular-nums text-mahogany-600">
                    {formatearMoneda(tarifaDe(fila))}
                </span>
            ),
        },
        {
            titulo: 'Estado',
            alineacion: 'centro',
            render: (fila) => (
                <EstadoTarifa tarifa={tarifaDe(fila)} actualizada={actualizados.has(Number(fila.id_distrito))} />
            ),
        },
    ];

    return (
        <div className="space-y-5">
            <PageHeader
                titulo="Tarifas de envío"
                descripcion="Precio del envío a domicilio por distrito de Lima. Los cambios se aplican de inmediato en la app y no alteran las ventas ya realizadas."
                acciones={
                    <Button variante="secondary" onClick={cargar} cargando={cargando}>
                        <FaRotate /> {cargando ? 'Actualizando...' : 'Actualizar'}
                    </Button>
                }
            />

            {resumen && (
                <motion.section
                    aria-label="Resumen de tarifas"
                    variants={escalonado}
                    initial="oculto"
                    animate="visible"
                    className="grid grid-cols-1 gap-4 sm:grid-cols-3"
                >
                    <StatCard
                        titulo="Tarifa mínima"
                        valor={formatearMoneda(resumen.minima)}
                        icono={<FaArrowDownWideShort />}
                        color="success"
                        detalle={`Aplicada en ${distritosTexto(resumen.conMinima)}`}
                    />
                    <StatCard
                        titulo="Tarifa promedio"
                        valor={formatearMoneda(resumen.promedio)}
                        icono={<FaScaleBalanced />}
                        color="primary"
                        detalle={`Sobre ${distritosTexto(distritos.length)} de Lima`}
                    />
                    <StatCard
                        titulo="Tarifa máxima"
                        valor={formatearMoneda(resumen.maxima)}
                        icono={<FaArrowUpWideShort />}
                        color="info"
                        detalle={`Aplicada en ${distritosTexto(resumen.conMaxima)}`}
                    />
                </motion.section>
            )}

            {error && <Alert tipo="error">{error}</Alert>}

            <Card>
                <CardHeader
                    titulo="Distritos de Lima"
                    subtitulo="Solo el envío a domicilio usa estas tarifas; recoger en tienda no tiene costo"
                    acciones={
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Input
                                    type="text"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Buscar distrito..."
                                    icono={<FaMagnifyingGlass />}
                                    className="pr-8 sm:w-64"
                                    aria-label="Buscar distrito"
                                />
                                {busqueda && (
                                    <button
                                        type="button"
                                        onClick={() => setBusqueda('')}
                                        aria-label="Limpiar búsqueda"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 hover:text-slate-700"
                                    >
                                        <FaXmark />
                                    </button>
                                )}
                            </div>
                            <span className="rounded-full bg-parchment-400 px-3 py-1 text-xs font-bold text-slate-700">
                                {filas.length}
                            </span>
                        </div>
                    }
                />
                <CardBody className="p-0">
                    {cargando ? (
                        <TableSkeleton columnas={4} filas={8} />
                    ) : distritos.length === 0 && !error ? (
                        <EmptyState
                            titulo="No hay distritos de Lima"
                            descripcion="No se encontraron distritos con tarifa de envío."
                            icono={<FaTruckFast />}
                        />
                    ) : (
                        <DataTable
                            columnas={columnas}
                            filas={filas}
                            keyExtractor={(fila) => fila.id_distrito}
                            orden={orden}
                            onOrdenar={ordenar}
                            vacio="Ningún distrito coincide con la búsqueda"
                            acciones={(fila) => (
                                <BtnAccion
                                    tipo="editar"
                                    onClick={() => setDistritoEditar(fila)}
                                    titulo={`Editar tarifa de ${fila.nombre}`}
                                >
                                    <FaPenToSquare />
                                </BtnAccion>
                            )}
                        />
                    )}
                </CardBody>
            </Card>

            <TarifaEditModal
                key={distritoEditar?.id_distrito ?? 'cerrado'}
                distrito={distritoEditar}
                abierto={Boolean(distritoEditar)}
                onCerrar={() => setDistritoEditar(null)}
                onActualizado={tarifaActualizada}
            />
        </div>
    );
}
