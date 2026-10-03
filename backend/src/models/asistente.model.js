const pool=require('../config/database');
const {PRECIO_FINAL_SQL,CAMPOS_DESCUENTO}=require('./libro.model');
const normalSQL=campo=>`regexp_replace(translate(lower(COALESCE(${campo},'')), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9]+', ' ', 'g')`;
const escapar=v=>String(v).replace(/[\\%_]/g,'\\$&');

async function facetas(){
    const [autores]=await pool.query(`SELECT DISTINCT a.id_autor AS id, CONCAT(a.nombre,' ',a.apellido) AS nombre
        FROM autores a INNER JOIN libros l ON l.id_autor=a.id_autor WHERE l.estado=1 ORDER BY nombre LIMIT 200`);
    const [categorias]=await pool.query(`SELECT DISTINCT c.id_categoria AS id,c.nombre
        FROM categorias c INNER JOIN libros l ON l.id_categoria=c.id_categoria WHERE l.estado=1 ORDER BY nombre LIMIT 100`);
    return {autores,categorias};
}
async function titulos(tokens){
    if(!tokens.length)return [];
    const condiciones=tokens.map(()=>`${normalSQL('l.titulo')} LIKE ?`);
    const patrones=tokens.map(t=>`%${escapar(t.slice(0,Math.max(2,t.length-2)))}%`);
    const [filas]=await pool.query(`SELECT l.id_libro AS id,l.titulo,l.id_autor,l.id_categoria
        FROM libros l WHERE l.estado=1 AND (${condiciones.join(' OR ')})
        ORDER BY (${condiciones.map(c=>`CASE WHEN ${c} THEN 1 ELSE 0 END`).join('+')}) DESC,l.id_libro DESC LIMIT 80`,[...patrones,...patrones]);
    return filas;
}
async function referencia(id){
    const [filas]=await pool.query(`SELECT id_libro AS id,titulo,id_autor,id_categoria FROM libros WHERE estado=1 AND id_libro=? LIMIT 1`,[id]);
    return filas[0] || null;
}
async function buscar(filtros={},orden='relevancia',limite=8){
    const condiciones=['l.estado=1'];const valores=[];
    for(const [campo,clave] of [['l.id_autor','autor'],['l.id_categoria','categoria']])if(filtros[clave]){condiciones.push(`${campo}=?`);valores.push(filtros[clave]);}
    if(filtros.ids?.length){condiciones.push('l.id_libro=ANY(?::int[])');valores.push(filtros.ids);}
    if(filtros.isbn){condiciones.push("replace(replace(l.isbn,'-',''),' ','')=?");valores.push(filtros.isbn);}
    if(filtros.excluir?.length){condiciones.push('NOT(l.id_libro=ANY(?::int[]))');valores.push(filtros.excluir.slice(-24));}
    if(filtros.referencia){condiciones.push('(l.id_autor=? OR l.id_categoria=?)');valores.push(filtros.referencia.id_autor,filtros.referencia.id_categoria);}
    if(filtros.palabras?.length){
        condiciones.push(`(${filtros.palabras.map(()=>`${normalSQL("CONCAT(l.titulo,' ',COALESCE(l.descripcion,''),' ',c.nombre)")} LIKE ?`).join(' OR ')})`);
        valores.push(...filtros.palabras.slice(0,6).map(t=>`%${escapar(t)}%`));
    }
    const externos=[];
    for(const [clave,op] of [['minimo','>='],['maximo','<='],['menorQue','<'],['mayorQue','>']])if(Number.isFinite(filtros[clave])){externos.push(`base.precio_final ${op} ?`);valores.push(filtros[clave]);}
    if(filtros.stock==='disponible')externos.push('base.stock>0');
    if(filtros.stock==='agotado')externos.push('base.stock<=0');
    if(filtros.oferta)externos.push('base.precio_final<base.precio');
    const ordenar=orden==='precio_asc'?'base.precio_final ASC, (base.stock>0) DESC':orden==='precio_desc'?'base.precio_final DESC, (base.stock>0) DESC':'(base.stock>0) DESC, base.id_libro DESC';
    const [filas]=await pool.query(`SELECT base.*,${CAMPOS_DESCUENTO} FROM (
        SELECT l.id_libro,l.titulo,l.isbn,l.id_autor,l.id_categoria,l.estado,l.creado_en,l.precio,l.portada,
            LEFT(COALESCE(l.descripcion,''),300) AS descripcion,
            CONCAT(a.nombre,' ',a.apellido) AS autor,c.nombre AS categoria,
            COALESCE(i.stock,l.stock,0) AS stock,${PRECIO_FINAL_SQL}
        FROM libros l INNER JOIN autores a ON a.id_autor=l.id_autor
        INNER JOIN categorias c ON c.id_categoria=l.id_categoria
        LEFT JOIN inventario i ON i.id_libro=l.id_libro WHERE ${condiciones.join(' AND ')}
    ) base ${externos.length?`WHERE ${externos.join(' AND ')}`:''}
    ORDER BY ${ordenar},base.id_libro DESC LIMIT ?`,[...valores,Math.min(8,Math.max(1,limite))]);
    return filas.map(l=>({...l,precio:Number(l.precio),precio_final:Number(l.precio_final),stock:Number(l.stock),descuento_porcentaje_efectivo:Number(l.descuento_porcentaje_efectivo)}));
}
module.exports={facetas,titulos,referencia,buscar};
