const carruselModel=require('../models/carrusel.model');
const usuarioModel=require('../models/usuario.model');
const bcrypt=require('bcryptjs');
const {registrarAuditoria}=require('../utils/auditoria');
const {validarId}=require('../utils/validaciones');
const {borrarArchivo}=require('../utils/carruselArchivos');
const permitidos=new Set(['titulo','orden','estado','id_libro']);
function datos(body,alta=false){
    if(!body || Object.keys(body).some(k=>!permitidos.has(k)))throw new Error('campos');
    const d={};
    if(alta || body.titulo!==undefined){if(typeof body.titulo!=='string' || !body.titulo.trim() || body.titulo.trim().length>200)throw new Error('titulo');d.titulo=body.titulo.trim();}
    for(const [clave,min,max] of [['orden',0,100000],['estado',0,1]])if(body[clave]!==undefined){
        if(!['string','number'].includes(typeof body[clave]) || !/^\d+$/.test(String(body[clave])))throw new Error(clave);
        const n=Number(body[clave]);if(!Number.isInteger(n) || n<min || n>max)throw new Error(clave);d[clave]=n;
    }
    if(body.id_libro!==undefined){if(body.id_libro===null || body.id_libro==='')d.id_libro=null;else{if(!['string','number'].includes(typeof body.id_libro))throw new Error('libro');const id=validarId(body.id_libro);if(!id)throw new Error('libro');d.id_libro=id;}}
    return d;
}
const errorCampos=res=>res.status(400).json({success:false,mensaje:'Revisa el título, el orden, la visibilidad y el libro vinculado.'});
async function listarPublico(_req,res){try{return res.json({success:true,data:await carruselModel.listar(true)});}catch{return res.status(503).json({success:false,mensaje:'No se pudieron cargar los anuncios del inicio.'});}}
async function listarPanel(_req,res){try{return res.json({success:true,data:await carruselModel.listar()});}catch{return res.status(503).json({success:false,mensaje:'No se pudo cargar el carrusel.'});}}
async function crear(req,res){
    let d;try{d=datos(req.body,true);}catch{return errorCampos(res);}
    if(!req.file?.imagen_url)return res.status(400).json({success:false,mensaje:'Selecciona una imagen para el carrusel.'});
    try{const creada=await carruselModel.crear({...d,imagen_url:req.file.imagen_url,imagen_public_id:req.file.imagen_public_id});
        await registrarAuditoria(req,'anuncios','CREAR',`Imagen de carrusel #${creada.id_imagen} creada`);
        return res.status(201).json({success:true,mensaje:'Imagen del carrusel guardada.',data:creada});}
    catch(e){return e.code==='23503'?errorCampos(res):res.status(503).json({success:false,mensaje:'No se pudo guardar la imagen del carrusel.'});}
}
async function actualizar(req,res){
    const id=validarId(req.params.id);if(!id)return errorCampos(res);
    let d;try{d=datos(req.body || {});}catch{return errorCampos(res);}
    if(req.file?.imagen_url){d.imagen_url=req.file.imagen_url;d.imagen_public_id=req.file.imagen_public_id;}
    try{
        const cambio=await carruselModel.actualizar(id,d);
        if(!cambio)return res.status(404).json({success:false,mensaje:'La imagen ya no existe.'});
        if(d.imagen_url && cambio.actual.imagen_url!==cambio.anterior.imagen_url)await borrarArchivo(cambio.anterior);
        await registrarAuditoria(req,'anuncios','ACTUALIZAR',`Imagen de carrusel #${id} actualizada`);
        return res.json({success:true,mensaje:'Imagen del carrusel actualizada.',data:cambio.actual});
    }catch(e){return e.code==='23503'?errorCampos(res):res.status(503).json({success:false,mensaje:'No se pudo actualizar la imagen.'});}
}
async function eliminar(req,res){
    const id=validarId(req.params.id),password=req.body?.password;
    if(!id || typeof password!=='string' || !password.trim() || password.length>255)return res.status(400).json({success:false,mensaje:'Indica la contraseña para eliminar la imagen.'});
    try{
        const u=await usuarioModel.buscarPorIdConPassword(req.usuario.id_usuario);
        if(!u || Number(u.estado)!==1 || !await bcrypt.compare(password,u.password))return res.status(403).json({success:false,mensaje:'Contraseña incorrecta'});
        const eliminado=await carruselModel.eliminar(id);
        if(!eliminado)return res.status(404).json({success:false,mensaje:'La imagen ya no existe.'});
        await borrarArchivo(eliminado);
        await registrarAuditoria(req,'anuncios','ELIMINAR',`Imagen de carrusel #${id} eliminada`);
        return res.json({success:true,mensaje:'Imagen del carrusel eliminada.'});
    }catch{return res.status(503).json({success:false,mensaje:'No se pudo eliminar la imagen.'});}
}
async function reordenar(req,res){
    const ids=req.body?.ids;
    if(!Array.isArray(ids) || ids.length>500 || ids.some(id=>!Number.isSafeInteger(id) || id<1 || id>2147483647) || new Set(ids).size!==ids.length)return errorCampos(res);
    try{await carruselModel.reordenar(ids);await registrarAuditoria(req,'anuncios','ACTUALIZAR','Orden del carrusel actualizado');return res.json({success:true,mensaje:'Orden del carrusel actualizado.'});}
    catch(e){return res.status(e.message==='lista_desactualizada'?409:503).json({success:false,mensaje:e.message==='lista_desactualizada'?'La lista cambió. Actualiza el carrusel e inténtalo de nuevo.':'No se pudo guardar el orden.'});}
}
module.exports={listarPublico,listarPanel,crear,actualizar,eliminar,reordenar};
