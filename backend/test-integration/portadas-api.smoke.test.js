const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');

test('portadas por API: catálogo, ficha, relacionados, favoritos y reservas compatibles con Flutter', async t => {
    const libros = [], usuarios = [];
    let autor, categoria;
    const pedir = async (ruta, token, method = 'GET', body) => {
        const r = await fetch(`${process.env.TEST_BASE_URL}/api${ruta}`, {
            method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
            body: body ? JSON.stringify(body) : undefined,
        });
        return { status: r.status, ...(await r.json()) };
    };
    const referencia = 'https://librer-a-zeta.vercel.app/portadas/9789700508900-referencia.jpg';
    try {
        const [a] = await pool.query("INSERT INTO autores(nombre,apellido) VALUES (?, 'Portadas')", [`Autor ${randomUUID()}`]); autor = a.insertId;
        const [c] = await pool.query('INSERT INTO categorias(nombre) VALUES (?)', [`Portadas ${randomUUID()}`]); categoria = c.insertId;
        for (const rol of ['cliente', 'administrador']) {
            const [u] = await pool.query("INSERT INTO usuarios(nombre,apellido,email,password,rol) VALUES ('Prueba','Portadas',?,'hash-prueba',?)", [`${randomUUID()}@example.test`, rol]);
            usuarios.push(u.insertId);
        }
        const cliente = jwt.sign({ id_usuario: usuarios[0] }, process.env.JWT_SECRET);
        const admin = jwt.sign({ id_usuario: usuarios[1] }, process.env.JWT_SECRET);
        for (const [isbn, portada] of [['9789700508900', null], ['9789580412342', '/uploads/portadas/manual.jpg'], ['9780000000055', null]]) {
            const [l] = await pool.query('INSERT INTO libros(titulo,isbn,precio,stock,portada,id_autor,id_categoria) VALUES (?,?,45,7,?,?,?)', [`Libro ${randomUUID()}`, isbn, portada, autor, categoria]);
            libros.push(l.insertId);
            await pool.query('INSERT INTO inventario(id_libro,stock,stock_minimo) VALUES (?,7,1)', [l.insertId]);
        }
        const comprobar = l => {
            assert.equal(l.portada, referencia);
            assert.equal(l.isbn, '9789700508900');
            assert.equal(l.portada_registrada, null);
            assert.equal(l.portada_es_referencia, true);
            assert.equal(l.portada_edicion_referencia.isbn, '9788401385360');
        };
        await t.test('ficha y catálogo entregan URL absoluta y mantienen manuales y estados vacíos', async () => {
            const ficha = await pedir(`/libros/${libros[0]}`); assert.equal(ficha.status, 200); comprobar(ficha.data);
            const catalogo = await pedir('/libros'); assert.equal(catalogo.status, 200);
            comprobar(catalogo.data.find(l => l.id_libro === libros[0]));
            assert.equal(catalogo.data.find(l => l.id_libro === libros[1]).portada, '/uploads/portadas/manual.jpg');
            assert.equal(catalogo.data.find(l => l.id_libro === libros[2]).portada, null);
        });
        await t.test('relacionados y favoritos usan la misma portada sin perder campos', async () => {
            const relacionados = await pedir(`/libros/${libros[1]}/relacionados`); assert.equal(relacionados.status, 200);
            comprobar(Object.values(relacionados.data).flat().find(l => l.id_libro === libros[0]));
            assert.equal((await pedir(`/favoritos/${libros[0]}`, cliente, 'POST', {})).status, 200);
            const favoritos = await pedir('/favoritos', cliente); assert.equal(favoritos.status, 200);
            comprobar(favoritos.data.find(l => l.id_libro === libros[0]));
            assert.equal((await pedir('/favoritos')).status, 401);
        });
        await t.test('mis reservas incluye ISBN y URL para la portada sin cambiar la reserva', async () => {
            await pool.query("INSERT INTO reservas(id_usuario,id_libro,cantidad,fecha_vencimiento,estado) VALUES (?,?,1,CURRENT_DATE + 7,'pendiente')", [usuarios[0], libros[0]]);
            const reservas = await pedir('/reservas/mis-reservas', cliente); assert.equal(reservas.status, 200);
            comprobar(reservas.data[0]); assert.equal(reservas.data[0].cantidad, 1);
        });
        await t.test('editar datos sin archivo no persiste la portada de respaldo en la BD', async () => {
            const r = await pedir(`/libros/${libros[0]}`, admin, 'PUT', { descripcion: 'Descripción editada', portada: referencia });
            assert.equal(r.status, 200);
            const [rows] = await pool.query('SELECT portada,isbn,precio,stock FROM libros WHERE id_libro=?', [libros[0]]);
            assert.equal(rows[0].portada, null); assert.equal(rows[0].isbn, '9789700508900');
            assert.equal(Number(rows[0].precio), 45); assert.equal(Number(rows[0].stock), 7);
            comprobar((await pedir(`/libros/${libros[0]}`)).data);
        });
        await t.test('una portada registrada posteriormente reemplaza el respaldo en todos los clientes', async () => {
            // Simula el resultado de una carga manual; todo ocurre en PostgreSQL desechable.
            await pool.query('UPDATE libros SET portada=? WHERE id_libro=?', ['/uploads/portadas/nueva-manual.jpg', libros[0]]);
            const l = (await pedir(`/libros/${libros[0]}`)).data;
            assert.equal(l.portada, '/uploads/portadas/nueva-manual.jpg');
            assert.equal(l.portada_es_referencia, false); assert.equal(l.portada_edicion_referencia, null);
            assert.equal((await pedir('/favoritos', cliente)).data[0].portada, l.portada);
            assert.equal((await pedir('/reservas/mis-reservas', cliente)).data[0].portada, l.portada);
        });
    } finally {
        for (const id of libros) {
            await pool.query('DELETE FROM favoritos WHERE id_libro=?', [id]);
            await pool.query('DELETE FROM reservas WHERE id_libro=?', [id]);
            await pool.query('DELETE FROM inventario WHERE id_libro=?', [id]);
            await pool.query('DELETE FROM libros WHERE id_libro=?', [id]);
        }
        if (autor) await pool.query('DELETE FROM autores WHERE id_autor=?', [autor]);
        if (categoria) await pool.query('DELETE FROM categorias WHERE id_categoria=?', [categoria]);
        for (const id of usuarios) await pool.query('DELETE FROM historial_operaciones WHERE id_usuario=?', [id]);
        for (const id of usuarios) await pool.query('DELETE FROM usuarios WHERE id_usuario=?', [id]);
        await pool.end();
    }
});
