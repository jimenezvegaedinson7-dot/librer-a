import client from '../../lib/api/client';
export async function listarImagenesCarrusel(){const r=await client.get('/anuncios/carrusel/todos');return Array.isArray(r?.data)?r.data:[];}
const formulario=d=>{
    const body=new FormData();
    for(const k of ['titulo','orden','estado','id_libro'])if(d[k]!==undefined)body.append(k,String(d[k] ?? ''));
    if(d.imagen)body.append('imagen',d.imagen);
    return body;
};
export async function crearImagenCarrusel(d){return client.post('/anuncios/carrusel',formulario(d),{headers:{'Content-Type':'multipart/form-data'}});}
export async function actualizarImagenCarrusel(id,d){
    if(d.imagen)return client.put(`/anuncios/carrusel/${id}`,formulario(d),{headers:{'Content-Type':'multipart/form-data'}});
    const campos=Object.fromEntries(Object.entries(d).filter(([k])=>k!=='imagen'));
    return client.put(`/anuncios/carrusel/${id}`,campos);
}
export async function ordenarCarrusel(ids){return client.put('/anuncios/carrusel/orden',{ids});}
export async function eliminarImagenCarrusel(id,password){return client.delete(`/anuncios/carrusel/${id}`,{data:{password}});}
