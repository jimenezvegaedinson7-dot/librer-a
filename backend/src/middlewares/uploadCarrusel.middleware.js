const multer=require('multer');
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {detectarImagen}=require('../utils/fileType');
const {subirImagen,configurado}=require('../utils/cloudinary');
const {carpeta,prefijo,borrarArchivo}=require('../utils/carruselArchivos');
const MENSAJE='Sube una imagen JPG, PNG o WebP válida, de hasta 5 MB.';
const subir=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1,fields:8,fieldSize:1024},
    fileFilter:(_req,file,cb)=>cb(['image/jpeg','image/png','image/webp'].includes(file.mimetype)?null:new Error('tipo_invalido'),true)}).single('imagen');
function recibir(req,res,next){
    subir(req,res,async error=>{
        if(error)return res.status(error.code==='LIMIT_FILE_SIZE'?413:400).json({success:false,mensaje:MENSAJE});
        if(!req.file)return next();
        const tipo=detectarImagen(req.file.buffer);
        if(!tipo)return res.status(400).json({success:false,mensaje:MENSAJE});
        if(!configurado && process.env.NODE_ENV==='production')return res.status(503).json({success:false,mensaje:'El almacenamiento de imágenes no está configurado. Configura Cloudinary antes de publicar banners.'});
        try{
            if(configurado){
                const imagen=await subirImagen(req.file.buffer,{carpeta:'libreria/carrusel'});
                req.file.imagen_url=imagen.url;req.file.imagen_public_id=imagen.publicId;
            }else{
                fs.mkdirSync(carpeta,{recursive:true});
                const nombre=`carrusel-${randomUUID()}${tipo.extension}`;
                fs.writeFileSync(path.join(carpeta,nombre),req.file.buffer);
                req.file.imagen_url=prefijo+nombre;req.file.imagen_public_id=null;
            }
            res.once('finish',()=>{if(res.statusCode>=400)borrarArchivo(req.file);});
            next();
        }catch{return res.status(502).json({success:false,mensaje:'No se pudo guardar la imagen. Inténtalo de nuevo.'});}
    });
}
module.exports={recibir};
