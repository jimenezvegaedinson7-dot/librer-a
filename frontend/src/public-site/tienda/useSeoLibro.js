import { useEffect } from 'react';
import { SITIO } from '../config/site';
import { urlPortada } from '../lib/formato';

// Completa la gestión de metadatos existente de PublicLayout con la ficha real.
export default function useSeoLibro(libro) {
    useEffect(()=>{
        if(!libro)return undefined;
        const titulo=[libro.titulo,libro.autor,SITIO.nombre].filter(Boolean).join(' · ');
        const descripcion=libro.sinopsis || [libro.titulo,libro.autor].filter(Boolean).join(' — ');
        const url=`${SITIO.url}/libro/${libro.id}`;
        const creados=[];
        const previos=[];
        const establecer=(selector,atributo,nombre,valor)=>{
            let meta=document.querySelector(selector);
            if(!meta){meta=document.createElement('meta');meta.setAttribute(atributo,nombre);document.head.appendChild(meta);creados.push(meta);}
            else previos.push([meta,meta.getAttribute('content')]);
            meta.setAttribute('content',valor);
        };
        const tituloPrevio=document.title;document.title=titulo;
        establecer('meta[name="description"]','name','description',descripcion);
        establecer('meta[property="og:title"]','property','og:title',titulo);
        establecer('meta[property="og:description"]','property','og:description',descripcion);
        establecer('meta[property="og:url"]','property','og:url',url);
        establecer('meta[property="og:type"]','property','og:type','book');
        const imagen=urlPortada(libro.portada);
        if(imagen && !imagen.startsWith('data:'))establecer('meta[property="og:image"]','property','og:image',imagen);
        const datos={'@context':'https://schema.org','@type':['Book','Product'],name:libro.titulo,url,
            ...(libro.autor?{author:{'@type':'Person',name:libro.autor}}:{}),...(libro.isbn?{isbn:libro.isbn}:{}),
            ...(libro.sinopsis?{description:libro.sinopsis}:{}),...(imagen && !imagen.startsWith('data:')?{image:imagen}:{}),
            offers:{'@type':'Offer',priceCurrency:'PEN',price:libro.precioFinal.toFixed(2),url,
                availability:libro.disponible?'https://schema.org/InStock':'https://schema.org/OutOfStock'}};
        const script=document.createElement('script');script.type='application/ld+json';script.dataset.seoLibro='true';script.textContent=JSON.stringify(datos);document.head.appendChild(script);
        return()=>{script.remove();creados.forEach(m=>m.remove());previos.forEach(([m,v])=>v===null?m.removeAttribute('content'):m.setAttribute('content',v));
            if(document.title===titulo)document.title=tituloPrevio;};
    },[libro]);
}
