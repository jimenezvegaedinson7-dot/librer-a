import { useEffect, useMemo, useRef, useState } from 'react';
import { FaCloudArrowUp, FaMagnifyingGlass, FaImages, FaPlus, FaRotate, FaArrowUp, FaArrowDown, FaEye, FaEyeSlash, FaPen, FaTrashCan } from 'react-icons/fa6';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/TableSkeleton';
import { Modal } from '../../components/ui/Modal';
import { ConfirmarEliminacion } from '../../components/ui/ConfirmarEliminacion';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/providers/ToastProvider';
import { construirUrlArchivo } from '../../lib/api/client';
import { listarLibros } from '../libros/librosService';
import { listarImagenesCarrusel,crearImagenCarrusel,actualizarImagenCarrusel,ordenarCarrusel,eliminarImagenCarrusel } from './carruselService';

// Sin tildes ni mayúsculas: "garcia" encuentra "García".
const normalizar=t=>String(t || '').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();

function FormularioImagen({imagen,onCerrar,onGuardado,siguienteOrden}){
    const [titulo,setTitulo]=useState(imagen?.titulo || ''),[orden,setOrden]=useState(String(imagen?.orden ?? siguienteOrden)),[estado,setEstado]=useState(String(imagen?.estado ?? 1));
    const [idLibro,setIdLibro]=useState(String(imagen?.id_libro || '')),[archivo,setArchivo]=useState(null),[preview,setPreview]=useState('');
    const [arrastrando,setArrastrando]=useState(false),[libros,setLibros]=useState([]),[error,setError]=useState(''),[guardando,setGuardando]=useState(false);
    const [busqueda,setBusqueda]=useState('');
    const url=useRef(''),bloqueo=useRef(false);const {exito}=useToast();
    const librosOrdenados=useMemo(()=>[...libros].sort((a,b)=>String(a.titulo).localeCompare(String(b.titulo),'es',{sensitivity:'base'})),[libros]);
    const librosVisibles=useMemo(()=>{const q=normalizar(busqueda);return q?librosOrdenados.filter(l=>normalizar(`${l.titulo} ${l.autor || ''}`).includes(q)):librosOrdenados;},[librosOrdenados,busqueda]);
    const seleccionado=libros.find(l=>String(l.id_libro)===idLibro);
    // El libro ya elegido sigue en la lista aunque la búsqueda lo deje fuera.
    const seleccionadoFuera=Boolean(idLibro) && !librosVisibles.some(l=>String(l.id_libro)===idLibro);
    useEffect(()=>{let activo=true;listarLibros().then(l=>{if(activo)setLibros(l.filter(b=>Number(b.estado)===1));}).catch(()=>{});return()=>{activo=false;if(url.current)URL.revokeObjectURL(url.current);};},[]);
    function elegir(e){
        const f=e.target.files?.[0];if(!f)return;
        if(url.current)URL.revokeObjectURL(url.current);url.current='';setArchivo(null);setPreview('');
        if(!['image/jpeg','image/png','image/webp'].includes(f.type) || f.size>5*1024*1024){setError('Selecciona una imagen JPG, PNG o WebP de hasta 5 MB.');e.target.value='';return;}
        url.current=URL.createObjectURL(f);setArchivo(f);setPreview(url.current);setError('');
    }
    async function guardar(e){
        e.preventDefault();if(bloqueo.current)return;
        if(!titulo.trim() || (!imagen && !archivo)){setError('Escribe un título y selecciona la imagen del anuncio.');return;}
        bloqueo.current=true;setGuardando(true);setError('');
        try{
            const d={titulo:titulo.trim(),orden,estado,id_libro:idLibro,imagen:archivo};
            const r=imagen?await actualizarImagenCarrusel(imagen.id_imagen,d):await crearImagenCarrusel(d);
            exito(r.mensaje || 'Imagen guardada');await onGuardado();onCerrar();
        }catch(e){setError(e.response?.data?.mensaje || 'No se pudo guardar la imagen.');}
        finally{bloqueo.current=false;setGuardando(false);}
    }
    return <Modal abierto titulo={imagen?'Editar imagen del carrusel':'Nueva imagen del carrusel'}
        subtitulo="La imagen completa se muestra como banner en el inicio de la web" onCerrar={()=>{if(!bloqueo.current)onCerrar();}}
        footer={<><Button variante="secondary" disabled={guardando} onClick={onCerrar}>Cancelar</Button><Button type="submit" form="form-imagen-carrusel" cargando={guardando}>Guardar imagen</Button></>}>
        <form id="form-imagen-carrusel" onSubmit={guardar} className="space-y-4">
            <Input label="Título del anuncio / texto alternativo" value={titulo} maxLength={200} requerido onChange={e=>setTitulo(e.target.value)} placeholder="Ej. Libro destacado de la semana"/>
            <div className="grid gap-4 sm:grid-cols-2"><Input label="Orden de aparición" type="number" min="0" max="100000" value={orden} requerido onChange={e=>setOrden(e.target.value)}/>
                <Select label="Visibilidad" value={estado} onChange={e=>setEstado(e.target.value)}><option value="1">Activo — mostrar en inicio</option><option value="0">Inactivo — oculto</option></Select></div>
            {/* Con muchos libros: lista de la A a la Z y un buscador que la filtra al escribir. */}
            <div className="space-y-2">
                <Input label="Buscar libro para vincular" type="search" value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Escribe parte del título o autor" icono={<FaMagnifyingGlass/>}/>
                <Select label="Libro vinculado (opcional)" value={idLibro} onChange={e=>setIdLibro(e.target.value)}><option value="">Sin enlace a un libro</option>
                    {seleccionadoFuera && <option value={idLibro}>{seleccionado?seleccionado.titulo:`Libro vinculado #${idLibro}`}</option>}
                    {librosVisibles.map(l=><option key={l.id_libro} value={l.id_libro}>{l.titulo}{l.autor?` — ${l.autor}`:''}</option>)}</Select>
                <p className="text-xs text-slate-500" aria-live="polite">{busqueda.trim()?`${librosVisibles.length} de ${librosOrdenados.length} libros coinciden con «${busqueda.trim()}»`:`${librosOrdenados.length} libros, ordenados de la A a la Z`}</p>
            </div>
            <div>
                <p className="block text-sm font-medium text-slate-700">Imagen del banner {imagen?'(opcional: reemplaza la actual)':<span className="text-crimson-500">*</span>}</p>
                {/* Zona de subida visible: el input nativo solo mostraba "Ningún archivo seleccionado". */}
                <label htmlFor="imagen-carrusel" onDragOver={e=>{e.preventDefault();setArrastrando(true);}} onDragLeave={()=>setArrastrando(false)}
                    onDrop={e=>{e.preventDefault();setArrastrando(false);const f=e.dataTransfer.files?.[0];if(f)elegir({target:{files:[f],value:''}});}}
                    className={`mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition focus-within:ring-2 focus-within:ring-[#004d43]/30 ${arrastrando?'border-[#004d43] bg-[#004d43]/5':'border-slate-300 bg-slate-50 hover:border-[#004d43] hover:bg-white'}`}>
                    <FaCloudArrowUp className="h-8 w-8 text-[#004d43]" aria-hidden="true"/>
                    <span className="text-sm font-semibold text-slate-800">{archivo?archivo.name:'Haz clic para subir la imagen o arrástrala aquí'}</span>
                    <span className="inline-flex items-center gap-2 rounded-lg bg-[#004d43] px-4 py-2 text-sm font-medium text-white">{archivo || imagen?'Cambiar imagen':'Seleccionar imagen'}</span>
                    <input id="imagen-carrusel" type="file" accept="image/jpeg,image/png,image/webp" onChange={elegir} className="sr-only"/>
                </label>
                <p className="mt-2 text-sm text-slate-600">JPG, PNG o WebP, hasta 5 MB. Recomendado: 1600 × 600 px. Incluye el anuncio en la imagen y usa texto grande para celular; no se recortará.</p></div>
            {(preview || imagen?.imagen_url) && <img src={preview || construirUrlArchivo(imagen.imagen_url)} alt="Vista previa del banner" className="aspect-[8/3] w-full rounded-lg border border-slate-200 bg-slate-50 object-contain"/>}
            {error && <Alert tipo="error">{error}</Alert>}
        </form>
    </Modal>;
}

