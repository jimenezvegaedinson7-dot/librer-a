import { useEffect, useMemo, useState } from 'react';

import { FaArrowUpRightFromSquare, FaBookOpen, FaEye, FaMagnifyingGlass, FaPrint, FaReply, FaRotate } from 'react-icons/fa6';

import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/TableSkeleton';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { BtnAccion } from '../../components/ui/Acciones';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/providers/ToastProvider';
import { formatearFecha, formatearMoneda } from '../../lib/utils/format';

import { listarReclamaciones, obtenerResumenReclamaciones, responderReclamacion } from './reclamacionesService';

const hoyLima = () => new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);

// Días de calendario hasta la fecha límite (negativo = vencida).
function diasRestantes(fechaLimite) {
    if (!fechaLimite) return null;
    const hoy = new Date(`${hoyLima()}T00:00:00Z`);
    const limite = new Date(`${fechaLimite}T00:00:00Z`);
    return Math.round((limite - hoy) / 86400000);
}

function Plazo({ fila }) {
    if (fila.estado === 'respondido') {
        return <Badge color="success">Respondida</Badge>;
    }
    const dias = diasRestantes(fila.fecha_limite);
    const fecha = new Date(`${fila.fecha_limite}T12:00:00`).toLocaleDateString('es-PE');
    if (dias < 0) return <span title={`Venció el ${fecha}`}><Badge color="danger">Vencida</Badge></span>;
    if (dias <= 3) return <span title={`Vence el ${fecha}`}><Badge color="warning">{dias === 0 ? 'Vence hoy' : `Vence en ${dias} d`}</Badge></span>;
    return <span className="text-xs text-slate-600">Hasta el {fecha}</span>;
}

const columnas = [
    { titulo: 'Hoja', render: (f) => <span className="font-mono text-xs font-bold text-slate-700">{f.numero}</span> },
    { titulo: 'Fecha', alineacion: 'centro', render: (f) => <span className="text-xs text-slate-700">{formatearFecha(f.fecha_registro)}</span> },
    {
        titulo: 'Consumidor',
        render: (f) => (
            <p className="text-sm">
                <span className="block font-semibold text-slate-800">{f.consumidor_nombre}</span>
                <span className="block text-xs text-slate-500">{f.consumidor_tipo_documento} {f.consumidor_documento}</span>
            </p>
        ),
    },
    { titulo: 'Tipo', alineacion: 'centro', render: (f) => <Badge color={f.tipo === 'queja' ? 'info' : 'primary'}>{f.tipo === 'queja' ? 'Queja' : 'Reclamo'}</Badge> },
    { titulo: 'Plazo', alineacion: 'centro', render: (f) => <Plazo fila={f} /> },
];

function Hoja({ r }) {
    const fila = (etiqueta, valor) => (
        <div className="grid grid-cols-[170px_1fr] gap-2 border-b border-slate-200 py-1.5 text-sm">
            <span className="text-slate-500">{etiqueta}</span>
            <span className="whitespace-pre-line text-slate-900">{valor || '—'}</span>
        </div>
    );
    return (
        <div id="hoja-reclamacion" className="print-area">
            <h3 className="mb-2 font-title text-lg font-semibold">Hoja de reclamación N.° {r.numero}</h3>
            {fila('Fecha de registro', formatearFecha(r.fecha_registro))}
            {fila('Plazo de respuesta', new Date(`${r.fecha_limite}T12:00:00`).toLocaleDateString('es-PE'))}
            {fila('Consumidor', r.consumidor_nombre)}
            {fila('Documento', `${r.consumidor_tipo_documento} ${r.consumidor_documento}`)}
            {fila('Domicilio', r.consumidor_domicilio)}
            {fila('Teléfono', r.consumidor_telefono)}
            {fila('Correo', r.consumidor_email)}
            {r.es_menor && fila('Padre, madre o apoderado', r.apoderado_nombre)}
            {fila('Bien contratado', `${r.bien_tipo === 'servicio' ? 'Servicio' : 'Producto'}: ${r.bien_descripcion}`)}
            {fila('Monto reclamado', r.monto_reclamado !== null ? formatearMoneda(r.monto_reclamado) : '')}
            {fila('N.° de pedido', r.id_venta ? `#${r.id_venta}` : '')}
            {fila('Tipo', r.tipo === 'queja' ? 'Queja' : 'Reclamo')}
            {fila('Detalle', r.detalle)}
            {fila('Pedido del consumidor', r.pedido)}
            {r.estado === 'respondido' && (
                <>
                    {fila('Respuesta del proveedor', r.respuesta)}
                    {fila('Fecha de respuesta', formatearFecha(r.fecha_respuesta))}
                </>
            )}
        </div>
    );
}

