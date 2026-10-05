const servicio=require('../services/aiAssistant.service');
async function conversar(req,res){
    const body=req.body;
    if(!body || Array.isArray(body) || typeof body.mensaje!=='string' || body.mensaje.length>400 || !body.mensaje.trim()
        || Object.keys(body).some(k=>!['mensaje','contexto','id_libro','modo'].includes(k))
        || (body.modo!==undefined && body.modo!=='charla')
        || (body.contexto!==undefined && (typeof body.contexto!=='string' || body.contexto.length>8000))
        || (body.id_libro!==undefined && (!Number.isSafeInteger(body.id_libro) || body.id_libro<1 || body.id_libro>2147483647))){
        return res.status(400).json({success:false,mensaje:'Escribe una consulta de hasta 400 caracteres y vuelve a intentarlo.'});
    }
    const mensaje=body.mensaje.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'').trim();
    if(!mensaje)return res.status(400).json({success:false,mensaje:'Escribe una consulta válida.'});
    try{
        const data=await servicio.responder({mensaje,contexto:body.contexto,id_libro:body.id_libro,modo:body.modo});
        return res.json({success:true,data});
    }catch(e){
        if(e.message==='contexto_invalido')return res.status(400).json({success:false,mensaje:'Reinicia la conversación y vuelve a consultar.'});
        // Sin errores del proveedor, claves, consultas SQL o stack traces.
        return res.status(503).json({success:false,mensaje:'No pude consultar el catálogo en este momento. Puedes reintentar.'});
    }
}
const memoriaModel=require('../models/asistenteMemoria.model');
const {sanearMemoria}=require('../utils/asistenteMemoria');
// Memoria del cliente con sesión: lo que el asistente aprendió de él.
async function obtenerMemoria(req,res){
    try{
        const datos=await memoriaModel.obtener(req.usuario.id_usuario);
        return res.json({success:true,data:sanearMemoria(datos || {})});
    }catch{return res.status(500).json({success:false,mensaje:'No se pudo leer la memoria del asistente.'});}
}
async function guardarMemoria(req,res){
    const cuerpo=req.body;
    if(!cuerpo || typeof cuerpo!=='object' || Array.isArray(cuerpo) || JSON.stringify(cuerpo).length>6000)
        return res.status(400).json({success:false,mensaje:'Memoria no válida.'});
    try{
        const datos=sanearMemoria(cuerpo.datos);
        await memoriaModel.guardar(req.usuario.id_usuario,datos);
        return res.json({success:true,data:datos});
    }catch{return res.status(500).json({success:false,mensaje:'No se pudo guardar la memoria del asistente.'});}
}
async function borrarMemoria(req,res){
    try{await memoriaModel.borrar(req.usuario.id_usuario);return res.json({success:true,mensaje:'Memoria del asistente borrada.'});}
    catch{return res.status(500).json({success:false,mensaje:'No se pudo borrar la memoria del asistente.'});}
}
module.exports={conversar,obtenerMemoria,guardarMemoria,borrarMemoria};
