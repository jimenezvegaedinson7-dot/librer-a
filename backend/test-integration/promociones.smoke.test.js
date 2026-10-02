const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../src/config/database');

test('promociones: HTTP, precio cobrado, favoritos, novedades y anuncios', async (t) => {
    const ids = { usuarios: [], libros: [], anuncios: [] };
    const clave = 'Prueba-local-123!';
    const pedir = (ruta, token, method = 'GET', body) => fetch(`${process.env.TEST_BASE_URL}/api${ruta}`, {
        method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined
    });
    let autor, categoria;
    try {
        const hash = await bcrypt.hash(clave, 4);
        for (const rol of ['administrador', 'cliente']) {
            const [u] = await pool.query("INSERT INTO usuarios (nombre,apellido,email,password,rol) VALUES ('Promo','Test',?,?,?)",
                [`${randomUUID()}@example.test`, hash, rol]);
            ids.usuarios.push(u.insertId);
        }
        const admin = jwt.sign({ id_usuario: ids.usuarios[0] }, process.env.JWT_SECRET);
        const cliente = jwt.sign({ id_usuario: ids.usuarios[1] }, process.env.JWT_SECRET);
        const [a] = await pool.query("INSERT INTO autores (nombre,apellido) VALUES ('Promo','Autor')"); autor = a.insertId;
        const [c] = await pool.query('INSERT INTO categorias (nombre) VALUES (?)', [`Promo-${randomUUID()}`]); categoria = c.insertId;
        const crear = async (extra = {}) => {
            const r = await pedir('/libros', admin, 'POST', { titulo: `Promo ${randomUUID()}`, precio: 100,
                id_autor: autor, id_categoria: categoria, ...extra });
            assert.equal(r.status, 201, await r.clone().text());
            const body = await r.json();
            const id = body.id_libro;
            ids.libros.push(id);
            await pool.query('UPDATE inventario SET stock=20 WHERE id_libro=?', [id]);
            return id;
        };
        const detalle = async (id) => (await (await pedir(`/libros/${id}`)).json()).data;
        const id = await crear({ descuento_porcentaje: 25 });

        await t.test('lista y detalle marcan nuevo desde creación real', async () => {
            const l = await detalle(id);
            assert.equal(l.es_nuevo, 1);
            assert.ok(l.creado_en);
            const listado = (await (await pedir('/libros')).json()).data;
            assert.equal(listado.find(l => l.id_libro === id).es_nuevo, 1);
            for (const fecha of [null, '2000-01-01', '2099-01-01']) {
                await pool.query('UPDATE libros SET creado_en=? WHERE id_libro=?', [fecha, id]);
                assert.equal((await detalle(id)).es_nuevo, 0);
            }
        });
        await t.test('actualiza precio y oferta juntos sin fallo del CHECK', async () => {
            assert.equal((await pedir(`/libros/${id}`, admin, 'PUT', { precio_oferta: 80, descuento_porcentaje: null })).status, 200);
            const r = await pedir(`/libros/${id}`, admin, 'PUT', { precio: 50, precio_oferta: 40 });
            assert.equal(r.status, 200, await r.clone().text());
            assert.equal(Number((await detalle(id)).precio_final), 40);
            assert.equal((await pedir(`/libros/${id}`, admin, 'PUT', { precio: 30, precio_oferta: null, descuento_porcentaje: 25 })).status, 200);
            assert.equal(Number((await detalle(id)).precio_final), 22.5);
            assert.equal((await pedir(`/libros/${id}`, admin, 'PUT', { precio_oferta: 999 })).status, 400);
        });
        await t.test('porcentaje, oferta prioritaria, vencimiento y redondeo', async () => {
            for (const [extra, esperado, vigente] of [
                [{}, 100, 0], [{ descuento_porcentaje: 35 }, 65, 1],
                [{ precio_oferta: 100, descuento_porcentaje: 30 }, 100, 0],
                [{ precio_oferta: 60, descuento_porcentaje: 90 }, 60, 1],
                [{ descuento_porcentaje: 30, descuento_hasta: '2000-01-01' }, 100, 0],
                [{ precio: 65.5, descuento_porcentaje: 35 }, 42.58, 1]
            ]) {
                // Datos heredados se leen con coherencia incluso si hoy el
                // formulario ya rechaza combinar los dos tipos de promoción.
                const caso = await crear();
                await pool.query('UPDATE libros SET precio=?,descuento_porcentaje=?,precio_oferta=?,descuento_hasta=? WHERE id_libro=?',
                    [extra.precio ?? 100, extra.descuento_porcentaje ?? null, extra.precio_oferta ?? null, extra.descuento_hasta ?? null, caso]);
                const l = await detalle(caso);
                assert.equal(Number(l.precio_final), esperado);
                assert.equal(l.descuento_vigente, vigente);
            }
        });
        await t.test('favoritos conserva el mismo precio final del catálogo', async () => {
            assert.equal((await pedir(`/favoritos/${id}`, cliente, 'POST', {})).status, 200);
            const favoritos = await (await pedir('/favoritos', cliente)).json();
            const listado = favoritos.data || favoritos;
            const l = listado.find(l => l.id_libro === id);
            assert.equal(Number(l.precio_final), 22.5);
            assert.equal(l.descuento_vigente, 1);
        });
        await t.test('checkout, detalle persistido y PayU cobran el descuento', async () => {
            const body = { items: [{ id_libro: id, cantidad: 2, precio: 1 }],
                tipo_entrega: 'tienda', cliente_tipo_documento: 'DNI', cliente_documento: '12345678', idempotencia_clave: randomUUID() };
            const r = await pedir('/pagos/crear-orden', cliente, 'POST', body);
            assert.equal(r.status, 201, await r.clone().text());
            const orden = (await r.json()).data;
            assert.equal(Number(orden.total), 45);
            const [v] = await pool.query('SELECT total FROM ventas WHERE id_venta=?', [orden.id_venta]);
            assert.equal(Number(v[0].total), 45);
            const [d] = await pool.query('SELECT precio_unitario,subtotal FROM detalle_venta WHERE id_venta=?', [orden.id_venta]);
            assert.equal(Number(d[0].precio_unitario), 22.5);
            assert.equal(Number(d[0].subtotal), 45);
            const html = await (await fetch(orden.checkout_url)).text();
            assert.match(html, /name="amount"\s+value="45\.00"/);
            // Un reintento conserva el total original de la orden; no crea
            // otra venta ni recalcula la compra que ya está pendiente.
            await pool.query('UPDATE libros SET descuento_hasta=\'2000-01-01\' WHERE id_libro=?', [id]);
            const repetida = await pedir('/pagos/crear-orden', cliente, 'POST', body);
            assert.equal(repetida.status, 200);
            const existente = (await repetida.json()).data;
            assert.equal(existente.id_venta, orden.id_venta);
            assert.equal(Number(existente.total), 45);
        });
        await t.test('anuncios CRUD real, autorización, archivo y contraseña', async () => {
            const video = readFileSync(path.resolve(__dirname, '../../frontend/test-browser/fixtures/anuncio.webm'));
            const subir = async (titulo, tipo = 'video/webm', contenido = video) => {
                const form = new FormData(); form.append('titulo', titulo);
                form.append('video', new Blob([contenido], { type: tipo }), 'anuncio.webm');
                return fetch(`${process.env.TEST_BASE_URL}/api/anuncios`, { method: 'POST', headers: { Authorization: `Bearer ${admin}` }, body: form });
            };
            assert.equal((await pedir('/anuncios/todos', cliente)).status, 403);
            assert.equal((await subir('Prueba', 'text/plain')).status, 400);
            assert.equal((await subir('Prueba', 'video/mp4', Buffer.from('texto disfrazado'))).status, 400);
            const r = await subir('Promo video'); assert.equal(r.status, 201, await r.clone().text());
            const anuncio = (await r.json()).anuncio; ids.anuncios.push(anuncio.id_anuncio);
            const archivo = path.resolve(__dirname, '../uploads/videos', path.basename(anuncio.video_url));
            assert.equal(existsSync(archivo), true);
            assert.equal((await (await pedir('/anuncios')).json()).anuncio.id_anuncio, anuncio.id_anuncio);
            assert.equal((await pedir(`/anuncios/${anuncio.id_anuncio}`, admin, 'PUT', { estado: 0 })).status, 200);
            assert.equal((await pedir(`/anuncios/${anuncio.id_anuncio}`, admin, 'DELETE', { password: 'incorrecta' })).status, 401);
            assert.equal((await pedir(`/anuncios/${anuncio.id_anuncio}`, admin, 'DELETE', { password: clave })).status, 200);
            assert.equal(existsSync(archivo), false);
        });
    } finally {
        for (const id of ids.anuncios) await pool.query('DELETE FROM anuncios WHERE id_anuncio=?', [id]);
        for (const usuario of ids.usuarios) {
            await pool.query('DELETE FROM detalle_venta WHERE id_venta IN (SELECT id_venta FROM ventas WHERE id_usuario=?)', [usuario]);
            await pool.query('DELETE FROM ventas WHERE id_usuario=?', [usuario]);
            await pool.query('DELETE FROM favoritos WHERE id_usuario=?', [usuario]);
            await pool.query('DELETE FROM historial_operaciones WHERE id_usuario=?', [usuario]);
        }
        for (const id of ids.libros) {
            await pool.query('DELETE FROM movimientos_inventario WHERE id_libro=?', [id]);
            await pool.query('DELETE FROM inventario WHERE id_libro=?', [id]);
            await pool.query('DELETE FROM libros WHERE id_libro=?', [id]);
        }
        if (autor) await pool.query('DELETE FROM autores WHERE id_autor=?', [autor]);
        if (categoria) await pool.query('DELETE FROM categorias WHERE id_categoria=?', [categoria]);
        for (const id of ids.usuarios) await pool.query('DELETE FROM usuarios WHERE id_usuario=?', [id]);
        await pool.end();
    }
});

test('migración 031 idempotente: antiguos sin fecha, nuevos con fecha real', async () => {
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    const schema = `promo_${randomUUID().replaceAll('-', '')}`;
    await client.connect();
    try {
        await client.query(`CREATE SCHEMA ${schema}; SET search_path TO ${schema}; CREATE TABLE libros (id SERIAL PRIMARY KEY); INSERT INTO libros DEFAULT VALUES;`);
        const sql = readFileSync(path.resolve(__dirname, '../database/migrations/031_libros_nuevos.sql'), 'utf8');
        await client.query(sql);
        await client.query(sql);
        assert.equal((await client.query('SELECT creado_en FROM libros WHERE id=1')).rows[0].creado_en, null);
        const nuevo = (await client.query('INSERT INTO libros DEFAULT VALUES RETURNING creado_en')).rows[0];
        assert.ok(nuevo.creado_en instanceof Date);
    } finally {
        await client.query(`DROP SCHEMA ${schema} CASCADE`);
        await client.end();
    }
});
