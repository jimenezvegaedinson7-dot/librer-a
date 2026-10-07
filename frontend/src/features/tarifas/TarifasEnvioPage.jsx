import { useEffect, useMemo, useState } from 'react';

import { motion } from 'motion/react';
import {
    FaArrowDownWideShort,
    FaArrowUpWideShort,
    FaMagnifyingGlass,
    FaPenToSquare,
    FaPlus,
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
import { listarZonasDelivery } from './tarifasService';
import TarifaEditModal from './TarifaEditModal';

const escalonado = {
    oculto: {},
    visible: { transition: { staggerChildren: 0.06 } },
};

const tarifaDe = (zona) => Number(zona.tarifa || 0);

// Resumen calculado solo con las tarifas reales recibidas del backend.
function resumirTarifas(zonas) {
    if (zonas.length === 0) return null;
    const tarifas = zonas.map(tarifaDe);
    const minima = Math.min(...tarifas);
    const maxima = Math.max(...tarifas);
    const promedio = tarifas.reduce((a, b) => a + b, 0) / tarifas.length;
    const cuantos = (valor) => tarifas.filter((t) => t === valor).length;
    return { minima, maxima, promedio, conMinima: cuantos(minima), conMaxima: cuantos(maxima) };
}

const zonasTexto = (n) => `${n} ${n === 1 ? 'zona activa' : 'zonas activas'}`;

function EstadoTarifa({ estado, actualizada }) {
    if (Number(estado) !== 1) return <Badge color="neutral">Inactiva</Badge>;
    return <Badge color="primary">{actualizada ? 'Activa · actualizada' : 'Activa'}</Badge>;
}

export default function TarifasEnvioPage() {
    const { exito } = useToast();

    const [zonas, setZonas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [orden, setOrden] = useState({ campo: 'nombre', direccion: 'asc' });
    const [zonaEditar, setZonaEditar] = useState(null);
    const [creando, setCreando] = useState(false);
    const [actualizados, setActualizados] = useState(() => new Set());

    // Lee las tarifas desde PostgreSQL (vía API). `vigente` evita actualizar
    // el estado si la página se cerró antes de recibir la respuesta.
    const obtener = (vigente = () => true) =>
        listarZonasDelivery()
            .then((lista) => {
                if (!vigente()) return;
                setZonas(lista);
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

    const zonasActivas = useMemo(() => zonas.filter((z) => Number(z.estado) === 1), [zonas]);
    const resumen = useMemo(() => resumirTarifas(zonasActivas), [zonasActivas]);

    const filas = useMemo(() => {
        const texto = busqueda.toLowerCase().trim();
        const filtradas = zonas.filter(
            (d) => !texto || String(d.nombre || '').toLowerCase().includes(texto),
        );
        const signo = orden.direccion === 'asc' ? 1 : -1;
        return [...filtradas].sort((a, b) => {
            if (orden.campo === 'tarifa') {
                return (tarifaDe(a) - tarifaDe(b)) * signo || a.nombre.localeCompare(b.nombre, 'es');
            }
            return a.nombre.localeCompare(b.nombre, 'es') * signo;
        });
    }, [zonas, busqueda, orden]);

    const ordenar = (campo) =>
        setOrden((actual) => ({
            campo,
            direccion: actual.campo === campo && actual.direccion === 'asc' ? 'desc' : 'asc',
        }));

    // Refleja al instante el precio guardado, sin recargar toda la tabla.
    const tarifaActualizada = (actualizado) => {
        if (!actualizado) return;
        setZonas((lista) => lista.some((z) => Number(z.id_zona) === Number(actualizado.id_zona))
            ? lista.map((z) => Number(z.id_zona) === Number(actualizado.id_zona) ? actualizado : z)
            : [...lista, actualizado]);
        setActualizados((previos) => new Set(previos).add(Number(actualizado.id_zona)));
        exito('Zona de delivery guardada correctamente');
    };

    const columnas = [
        {
            titulo: 'Zona',
            campo: 'nombre',
            ordenable: true,
            render: (fila) => <span className="font-semibold text-slate-800">{fila.nombre}</span>,
        },
        {
            titulo: 'Tarifa actual',
            campo: 'tarifa',
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
                <EstadoTarifa estado={fila.estado} actualizada={actualizados.has(Number(fila.id_zona))} />
            ),
        },
    ];

    return (
        <div className="space-y-5">
            <PageHeader
                titulo="Tarifas de envío"
                descripcion="Zonas y tarifas de delivery dentro de Pallasca. Recojo gratuito. Las compras anteriores conservan sus datos e importes originales."
                acciones={
                    <div className="flex flex-wrap gap-2"><Button variante="secondary" onClick={cargar} cargando={cargando}>
                        <FaRotate /> {cargando ? 'Actualizando...' : 'Actualizar'}
                    </Button>
                    <Button onClick={() => setCreando(true)}><FaPlus /> Nueva zona</Button></div>
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
                        detalle={`Aplicada en ${zonasTexto(resumen.conMinima)}`}
                        medidor={{ valor: resumen.conMinima, total: zonasActivas.length, etiqueta: 'Zonas con tarifa mínima sobre el total', leyenda: 'de las zonas activas usa la tarifa mínima' }}
                    />
                    <StatCard
                        titulo="Tarifa promedio"
                        valor={formatearMoneda(resumen.promedio)}
                        icono={<FaScaleBalanced />}
                        color="primary"
                        detalle={`Sobre ${zonasTexto(zonasActivas.length)} de Pallasca`}
                        tendencia={zonasActivas.length > 1 ? zonasActivas.map(tarifaDe) : undefined}
                        etiquetaTendencia="Tarifas de las zonas activas de Pallasca"
                        medidor={zonasActivas.length === 1 ? { valor: zonasActivas.length, total: zonasActivas.length, etiqueta: 'Zonas incluidas en el promedio', leyenda: 'de las zonas activas incluidas en el promedio' } : undefined}
                    />
                    <StatCard
                        titulo="Tarifa máxima"
                        valor={formatearMoneda(resumen.maxima)}
                        icono={<FaArrowUpWideShort />}
                        color="info"
                        detalle={`Aplicada en ${zonasTexto(resumen.conMaxima)}`}
                        medidor={{ valor: resumen.conMaxima, total: zonasActivas.length, etiqueta: 'Zonas con tarifa máxima sobre el total', leyenda: 'de las zonas activas usa la tarifa máxima' }}
                    />
                </motion.section>
            )}

            {error && <Alert tipo="error">{error}</Alert>}

            <Card>
                <CardHeader
                    titulo="Zonas de delivery en Pallasca"
                    subtitulo="Activa o inactiva la cobertura por zona. Recojo en Pallasca siempre sin costo."
                    acciones={
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Input
                                    type="text"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Buscar zona..."
                                    icono={<FaMagnifyingGlass />}
                                    className="pr-8 sm:w-64"
                                    aria-label="Buscar zona"
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
                    ) : zonas.length === 0 && !error ? (
                        <EmptyState
                            titulo="Sin zonas de delivery configuradas"
                            descripcion="Registra una nueva zona con su tarifa para habilitar el delivery. El recojo gratuito en Pallasca ya está disponible."
                            icono={<FaTruckFast />}
                        />
                    ) : (
                        <DataTable
                            columnas={columnas}
                            filas={filas}
                            keyExtractor={(fila) => fila.id_zona}
                            orden={orden}
                            onOrdenar={ordenar}
                            vacio="Ninguna zona coincide con la búsqueda"
                            acciones={(fila) => (
                                <BtnAccion
                                    tipo="editar"
                                    onClick={() => setZonaEditar(fila)}
                                    titulo={`Editar zona ${fila.nombre}`}
                                >
                                    <FaPenToSquare />
                                </BtnAccion>
                            )}
                        />
                    )}
                </CardBody>
            </Card>

            <TarifaEditModal
                key={`${zonaEditar?.id_zona ?? 'nueva'}-${creando}`}
                zona={zonaEditar}
                abierto={creando || Boolean(zonaEditar)}
                onCerrar={() => { setZonaEditar(null); setCreando(false); }}
                onActualizado={tarifaActualizada}
            />
        </div>
    );
}
