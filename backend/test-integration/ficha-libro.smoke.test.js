const test=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const jwt=require('jsonwebtoken');
const pool=require('../src/config/database');

test('ficha de libro: relacionados acotados, datos reales, descuentos y propiedad de favoritos',async t=>{
    const libros=[],autores=[],categorias=[],usuarios=[];
    const pedir=(ruta,token,method='GET',body)=>fetch(`${process.env.TEST_BASE_URL}/api${ruta}`,{
        method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    try {
        for(let n=0;n<2;n++){
            const [a]=await pool.query('INSERT INTO autores(nombre,apellido,biografia) VALUES (?,?,?)',[`Autor ${randomUUID()}`,'Ficha','Biografía de prueba real']);autores.push(a.insertId);
            const [c]=await pool.query('INSERT INTO categorias(nombre) VALUES (?)',[`Categoría ${randomUUID()}`]);categorias.push(c.insertId);
            const [u]=await pool.query("INSERT INTO usuarios(nombre,apellido,email,password,rol) VALUES ('Ficha','Cliente',?,'hash-prueba','cliente')",[`${randomUUID()}@example.test`]);usuarios.push(u.insertId);
        }
        const tokens=usuarios.map(id_usuario=>jwt.sign({id_usuario},process.env.JWT_SECRET));
        async function crear({autor=autores[0],categoria=categorias[0],stock=5,estado=1,descuento=25,vencimiento=null}={}){
            const [l]=await pool.query('INSERT INTO libros(titulo,isbn,descripcion,precio,stock,id_autor,id_categoria,estado,descuento_porcentaje,descuento_hasta) VALUES (?,?,?,100,999,?,?,?,?,?)',
                [`Título ${randomUUID()}`,randomUUID().slice(0,20),'Descripción real\nSegunda línea',autor,categoria,estado,descuento,vencimiento]);libros.push(l.insertId);
            await pool.query('INSERT INTO inventario(id_libro,stock,stock_minimo) VALUES (?,?,1)',[l.insertId,stock]);return l.insertId;
        }
        const actual=await crear();
        const mismoAutor=[];for(let n=0;n<8;n++)mismoAutor.push(await crear({stock:n===0?0:3}));
        const mismaCategoria=[];for(let n=0;n<8;n++)mismaCategoria.push(await crear({autor:autores[1],descuento:30,vencimiento:n===0?'2000-01-01':null}));
        const inactivo=await crear({estado:0});
        const ajeno=await crear({autor:autores[1],categoria:categorias[1]});
        await t.test('libro por ID conserva ISBN, descripción, precio definitivo y stock del inventario',async()=>{
            const r=await pedir(`/libros/${actual}`);assert.equal(r.status,200);const l=(await r.json()).data;
            assert.ok(l.isbn);assert.equal(l.descripcion,'Descripción real\nSegunda línea');assert.equal(Number(l.precio_final),75);assert.equal(Number(l.stock),5);
            assert.equal(l.id_autor,autores[0]);assert.equal(l.id_categoria,categorias[0]);
            assert.equal((await pedir('/libros/2147483647')).status,404);
        });
        await t.test('autor prioritario, categoría complementaria, activos, exclusión y cero duplicados',async()=>{
            const r=await pedir(`/libros/${actual}/relacionados`);assert.equal(r.status,200);const d=(await r.json()).data;
            assert.equal(d.relacionados.length,4);assert.equal(d.mas_autor.length,4);assert.equal(d.interesarte.length,4);
            assert.ok(d.relacionados.every(l=>l.id_autor===autores[0]));assert.ok(d.mas_autor.every(l=>l.id_autor===autores[0]));
            assert.ok(d.interesarte.every(l=>l.id_categoria===categorias[0] && l.id_autor!==autores[0]));
            const todos=[...d.relacionados,...d.mas_autor,...d.interesarte];assert.equal(new Set(todos.map(l=>l.id_libro)).size,todos.length);
            assert.ok(todos.every(l=>l.estado===1 && ![actual,inactivo,ajeno].includes(l.id_libro)));
            assert.ok(todos.every(l=>Number.isFinite(Number(l.precio_final))));assert.ok(todos.length<=12);
        });
        await t.test('rellena con categoría cuando faltan otros libros del autor; no inventa recomendaciones vacías',async()=>{
            const solo=await crear({autor:autores[1],categoria:categorias[1]});
            const d=(await (await pedir(`/libros/${solo}/relacionados`)).json()).data;
            assert.ok(d.relacionados.every(l=>l.id_autor===autores[1]));
            const [nuevoAutor]=await pool.query("INSERT INTO autores(nombre,apellido) VALUES ('Sin','Otros')");autores.push(nuevoAutor.insertId);
            const sinAutor=await crear({autor:nuevoAutor.insertId});
            const relleno=(await (await pedir(`/libros/${sinAutor}/relacionados`)).json()).data;
            assert.equal(relleno.relacionados.length,4);assert.ok(relleno.relacionados.every(l=>l.id_categoria===categorias[0]));
            const [nuevaCat]=await pool.query('INSERT INTO categorias(nombre) VALUES (?)',[`Vacía ${randomUUID()}`]);categorias.push(nuevaCat.insertId);
            const sinResultados=await crear({autor:nuevoAutor.insertId,categoria:nuevaCat.insertId});
            // Retiramos el único otro libro de ese autor, conservándolo en la base.
            await pool.query('UPDATE libros SET estado=0 WHERE id_libro=?',[sinAutor]);
            const vacio=(await (await pedir(`/libros/${sinResultados}/relacionados`)).json()).data;
            assert.deepEqual(vacio,{relacionados:[],mas_autor:[],interesarte:[]});
        });
        await t.test('ID inválido, inexistente e inactivo no exponen relacionados',async()=>{
            assert.equal((await pedir('/libros/no-id/relacionados')).status,400);
            assert.equal((await pedir('/libros/2147483647/relacionados')).status,404);
            assert.equal((await pedir(`/libros/${inactivo}/relacionados`)).status,404);
        });
        await t.test('favoritos reutilizados: JWT, persistencia, idempotencia y aislamiento entre clientes',async()=>{
            assert.equal((await pedir(`/favoritos/${actual}`,null,'POST',{})).status,401);
            for(let n=0;n<2;n++)assert.equal((await pedir(`/favoritos/${actual}`,tokens[0],'POST',{id_usuario:usuarios[1]})).status,200);
            const [f]=await pool.query('SELECT * FROM favoritos WHERE id_libro=?',[actual]);assert.equal(f.length,1);assert.equal(f[0].id_usuario,usuarios[0]);
            assert.equal((await (await pedir(`/favoritos/${actual}`,tokens[0])).json()).data.es_favorito,true);
            assert.equal((await (await pedir(`/favoritos/${actual}`,tokens[1])).json()).data.es_favorito,false);
            await pedir(`/favoritos/${actual}`,tokens[1],'DELETE',{id_usuario:usuarios[0]});
            assert.equal((await (await pedir(`/favoritos/${actual}`,tokens[0])).json()).data.es_favorito,true);
            await pedir(`/favoritos/${actual}`,tokens[0],'DELETE');
            assert.equal((await (await pedir(`/favoritos/${actual}`,tokens[0])).json()).data.es_favorito,false);
        });
    } finally {
        for(const id of libros){await pool.query('DELETE FROM favoritos WHERE id_libro=?',[id]);await pool.query('DELETE FROM inventario WHERE id_libro=?',[id]);await pool.query('DELETE FROM libros WHERE id_libro=?',[id]);}
        for(const id of autores)await pool.query('DELETE FROM autores WHERE id_autor=?',[id]);
        for(const id of categorias)await pool.query('DELETE FROM categorias WHERE id_categoria=?',[id]);
        for(const id of usuarios)await pool.query('DELETE FROM usuarios WHERE id_usuario=?',[id]);
        await pool.end();
    }
});
