import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaPaperPlane, FaXmark, FaArrowRotateLeft } from 'react-icons/fa6';
import IconoIA from './IconoIA';
import { sonarPortal } from './sonidoPortal';
import posterAvatar from '../assets/asistente/anime-poster.webp';
import { clienteApi } from '../tienda/clienteApi';
import { listaLibros, libroComercial } from '../tienda/libroComercial';
import ComprarLibro from '../tienda/ComprarLibro';
import { analizarConsulta, responderConsulta, separarSaludo } from './respuestasAsistente';
import { soles, urlPortada } from '../lib/formato';
import './asistente.css';

const bienvenida = {id:0,autor:'asistente',texto:'Hola. Te ayudo con los libros de esta librería: precios, stock, autores y ofertas. También puedo orientarte sobre entrega y cómo comprar. ¿Qué buscas?'};
const sugerencias = [
    {texto:'Buscar un libro',pregunta:'¿Cómo busco un libro?'},
    {texto:'Ver ofertas',pregunta:'¿Qué libros están en oferta?'},
    {texto:'Entrega y recojo',pregunta:'¿Cómo funciona la entrega?'}
];

// Pedazos del personaje para la presentación (4 x 4). Cada uno sale de un
// punto distinto alrededor y llega a su sitio en una fracción de segundo.
const PIEZAS = Array.from({length:16},(_,i)=>{
    const angulo=i*137.5*Math.PI/180, distancia=110+(i%3)*30;
    return {i,x:i%4,y:Math.floor(i/4),dx:Math.round(Math.cos(angulo)*distancia),dy:Math.round(Math.sin(angulo)*distancia),giro:(i%2?1:-1)*(40+i*7),retraso:(i%5)*0.025};
});

// Lo que "piensa" el asistente mientras consulta, como haría una persona.
const FRASES_PENSANDO = ['Pensando…', 'Buscando en el catálogo…', 'Revisando precios y stock…', 'Preparando tu respuesta…'];
const ahora = () => Date.now();
const movimientoReducido = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Escribe el texto poco a poco. El texto completo va oculto para lectores
// de pantalla desde el primer momento: no tienen que oír letra por letra.
function TextoEscrito({ texto, animar, alAvanzar, alTerminar }) {
    const [cuantos, setCuantos] = useState(animar ? 0 : texto.length);
    const fin = useRef(alTerminar);
    useEffect(() => { fin.current = alTerminar; });
    useEffect(() => {
        if (!animar) return;
        const paso = Math.max(1, Math.ceil(texto.length / 70));
        const id = setInterval(() => setCuantos((c) => {
            const siguiente = Math.min(texto.length, c + paso);
            if (siguiente >= texto.length) { clearInterval(id); fin.current?.(); }
            return siguiente;
        }), 16);
        return () => clearInterval(id);
    }, [animar, texto]);
    useEffect(() => { if (animar) alAvanzar?.(); }, [cuantos, animar, alAvanzar]);
    const escribiendo = cuantos < texto.length;
    return <p>
        <span aria-hidden="true">{texto.slice(0, cuantos)}{escribiendo && <span className="asistente-cursor" />}</span>
        <span className="visualmente-oculto">{texto}</span>
    </p>;
}

function Pensando() {
    const [frase, setFrase] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setFrase((f) => (f + 1) % FRASES_PENSANDO.length), 1100);
        return () => clearInterval(id);
    }, []);
    return <div className="asistente-pensando" role="status">
        <span className="asistente-avatar asistente-avatar--pensando"><IconoIA pensando /></span>
        <span className="asistente-pensando__burbuja">
            <span key={frase} className="asistente-pensando__frase" aria-hidden="true">{FRASES_PENSANDO[frase]}</span>
            <span className="asistente-pensando__puntos" aria-hidden="true"><i /><i /><i /></span>
            <span className="visualmente-oculto">Pensando. Consultando el catálogo.</span>
        </span>
    </div>;
}

