import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa6';
import useCarrusel from '../hooks/useCarrusel';
import { urlPortada } from '../lib/formato';
import './carrusel-inicio.css';

// Anuncios al ancho real de la pantalla: un celular baja la versión de 800 px
// en lugar de la de 1800 px.
const ANCHOS_ANUNCIO=[800,1200,1800];
const fuentesAnuncio=url=>ANCHOS_ANUNCIO.map(a=>`${urlPortada(url,a)} ${a}w`).join(', ');
const anchoAnuncio=()=>{
    const necesario=(typeof window==='undefined'?1800:window.innerWidth*(window.devicePixelRatio||1));
    return ANCHOS_ANUNCIO.find(a=>a>=necesario)||1800;
};

export default function Hero(){
    const {imagenes:data,cargando,error,reintentar}=useCarrusel();
    const [indice,setIndice]=useState(0),[foco,setFoco]=useState(false);
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
        // Cambia solo, también con movimiento reducido (ahí sin transición).
        // Solo se detiene si se recorre con el teclado o la pestaña no se ve.
        if(imagenes.length<2 || foco || oculto || cargando)return undefined;
        const id=setInterval(()=>setIndice(v=>(v+1)%imagenes.length),6000);
        return()=>clearInterval(id);
    },[imagenes.length,foco,oculto,cargando,indice]);
    useEffect(()=>{
        if(imagenes.length<2)return;
        const proxima=new Image();proxima.src=urlPortada(imagenes[(actual+1)%imagenes.length].imagen_url,anchoAnuncio());
    },[imagenes,actual]);
    function intentar(){setFallidas([]);setIndice(0);reintentar();}
    const noImagen=!cargando && !error && !imagenes.length;
    const inicioPuntos=Math.max(0,Math.min(actual-1,imagenes.length-3));
    return <section className="anuncios-inicio" aria-label="Anuncios de la librería" aria-roledescription="carrusel" tabIndex={0}
        onFocusCapture={e=>{if(e.target.matches(':focus-visible'))setFoco(true);}} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFoco(false);}}
        onKeyDown={e=>{if(imagenes.length>1 && ['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();cambiar(e.key==='ArrowRight'?1:-1);}}}>
        <h1 className="sr-only">Libros y anuncios de Librería del Saber</h1>
        <div className="anuncios-inicio__marco">
            {cargando?<div className="anuncios-inicio__vacio"><p role="status">Cargando anuncios…</p></div>
                :error?<div className="anuncios-inicio__vacio"><p role="status">No pudimos cargar los anuncios.</p><div><button type="button" onClick={intentar}>Reintentar anuncios</button><Link to="/catalogo">Ver catálogo</Link></div></div>
                :noImagen?<div className="anuncios-inicio__vacio"><p>{data.length?'No se pudo mostrar la imagen del anuncio.':'Sin imágenes publicadas todavía.'}</p>
                    <div>{data.length>0 && <button type="button" onClick={intentar}>Reintentar anuncios</button>}<Link to="/catalogo">Ver catálogo</Link></div></div>
                :<>{imagen.id_libro?<Link to={`/libro/${Number(imagen.id_libro)}`} aria-label={`Ver libro: ${imagen.titulo}`}>
                    <img key={imagen.id_imagen} src={urlPortada(imagen.imagen_url,1800)} srcSet={fuentesAnuncio(imagen.imagen_url)} sizes="100vw" alt={imagen.titulo || 'Anuncio de la librería'} width="1600" height="600" fetchPriority="high"
                        onError={()=>setFallidas(v=>[...v,Number(imagen.id_imagen)])}/>
                    <span className="anuncios-inicio__ver" aria-hidden="true">Ver ahora <FaArrowRight/></span>
                </Link>:<img key={imagen.id_imagen} src={urlPortada(imagen.imagen_url,1800)} srcSet={fuentesAnuncio(imagen.imagen_url)} sizes="100vw" alt={imagen.titulo || 'Anuncio de la librería'} width="1600" height="600" fetchPriority="high"
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
