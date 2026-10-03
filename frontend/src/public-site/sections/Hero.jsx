import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useCarrusel from '../hooks/useCarrusel';
import { urlPortada } from '../lib/formato';
import './carrusel-inicio.css';

export default function Hero({reducido}){
    const {imagenes:data,cargando,error,reintentar}=useCarrusel();
    const [indice,setIndice]=useState(0),[hover,setHover]=useState(false),[foco,setFoco]=useState(false);
    const [oculto,setOculto]=useState(()=>typeof document!=='undefined' && document.hidden),[fallidas,setFallidas]=useState([]);
    const imagenes=useMemo(()=>{const ids=new Set();return data.filter(l=>{
        const id=Number(l.id_imagen);if(!Number.isInteger(id) || id<1 || ids.has(id) || fallidas.includes(id))return false;
        ids.add(id);return Boolean(urlPortada(l.imagen_url,1800));
    });},[data,fallidas]);
    const actual=imagenes.length?indice%imagenes.length:0;
    const imagen=imagenes[actual];
    const cambiar=paso=>setIndice(v=>imagenes.length?(v+paso+imagenes.length)%imagenes.length:0);
    useEffect(()=>{const escuchar=()=>setOculto(document.hidden);document.addEventListener('visibilitychange',escuchar);return()=>document.removeEventListener('visibilitychange',escuchar);},[]);
    useEffect(()=>{
        if(imagenes.length<2 || reducido || hover || foco || oculto || cargando)return undefined;
        const id=setInterval(()=>setIndice(v=>(v+1)%imagenes.length),6000);
        return()=>clearInterval(id);
    },[imagenes.length,reducido,hover,foco,oculto,cargando,indice]);
    useEffect(()=>{
        if(imagenes.length<2)return;
        const proxima=new Image();proxima.src=urlPortada(imagenes[(actual+1)%imagenes.length].imagen_url,1800);
    },[imagenes,actual]);
    function intentar(){setFallidas([]);setIndice(0);reintentar();}
    const noImagen=!cargando && !error && !imagenes.length;
    const inicioPuntos=Math.max(0,Math.min(actual-1,imagenes.length-3));
    return <section className="anuncios-inicio" aria-label="Anuncios de la librería" aria-roledescription="carrusel" tabIndex={0}
        onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
        onFocusCapture={()=>setFoco(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFoco(false);}}
        onKeyDown={e=>{if(imagenes.length>1 && ['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();cambiar(e.key==='ArrowRight'?1:-1);}}}>
        <h1 className="sr-only">Libros y anuncios de Librería del Saber</h1>
        <div className="anuncios-inicio__marco">
            {cargando?<div className="anuncios-inicio__vacio"><p role="status">Cargando anuncios…</p></div>
                :error?<div className="anuncios-inicio__vacio"><p role="status">No pudimos cargar los anuncios.</p><div><button type="button" onClick={intentar}>Reintentar anuncios</button><Link to="/catalogo">Ver catálogo</Link></div></div>
                :noImagen?<div className="anuncios-inicio__vacio"><p>{data.length?'No se pudo mostrar la imagen del anuncio.':'Sin imágenes publicadas todavía.'}</p>
                    <div>{data.length>0 && <button type="button" onClick={intentar}>Reintentar anuncios</button>}<Link to="/catalogo">Ver catálogo</Link></div></div>
                :<>{imagen.id_libro?<Link to={`/libro/${Number(imagen.id_libro)}`} aria-label={`Ver libro: ${imagen.titulo}`}>
                    <img key={imagen.id_imagen} src={urlPortada(imagen.imagen_url,1800)} alt={imagen.titulo || 'Anuncio de la librería'} width="1600" height="600" fetchPriority="high"
                        onError={()=>setFallidas(v=>[...v,Number(imagen.id_imagen)])}/>
                </Link>:<img key={imagen.id_imagen} src={urlPortada(imagen.imagen_url,1800)} alt={imagen.titulo || 'Anuncio de la librería'} width="1600" height="600" fetchPriority="high"
                    onError={()=>setFallidas(v=>[...v,Number(imagen.id_imagen)])}/>}
                </>}
        </div>
        {!cargando && imagenes.length>1 && <div className="anuncios-inicio__controles">
            {/* Solo los puntos: las flechas, el contador y el botón de pausa
                recargaban el banner. Se pausa al pasar el mouse o al enfocarlo,
                y con el foco las flechas del teclado lo mueven. */}
            <span className="visualmente-oculto" aria-live={foco?'polite':'off'}>Anuncio {actual+1} de {imagenes.length}</span>
            <div className="anuncios-inicio__puntos" aria-label="Elegir anuncio">{imagenes.slice(inicioPuntos,inicioPuntos+3).map((l,i)=>{
                const n=inicioPuntos+i;return <button key={l.id_imagen} type="button" aria-label={`Mostrar anuncio ${n+1}`} aria-current={n===actual?'true':undefined} onClick={()=>setIndice(n)}><span/></button>;
            })}</div>
        </div>}
    </section>;
}
