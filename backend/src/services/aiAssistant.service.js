const modelo=require('../models/asistente.model');
const gemini=require('./geminiAssistant.service');
const contextoService=require('./asistenteContexto.service');
const {normalizar,coincidencias,interpretar}=require('../utils/asistenteBusqueda');
const ALCANCE='Solo puedo ayudarte con libros reales del catálogo y con la información pública de esta librería. No respondo sobre temas ajenos ni revelo información interna.';
function crearAsistente({repositorio=modelo,proveedor=gemini.seleccionar,contextos=contextoService}={}){
    return async function responder({mensaje,contexto,id_libro}){
        const previo=contextos.leer(contexto);
        const plan=interpretar(mensaje,previo);
        const simple=(texto,opciones=[])=>({mensaje:texto,libros:[],opciones,contexto:contextos.firmar({...previo,opciones}),origen:'catalogo'});
        if(plan.fuera)return simple(ALCANCE);
        const facetas=await repositorio.facetas();
        let filtros={...plan.filtros};let referencia=null;
        const ordinal=/\b(primer[oa]?|segundo|segunda|tercero|tercera|cuarto|cuarta)\b/.exec(plan.q)?.[1];
        const posicion=ordinal?/^primer/.test(ordinal)?0:/^segund/.test(ordinal)?1:/^tercer/.test(ordinal)?2:3:null;
        const opciones=previo.opciones || [];
        let tokens=plan.tokens;
        if(posicion!==null && opciones[posicion])tokens=normalizar(opciones[posicion].texto).split(' ');
        const autores=coincidencias(facetas.autores,tokens);
        const categorias=coincidencias(facetas.categorias,tokens);
        let titulos=[];
        if(tokens.length && !autores.length && !categorias.length)titulos=coincidencias(await repositorio.titulos(tokens),tokens);
        if(autores.length>1)return simple('Encontré varios autores que pueden coincidir. ¿A cuál te refieres?',autores.map(a=>({texto:a.nombre,consulta:`Libros de ${a.nombre}`})));
        if(categorias.length>1)return simple('¿Qué categoría quieres explorar?',categorias.map(c=>({texto:c.nombre,consulta:`Libros de ${c.nombre}`})));
        if(plan.isbn)filtros={isbn:plan.isbn};
        else if(plan.este && id_libro)filtros={ids:[id_libro]};
        else if(posicion!==null && !opciones.length && previo.ultimos?.[posicion])filtros={ids:[previo.ultimos[posicion]]};
        else if(autores.length===1)filtros={autor:autores[0].id};
        else if(categorias.length===1)filtros={categoria:categorias[0].id};
        else if(titulos.length && !plan.similar)filtros={ids:titulos.map(t=>t.id)};
        else if(tokens.length && !plan.genero.length && !plan.similar)return simple('No encuentro ese título o autor actualmente en el catálogo. Prueba con otro nombre, una categoría o un rango de precio.');
        if(plan.similar || ((plan.otro || plan.comparativo) && filtros.ids?.length===1)){
            const id=titulos[0]?.id || previo.ultimos?.[0] || id_libro;
            referencia=id?await repositorio.referencia(id):null;
            if(!referencia)return simple('¿A qué libro quieres que se parezca? Dime un título del catálogo.');
            filtros={referencia};
        }
        if(plan.genero.length){
            const categoria=facetas.categorias.find(c=>plan.genero.some(p=>normalizar(c.nombre).includes(p)));
            if(categoria)filtros={...filtros,categoria:categoria.id};else filtros={...filtros,palabras:plan.genero};
        }
        if(plan.otro && !previo.filtros && !autores.length && !titulos.length && !plan.genero.length)return simple('¿De qué autor, categoría o libro quieres otra opción?');
        if(Number.isFinite(plan.minimo))filtros.minimo=plan.minimo;
        if(Number.isFinite(plan.maximo))filtros.maximo=plan.maximo;
        if(plan.stock)filtros.stock=plan.stock;
        if(plan.oferta)filtros.oferta=true;
        const base={...filtros};
        const mismaBusqueda=JSON.stringify({...previo.filtros})===JSON.stringify(base);
        const yaMostrados=mismaBusqueda?(previo.mostrados || []):[];
        if(plan.otro)filtros.excluir=yaMostrados;
        if(referencia)filtros.excluir=[...(filtros.excluir || []),referencia.id];
        if(plan.comparativo && previo.ultimos?.length){
            const anteriores=await repositorio.buscar({ids:previo.ultimos},'precio_asc',8);
            if(anteriores.length){
                const precio=plan.barato?Math.min(...anteriores.map(l=>l.precio_final)):Math.max(...anteriores.map(l=>l.precio_final));
                filtros[plan.barato?'menorQue':'mayorQue']=precio;
                filtros.excluir=[...(filtros.excluir || []),...previo.ultimos];
            }
        }
        const candidatos=await repositorio.buscar(filtros,plan.orden,plan.superlativo?1:8);
        if(!candidatos.length)return simple(plan.comparativo?'No encuentro una opción que cumpla ese precio dentro de la búsqueda anterior. Podemos cambiar el presupuesto o el autor.'
            :plan.otro?'No encontré más opciones dentro de esa búsqueda. Podemos probar otra categoría o autor.'
            :'No encontré libros que cumplan esos criterios actualmente. Podemos probar otro autor, categoría o presupuesto.');
        // Una sola llamada, siempre DESPUES de PostgreSQL y con <=8 registros.
        const generacion=candidatos.length===1?{selecciones:null}:await proveedor({mensaje,libros:candidatos,historial:previo.historial || [],limite:plan.limite});
        const selecciones=generacion.selecciones || candidatos.slice(0,plan.limite).map(l=>({id_libro:l.id_libro,motivo:'consulta'}));
        const permitidos=new Set(candidatos.map(l=>l.id_libro));
        const ids=[...new Set(selecciones.map(s=>s.id_libro).filter(id=>permitidos.has(id)))].slice(0,plan.limite);
        if(!ids.length)return simple('No pude confirmar una recomendación con esos datos. Prueba otra búsqueda.');
        // Releer precios y stock: nunca devolver los campos escritos por Gemini.
        let actuales=await repositorio.buscar({...filtros,ids},plan.orden,8);
        let usoGemini=Boolean(generacion.selecciones);
        if(!actuales.length){actuales=await repositorio.buscar(filtros,plan.orden,plan.limite);usoGemini=false;}
        const porId=new Map(actuales.map(l=>[l.id_libro,l]));
        const ordenados=ids.map(id=>porId.get(id)).filter(Boolean);
        const elegidos=(ordenados.length?ordenados:actuales).slice(0,plan.limite);
        if(!elegidos.length)return simple('El catálogo cambió durante la consulta. No tengo opciones confirmadas con esos criterios; podemos buscar de nuevo.');
        const libros=elegidos.map(l=>{
            let motivo='Puedes consultar su ficha para ver la descripción publicada.';
            if(filtros.autor)motivo=`Es de ${l.autor}, el autor de tu búsqueda.`;
            else if(referencia && l.id_autor===referencia.id_autor)motivo=`Comparte autor con «${referencia.titulo}».`;
            else if(referencia && l.id_categoria===referencia.id_categoria)motivo=`Comparte la categoría registrada con «${referencia.titulo}».`;
            else if(plan.barato || plan.caro || Number.isFinite(filtros.maximo))motivo=`Su precio actual es S/ ${l.precio_final.toFixed(2)}.`;
            else if(filtros.categoria)motivo=`Está registrado en ${l.categoria}.`;
            else if(filtros.palabras)motivo='El título, la categoría o la descripción publicada coincide con los términos de tu búsqueda.';
            // Gemini elige el enfoque, pero el backend redacta únicamente
            // afirmaciones verificables con los campos recién leídos de la BD.
            const enfoque=selecciones.find(s=>s.id_libro===l.id_libro)?.motivo;
            if(enfoque==='precio')motivo=`Su precio actual es S/ ${l.precio_final.toFixed(2)}.`;
            else if(enfoque==='disponibilidad' && l.stock>0)motivo=`El catálogo registra ${l.stock} ejemplares disponibles.`;
            else if(enfoque==='categoria')motivo=`Está registrado en ${l.categoria}.`;
            else if(enfoque==='autor')motivo=`Es de ${l.autor}, según la ficha publicada.`;
            return {...l,motivo};
        });
        const texto=plan.otro?'Aquí tienes otra opción del catálogo.':plan.comparativo?'Estas opciones cumplen la comparación de precio en tu búsqueda anterior.'
            :autores.length?`Encontré estas opciones de ${autores[0].nombre}.`:plan.similar?'Estas opciones comparten autor o categoría registrada con el libro que mencionaste.'
            :'Encontré estas opciones reales del catálogo.';
        const historial=[...(previo.historial || []),{rol:'usuario',texto:mensaje.slice(0,220)},{rol:'asistente',texto:texto,ids:libros.map(l=>l.id_libro)}].slice(-6);
        return {mensaje:texto,libros,opciones:[],origen:usoGemini?'gemini':'catalogo',
            contexto:contextos.firmar({filtros:base,ultimos:libros.map(l=>l.id_libro),mostrados:[...new Set([...yaMostrados,...libros.map(l=>l.id_libro)])].slice(-24),historial,opciones:[]})};
    };
}
module.exports={crearAsistente,responder:crearAsistente(),ALCANCE};
