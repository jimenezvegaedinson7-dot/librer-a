import { useEffect, useMemo, useRef, useState } from 'react';

import {
    FaCloudArrowUp,
    FaEye,
    FaEyeSlash,
    FaPen,
    FaPlus,
    FaRotate,
    FaTrashCan,
} from 'react-icons/fa6';

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
import { ConfirmarEliminacion } from '../../components/ui/ConfirmarEliminacion';
import { useToast } from '../../components/providers/ToastProvider';
import { formatearFecha } from '../../lib/utils/format';
import CarruselPanel from './CarruselPanel';

import {
    listarAnuncios,
    crearAnuncio,
    actualizarAnuncio,
    eliminarAnuncio,
} from './anunciosService';

// El backend valida los magic bytes, pero avisar aquí evita subir 40 MB
// para que el servidor los rechace. Es una cortesía, no la validación.
const TIPOS_ACEPTADOS = ['video/mp4', 'video/webm', 'video/quicktime'];
const LIMITE_MB = 50;

function tamanoLegible(bytes) {
    if (!bytes) return '0 KB';
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

function revisarArchivo(archivo) {
    if (!TIPOS_ACEPTADOS.includes(archivo.type)) {
        return 'Formato no válido. Sube un MP4 o un WebM.';
    }
    if (archivo.size > LIMITE_MB * 1024 * 1024) {
        return `El video supera los ${LIMITE_MB} MB.`;
    }
    return '';
}

function Formulario({ anuncio, onCerrar, onGuardado }) {
    const { exito } = useToast();
    const esEdicion = Boolean(anuncio);
    const inputRef = useRef(null);

    const [titulo, setTitulo] = useState(anuncio?.titulo || '');
    const [estado, setEstado] = useState(anuncio ? String(anuncio.estado) : '1');
    // Textos junto al video en la portada; vacíos usan los de la web.
    const [textos, setTextos] = useState({
        etiqueta: anuncio?.etiqueta || '',
        descripcion: anuncio?.descripcion || '',
        boton_texto: anuncio?.boton_texto || '',
        boton_enlace: anuncio?.boton_enlace || '',
    });
    const cambiarTexto = (campo) => (e) => {
        setTextos((t) => ({ ...t, [campo]: e.target.value }));
        setError('');
    };
    const [video, setVideo] = useState(null);
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [vistaPrevia, setVistaPrevia] = useState(null);
    const previewRef = useRef(null);
    const enviandoRef = useRef(false);
    useEffect(() => {
        return () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); };
    }, []);

    const asignarVideo = (archivo) => {
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
        previewRef.current = archivo ? URL.createObjectURL(archivo) : null;
        setVistaPrevia(previewRef.current);
        setVideo(archivo);
    };

    // Al elegir un archivo se muestra la vista previa, y cancelar
    // devuelve el input a vacío para poder resubir el mismo archivo.
    const alElegir = (e) => {
        const archivo = e.target.files?.[0];
        if (!archivo) return;
        const problema = revisarArchivo(archivo);
        setError(problema);
        asignarVideo(problema ? null : archivo);
        if (problema) e.target.value = '';
    };

    const quitarVideo = () => {
        asignarVideo(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    const enviar = async (e) => {
        e.preventDefault();
        if (enviandoRef.current) return;
        if (!titulo.trim()) {
            setError('Escribe un título para el anuncio');
            return;
        }
        // En alta no hay archivo previo, así que el video es obligatorio.
        if (!esEdicion && !video) {
            setError('Selecciona el video del anuncio');
            return;
        }
        const enlace = textos.boton_enlace.trim();
        if (enlace && (!enlace.startsWith('/') || enlace.startsWith('//'))) {
            setError('El enlace del botón debe ser una ruta de la web, por ejemplo /catalogo');
            return;
        }

        try {
            enviandoRef.current = true;
            setGuardando(true);
            setError('');
            const res = esEdicion
                ? await actualizarAnuncio(anuncio.id_anuncio, { titulo, estado, video, ...textos })
                : await crearAnuncio({ titulo, estado, video, ...textos });
            exito(res?.mensaje || 'Anuncio guardado');
            await onGuardado();
            onCerrar();
        } catch (err) {
            setError(err.response?.data?.mensaje || 'No se pudo guardar el anuncio');
        } finally {
            enviandoRef.current = false;
            setGuardando(false);
        }
    };

    return (
        <Modal
            abierto
            titulo={esEdicion ? 'Editar anuncio' : 'Nuevo anuncio'}
            subtitulo={esEdicion ? `Anuncio #${anuncio.id_anuncio}` : 'El video se reproduce en la portada de la web pública'}
            onCerrar={onCerrar}
            footer={
                <>
                    <Button variante="secondary" onClick={onCerrar} disabled={guardando}>
                        Cancelar
                    </Button>
                    <Button type="submit" form="form-anuncio" cargando={guardando}>
                        {esEdicion ? 'Guardar cambios' : 'Publicar anuncio'}
                    </Button>
                </>
            }
        >
            <form id="form-anuncio" onSubmit={enviar} className="space-y-4">
                <Input
                    label="Título"
                    value={titulo}
                    onChange={(e) => {
                        setTitulo(e.target.value);
                        setError('');
                    }}
                    placeholder="Ej. Una experiencia creada para quienes aman los libros"
                    maxLength={200}
                    requerido
                />
                <p className="-mt-2 text-xs text-slate-500">
                    Se muestra como título grande al lado del video en la portada.
                </p>

                <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
                    <legend className="px-1 text-sm font-medium text-slate-700">Textos junto al video (opcionales)</legend>
                    <Input
                        label="Etiqueta superior"
                        value={textos.etiqueta}
                        onChange={cambiarTexto('etiqueta')}
                        placeholder="Descubre nuestra librería"
                        maxLength={80}
                    />
                    <Textarea
                        label="Descripción"
                        value={textos.descripcion}
                        onChange={cambiarTexto('descripcion')}
                        placeholder="Conoce nuestra librería, descubre nuestras colecciones y encuentra historias que pueden acompañarte en cada momento."
                        maxLength={400}
                        rows={3}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                            label="Texto del botón"
                            value={textos.boton_texto}
                            onChange={cambiarTexto('boton_texto')}
                            placeholder="Explorar libros"
                            maxLength={40}
                        />
                        <Input
                            label="Enlace del botón"
                            value={textos.boton_enlace}
                            onChange={cambiarTexto('boton_enlace')}
                            placeholder="/catalogo"
                            maxLength={200}
                        />
                    </div>
                    <p className="text-xs text-slate-500">
                        Si dejas un campo vacío, la web usa el texto de ejemplo. El enlace debe ser una página de la web, como /catalogo o /nosotros.
                    </p>
                </fieldset>

                <Select
                    label="Visibilidad"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    requerido
                >
                    <option value="1">Activo — se muestra en la portada</option>
                    <option value="0">Inactivo — oculto</option>
                </Select>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700" htmlFor="campo-video">
                        Video {esEdicion ? '(opcional: reemplaza el actual)' : ''}
                    </label>
                    <input
                        id="campo-video"
                        ref={inputRef}
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        onChange={alElegir}
                        className="block w-full cursor-pointer rounded-lg border border-slate-300 bg-white text-sm text-slate-600 file:mr-3 file:cursor-pointer file:border-0 file:bg-slate-100 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                    />
                    <p className="text-xs text-slate-500">
                        MP4, WebM o MOV, hasta {LIMITE_MB} MB. Se reproduce sin sonido automáticamente.
                    </p>
                </div>

                {video && (
                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
                        <video
                            src={vistaPrevia || undefined}
                            controls
                            muted
                            playsInline
                            className="aspect-video w-full"
                        />
                        <div className="flex items-center justify-between gap-2 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                            <span>{video.name} — {tamanoLegible(video.size)}</span>
                            <button type="button" onClick={quitarVideo} className="font-medium text-[#004d43] hover:underline">
                                Quitar
                            </button>
                        </div>
                    </div>
                )}

                {esEdicion && !video && anuncio.video_url && (
                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
                        <video src={anuncio.video_url} controls muted playsInline className="aspect-video w-full" />
                        <p className="bg-slate-50 px-3 py-2 text-xs text-slate-600">Video actual. Sube otro para reemplazarlo.</p>
                    </div>
                )}

                {error && <Alert tipo="error">{error}</Alert>}
            </form>
        </Modal>
    );
}

const columnas = (enPortada) => [
    {
        titulo: 'Anuncio',
        render: (f) => (
            <p className="text-sm">
                <span className="block font-semibold text-slate-800">{f.titulo}</span>
                <span className="block font-mono text-xs text-slate-500">#{f.id_anuncio}</span>
            </p>
        ),
    },
    {
        titulo: 'Vista previa',
        render: (f) => (
            <video
                src={f.video_url}
                muted
                playsInline
                preload="metadata"
                className="aspect-video w-32 rounded border border-slate-200 bg-slate-900 object-cover"
            />
        ),
    },
    {
        titulo: 'Estado',
        alineacion: 'centro',
        render: (f) => (Number(f.estado) !== 1
            ? <Badge color="neutral">Inactivo</Badge>
            : f.id_anuncio === enPortada?.id_anuncio
                ? <Badge color="success">En portada</Badge>
                : <Badge color="warning">Activo · en espera</Badge>),
    },
    {
        titulo: 'Publicado',
        alineacion: 'centro',
        render: (f) => <span className="text-xs text-slate-600">{formatearFecha(f.created_at)}</span>,
    },
];

function AnunciosVideo() {
    const { exito, error: mostrarError } = useToast();
    const [lista, setLista] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [formAbierto, setFormAbierto] = useState(false);
    const [editando, setEditando] = useState(null);
    const [aEliminar, setAEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);

    const cargar = async () => {
        try {
            setCargando(true);
            setError('');
            setLista(await listarAnuncios());
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al cargar los anuncios');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // La lista llega del más reciente al más antiguo: el primero activo es el
    // que se ve en la portada.
    const enPortada = useMemo(() => lista.find((a) => Number(a.estado) === 1) || null, [lista]);

    const abrirNuevo = () => {
        setEditando(null);
        setFormAbierto(true);
    };

    const abrirEdicion = (anuncio) => {
        setEditando(anuncio);
        setFormAbierto(true);
    };

    // La web pública solo muestra un anuncio, así que activar un segundo
    // sin desactivar el primero deja de lado el que ya se estaba viendo.
    // Se avisa antes en vez de dejarlo pasar en silencio.
    const cambiarEstado = async (anuncio) => {
        const nuevoEstado = Number(anuncio.estado) === 1 ? 0 : 1;
        try {
            const res = await actualizarAnuncio(anuncio.id_anuncio, {
                titulo: anuncio.titulo,
                estado: nuevoEstado,
            });
            exito(res?.mensaje || 'Estado actualizado');
            await cargar();
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || 'No se pudo actualizar el estado');
        }
    };

    const confirmarEliminar = async (password) => {
        setEliminando(true);
        try {
            const res = await eliminarAnuncio(aEliminar.id_anuncio, password);
            exito(res?.mensaje || 'Anuncio eliminado');
            setAEliminar(null);
            await cargar();
        } catch (err) {
            mostrarError(err.response?.data?.mensaje || 'No se pudo eliminar el anuncio');
        } finally {
            setEliminando(false);
        }
    };

    return (
        <div className="space-y-4">
                    <div className="summary-strip flex flex-wrap items-center gap-2">
                        <span className="rounded-xl border border-[#e6e0d7] bg-white px-4 py-2.5 text-sm">
                            Total: <strong>{lista.length}</strong>
                        </span>
                        <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
                            En portada: <strong>{enPortada ? enPortada.titulo : 'ninguno'}</strong>
                        </span>
                    </div>

            <Alert tipo="info">
                La portada muestra el anuncio activo más reciente. Si activas otro, reemplaza al que se está viendo.
            </Alert>

            <Card>
                <CardHeader
                    titulo="Anuncios"
                    subtitulo="Sube un MP4, WebM o MOV corto; en la portada se reproduce en silencio y en bucle."
                    acciones={
                        <div className="flex gap-2">
                            <Button variante="secondary" onClick={cargar} disabled={cargando}>
                                <FaRotate /> Actualizar
                            </Button>
                            <Button onClick={abrirNuevo}>
                                <FaPlus /> Nuevo anuncio
                            </Button>
                        </div>
                    }
                />
                <CardBody className="p-0">
                    {cargando && <TableSkeleton columnas={4} filas={2} />}
                    {!cargando && error && (
                        <div className="p-4">
                            <Alert tipo="error">{error}</Alert>
                        </div>
                    )}
                    {!cargando && !error && lista.length === 0 && (
                        <EmptyState
                            titulo="Sin anuncios"
                            descripcion="Sube el primer video para que aparezca en la portada de la web pública."
                            icono={<FaCloudArrowUp />}
                        />
                    )}
                    {!cargando && !error && lista.length > 0 && (
                        <DataTable
                            columnas={columnas(enPortada)}
                            filas={lista}
                            keyExtractor={(f) => f.id_anuncio}
                            acciones={(f) => (
                                <div className="flex gap-1">
                                    <BtnAccion tipo="ver" onClick={() => cambiarEstado(f)} titulo={Number(f.estado) === 1 ? 'Ocultar' : 'Mostrar'}>
                                        {Number(f.estado) === 1 ? <FaEye /> : <FaEyeSlash />}
                                    </BtnAccion>
                                    <BtnAccion tipo="editar" onClick={() => abrirEdicion(f)} titulo="Editar">
                                        <FaPen />
                                    </BtnAccion>
                                    <BtnAccion tipo="eliminar" onClick={() => setAEliminar(f)} titulo="Eliminar">
                                        <FaTrashCan />
                                    </BtnAccion>
                                </div>
                            )}
                        />
                    )}
                </CardBody>
            </Card>

            {formAbierto && (
                <Formulario
                    anuncio={editando}
                    onCerrar={() => setFormAbierto(false)}
                    onGuardado={cargar}
                />
            )}

            <ConfirmarEliminacion
                abierto={Boolean(aEliminar)}
                titulo="Eliminar anuncio"
                mensaje={
                    aEliminar
                        ? `Se eliminará "${aEliminar.titulo}" junto con su video.`
                        : ''
                }
                advertencia="El video se borra de Cloudinary y habría que volver a subirlo."
                eliminando={eliminando}
                onCerrar={() => setAEliminar(null)}
                onConfirmar={confirmarEliminar}
            />
        </div>
    );
}

export default function AnunciosPage(){
    const [tipo,setTipo]=useState('imagenes');
    function navegarTabs(e){if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const nuevo=tipo==='imagenes'?'videos':'imagenes';setTipo(nuevo);document.getElementById(`tab-anuncios-${nuevo}`)?.focus();}}
    return <div className="space-y-4">
        <PageHeader titulo="Anuncios de la web" descripcion="Carrusel de imágenes del inicio y anuncios en video" icono={<FaCloudArrowUp/>}/>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tipo de anuncios">
            <button type="button" role="tab" tabIndex={tipo==='imagenes'?0:-1} onKeyDown={navegarTabs} aria-selected={tipo==='imagenes'} aria-controls="anuncios-imagenes" id="tab-anuncios-imagenes"
                className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold aria-selected:border-emerald-700 aria-selected:bg-emerald-50" onClick={()=>setTipo('imagenes')}>Carrusel de imágenes</button>
            <button type="button" role="tab" tabIndex={tipo==='videos'?0:-1} onKeyDown={navegarTabs} aria-selected={tipo==='videos'} aria-controls="anuncios-videos" id="tab-anuncios-videos"
                className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold aria-selected:border-emerald-700 aria-selected:bg-emerald-50" onClick={()=>setTipo('videos')}>Anuncios en video</button>
        </div>
        {tipo==='imagenes'?<section role="tabpanel" id="anuncios-imagenes" aria-labelledby="tab-anuncios-imagenes"><CarruselPanel/></section>
            :<section role="tabpanel" id="anuncios-videos" aria-labelledby="tab-anuncios-videos"><AnunciosVideo/></section>}
    </div>;
}