export default function CarruselPanel(){
    const [lista,setLista]=useState([]),[cargando,setCargando]=useState(true),[error,setError]=useState(''),[form,setForm]=useState(null),[eliminar,setEliminar]=useState(null),[ocupado,setOcupado]=useState(false);
    const operando=useRef(false);const {exito,error:avisar}=useToast();
    async function cargar(){try{setCargando(true);setError('');setLista(await listarImagenesCarrusel());}catch(e){setError(e.response?.status===404?'Este servidor todavía no tiene habilitado el carrusel. Publica la actualización del backend cuando esté autorizada.':e.response?.data?.mensaje || 'No se pudo cargar el carrusel.');}finally{setCargando(false);}}
    useEffect(()=>{Promise.resolve().then(cargar);},[]);
    async function operar(accion){if(operando.current)return;operando.current=true;setOcupado(true);try{const r=await accion();exito(r?.mensaje || 'Carrusel actualizado');await cargar();}catch(e){avisar(e.response?.data?.mensaje || 'No se pudo actualizar el carrusel.');}finally{operando.current=false;setOcupado(false);}}
    function mover(i,paso){const ids=lista.map(l=>l.id_imagen),j=i+paso;if(j<0 || j>=ids.length)return;[ids[i],ids[j]]=[ids[j],ids[i]];operar(()=>ordenarCarrusel(ids));}
    async function confirmar(password){await operar(async()=>{const r=await eliminarImagenCarrusel(eliminar.id_imagen,password);setEliminar(null);return r;});}
    return <div className="space-y-4">
        <Alert tipo="info">Estas imágenes reemplazan el libro animado y el texto del bloque principal del inicio. Puedes mantener varios anuncios activos: se mostrarán en el orden indicado.</Alert>
        <Card><CardHeader titulo="Carrusel de imágenes" subtitulo={`${lista.filter(l=>Number(l.estado)===1).length} imágenes activas · carga banners con tus anuncios de libros`}
            acciones={<div className="flex flex-wrap gap-2"><Button variante="secondary" onClick={cargar} disabled={cargando || ocupado}><FaRotate/> Actualizar carrusel</Button>
                <Button onClick={()=>setForm({})} disabled={Boolean(error) || cargando || ocupado}><FaPlus/> Nueva imagen</Button></div>}/>
            <CardBody>{cargando?<TableSkeleton columnas={4} filas={2}/>:error?<Alert tipo="error">{error}</Alert>:!lista.length?
                <EmptyState titulo="Carrusel sin imágenes" descripcion="Sube la primera imagen para mostrar tu anuncio en el inicio." icono={<FaImages/>}/>
                :<ul className="space-y-4">{lista.map((l,i)=><li key={l.id_imagen} className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row">
                    <img src={construirUrlArchivo(l.imagen_url)} alt={`Banner: ${l.titulo}`} className="aspect-[8/3] w-full rounded-lg bg-slate-50 object-contain sm:w-60"/>
                    <div className="min-w-0 flex-1"><h2 className="text-base font-semibold text-slate-800">{l.titulo}</h2><p className="mt-1 text-sm text-slate-600">Orden: {l.orden}{l.id_libro?` · Enlace al libro #${l.id_libro}`:' · Sin enlace a libro'}</p>
                        <div className="mt-2"><Badge color={Number(l.estado)===1?'success':'neutral'}>{Number(l.estado)===1?'Activo en el carrusel':'Oculto'}</Badge></div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Button variante="secondary" tamano="sm" aria-label={`Subir ${l.titulo}`} disabled={i===0 || ocupado} onClick={()=>mover(i,-1)}><FaArrowUp/> Subir</Button>
                            <Button variante="secondary" tamano="sm" aria-label={`Bajar ${l.titulo}`} disabled={i===lista.length-1 || ocupado} onClick={()=>mover(i,1)}><FaArrowDown/> Bajar</Button>
                            <Button variante="secondary" tamano="sm" disabled={ocupado} onClick={()=>operar(()=>actualizarImagenCarrusel(l.id_imagen,{estado:Number(l.estado)===1?0:1}))}>{Number(l.estado)===1?<FaEyeSlash/>:<FaEye/>}{Number(l.estado)===1?'Ocultar':'Mostrar'}</Button>
                            <Button variante="secondary" tamano="sm" disabled={ocupado} onClick={()=>setForm(l)}><FaPen/> Editar imagen</Button>
                            <Button variante="danger" tamano="sm" disabled={ocupado} onClick={()=>setEliminar(l)}><FaTrashCan/> Eliminar imagen</Button>
                        </div>
                    </div>
                </li>)}</ul>}
            </CardBody>
        </Card>
        {form && <FormularioImagen imagen={form.id_imagen?form:null} siguienteOrden={Math.max(0,...lista.map(l=>Number(l.orden)))+1} onCerrar={()=>setForm(null)} onGuardado={cargar}/>}
        <ConfirmarEliminacion abierto={Boolean(eliminar)} titulo="Eliminar imagen del carrusel" mensaje={eliminar?`Se eliminará «${eliminar.titulo}» y su imagen.`:''}
            advertencia="Esta imagen dejará de estar disponible en el inicio." eliminando={ocupado} onCerrar={()=>{if(!ocupado)setEliminar(null);}} onConfirmar={confirmar}/>
    </div>;
}
