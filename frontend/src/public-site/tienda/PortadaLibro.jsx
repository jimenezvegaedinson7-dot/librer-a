import { useState } from 'react';
import { FaImage } from 'react-icons/fa6';
import { urlPortada } from '../lib/formato';
import { resolverPortadaLibro, portadaPorIsbn, referenciaPortadaLibro, AVISO_PORTADA_REFERENCIA } from '../../lib/utils/portadasLibro';

// Mismo placeholder "Sin portada"/FaImage del detalle administrativo.
// No sustituye la imagen real por imágenes inventadas.
export default function PortadaLibro({ libro, mini = false, prioritaria = false }) {
    const principal = urlPortada(resolverPortadaLibro(libro), mini ? 160 : 480);
    const respaldo = urlPortada(portadaPorIsbn(libro), mini ? 160 : 480);
    const [estado,setEstado] = useState({src:null,alternativa:false,listo:false,error:false});
    const vigente = estado.src === principal;
    const src = vigente && estado.alternativa ? respaldo : principal;
    const error = vigente && estado.error;
    const listo = vigente && estado.listo;
    const referencia = referenciaPortadaLibro(libro,src);
    return <><div className={`ficha-portada${mini?' ficha-portada--mini':''}`}>
        {src && !error ? <>
            {!listo && <div className="ficha-skeleton ficha-portada-carga" aria-hidden="true"/>}
            <img src={src} alt={`Portada de ${libro.titulo}`} width={mini?80:260} height={mini?120:390}
                title={referencia?`${AVISO_PORTADA_REFERENCIA}: ${referencia.edicion}`:undefined}
                loading={prioritaria?'eager':'lazy'} decoding="async"
                onLoad={()=>setEstado({src:principal,alternativa:src!==principal,listo:true,error:false})}
                onError={()=>setEstado({src:principal,alternativa:Boolean(respaldo && src!==respaldo),listo:false,error:!respaldo || src===respaldo})}/>
        </> : <div className="ficha-portada-vacia"><FaImage aria-hidden="true"/><span>{src?'No se pudo cargar la portada':'Sin portada'}</span></div>}
    </div>
        {prioritaria && referencia && !error && <p className="portada-referencia">{AVISO_PORTADA_REFERENCIA}
            <span className="portada-referencia__edicion">Imagen: {referencia.edicion}.</span>
        </p>}
    </>;
}
