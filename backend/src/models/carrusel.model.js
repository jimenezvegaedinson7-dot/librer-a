const pool=require('../config/database');
async function listar(publico=false){
    const [r]=await pool.query(publico?`SELECT c.id_imagen,c.titulo,c.imagen_url,c.orden,
        CASE WHEN l.estado=1 THEN c.id_libro ELSE NULL END AS id_libro
        FROM carrusel_anuncios c LEFT JOIN libros l ON l.id_libro=c.id_libro
        WHERE c.estado=1 ORDER BY c.orden,c.id_imagen`
        :'SELECT * FROM carrusel_anuncios ORDER BY orden,id_imagen');
    return r;
}
async function obtener(id){const [r]=await pool.query('SELECT * FROM carrusel_anuncios WHERE id_imagen=?',[id]);return r[0] || null;}
async function crear(d){
    const [r]=await pool.query(`INSERT INTO carrusel_anuncios(titulo,imagen_url,imagen_public_id,id_libro,orden,estado)
        VALUES (?,?,?,?,?,?) RETURNING *`,[d.titulo,d.imagen_url,d.imagen_public_id,d.id_libro ?? null,d.orden ?? 0,d.estado ?? 1]);
    return r[0];
}
async function actualizar(id,d){
    const [r]=await pool.query(`WITH previa AS (SELECT * FROM carrusel_anuncios WHERE id_imagen=? FOR UPDATE),
        cambiada AS (UPDATE carrusel_anuncios c SET titulo=COALESCE(?,c.titulo),
            imagen_url=COALESCE(?,c.imagen_url),imagen_public_id=CASE WHEN ?::boolean THEN ? ELSE c.imagen_public_id END,
            id_libro=CASE WHEN ?::boolean THEN ? ELSE c.id_libro END,
            orden=COALESCE(?::int,c.orden),estado=COALESCE(?::smallint,c.estado),actualizado_en=CURRENT_TIMESTAMP
            FROM previa p WHERE c.id_imagen=p.id_imagen
            RETURNING c.*,p.imagen_url AS url_anterior,p.imagen_public_id AS public_id_anterior)
        SELECT * FROM cambiada`,[id,d.titulo ?? null,d.imagen_url ?? null,Boolean(d.imagen_url),d.imagen_public_id ?? null,
        Object.hasOwn(d,'id_libro'),d.id_libro ?? null,d.orden ?? null,d.estado ?? null]);
    if(!r[0])return null;
    const {url_anterior,public_id_anterior,...actual}=r[0];
    return {actual,anterior:{imagen_url:url_anterior,imagen_public_id:public_id_anterior}};
}
async function eliminar(id){const [r]=await pool.query('DELETE FROM carrusel_anuncios WHERE id_imagen=? RETURNING *',[id]);return r[0] || null;}
async function reordenar(ids){
    const c=await pool.getConnection();
    try{
        await c.beginTransaction();
        await c.query('LOCK TABLE carrusel_anuncios IN SHARE ROW EXCLUSIVE MODE');
        const [r]=await c.query('SELECT id_imagen FROM carrusel_anuncios ORDER BY id_imagen');
        if(r.length!==ids.length || r.some(i=>!ids.includes(i.id_imagen))){const e=new Error('lista_desactualizada');throw e;}
        for(let i=0;i<ids.length;i++)await c.query('UPDATE carrusel_anuncios SET orden=?,actualizado_en=CURRENT_TIMESTAMP WHERE id_imagen=?',[i+1,ids[i]]);
        await c.commit();
    }catch(e){await c.rollback();throw e;}finally{c.release();}
}
module.exports={listar,obtener,crear,actualizar,eliminar,reordenar};