function HojaModal({ reclamacion, onCerrar, onRespondida }) {
    const [respuesta, setRespuesta] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    const enviar = async (e) => {
        e.preventDefault();
        if (respuesta.trim().length < 10) {
            setError('Escribe la respuesta (al menos 10 caracteres)');
            return;
        }
        try {
            setGuardando(true);
            setError('');
            const res = await responderReclamacion(reclamacion.id_reclamacion, respuesta.trim());
            await onRespondida(res);
            onCerrar();
        } catch (err) {
            setError(err.response?.data?.mensaje || 'No se pudo registrar la respuesta');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal
            abierto
            titulo="Libro de Reclamaciones"
            subtitulo={`Hoja N.° ${reclamacion.numero}`}
            onCerrar={onCerrar}
            grande
            footer={
                <div className="no-print flex gap-2">
                    <Button variante="secondary" onClick={onCerrar}>Cerrar</Button>
                    <Button variante="secondary" onClick={() => window.print()}><FaPrint /> Imprimir</Button>
                </div>
            }
        >
            <Hoja r={reclamacion} />
            {reclamacion.estado === 'pendiente' && (
                <form onSubmit={enviar} className="no-print mt-5 space-y-3 border-t border-slate-200 pt-5">
                    <Textarea
                        label="Respuesta al consumidor"
                        value={respuesta}
                        onChange={(e) => setRespuesta(e.target.value)}
                        rows="5"
                        maxLength={3000}
                        placeholder="Explica qué harás para atender el reclamo. Se enviará a su correo y quedará en el libro."
                        requerido
                    />
                    {error && <Alert tipo="error">{error}</Alert>}
                    <div className="flex justify-end">
                        <Button type="submit" cargando={guardando}>
                            <FaReply /> {guardando ? 'Enviando...' : 'Responder y enviar'}
                        </Button>
                    </div>
                </form>
            )}
        </Modal>
    );
}

export default function ReclamacionesPage() {
    const { exito, error: mostrarError } = useToast();
    const [lista, setLista] = useState([]);
    const [resumen, setResumen] = useState({ total: 0, pendientes: 0, vencidos: 0, por_vencer: 0 });
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [estado, setEstado] = useState('todos');
    const [busqueda, setBusqueda] = useState('');
    const [abierta, setAbierta] = useState(null);

    const cargar = async () => {
        try {
            setCargando(true);
            setError('');
            const [datos, res] = await Promise.all([
                listarReclamaciones({ estado: estado === 'todos' ? undefined : estado }),
                obtenerResumenReclamaciones(),
            ]);
            setLista(datos);
            setResumen(res);
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al cargar el libro de reclamaciones');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [estado]);

    const filtradas = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        if (!texto) return lista;
        return lista.filter((r) =>
            [r.numero, r.consumidor_nombre, r.consumidor_documento, r.consumidor_email].some((v) => String(v || '').toLowerCase().includes(texto)),
        );
    }, [lista, busqueda]);

    const urlPublica = `${window.location.origin}/libro-de-reclamaciones`;

    return (
        <div className="space-y-4">
            <PageHeader
                titulo="Libro de Reclamaciones"
                descripcion="Reclamos y quejas de los consumidores: respóndelos en un plazo no mayor a 15 días hábiles"
                icono={<FaBookOpen />}
                acciones={
                    <div className="summary-strip flex flex-wrap gap-2">
                        <span className="rounded-xl border border-[#e6e0d7] bg-white px-4 py-2.5 text-sm">Pendientes: <strong>{resumen.pendientes}</strong></span>
                        <span className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">Por vencer: <strong>{resumen.por_vencer}</strong></span>
                        <span className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">Vencidas: <strong>{resumen.vencidos}</strong></span>
                    </div>
                }
            />

            <Card>
                <CardHeader
                    titulo="Hojas registradas"
                    subtitulo={
                        <span>
                            Formulario público:{' '}
                            <a href={urlPublica} target="_blank" rel="noreferrer" className="font-semibold text-[#7a2530] underline">
                                {urlPublica} <FaArrowUpRightFromSquare className="inline text-xs" />
                            </a>
                        </span>
                    }
                    acciones={
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar hoja o consumidor..." icono={<FaMagnifyingGlass />} className="sm:w-64" />
                            <Select value={estado} onChange={(e) => setEstado(e.target.value)} className="sm:w-44" aria-label="Filtrar por estado">
                                <option value="todos">Todas</option>
                                <option value="pendiente">Pendientes</option>
                                <option value="vencido">Vencidas</option>
                                <option value="respondido">Respondidas</option>
                            </Select>
                            <Button variante="secondary" onClick={cargar} disabled={cargando}><FaRotate /> Actualizar</Button>
                        </div>
                    }
                />
                <CardBody className="p-0">
                    {cargando && <TableSkeleton columnas={5} filas={5} />}
                    {!cargando && error && <div className="p-4"><Alert tipo="error">{error}</Alert></div>}
                    {!cargando && !error && filtradas.length === 0 && (
                        <EmptyState titulo="Sin hojas" descripcion="No hay hojas de reclamación con este filtro." icono={<FaBookOpen />} />
                    )}
                    {!cargando && !error && filtradas.length > 0 && (
                        <DataTable
                            columnas={columnas}
                            filas={filtradas}
                            keyExtractor={(f) => f.id_reclamacion}
                            acciones={(f) => (
                                <BtnAccion tipo="ver" onClick={() => setAbierta(f)} titulo={f.estado === 'pendiente' ? 'Ver y responder' : 'Ver hoja'}>
                                    {f.estado === 'pendiente' ? <FaReply /> : <FaEye />}
                                </BtnAccion>
                            )}
                        />
                    )}
                </CardBody>
            </Card>

            {abierta && (
                <HojaModal
                    reclamacion={abierta}
                    onCerrar={() => setAbierta(null)}
                    onRespondida={async (res) => {
                        (res?.enviado === false ? mostrarError : exito)(res?.mensaje || 'Respuesta registrada');
                        await cargar();
                    }}
                />
            )}
        </div>
    );
}
