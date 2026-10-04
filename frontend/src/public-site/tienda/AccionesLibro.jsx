import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaHeart, FaRegHeart, FaShareNodes, FaLink, FaWhatsapp, FaFacebook } from 'react-icons/fa6';
import { clienteApi } from './clienteApi';
import { useTienda } from './TiendaContext';

export function FavoritoLibro({ libro }) {
    const {usuario,revisando,sesion,errorSesion,generacion} = useTienda();
    const [consulta,setConsulta] = useState({cargando:Boolean(usuario),favorito:false,error:''});
    const [guardando,setGuardando] = useState(false);
    const [mensaje,setMensaje] = useState('');
    const [version,setVersion] = useState(0);
    const idUsuario=usuario?.id_usuario;
    useEffect(()=>{
        if (!idUsuario || revisando || errorSesion) return undefined;
        let activo=true;
        clienteApi.favorito(libro.id,sesion).then(j=>{if(activo)setConsulta({cargando:false,favorito:j.data.es_favorito===true,error:''});})
            .catch(e=>{if(activo)setConsulta({cargando:false,favorito:false,error:e.message});});
        return()=>{activo=false;};
    },[libro.id,idUsuario,revisando,errorSesion,generacion,version,sesion]);
    async function cambiar() {
        if (!usuario) {setMensaje('Inicia sesión para guardar este libro en tus favoritos.');return;}
        if(guardando || consulta.cargando || revisando || errorSesion || consulta.error)return;
        setGuardando(true);setMensaje('');
        try {
            const j=consulta.favorito ? await clienteApi.quitarFavorito(libro.id,sesion) : await clienteApi.agregarFavorito(libro.id,sesion);
            setConsulta({cargando:false,favorito:j.data.es_favorito===true,error:''});
            setMensaje(j.mensaje);
        } catch(e) {setMensaje(e.message);} finally {setGuardando(false);}
    }
    return <div className="ficha-favorito">
        <button type="button" className={`ficha-utilidad${consulta.favorito?' ficha-utilidad--activa':''}`} aria-pressed={consulta.favorito}
            disabled={guardando || (Boolean(usuario) && (consulta.cargando || revisando || Boolean(errorSesion) || Boolean(consulta.error)))} onClick={cambiar}>
            {consulta.favorito?<FaHeart aria-hidden="true"/>:<FaRegHeart aria-hidden="true"/>}
            {guardando?'Guardando…':consulta.favorito?'En favoritos':'Agregar a favoritos'}
        </button>
        {consulta.error && usuario && <p role="alert">{consulta.error} <button type="button" className="enlace-texto" onClick={()=>setVersion(v=>v+1)}>Reintentar favoritos</button></p>}
        {mensaje && <p role="status" className="ficha-mensaje">{mensaje}
            {!usuario && <> <Link to={`/cuenta?continuar=${encodeURIComponent(`/libro/${libro.id}`)}`}>Iniciar sesión</Link></>}
        </p>}
    </div>;
}

export function CompartirLibro({ libro }) {
    const [abierto,setAbierto]=useState(false),[mensaje,setMensaje]=useState('');
    const url=window.location.href;
    const texto=[libro.titulo,libro.autor].filter(Boolean).join(' — ');
    async function compartir() {
        if(typeof navigator.share==='function') {
            try {await navigator.share({title:libro.titulo,text:texto,url});return;}
            catch(e){if(e.name==='AbortError')return;}
        }
        setAbierto(v=>!v);
    }
    async function copiar() {
        try {
            if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(url);
            else {
                const campo=document.createElement('textarea');campo.value=url;campo.style.position='fixed';campo.style.opacity='0';
                document.body.appendChild(campo);campo.select();
                try {if(!document.execCommand('copy'))throw new Error('Copia el enlace manualmente');} finally {campo.remove();}
            }
            setMensaje('Enlace copiado');
        } catch {setMensaje('No se pudo copiar automáticamente. Selecciona el enlace y cópialo.');}
    }
    return <div className="ficha-compartir"><button type="button" className="ficha-utilidad" aria-expanded={abierto} onClick={compartir}><FaShareNodes aria-hidden="true"/>Compartir</button>
        {abierto && <div className="ficha-compartir-opciones" role="group" aria-label="Opciones para compartir">
            <button type="button" onClick={copiar}><FaLink aria-hidden="true"/>Copiar enlace</button>
            <a href={`https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`} target="_blank" rel="noopener noreferrer"><FaWhatsapp aria-hidden="true"/>WhatsApp</a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer"><FaFacebook aria-hidden="true"/>Facebook</a>
            <input aria-label="Enlace del libro" readOnly value={url} onFocus={e=>e.target.select()}/>
        </div>}
        {mensaje && <p role="status" className="ficha-mensaje">{mensaje}</p>}
    </div>;
}
