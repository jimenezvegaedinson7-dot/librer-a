const normalizar = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/[^a-z0-9/.,]/g,' ').replace(/\s+/g,' ').trim();
const VACIAS = new Set(('a al algo algun alguna algunos algunas autor autores autora barato baratos barata baratas busca buscar busco caros caro categoria categorias como con cual cuales cuanto cuantos de del el en es esta estan este estos hay la las libro libros lo los mas me menos mi muestra muestrame necesito otro otros otra otras para parecido parecidos por precio precios puede puedes que quiero recomienda recomiendame s sin solo sol soles stock su tengo tiene tienes tienen titulo titulos todos un una uno vale ver y de cuanto cuesta cuestan disponibles disponible economico economicos terror romantico romantica romanticos romance miedo infantil infantiles ninos nina ninas jovenes juvenil debajo hasta entre maximo presupuesto sus baratos grabieles ofrece ofreces quedan ejemplares oferta ofertas descuento descuentos sinopsis descripcion trata').split(' '));
const GENEROS = [
    {patron:/\b(terror|miedo|asust|horror)\w*\b/,palabras:['terror','horror','miedo']},
    {patron:/\b(romantic|romance|amor)\w*\b/,palabras:['romance','romantica','romantico','amor']},
    {patron:/\b(ninos|ninas|infantil|juvenil)\b/,palabras:['infantil','juvenil','ninos','ninas']}
];
function fueraDeAlcance(q) {
    return /ignora.*(?:instrucciones|reglas)|olvida.*(?:instrucciones|reglas)|(?:revela|muestra|dame).*(?:token|jwt|credenciales|api key|clave secreta)|\b(ropa|camiseta|camisa|zapatos|clima|futbol|receta|programacion)\b/.test(q)
        || (/\b(ciencia|fisica|quimica|gravedad|fotosintesis|matematicas)\b/.test(q) && !/\b(libro|libros|catalogo|categoria|titulo)\b/.test(q));
}
function distancia(a,b) {
    const d=Array.from({length:a.length+1},(_,i)=>Array.from({length:b.length+1},(_,j)=>i===0?j:j===0?i:0));
    for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){
        d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
        if(i>1 && j>1 && a[i-1]===b[j-2] && a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1);
    }
    return d[a.length][b.length];
}
function puntuacion(nombre,tokens) {
    if(!tokens.length)return 0;
    const palabras=normalizar(nombre).split(/\s+/);
    let suma=0;
    for(const token of tokens){
        let mejor=0;
        for(const palabra of palabras){
            if(token===palabra)mejor=Math.max(mejor,1);
            else if(token.length>=3 && palabra.startsWith(token))mejor=Math.max(mejor,.92);
            else if(token.length>=4 && Math.abs(token.length-palabra.length)<=2){
                const n=distancia(token,palabra);
                if(n<=(token.length>=7?2:1))mejor=Math.max(mejor,1-n/Math.max(token.length,palabra.length));
            }
        }
        if(mejor<.7)return 0;
        suma+=mejor;
    }
    return suma/tokens.length;
}
function coincidencias(filas,tokens) {
    const lista=filas.map(f=>({...f,puntuacion:puntuacion(f.nombre || f.titulo,tokens)})).filter(f=>f.puntuacion>0)
        .sort((a,b)=>b.puntuacion-a.puntuacion);
    if(!lista.length)return [];
    return lista.filter(f=>f.puntuacion>=lista[0].puntuacion-.04).slice(0,4);
}
function interpretar(mensaje,previo={}) {
    const q=normalizar(mensaje);
    const genero=GENEROS.find(g=>g.patron.test(q));
    const rango=/entre\s+(?:s\/\s*)?(\d+(?:[.,]\d{1,2})?)\s+y\s+(?:s\/\s*)?(\d+(?:[.,]\d{1,2})?)/.exec(q);
    const max=/(?:menos de|hasta|menor (?:a|que)|debajo de|maximo|presupuesto de)\s*(?:s\/\s*)?(\d+(?:[.,]\d{1,2})?)/.exec(q);
    const minimo=rango?Number(rango[1].replace(',','.')):undefined;
    const maximo=rango?Number(rango[2].replace(',','.')):max?Number(max[1].replace(',','.')):undefined;
    const otro=/\b(otro|otra|otros|otras)\b|uno mas\b/.test(q) && !/mas barato|mas caro/.test(q);
    const similar=/\b(parecido|parecida|similar|similares)\b/.test(q);
    const barato=/\b(barato|baratos|barata|baratas|economico|economicos)\b|cuesta menos/.test(q);
    const caro=/\b(caro|caros|cara|caras)\b/.test(q);
    const superlativo=/el mas barato|el mas caro|cual .*mas (barato|caro)|cual cuesta menos/.test(q);
    const tokens=q.split(/[\s/.,]+/).filter(t=>t.length>1 && !VACIAS.has(t)
        && !(/^\d+$/.test(t) && (rango || max))).slice(0,8);
    const seguimiento=Boolean(previo.filtros) && (otro || similar || barato || caro || tokens.length===0 || /\b(esos|estos|ellos|ese)\b/.test(q));
    return {q,tokens,fuera:fueraDeAlcance(q),genero:genero?.palabras || [],otro,similar,barato,caro,superlativo,
        comparativo:seguimiento && !superlativo && /mas (barato|caro)/.test(q),
        filtros:seguimiento?{...previo.filtros}:{},
        minimo,maximo,orden:barato?'precio_asc':caro?'precio_desc':'relevancia',
        stock:/sin stock|agotados|agotado/.test(q)?'agotado':/con stock|en stock|disponibles/.test(q)?'disponible':undefined,
        oferta:/\b(oferta|ofertas|descuento|descuentos)\b/.test(q),
        isbn:q.replace(/\s/g,'').match(/(?:978|979)\d{10}/)?.[0],
        este:/este libro|libro actual/.test(q),
        limite:otro || superlativo?1:4};
}
module.exports={normalizar,distancia,puntuacion,coincidencias,interpretar,fueraDeAlcance};
