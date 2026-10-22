import { useEffect, useMemo, useRef, useState } from 'react';
import { FaBookOpen, FaMagnifyingGlass, FaRotate, FaWandMagicSparkles, FaFloppyDisk, FaArrowUpRightFromSquare } from 'react-icons/fa6';

import { Card, CardHeader, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Form';
import { Alert } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { useToast } from '../../app/providers/ToastProvider';
import PortadaCatalogo from '../componentes/PortadaCatalogo';
import { formatearMoneda, formatearFecha } from '../../compartido/lib/utils/format';
import { listarLibros } from '../libros/librosService';
import { obtenerProtagonista, guardarProtagonista } from './protagonistaService';

// ============================================================
// PORTADA → LIBRO PROTAGONISTA
// Elige el libro real que aparece en la escena 3D del inicio. Sin selección
// manual, la web usa el último libro agregado (activo y con portada).
// ============================================================

const conPortada = (l) => typeof l?.portada === 'string' && l.portada.trim() !== '';
const elegible = (l) => Number(l?.estado) === 1 && conPortada(l);

function Precio({ libro }) {
    if (!libro) return null;
    if (Number(libro.descuento_vigente) === 1) {
        return (
            <span className="flex items-baseline gap-2">
                <span className="text-base font-bold text-[#c2410c]">{formatearMoneda(libro.precio_final)}</span>
                <span className="text-xs text-slate-500 line-through">{formatearMoneda(libro.precio)}</span>
            </span>
        );
    }
    return <span className="text-base font-bold text-slate-900">{formatearMoneda(libro.precio)}</span>;
}

function VistaPrevia({ libro, modo }) {
    if (!libro) {
        return (
            <div className="protagonista-vista protagonista-vista--vacia">
                <FaBookOpen aria-hidden="true" />
                <p>No hay libros activos con portada. La web mostrará una portada sin libro.</p>
            </div>
        );
    }
    return (
        <div className="protagonista-vista">
            <div className="protagonista-vista__escena" aria-hidden="true">
                <span className="protagonista-vista__luz" />
                <span className="protagonista-vista__libro">
                    <PortadaCatalogo libro={libro} mostrarTexto={false} prioritaria className="h-full w-full object-contain" />
                </span>
            </div>
            <div className="min-w-0">
                <Badge color={modo === 'manual' ? 'info' : 'neutral'}>{modo === 'manual' ? 'Selección manual' : 'Automático: último agregado'}</Badge>
                <p className="mt-2 font-title text-lg font-semibold leading-tight text-slate-900">{libro.titulo}</p>
                <p className="text-sm text-slate-600">{libro.autor || 'Autor no registrado'}</p>
                <div className="mt-2"><Precio libro={libro} /></div>
                <a className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1d4f91] hover:underline" href={`/libro/${libro.id_libro}`} target="_blank" rel="noreferrer">
                    Ver en la web <FaArrowUpRightFromSquare className="text-xs" aria-hidden="true" />
                </a>
            </div>
        </div>
    );
}

