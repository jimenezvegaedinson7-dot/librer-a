const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');
const base = process.env.TEST_BASE_URL;
let admin, autor, categoria, libro, token;
test.before(async () => {
    const [u] = await pool.query("INSERT INTO usuarios (nombre,apellido,email,password,rol) VALUES ('Audit','Input',?,'x','administrador')", [`${crypto.randomUUID()}@example.test`]); admin = u.insertId;
    const [a] = await pool.query("INSERT INTO autores (nombre,apellido) VALUES ('Audit','Input')"); autor = a.insertId;
    const [c] = await pool.query("INSERT INTO categorias (nombre) VALUES ('Audit Input')"); categoria = c.insertId;
    token = jwt.sign({ id_usuario: admin }, process.env.JWT_SECRET);
    const res = await pedir('/api/libros', 'POST', datos()); assert.equal(res.status, 201); libro = (await res.json()).id_libro;
});
const isbn = `AUD-${crypto.randomUUID().slice(0, 12)}`;
const datos = () => ({ titulo: 'Audit Input', isbn, precio: 20, id_autor: autor, id_categoria: categoria });
const pedir = (ruta, method, body) => fetch(`${base}${ruta}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
test.after(async () => {
    if (libro) {
        await pool.query('DELETE FROM movimientos_inventario WHERE id_libro = ?', [libro]);
        await pool.query('DELETE FROM inventario WHERE id_libro = ?', [libro]);
        await pool.query('DELETE FROM libros WHERE id_libro = ?', [libro]);
    }
    if (admin) { await pool.query('DELETE FROM historial_operaciones WHERE id_usuario = ?', [admin]); await pool.query('DELETE FROM usuarios WHERE id_usuario = ?', [admin]); }
    if (autor) await pool.query('DELETE FROM autores WHERE id_autor = ?', [autor]);
    if (categoria) await pool.query('DELETE FROM categorias WHERE id_categoria = ?', [categoria]);
    await pool.end();
});
for (const [caso, cambio, esperado] of [
    ['ISBN duplicado', {}, 409], ['autor inexistente', { id_autor: 2147483647 }, 400],
    ['categoría inexistente', { id_categoria: 2147483647 }, 400], ['precio negativo', { precio: -1 }, 400],
    ['precio texto', { precio: 'abc' }, 400], ['precio infinito', { precio: 'Infinity' }, 400],
    ['precio blanco', { precio: '  ' }, 400], ['precio null', { precio: null }, 400],
    ['autor inválido', { id_autor: 'abc' }, 400], ['categoría inválida', { id_categoria: true }, 400],
    ['título objeto', { titulo: {} }, 400]
]) {
    test(`libro crear: ${caso}`, async () => {
        assert.equal((await pedir('/api/libros', 'POST', { ...datos(), ...cambio })).status, esperado);
    });
    if (caso !== 'ISBN duplicado') test(`libro editar: ${caso}`, async () => {
        assert.equal((await pedir(`/api/libros/${libro}`, 'PUT', cambio)).status, esperado);
    });
}
for (const campo of ['stock', 'stock_minimo']) {
    for (const valor of [-1, 'abc', 'NaN', 'Infinity', '-Infinity', 1.5, '', '   ', null, true, [], 2147483648]) {
        test(`HTTP inventario ${campo}=${JSON.stringify(valor)} rechaza sin mutar`, async () => {
            const [antes] = await pool.query('SELECT stock, stock_minimo FROM inventario WHERE id_libro = ?', [libro]);
            assert.equal((await pedir(`/api/inventario/libro/${libro}`, 'PUT', { [campo]: valor })).status, 400);
            const [despues] = await pool.query('SELECT stock, stock_minimo FROM inventario WHERE id_libro = ?', [libro]);
            assert.deepEqual(despues[0], antes[0]);
        });
    }
    for (const valor of [0, 1]) test(`HTTP inventario ${campo}=${valor} persiste`, async () => {
        assert.equal((await pedir(`/api/inventario/libro/${libro}`, 'PUT', { [campo]: valor })).status, 200);
        const [rows] = await pool.query(`SELECT ${campo} FROM inventario WHERE id_libro = ?`, [libro]);
        assert.equal(rows[0][campo], valor);
    });
}
test('inventario: libro inexistente y ubicación excesiva son 4xx',async () => {
    assert.equal((await pedir('/api/inventario','POST',{id_libro:2147483647,stock:1})).status,400);
    assert.equal((await pedir(`/api/inventario/libro/${libro}`,'PUT',{ubicacion:'x'.repeat(101)})).status,400);
});
test('inventario movimientos: paginación inválida no llega a SQL',async () => {
    for(const valor of ['abc','Infinity','1.5','0','-1']) {
        const res=await fetch(`${base}/api/inventario/movimientos?pagina=${valor}`,{headers:{Authorization:`Bearer ${token}`}});
        assert.equal(res.status,400);
    }
});
test('libro editar: ISBN duplicado conserva datos de la segunda fila',async () => {
    const res=await pedir('/api/libros','POST',{...datos(),isbn:`AUD-${crypto.randomUUID().slice(0,12)}`}); assert.equal(res.status,201);
    const otro=(await res.json()).id_libro;
    try { assert.equal((await pedir(`/api/libros/${otro}`,'PUT',{isbn})).status,409); }
    finally {
        await pool.query('DELETE FROM inventario WHERE id_libro=?',[otro]); await pool.query('DELETE FROM libros WHERE id_libro=?',[otro]);
    }
});