export default function AsistenteTienda({ legal }) {
    const [abierto,setAbierto] = useState(false);
    const [pregunta,setPregunta] = useState('');
    const [mensajes,setMensajes] = useState([bienvenida]);
    const [ocupado,setOcupado] = useState(false);
    const [fecha,setFecha] = useState(null);
    // Ids de respuestas nuevas que ya terminaron de escribirse.
    const [escritos,setEscritos] = useState(()=>new Set());
    const bajar = useCallback(()=>{if(conversacion.current)conversacion.current.scrollTop=conversacion.current.scrollHeight;},[]);
    const boton = useRef(null), campo = useRef(null), conversacion = useRef(null);
    const bloqueo = useRef(false), montado = useRef(true), siguiente = useRef(1), contexto = useRef([]);
    const contextoServidor=useRef('');
    const {pathname} = useLocation();
    const idActual = Number(/^\/libro\/(\d+)$/.exec(pathname)?.[1]) || undefined;
    useEffect(()=>{montado.current=true;return()=>{montado.current=false;};},[]);
    useEffect(()=>{if(abierto)campo.current?.focus();},[abierto]);
    // Tocar o hacer clic fuera del chat lo cierra y vuelve al icono.
    const raiz=useRef(null);
    useEffect(()=>{
        if(!abierto)return undefined;
        const alTocar=e=>{
            if(raiz.current?.contains(e.target))return;
            setAbierto(false);
        };
        document.addEventListener('pointerdown',alTocar);
        return()=>document.removeEventListener('pointerdown',alTocar);
    },[abierto]);
    useEffect(()=>{if(abierto)bajar();},[mensajes,ocupado,abierto,escritos,bajar]);
    // Primera apertura de la visita: el personaje se arma desde pedazos y saluda,
    // con una campanilla. Las siguientes
    // abren directo para no cansar.
    const [intro,setIntro]=useState(false);
    const introVista=useRef(false);
    function abrir(){
        let primera=!introVista.current;
        try{primera=primera && sessionStorage.getItem('asistente-intro')!=='1';sessionStorage.setItem('asistente-intro','1');}catch{/* sin almacenamiento: solo esta visita */}
        introVista.current=true;
        if(primera){
            sonarPortal();
            if(!movimientoReducido()){setIntro(true);setTimeout(()=>{if(montado.current)setIntro(false);},2700);}
        }
        setAbierto(true);
    }
    function cerrar(){setAbierto(false);boton.current?.focus();}
    function agregar(mensaje){setMensajes(prev=>[...prev.slice(-29),{...mensaje,id:siguiente.current++}]);}
    async function enviar(texto = pregunta) {
        const consulta=texto.trim();
        if(!consulta || consulta.length>400 || bloqueo.current)return;
        bloqueo.current=true;setOcupado(true);setPregunta('');
        agregar({autor:'usuario',texto:consulta});
        // Una pausa breve antes de contestar, como quien lee y piensa la
        // pregunta. Si la consulta ya tardó, no se añade más espera.
        const inicio=ahora();
        const objetivo=movimientoReducido()?0:700+Math.min(800,consulta.length*12);
        const responder=async(mensaje)=>{
            const falta=objetivo-(ahora()-inicio);
            if(falta>0)await new Promise(r=>setTimeout(r,falta));
            if(montado.current)agregar({...mensaje,nuevo:!movimientoReducido()});
        };
        // «Hola, ¿tienen libros de…?»: se devuelve el saludo y se atiende el resto.
        const {saludo,resto}=separarSaludo(consulta);
        const pedido=saludo?(resto || consulta):consulta;
        const conSaludo=m=>saludo?{...m,texto:`${saludo} ${m.texto}`}:m;
        try {
            if(saludo && !resto){await responder({autor:'asistente',texto:`${saludo} Soy el asistente de la librería. Puedo buscar libros por título, autor o categoría, decirte precios y stock, mostrarte ofertas y orientarte sobre la ubicación de la tienda, la entrega y cómo comprar. ¿Qué buscas hoy?`});return;}
            const plan=analizarConsulta(pedido);
            let libros=[];
            let consultado=null;
            if(plan.tipo==='catalogo'){
                try {
                    const json=await clienteApi.asistente({mensaje:pedido,...(contextoServidor.current?{contexto:contextoServidor.current}:{}),...(idActual?{id_libro:idActual}:{})});
                    if(typeof json.data?.mensaje!=='string' || !Array.isArray(json.data.libros))throw new Error('Respuesta no válida');
                    if(!montado.current)return;
                    contextoServidor.current=json.data.contexto || '';
                    const respuesta={autor:'asistente',texto:json.data.mensaje,libros:json.data.libros.map(libroComercial),
                        motivos:Object.fromEntries(json.data.libros.map(l=>[l.id_libro,l.motivo])),opciones:json.data.opciones || [],consultado:new Date()};
                    setFecha(respuesta.consultado);await responder(conSaludo(respuesta));return;
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
            const respuesta=responderConsulta(pedido,{libros,legal,contexto:contexto.current,idActual});
            if(plan.tipo==='catalogo')contexto.current=respuesta.contexto || [];
            await responder(conSaludo({...respuesta,autor:'asistente',consultado}));
        } catch(error) {
            if(error.status===400){contextoServidor.current='';contexto.current=[];}
            if(montado.current)await responder({autor:'asistente',texto:error.status===429?'Has realizado muchas consultas. Espera un momento y vuelve a intentar.'
                :error.status===400?'Necesitamos retomar la búsqueda. Dime de nuevo el título, autor o categoría; no puedo confirmar datos con un contexto inválido.'
                :'No pude consultar el catálogo en este momento. No puedo confirmar precios ni stock sin esa consulta. Puedes reintentar.',reintentar:consulta});
        } finally {
            bloqueo.current=false;
            if(montado.current){setOcupado(false);campo.current?.focus();}
        }
    }
    function reiniciar(){if(bloqueo.current)return;setMensajes([bienvenida]);setEscritos(new Set());contexto.current=[];contextoServidor.current='';setFecha(null);setPregunta('');campo.current?.focus();}
    return <div ref={raiz} className="asistente-tienda">
        <button ref={boton} type="button" className="asistente-abrir" aria-label="Abrir asistente de la librería"
            aria-expanded={abierto} aria-controls="asistente-panel" onClick={()=>abierto?cerrar():abrir()}>
            <span className="asistente-abrir__icono"><IconoIA pensando={ocupado}/></span>
        </button>
        {abierto && <section id="asistente-panel" className={`asistente-panel${intro?' asistente-panel--portal':''}`} role="dialog" aria-modal="false" aria-labelledby="asistente-titulo"
            onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();cerrar();}}}>
            {intro && <div className="asistente-intro" aria-hidden="true">
                <span className="asistente-intro__avatar">
                    <span className="asistente-intro__piezas">{PIEZAS.map(p=><i key={p.i} style={{'--px':p.x,'--py':p.y,'--dx':`${p.dx}px`,'--dy':`${p.dy}px`,'--giro':`${p.giro}deg`,'--retraso':`${p.retraso}s`,backgroundImage:`url(${posterAvatar})`}}/>)}</span>
                    <span className="asistente-intro__vivo"><IconoIA desde={4.4}/></span>
                </span>
                <p className="asistente-intro__texto">¡Hola! Soy tu asistente</p>
            </div>}
            <header className="asistente-cabecera"><span className="asistente-avatar"><IconoIA pensando={ocupado}/></span><div className="asistente-cabecera__texto"><h2 id="asistente-titulo">Asistente de la librería</h2><p>Catálogo e información de la tienda</p></div>
                <button type="button" className="asistente-icono" aria-label="Cerrar asistente" onClick={cerrar}><FaXmark aria-hidden="true"/></button>
            </header>
            <div ref={conversacion} className="asistente-conversacion" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversación con el asistente">
                {mensajes.map(m=><div key={m.id} className={`asistente-mensaje asistente-mensaje--${m.autor}`}>
                    <span className="asistente-quien">{m.autor==='usuario'?'Tú':'Asistente'}</span>
                    {m.autor==='asistente'
                        ?<TextoEscrito texto={m.texto} animar={Boolean(m.nuevo) && !escritos.has(m.id)} alAvanzar={bajar}
                            alTerminar={()=>setEscritos(prev=>new Set(prev).add(m.id))}/>
                        :<p>{m.texto}</p>}
                    {(!m.nuevo || escritos.has(m.id)) && <div className="asistente-extras">
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
                    </div>}
                </div>)}
                {ocupado && <Pensando/>}
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
