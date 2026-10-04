import { useState } from 'react';
import { FaImage } from 'react-icons/fa6';
import { resolverPortadaLibro, portadaPorIsbn, referenciaPortadaLibro, AVISO_PORTADA_REFERENCIA } from '../../lib/utils/portadasLibro';
import { construirUrlArchivo } from '../../lib/utils/url';

export default function PortadaCatalogo({libro,src,className='',mostrarTexto=true,alt,prioritaria=false}){
    const explicita=src!==undefined;
    const principal=construirUrlArchivo(explicita?src:resolverPortadaLibro(libro));
    const respaldo=explicita?null:construirUrlArchivo(portadaPorIsbn(libro));
    const [estado,setEstado]=useState({principal:null,alternativa:false,error:false});
    const vigente=estado.principal===principal;
    const fuente=vigente && estado.alternativa?respaldo:principal;
    const error=vigente && estado.error;
    const referencia=referenciaPortadaLibro(libro,fuente);
    if(!fuente || error)return <span className={`flex flex-col items-center justify-center gap-1 text-slate-500 ${className}`} role="img"
        aria-label={`${principal?'No se pudo cargar la portada':'Sin portada'}${libro?.titulo?`: ${libro.titulo}`:''}`}>
        <FaImage aria-hidden="true" size={mostrarTexto?32:20}/>{mostrarTexto && <span className="text-xs">{principal?'No se pudo cargar la portada':'Sin portada'}</span>}
    </span>;
    const imagen=<img className={referencia && mostrarTexto?'min-h-0 w-full flex-1 object-contain':className} src={fuente} alt={alt || `Portada de ${libro?.titulo || 'libro'}`}
        title={referencia?`${AVISO_PORTADA_REFERENCIA}: ${referencia.edicion}`:undefined}
        loading={prioritaria?'eager':'lazy'} decoding="async"
        onError={()=>setEstado({principal,alternativa:Boolean(respaldo && fuente!==respaldo),error:!respaldo || fuente===respaldo})}/>;
    return referencia && mostrarTexto?<span className={`flex flex-col ${className}`}>{imagen}
        <span className="px-1 py-2 text-center text-xs leading-4 text-slate-600">{AVISO_PORTADA_REFERENCIA}</span></span>:imagen;
}
