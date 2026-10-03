const fs=require('node:fs');
const path=require('node:path');
const {eliminarRecurso}=require('./cloudinary');
const carpeta=path.join(__dirname,'../../uploads/carrusel');
const prefijo='/uploads/carrusel/';
async function borrarArchivo(datos){
    if(!datos)return;
    try{
        if(datos.imagen_public_id){await eliminarRecurso(datos.imagen_public_id,'image');return;}
        const url=datos.imagen_url;
        if(typeof url==='string' && url.startsWith(prefijo)){
            const nombre=path.basename(url);
            if(/^carrusel-[a-f0-9-]+\.(jpg|jpeg|png|webp)$/.test(nombre)){
                const p=path.join(carpeta,nombre);if(fs.existsSync(p))fs.unlinkSync(p);
            }
        }
    }catch{console.error('[carrusel] No se pudo retirar un archivo anterior.');}
}
module.exports={carpeta,prefijo,borrarArchivo};
