import { useState } from 'react';
import { FaImage } from 'react-icons/fa6';
import { urlPortada } from '../lib/formato';

// Mismo placeholder "Sin portada"/FaImage del detalle administrativo.
// No sustituye la imagen real por imágenes inventadas.
export default function PortadaLibro({ libro, mini = false, prioritaria = false }) {
    const src = urlPortada(libro.portada, mini ? 160 : 480);
    const [estado,setEstado] = useState({src:null,listo:false,error:false});
    const error = estado.src === src && estado.error;
    const listo = estado.src === src && estado.listo;
    return <div className={`ficha-portada${mini?' ficha-portada--mini':''}`}>
        {src && !error ? <>
            {!listo && <div className="ficha-skeleton ficha-portada-carga" aria-hidden="true"/>}
            <img src={src} alt={`Portada de ${libro.titulo}`} width={mini?80:260} height={mini?120:390}
                loading={prioritaria?'eager':'lazy'} decoding="async"
                onLoad={()=>setEstado({src,listo:true,error:false})}
                onError={()=>setEstado({src,listo:false,error:true})}/>
        </> : <div className="ficha-portada-vacia"><FaImage aria-hidden="true"/><span>{src?'No se pudo cargar la portada':'Sin portada'}</span></div>}
    </div>;
}
