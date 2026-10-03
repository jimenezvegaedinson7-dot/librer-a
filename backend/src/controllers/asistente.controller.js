const servicio=require('../services/aiAssistant.service');
async function conversar(req,res){
    const body=req.body;
    if(!body || Array.isArray(body) || typeof body.mensaje!=='string' || body.mensaje.length>400 || !body.mensaje.trim()
        || Object.keys(body).some(k=>!['mensaje','contexto','id_libro'].includes(k))
        || (body.contexto!==undefined && (typeof body.contexto!=='string' || body.contexto.length>8000))
        || (body.id_libro!==undefined && (!Number.isSafeInteger(body.id_libro) || body.id_libro<1 || body.id_libro>2147483647))){
        return res.status(400).json({success:false,mensaje:'Escribe una consulta de hasta 400 caracteres y vuelve a intentarlo.'});
    }
    const mensaje=body.mensaje.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'').trim();
    if(!mensaje)return res.status(400).json({success:false,mensaje:'Escribe una consulta válida.'});
    try{
        const data=await servicio.responder({mensaje,contexto:body.contexto,id_libro:body.id_libro});
        return res.json({success:true,data});
    }catch(e){
        if(e.message==='contexto_invalido')return res.status(400).json({success:false,mensaje:'Reinicia la conversación y vuelve a consultar.'});
        // Sin errores del proveedor, claves, consultas SQL o stack traces.
        return res.status(503).json({success:false,mensaje:'No pude consultar el catálogo en este momento. Puedes reintentar.'});
    }
}
module.exports={conversar};
