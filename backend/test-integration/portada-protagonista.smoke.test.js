const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
if (process.env.NODE_ENV !== 'test' || !/^http:\/\/127\.0\.0\.1:\d+$/.test(process.env.TEST_BASE_URL || '')) {
    throw new Error('Ejecutar solo mediante test-integration/run.cjs, con PostgreSQL desechable.');
}
const pool = require('../src/config/database');

test('protagonista: selección persistida, fechas, precios reales, permisos y migración no destructiva', async (t) => {
    const usuarios = [], libros = [];
    let autor, categoria, admin, cliente;
    const pedir = (sufijo = '', token, method = 'GET', body) => fetch(`${process.env.TEST_BASE_URL}/api/anuncios/protagonista${sufijo}`, {
        method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    const publico = async () => (await (await pedir()).json()).data;
    const panel = async () => (await (await pedir('/panel', admin)).json()).data;
    const guardar = (id_libro) => pedir('', admin, 'PUT', { id_libro });
    const [configInicial] = await pool.query('SELECT * FROM portada_config WHERE id=1');
    try {
        for (const rol of ['administrador', 'cliente']) {
            const [r] = await pool.query('INSERT INTO usuarios(nombre,apellido,email,password,rol) VALUES (?,?,?,?,?)',
                ['Portada', 'Prueba', `${randomUUID()}@example.test`, 'no-se-usa-login', rol]);
            usuarios.push(r.insertId);
            const token = jwt.sign({ id_usuario: r.insertId }, process.env.JWT_SECRET);
            if (rol === 'administrador') admin = token; else cliente = token;
        }
        const [a] = await pool.query("INSERT INTO autores(nombre,apellido) VALUES ('Autor','Portada')"); autor = a.insertId;
        const [c] = await pool.query('INSERT INTO categorias(nombre) VALUES (?)', [`Portada ${randomUUID()}`]); categoria = c.insertId;
        for (const [titulo, fecha, portada] of [
            ['Manual', '2098-01-01', '/portadas/manual.jpg'],
            ['Reciente A', '2099-01-01', '/portadas/a.jpg'],
            ['Reciente B', '2099-01-01', '/portadas/b.jpg'],
            ['ID mayor pero antiguo', '2001-01-01', '/portadas/antiguo.jpg'],
            ['Más nuevo sin portada', '2099-02-01', null],
            ['Esquema de imagen inválido', '2099-03-01', 'javascript:alert(1)'],
        ]) {
            const [l] = await pool.query('INSERT INTO libros(titulo,precio,stock,id_autor,id_categoria,portada,creado_en) VALUES (?,40,3,?,?,?,?)', [titulo, autor, categoria, portada, fecha]);
            libros.push(l.insertId);
        }
        await pool.query('UPDATE libros SET precio_oferta=30 WHERE id_libro=?', [libros[2]]);
        await t.test('público anónimo, panel privado y escritura solo admin', async () => {
            assert.equal((await pedir('/panel')).status, 401);
            assert.equal((await pedir('/panel', cliente)).status, 403);
            assert.equal((await pedir('', cliente, 'PUT', { id_libro: libros[0] })).status, 403);
            const r = await pedir(); assert.equal(r.status, 200); assert.equal(r.headers.get('cache-control'), 'no-store');
        });
        await t.test('automático ordena por fecha y desempata por ID; excluye portadas inválidas', async () => {
            assert.equal((await guardar(null)).status, 200);
            const d = await publico(); assert.equal(d.modo, 'automatico'); assert.equal(d.libro.id_libro, libros[2]);
            assert.equal(Number(d.libro.precio), 40); assert.equal(Number(d.libro.precio_final), 30);
            assert.equal(Number(d.libro.descuento_vigente), 1); assert.equal(Number(d.libro.descuento_porcentaje_efectivo), 25);
        });
        const [antes] = await pool.query('SELECT * FROM libros WHERE id_autor=? ORDER BY id_libro', [autor]);
        await t.test('selección manual se refleja en lectura pública y conserva vista previa automática', async () => {
            assert.equal((await guardar(libros[0])).status, 200);
            assert.equal((await publico()).libro.id_libro, libros[0]);
            const d = await panel(); assert.equal(d.modo, 'manual'); assert.equal(d.libro_automatico.id_libro, libros[2]);
            const [despues] = await pool.query('SELECT * FROM libros WHERE id_autor=? ORDER BY id_libro', [autor]); assert.deepEqual(despues, antes);
            const [historial] = await pool.query("SELECT * FROM historial_operaciones WHERE id_usuario=? AND modulo='anuncios'", [usuarios[0]]); assert.ok(historial.length >= 2);
        });
        await t.test('rechaza cuerpos inválidos y libros sin portada o inactivos sin cambiar la elección', async () => {
            for (const body of [{}, { id_libro: false }, { id_libro: -1 }, { id_libro: libros[0], extra: 1 }, { id_libro: libros[4] }, { id_libro: libros[5] }]) {
                assert.equal((await pedir('', admin, 'PUT', body)).status, 400);
            }
            assert.equal((await guardar(2147483647)).status, 404);
            assert.equal((await publico()).libro.id_libro, libros[0]);
            await pool.query('UPDATE libros SET estado=0 WHERE id_libro=?', [libros[0]]);
            assert.equal((await guardar(libros[0])).status, 400);
            assert.equal((await publico()).libro.id_libro, libros[2]);
            assert.equal((await panel()).manual_invalido, true);
        });
        await t.test('repetir la migración conserva la selección y no modifica datos comerciales', async () => {
            const sql = readFileSync(path.join(__dirname, '../database/migrations/044_portada_protagonista.sql'), 'utf8');
            await pool.query(sql); await pool.query(sql);
            assert.equal((await panel()).id_libro_manual, libros[0]);
            const d = await guardar(null); assert.equal(d.status, 200); assert.equal((await panel()).id_libro_manual, null);
        });
    } finally {
        const original = configInicial[0];
        await pool.query('UPDATE portada_config SET id_libro_protagonista=?,actualizado_por=?,actualizado_en=? WHERE id=1', [original.id_libro_protagonista, original.actualizado_por, original.actualizado_en]);
        for (const id of libros) await pool.query('DELETE FROM libros WHERE id_libro=?', [id]);
        if (autor) await pool.query('DELETE FROM autores WHERE id_autor=?', [autor]);
        if (categoria) await pool.query('DELETE FROM categorias WHERE id_categoria=?', [categoria]);
        for (const id of usuarios) {
            await pool.query('DELETE FROM historial_operaciones WHERE id_usuario=?', [id]);
            await pool.query('DELETE FROM usuarios WHERE id_usuario=?', [id]);
        }
        await pool.end();
    }
});