export default function ProtagonistaPanel() {
    const { exito } = useToast();
    const [config, setConfig] = useState(null);
    const [libros, setLibros] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [elegido, setElegido] = useState(null);
    const [modoManual, setModoManual] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [recarga, setRecarga] = useState(0);
    const enviando = useRef(false);

    useEffect(() => {
        let activo = true;
        Promise.all([obtenerProtagonista(), listarLibros()])
            .then(([c, l]) => {
                if (!activo) return;
                setConfig(c);
                setLibros(Array.isArray(l) ? l : []);
                setModoManual(c?.modo === 'manual');
                setElegido(c?.modo === 'manual' ? Number(c.libro?.id_libro) : null);
                setError('');
            })
            .catch((e) => { if (activo) { setConfig(null); setError(e?.response?.data?.mensaje || 'No se pudo cargar la configuración de la portada.'); } })
            .finally(() => activo && setCargando(false));
        return () => { activo = false; };
    }, [recarga]);

    const candidatos = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return libros
            .filter(elegible)
            .filter((l) => !q || `${l.titulo} ${l.autor || ''}`.toLowerCase().includes(q))
            .slice(0, 30);
    }, [libros, busqueda]);

    const libroElegido = libros.find((l) => Number(l.id_libro) === elegido) || null;
    const vista = modoManual ? libroElegido : (config?.libro_automatico ?? (config?.modo === 'automatico' ? config.libro : null));
    const cambios = modoManual
        ? Boolean(elegido) && (config?.modo !== 'manual' || Number(config?.libro?.id_libro) !== elegido)
        : config?.modo === 'manual' || Boolean(config?.manual_invalido);

    async function guardar() {
        if (enviando.current || !config || !cambios || (modoManual && !elegido)) return;
        enviando.current = true;
        setGuardando(true);
        setError('');
        try {
            const nueva = await guardarProtagonista(modoManual ? elegido : null);
            setConfig(nueva);
            exito(modoManual ? 'Libro protagonista guardado.' : 'La portada usará el último libro agregado.');
        } catch (e) {
            setError(e?.response?.data?.mensaje || 'No se pudo guardar el libro protagonista.');
        } finally {
            enviando.current = false;
            setGuardando(false);
        }
    }

    return (
        <Card>
            <CardHeader
                titulo="Libro protagonista de la portada"
                subtitulo="El libro real que flota en la escena 3D del inicio de la web"
                icono={<FaWandMagicSparkles />}
                acciones={<Button variante="secondary" tamano="sm" icono={<FaRotate />} disabled={guardando || cargando} onClick={() => { setCargando(true); setRecarga((n) => n + 1); }}>Actualizar</Button>}
            />
            <CardBody>
                {error && <div className="mb-4"><Alert tipo="error">{error}</Alert></div>}
                {config?.manual_invalido && (
                    <div className="mb-4"><Alert tipo="warning">El libro elegido antes ya no está activo o no tiene portada. Mientras tanto se muestra el último libro agregado.</Alert></div>
                )}
                {cargando ? <p className="py-8 text-center text-sm text-slate-600">Cargando…</p> : (
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                        <div className="space-y-4">
                            <fieldset className="space-y-2" disabled={guardando || !config}>
                                <legend className="text-sm font-semibold text-slate-900">Modo</legend>
                                <label className="protagonista-modo">
                                    <input type="radio" name="modo-portada" checked={!modoManual} onChange={() => setModoManual(false)} />
                                    <span><strong>Automático</strong><small>Usa el último libro agregado que esté activo y tenga portada.</small></span>
                                </label>
                                <label className="protagonista-modo">
                                    <input type="radio" name="modo-portada" checked={modoManual} onChange={() => setModoManual(true)} />
                                    <span><strong>Elegir un libro</strong><small>Solo un libro puede ser protagonista a la vez.</small></span>
                                </label>
                            </fieldset>

                            {modoManual && (
                                <div className="space-y-2">
                                    <Input disabled={guardando || !config} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por título o autor…" icono={<FaMagnifyingGlass />} aria-label="Buscar libro" />
                                    <ul className="protagonista-lista" aria-label="Libros activos con portada">
                                        {candidatos.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-600">No hay libros activos con portada que coincidan.</li>}
                                        {candidatos.map((l) => (
                                            <li key={l.id_libro}>
                                                <button type="button" disabled={guardando || !config} aria-pressed={Number(l.id_libro) === elegido} onClick={() => setElegido(Number(l.id_libro))}
                                                    className={`protagonista-opcion ${Number(l.id_libro) === elegido ? 'protagonista-opcion--activa' : ''}`}>
                                                    <PortadaCatalogo libro={l} mostrarTexto={false} className="h-14 w-10 shrink-0 rounded object-cover" />
                                                    <span className="min-w-0 flex-1 text-left">
                                                        <span className="block truncate text-sm font-semibold text-slate-900">{l.titulo}</span>
                                                        <span className="block truncate text-xs text-slate-600">{l.autor || 'Autor no registrado'}</span>
                                                    </span>
                                                    <Precio libro={l} />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-primary-200 pt-4">
                                <p className="text-xs text-slate-600">{config?.actualizado_en ? `Última actualización: ${formatearFecha(config.actualizado_en)}` : 'Sin cambios guardados todavía.'}</p>
                                <Button icono={<FaFloppyDisk />} onClick={guardar} cargando={guardando} disabled={!config || !cambios || (modoManual && !elegido)}>
                                    {modoManual ? 'Guardar libro protagonista' : 'Usar modo automático'}
                                </Button>
                            </div>
                        </div>

                        <div>
                            <p className="mb-2 text-sm font-semibold text-slate-900">Vista previa</p>
                            {modoManual && !libroElegido
                                ? <div className="protagonista-vista protagonista-vista--vacia"><FaBookOpen aria-hidden="true" /><p>Elige un libro de la lista para verlo aquí.</p></div>
                                : <VistaPrevia libro={vista} modo={modoManual ? 'manual' : 'automatico'} />}
                        </div>
                    </div>
                )}
            </CardBody>
        </Card>
    );
}
