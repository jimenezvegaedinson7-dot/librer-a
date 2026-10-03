import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaComments, FaPaperPlane, FaXmark, FaArrowRotateLeft } from 'react-icons/fa6';
import { clienteApi } from '../tienda/clienteApi';
import { listaLibros, libroComercial } from '../tienda/libroComercial';
import ComprarLibro from '../tienda/ComprarLibro';
import { analizarConsulta, responderConsulta } from './respuestasAsistente';
import { soles, urlPortada } from '../lib/formato';
import './asistente.css';

const bienvenida = {id:0,autor:'asistente',texto:'Hola. Te ayudo con los libros de esta librería: precios, stock, autores y ofertas. También puedo orientarte sobre entrega y cómo comprar. ¿Qué buscas?'};
const sugerencias = [
    {texto:'Buscar un libro',pregunta:'¿Cómo busco un libro?'},
    {texto:'Ver ofertas',pregunta:'¿Qué libros están en oferta?'},
    {texto:'Entrega y recojo',pregunta:'¿Cómo funciona la entrega?'}
];

export default function AsistenteTienda({ legal }) {
    const [abierto,setAbierto] = useState(false);
    const [pregunta,setPregunta] = useState('');
    const [mensajes,setMensajes] = useState([bienvenida]);
    const [ocupado,setOcupado] = useState(false);
    const [fecha,setFecha] = useState(null);
    const boton = useRef(null), campo = useRef(null), conversacion = useRef(null);
    const bloqueo = useRef(false), montado = useRef(true), siguiente = useRef(1), contexto = useRef([]);
    const contextoServidor=useRef('');
    const {pathname} = useLocation();
    const idActual = Number(/^\/libro\/(\d+)$/.exec(pathname)?.[1]) || undefined;
    useEffect(()=>{montado.current=true;return()=>{montado.current=false;};},[]);
    useEffect(()=>{if(abierto)campo.current?.focus();},[abierto]);
    // El botón flotante se aparta al bajar para no tapar textos ni imágenes;
    // vuelve al subir o cerca del inicio de la página.
    const [apartado,setApartado] = useState(false);
    useEffect(()=>{
        let previo=window.scrollY;
        const alDesplazar=()=>{
            const y=window.scrollY;
            if(y<160)setApartado(false);
            else if(y>previo+6)setApartado(true);
            else if(y<previo-6)setApartado(false);
            previo=y;
        };
        window.addEventListener('scroll',alDesplazar,{passive:true});
        return()=>window.removeEventListener('scroll',alDesplazar);
    },[]);
    useEffect(()=>{
        if(abierto && conversacion.current)conversacion.current.scrollTop=conversacion.current.scrollHeight;
    },[mensajes,ocupado,abierto]);
    function cerrar(){setAbierto(false);boton.current?.focus();}
    function agregar(mensaje){setMensajes(prev=>[...prev.slice(-29),{...mensaje,id:siguiente.current++}]);}
    async function enviar(texto = pregunta) {
        const consulta=texto.trim();
        if(!consulta || consulta.length>400 || bloqueo.current)return;
        bloqueo.current=true;setOcupado(true);setPregunta('');
        agregar({autor:'usuario',texto:consulta});
        try {
            const plan=analizarConsulta(consulta);
            let libros=[];
            let consultado=null;
            if(plan.tipo==='catalogo'){
                try {
                    const json=await clienteApi.asistente({mensaje:consulta,...(contextoServidor.current?{contexto:contextoServidor.current}:{}),...(idActual?{id_libro:idActual}:{})});
                    if(typeof json.data?.mensaje!=='string' || !Array.isArray(json.data.libros))throw new Error('Respuesta no válida');
                    if(!montado.current)return;
                    contextoServidor.current=json.data.contexto || '';
                    const respuesta={autor:'asistente',texto:json.data.mensaje,libros:json.data.libros.map(libroComercial),
                        motivos:Object.fromEntries(json.data.libros.map(l=>[l.id_libro,l.motivo])),opciones:json.data.opciones || [],consultado:new Date()};
                    setFecha(respuesta.consultado);agregar(respuesta);return;
                } catch(error) {
                    // Compatibilidad mientras el nuevo endpoint aun no se publique.
                    // Otros fallos no se ocultan ni se convierten en datos inventados.
                    if(![404,405].includes(error.status))throw error;
                }
                const json=await clienteApi.catalogo();
                if(!Array.isArray(json.data))throw new Error('Catálogo no disponible');
                libros=listaLibros(json);
                consultado=new Date();
                if(montado.current)setFecha(consultado);
            }
            if(!montado.current)return;
            const respuesta=responderConsulta(consulta,{libros,legal,contexto:contexto.current,idActual});
            if(plan.tipo==='catalogo')contexto.current=respuesta.contexto || [];
            agregar({...respuesta,autor:'asistente',consultado});
        } catch(error) {
            if(error.status===400){contextoServidor.current='';contexto.current=[];}
            if(montado.current)agregar({autor:'asistente',texto:error.status===429?'Has realizado muchas consultas. Espera un momento y vuelve a intentar.'
                :error.status===400?'Necesitamos retomar la búsqueda. Dime de nuevo el título, autor o categoría; no puedo confirmar datos con un contexto inválido.'
                :'No pude consultar el catálogo en este momento. No puedo confirmar precios ni stock sin esa consulta. Puedes reintentar.',reintentar:consulta});
        } finally {
            bloqueo.current=false;
            if(montado.current){setOcupado(false);campo.current?.focus();}
        }
    }
    function reiniciar(){if(bloqueo.current)return;setMensajes([bienvenida]);contexto.current=[];contextoServidor.current='';setFecha(null);setPregunta('');campo.current?.focus();}
    return <div className="asistente-tienda" data-apartado={apartado && !abierto ? '' : undefined}>
        <button ref={boton} type="button" className="asistente-abrir" aria-label="Abrir asistente de la librería"
            aria-expanded={abierto} aria-controls="asistente-panel" onClick={()=>abierto?cerrar():setAbierto(true)}>
            <FaComments aria-hidden="true"/><span>Asistente</span>
        </button>
        {abierto && <section id="asistente-panel" className="asistente-panel" role="dialog" aria-modal="false" aria-labelledby="asistente-titulo"
            onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();cerrar();}}}>
            <header className="asistente-cabecera"><div><h2 id="asistente-titulo">Asistente de la librería</h2><p>Catálogo e información de la tienda</p></div>
                <button type="button" className="asistente-icono" aria-label="Cerrar asistente" onClick={cerrar}><FaXmark aria-hidden="true"/></button>
            </header>
            <div ref={conversacion} className="asistente-conversacion" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversación con el asistente">
                {mensajes.map(m=><div key={m.id} className={`asistente-mensaje asistente-mensaje--${m.autor}`}>
                    <span className="asistente-quien">{m.autor==='usuario'?'Tú':'Asistente'}</span><p>{m.texto}</p>
                    {m.libros?.length>0 && <ul className="asistente-libros">{m.libros.map(l=><li key={l.id}>
                        {l.portada && <img className="asistente-portada" src={urlPortada(l.portada,160)} alt={`Portada de ${l.titulo}`} width="44" height="66" loading="lazy" onError={e=>{e.currentTarget.hidden=true;}}/>}
                        <Link to={`/libro/${l.id}`} onClick={cerrar}>{l.titulo}</Link>
                        {l.autor && <p>{l.autor}</p>}
                        <p><strong>{soles(l.precioFinal)}</strong>{l.descuento>0 && <> <s>{soles(l.precio)}</s><span className="asistente-oferta">Oferta -{l.descuento}%</span></>}</p>
                        <p className="asistente-stock">{l.stock>0?`${l.stock} ${l.stock===1?'ejemplar disponible':'ejemplares disponibles'}`:'Agotado en el catálogo consultado'}</p>
                        {m.motivos?.[l.id] && <p className="asistente-motivo">{m.motivos[l.id]}</p>}
                        <ComprarLibro libro={l}/>
                    </li>)}</ul>}
                    {m.opciones?.length>0 && <div className="asistente-sugerencias" aria-label="Aclarar búsqueda">{m.opciones.map(o=><button key={o.consulta} type="button" disabled={ocupado} onClick={()=>enviar(o.consulta)}>{o.texto}</button>)}</div>}
                    {m.enlaces?.length>0 && <ul className="asistente-enlaces">{m.enlaces.map(e=><li key={e.to}><Link to={e.to} onClick={cerrar}>{e.texto}</Link></li>)}</ul>}
                    {m.consultado && <p className="asistente-consulta">Consulta: <time dateTime={m.consultado.toISOString()}>{m.consultado.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})}</time></p>}
                    {m.reintentar && <button type="button" className="asistente-reintentar" disabled={ocupado} onClick={()=>enviar(m.reintentar)}>Reintentar consulta</button>}
                </div>)}
                {ocupado && <p className="asistente-cargando" role="status">Escribiendo… Consultando el catálogo.</p>}
            </div>
            <div className="asistente-sugerencias" aria-label="Preguntas sugeridas">
                {idActual && <button type="button" disabled={ocupado} onClick={()=>enviar('¿Cuál es el precio y stock de este libro?')}>Este libro</button>}
                {sugerencias.map(s=><button key={s.texto} type="button" disabled={ocupado} onClick={()=>enviar(s.pregunta)}>{s.texto}</button>)}
            </div>
            <form className="asistente-formulario" onSubmit={e=>{e.preventDefault();enviar();}}>
                <label htmlFor="asistente-pregunta">Tu pregunta sobre la librería</label>
                <div><input ref={campo} id="asistente-pregunta" type="text" autoComplete="off" maxLength={400} value={pregunta}
                    placeholder="Título, autor, precio o stock…" onChange={e=>setPregunta(e.target.value)} aria-describedby="asistente-alcance"/>
                    <button type="submit" aria-label="Enviar pregunta" disabled={ocupado || !pregunta.trim()}><FaPaperPlane aria-hidden="true"/></button></div>
                <p id="asistente-alcance">Solo consultas sobre esta librería. Hasta 400 caracteres.</p>
            </form>
            <footer className="asistente-pie"><span>{fecha?`Catálogo consultado a las ${fecha.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})}`:'Datos públicos de la web'}</span>
                <button type="button" className="asistente-icono" aria-label="Reiniciar conversación" disabled={ocupado} onClick={reiniciar}><FaArrowRotateLeft aria-hidden="true"/></button>
            </footer>
        </section>}
    </div>;
}
