import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { clienteApi } from './clienteApi';
import { libroComercial } from './libroComercial';
import { PrecioOferta } from '../components/PrecioOferta';
import ComprarLibro from './ComprarLibro';
import { useTienda } from './TiendaContext';
import { Stock } from '../pages/CatalogoPage';
import { FaStore, FaTruckFast, FaShieldHalved } from 'react-icons/fa6';
import PortadaLibro from './PortadaLibro';
import FichaTecnicaLibro from './FichaTecnicaLibro';
import { FavoritoLibro, CompartirLibro } from './AccionesLibro';
import { LibrosRelacionados, SeccionLibros } from './DescubrimientosLibro';
import useSeoLibro from './useSeoLibro';
import './ficha-libro.css';

function InformacionLibro({ libro }) {
    const {items,generacion}=useTienda();
    const [cantidad,setCantidad]=useState(1);
    const agregados=items.find(i=>i.id_libro===libro.id)?.cantidad || 0;
    const enlaceAutor=libro.idAutor?`/catalogo?autor=${libro.idAutor}`:`/catalogo?q=${encodeURIComponent(libro.autor)}`;
    return <div className="ficha-informacion">
        {libro.categoria && <Link className="ficha-categoria" to={`/catalogo?categoria=${encodeURIComponent(libro.categoria)}`}>{libro.categoria}</Link>}
        <h1>{libro.titulo}</h1>
        {libro.autor && <p className="ficha-autor">Por <Link to={enlaceAutor}>{libro.autor}</Link></p>}
        {libro.isbn && <p className="ficha-isbn">ISBN: {libro.isbn}</p>}
        <div className="ficha-precio"><PrecioOferta libro={libro}/></div>
        {libro.descuento>0 && <p className="ficha-promocion">Antes: <s>{`S/ ${libro.precio.toFixed(2)}`}</s> · Precio promocional vigente</p>}
        <div className="ficha-disponibilidad"><Stock libro={libro}/>
            {libro.stock>0 && <p>{libro.stock} unidades disponibles</p>}
        </div>
        <ComprarLibro libro={libro} detalle cantidad={Number(cantidad)} onCantidadChange={setCantidad}/>
        {agregados>0 && <p className="ficha-mensaje">Ya tienes {agregados} {agregados===1?'ejemplar':'ejemplares'} de este libro en el carrito. <Link to="/carrito">Ver carrito</Link></p>}
        <div className="ficha-herramientas"><FavoritoLibro key={`${libro.id}-${generacion}`} libro={libro}/><CompartirLibro libro={libro}/></div>
        <section className="ficha-entrega" aria-label="Entrega disponible"><h2>Entrega disponible</h2><ul>
            <li><FaStore aria-hidden="true"/><span>Recojo en Pallasca — <strong>Gratis</strong></span></li>
            <li><FaTruckFast aria-hidden="true"/><span>Delivery dentro de Pallasca — Tarifa por zona activa</span></li>
            <li><FaShieldHalved aria-hidden="true"/><span>Pago seguro con PayU</span></li>
        </ul></section>
        {libro.sinopsis && <a className="ficha-leer-descripcion" href="#descripcion-libro">Leer la descripción completa</a>}
    </div>;
}

function DescripcionLibro({ libro }) {
    const [expandida,setExpandida]=useState(false);
    const larga=libro.sinopsis.length>900;
    return <section className="ficha-descripcion ficha-seccion" id="descripcion-libro" aria-labelledby="descripcion-titulo">
        <h2 id="descripcion-titulo">Descripción</h2>
        {libro.sinopsis ? <><div id="descripcion-contenido" className={`ficha-descripcion-texto${larga && !expandida?' ficha-descripcion-texto--breve':''}`}>{libro.sinopsis}</div>
            {larga && <button type="button" className="enlace-texto" aria-expanded={expandida} aria-controls="descripcion-contenido" onClick={()=>setExpandida(v=>!v)}>{expandida?'Ver menos':'Ver más'}</button>}</>
            :<p>Este libro todavía no tiene una descripción registrada.</p>}
    </section>;
}

function CargandoFicha() {
    return <><h1>Detalle del libro</h1><p role="status">Cargando la ficha del libro…</p>
        <div className="ficha-superior ficha-cargando" aria-hidden="true"><div className="ficha-skeleton ficha-esqueleto-portada"/>
            <div>{[1,2,3,4].map(n=><div className="ficha-skeleton ficha-esqueleto-linea" key={n}/>)}</div>
            <div className="ficha-skeleton ficha-esqueleto-lateral"/></div></>;
}

