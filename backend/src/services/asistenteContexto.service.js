const crypto=require('node:crypto');
const secreto=crypto.randomBytes(32);
const DURACION=20*60*1000;
function firmar(datos){
    const contenido=Buffer.from(JSON.stringify({...datos,exp:Date.now()+DURACION})).toString('base64url');
    return `${contenido}.${crypto.createHmac('sha256',secreto).update(contenido).digest('base64url')}`;
}
function leer(token){
    if(!token)return {filtros:null,mostrados:[],ultimos:[],historial:[]};
    if(typeof token!=='string' || token.length>8000)throw new Error('contexto_invalido');
    const partes=token.split('.');if(partes.length!==2)throw new Error('contexto_invalido');
    const firma=crypto.createHmac('sha256',secreto).update(partes[0]).digest();
    const recibida=Buffer.from(partes[1],'base64url');
    if(firma.length!==recibida.length || !crypto.timingSafeEqual(firma,recibida))throw new Error('contexto_invalido');
    let datos;try{datos=JSON.parse(Buffer.from(partes[0],'base64url').toString('utf8'));}catch{throw new Error('contexto_invalido');}
    if(!Number.isFinite(datos.exp) || datos.exp<Date.now())return {filtros:null,mostrados:[],ultimos:[],historial:[]};
    return datos;
}
module.exports={firmar,leer,DURACION};
