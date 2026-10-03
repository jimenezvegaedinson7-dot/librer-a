import { useEffect, useState } from 'react';
import env from '../../config/env';

export default function useCarrusel(){
    const [version,setVersion]=useState(0),[estado,setEstado]=useState({version:-1,imagenes:[],error:false});
    useEffect(()=>{
        const control=new AbortController();let activo=true;
        const timeout=setTimeout(()=>control.abort(),10000);
        fetch(`${env.apiUrl}/anuncios/carrusel`,{signal:control.signal,headers:{Accept:'application/json'}})
            .then(async r=>{if(!r.ok)throw new Error('No disponible');const j=await r.json();if(!Array.isArray(j.data))throw new Error('Formato no válido');return j.data;})
            .then(imagenes=>{if(activo)setEstado({version,imagenes,error:false});})
            .catch(()=>{if(activo)setEstado({version,imagenes:[],error:true});})
            .finally(()=>clearTimeout(timeout));
        return()=>{activo=false;clearTimeout(timeout);control.abort();};
    },[version]);
    return {...estado,cargando:estado.version!==version,reintentar:()=>setVersion(v=>v+1)};
}