export default function LibroPage() {
    const {id}=useParams();
    const [version,setVersion]=useState(0);
    const [versionRelacionados,setVersionRelacionados]=useState(0);
    const [recomendaciones,setRecomendaciones]=useState({id:null,libro:null,version:-1,data:null,error:false});
    const [autor,setAutor]=useState(null);
    const [estado,setEstado]=useState({libro:null,error:'',cargando:true});
    useEffect(()=>{
        let activo=true;
        clienteApi.libro(id).then(json=>{
            if (Number(json.data?.estado)!==1) throw new Error('Este libro no está disponible en el catálogo.');
            if(activo)setEstado({id,libro:libroComercial(json.data),error:'',cargando:false});
        }).catch(e=>{if(activo)setEstado({id,libro:null,error:e.message,status:e.status,cargando:false});});
        return()=>{activo=false;};
    },[id,version]);
    const l=estado.id===id ? estado.libro : null;
    useEffect(()=>{
        if(!l)return undefined;
        let activo=true;
        clienteApi.relacionados(id,l).then(j=>{if(activo)setRecomendaciones({id,libro:l,version:versionRelacionados,data:j.data,error:false});})
            .catch(()=>{if(activo)setRecomendaciones({id,libro:l,version:versionRelacionados,data:null,error:true});});
        return()=>{activo=false;};
    },[id,l,versionRelacionados]);
    const idAutor=l?.idAutor;
    useEffect(()=>{
        if(!idAutor)return undefined;
        let activo=true;
        clienteApi.autor(idAutor).then(j=>{if(activo)setAutor({id:idAutor,data:j.data});}).catch(()=>{});
        return()=>{activo=false;};
    },[idAutor]);
    useSeoLibro(l);
    const recomendacionesVigentes=recomendaciones.id===id && recomendaciones.libro===l && recomendaciones.version===versionRelacionados;
    const datos=recomendacionesVigentes ? recomendaciones.data : null;
    const lista=clave=>(datos?.[clave] || []).filter(x=>Number(x.estado)===1 && Number(x.id_libro)!==Number(id)).map(libroComercial);
    const relacionados=lista('relacionados'),masAutor=lista('mas_autor'),interesarte=lista('interesarte');
    const enlaceAutor=l?.idAutor?`/catalogo?autor=${l.idAutor}`:`/catalogo?q=${encodeURIComponent(l?.autor || '')}`;
    return <section className="compra-pagina contenedor ficha-libro"><nav className="ficha-migas" aria-label="Ruta del libro">
        <Link to="/">Inicio</Link><span aria-hidden="true">/</span><Link to="/catalogo">Catálogo</Link>
        {l?.categoria && <><span aria-hidden="true">/</span><Link to={`/catalogo?categoria=${encodeURIComponent(l.categoria)}`}>{l.categoria}</Link></>}
    </nav>
        {estado.cargando || estado.id!==id ? <CargandoFicha/>
            : !l ? <div className="ficha-error"><h1>{estado.status===404?'Libro no encontrado':'Libro no disponible'}</h1><p role="alert">{estado.error}</p>
                {estado.status!==404 && <button type="button" className="boton boton--linea" onClick={()=>setVersion(v=>v+1)}>Reintentar ficha</button>}
                <Link className="boton boton--compra" to="/catalogo">Volver al catálogo</Link></div>
                : <><div className="ficha-superior"><div className="ficha-portada-principal"><PortadaLibro key={l.id} libro={l} prioritaria/></div>
                    <InformacionLibro key={l.id} libro={l}/>
                    <LibrosRelacionados libros={relacionados} cargando={!recomendacionesVigentes} error={recomendacionesVigentes && recomendaciones.error} reintentar={()=>setVersionRelacionados(v=>v+1)}/>
                </div>
                <div className="ficha-contenido"><FichaTecnicaLibro libro={l}/><DescripcionLibro key={l.id} libro={l}/></div>
                {l.autor && <><section className="ficha-sobre-autor ficha-seccion"><h2>Sobre {l.autor}</h2>
                    {autor?.id===l.idAutor && autor.data?.biografia && <p className="ficha-biografia">{autor.data.biografia}</p>}
                    {autor?.id===l.idAutor && autor.data?.nacionalidad && <p>Nacionalidad: {autor.data.nacionalidad}</p>}
                    <Link className="enlace-texto" to={enlaceAutor}>Explorar los libros de {l.autor}</Link>
                </section>
                <SeccionLibros titulo={`Más libros de ${l.autor}`} libros={masAutor} enlace={enlaceAutor}
                    mensajeVacio={!datos?'Puedes explorar otros títulos del autor en el catálogo.':relacionados.some(x=>x.idAutor===l.idAutor)?'Los otros títulos del autor aparecen en Libros relacionados.':'No hay otros libros de este autor en el catálogo para mostrar.'}/></>}
                <SeccionLibros titulo="También podría interesarte" libros={interesarte}
                    enlace={l.categoria?`/catalogo?categoria=${encodeURIComponent(l.categoria)}`:undefined}
                    mensajeVacio={!datos?'Puedes explorar esta categoría en el catálogo.':'No hay más títulos de esta categoría para mostrar en este momento.'}/>
            </>}
    </section>;
}
