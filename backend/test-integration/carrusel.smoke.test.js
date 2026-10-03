const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {randomUUID}=require('node:crypto');
const jwt=require('jsonwebtoken');
const bcrypt=require('bcryptjs');
if(process.env.NODE_ENV!=='test' || !/^http:\/\/127\.0\.0\.1:\d+$/.test(process.env.TEST_BASE_URL || ''))throw new Error('Usar solo el runner de PostgreSQL desechable.');
const pool=require('../src/config/database');
const {carpeta}=require('../src/utils/carruselArchivos');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jr1sAAAAASUVORK5CYII=','base64');
test('carrusel: imágenes persistidas, permisos, orden atómico y limpieza de archivos',async t=>{
    const usuarios=[],imagenes=[];let autor,categoria,libro,video;
    const password='ClaveCarrusel123';let admin,cliente;
    const pedir=(ruta,token,method='GET',body)=>fetch(`${process.env.TEST_BASE_URL}/api/anuncios${ruta}`,{
        method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body && !(body instanceof FormData)?{'Content-Type':'application/json'}:{})},body:body?body instanceof FormData?body:JSON.stringify(body):undefined});
    const publico=async()=>(await (await pedir('/carrusel')).json()).data;
    const alta=async(titulo,orden=1,estado=1,extras={},buffer=png,mime='image/png')=>{
        const f=new FormData();for(const [k,v] of Object.entries({titulo,orden,estado,...extras}))f.append(k,String(v));
        if(buffer)f.append('imagen',new Blob([buffer],{type:mime}),'banner.png');
        return pedir('/carrusel',admin,'POST',f);
    };
    const archivos=()=>fs.existsSync(carpeta)?fs.readdirSync(carpeta).sort():[];
    try{
        for(const rol of ['administrador','cliente']){
            const [r]=await pool.query('INSERT INTO usuarios(nombre,apellido,email,password,rol) VALUES (?,?,?,?,?)',['Carrusel','Prueba',`${randomUUID()}@example.test`,await bcrypt.hash(password,4),rol]);usuarios.push(r.insertId);
            const token=jwt.sign({id_usuario:r.insertId},process.env.JWT_SECRET);if(rol==='administrador')admin=token;else cliente=token;
        }
        const [a]=await pool.query("INSERT INTO autores(nombre,apellido) VALUES ('Autor','Carrusel')");autor=a.insertId;
        const [c]=await pool.query('INSERT INTO categorias(nombre) VALUES (?)',[`Carrusel ${randomUUID()}`]);categoria=c.insertId;
        const [l]=await pool.query('INSERT INTO libros(titulo,precio,stock,id_autor,id_categoria) VALUES (?,35,3,?,?)',[`Libro ${randomUUID()}`,autor,categoria]);libro=l.insertId;
        const [v]=await pool.query("INSERT INTO anuncios(titulo,video_url,estado) VALUES ('Video existente','/uploads/video-prueba.webm',1)");video=v.insertId;
        const [antes]=await pool.query('SELECT * FROM libros WHERE id_libro=?',[libro]);
        await t.test('público sin token y escrituras solo administrador',async()=>{
            assert.deepEqual(await publico(),[]);
            assert.equal((await pedir('/carrusel/todos')).status,401);
            assert.equal((await pedir('/carrusel',cliente,'POST',{})).status,403);
            assert.equal((await pedir('/carrusel/1',cliente,'PUT',{estado:0})).status,403);
        });
        let primera,segunda,oculta;
        await t.test('alta con imagen válida y publicación en el orden definido',async()=>{
            for(const [titulo,orden,estado] of [['Primera',1,1],['Segunda',2,1],['Oculta',3,0]]){
                const r=await alta(titulo,orden,estado,{id_libro:libro});assert.equal(r.status,201);
                const d=(await r.json()).data;imagenes.push(d.id_imagen);if(titulo==='Primera')primera=d;else if(titulo==='Segunda')segunda=d;else oculta=d;
                assert.ok(d.imagen_url.startsWith('/uploads/carrusel/'));
            }
            const r=await publico();assert.deepEqual(r.map(i=>i.titulo),['Primera','Segunda']);assert.equal(r[0].id_libro,libro);
            assert.ok(r.every(i=>!Object.hasOwn(i,'imagen_public_id') && !Object.hasOwn(i,'actualizado_en')));
            const img=await fetch(`${process.env.TEST_BASE_URL}${primera.imagen_url}`);assert.equal(img.status,200);
        });
        await t.test('metadata sin imagen nueva conserva el archivo; reemplazar borra solo el anterior',async()=>{
            const r=await pedir(`/carrusel/${primera.id_imagen}`,admin,'PUT',{titulo:'Primera editada',orden:1});assert.equal(r.status,200);
            assert.equal((await r.json()).data.imagen_url,primera.imagen_url);
            const f=new FormData();f.append('imagen',new Blob([png],{type:'image/png'}),'nueva.png');
            const nuevo=await pedir(`/carrusel/${primera.id_imagen}`,admin,'PUT',f);assert.equal(nuevo.status,200);
            const d=(await nuevo.json()).data;assert.notEqual(d.imagen_url,primera.imagen_url);
            assert.equal((await fetch(`${process.env.TEST_BASE_URL}${primera.imagen_url}`)).status,404);primera=d;
        });
        await t.test('activar y ocultar imágenes no afecta al video existente',async()=>{
            assert.equal((await pedir(`/carrusel/${oculta.id_imagen}`,admin,'PUT',{estado:1})).status,200);
            assert.equal((await publico()).length,3);
            assert.equal((await pedir(`/carrusel/${oculta.id_imagen}`,admin,'PUT',{estado:0})).status,200);
            assert.equal((await (await pedir('')).json()).anuncio.id_anuncio,video);
        });
        await t.test('reordenar es atómico; lista incompleta o duplicada se rechaza',async()=>{
            assert.equal((await pedir('/carrusel/orden',admin,'PUT',{ids:[segunda.id_imagen,primera.id_imagen,oculta.id_imagen]})).status,200);
            assert.deepEqual((await publico()).map(i=>i.id_imagen),[segunda.id_imagen,primera.id_imagen]);
            assert.equal((await pedir('/carrusel/orden',admin,'PUT',{ids:[primera.id_imagen]})).status,409);
            assert.equal((await pedir('/carrusel/orden',admin,'PUT',{ids:[primera.id_imagen,primera.id_imagen]})).status,400);
            assert.deepEqual((await publico()).map(i=>i.id_imagen),[segunda.id_imagen,primera.id_imagen]);
        });
        await t.test('rechaza archivos falsos, URLs manuales, libro inexistente y datos inválidos sin huérfanos',async()=>{
            const antesArchivos=archivos();
            for(const [extras,buffer,mime] of [
                [{imagen_url:'https://example.test/falsa.jpg'},png,'image/png'],[{estado:3},png,'image/png'],
                [{id_libro:2147483647},png,'image/png'],[{},Buffer.from('texto'),'image/png'],[{},png,'image/svg+xml']
            ])assert.equal((await alta('Inválida',1,1,extras,buffer,mime)).status,400);
            await new Promise(r=>setTimeout(r,30));assert.deepEqual(archivos(),antesArchivos);
            assert.equal((await alta('Sin imagen',1,1,{},null)).status,400);
            assert.equal((await alta('Grande',1,1,{},Buffer.alloc(5*1024*1024+1))).status,413);
            assert.equal((await pedir(`/carrusel/${primera.id_imagen}`,admin,'PUT',{orden:-1})).status,400);
        });
        await t.test('migración es repetible y no incluye imágenes de ejemplo',async()=>{
            const sql=fs.readFileSync(require('node:path').join(__dirname,'../database/migrations/034_carrusel_anuncios.sql'),'utf8');
            await pool.query(sql);await pool.query(sql);assert.equal((await publico()).length,2);
        });
        await t.test('eliminación exige contraseña y retira el archivo correcto',async()=>{
            assert.equal((await pedir(`/carrusel/${segunda.id_imagen}`,admin,'DELETE',{password:'incorrecta'})).status,403);
            assert.equal((await pedir(`/carrusel/${segunda.id_imagen}`,admin,'DELETE',{password})).status,200);
            assert.equal((await fetch(`${process.env.TEST_BASE_URL}${segunda.imagen_url}`)).status,404);
            assert.equal((await publico()).length,1);
        });
        const [despues]=await pool.query('SELECT * FROM libros WHERE id_libro=?',[libro]);assert.deepEqual([...despues],[...antes]);
    }finally{
        const modelo=require('../src/models/carrusel.model'),{borrarArchivo}=require('../src/utils/carruselArchivos');
        for(const id of imagenes){const d=await modelo.eliminar(id);if(d)await borrarArchivo(d);}
        if(video)await pool.query('DELETE FROM anuncios WHERE id_anuncio=?',[video]);
        if(libro)await pool.query('DELETE FROM libros WHERE id_libro=?',[libro]);
        if(autor)await pool.query('DELETE FROM autores WHERE id_autor=?',[autor]);
        if(categoria)await pool.query('DELETE FROM categorias WHERE id_categoria=?',[categoria]);
        for(const id of usuarios)await pool.query('DELETE FROM usuarios WHERE id_usuario=?',[id]);
        await pool.end();
    }
});
