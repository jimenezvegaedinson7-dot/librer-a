const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');
const { aplicarMigracionesDatos } = require('../src/config/migraciones');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const archivo = '042_purga_reservas.sql';
const silencio = { log() {}, error() {} };
test('042 elimina reservas e historial sin borrar ventas ni duplicar existencias', async t => {
    assert.equal(process.env.NODE_ENV, 'test');
    assert.match(process.env.DATABASE_URL, /@127\.0\.0\.1:\d+\/audit$/);
    const sufijo = randomUUID().replaceAll('-', '');
    const fk = `purga_fk_${sufijo}`, tabla = `purga_rel_${sufijo}`, fallo = `purga_fallo_${sufijo}`;
    const ids = { usuarios: [], libros: [], reservas: [], venta: null };
    let autor, categoria;
    const aplicar = () => aplicarMigracionesDatos(pool, { lista: [archivo], registro: silencio });
    const sql = readFileSync(path.join(__dirname, '../database/migrations', archivo), 'utf8');
    const consultar = async sql => Array.from((await pool.query(sql))[0]);
    const snapshot = async () => ({
        reservas: await consultar('SELECT * FROM reservas ORDER BY id_reserva'),
        stock: await consultar('SELECT * FROM inventario ORDER BY id_libro'),
        movimientos: await consultar('SELECT * FROM movimientos_inventario ORDER BY id_movimiento'),
        historial: await consultar('SELECT * FROM historial_operaciones ORDER BY id_historial'),
        ventas: await consultar('SELECT * FROM ventas ORDER BY id_venta'),
        comprobantes: await consultar('SELECT * FROM comprobantes ORDER BY id_comprobante'),
        usuarios: await consultar('SELECT * FROM usuarios ORDER BY id_usuario'),
    });
    try {
        await aplicarMigracionesDatos(pool, { lista: [], registro: silencio });
        await pool.query('DELETE FROM migraciones_datos WHERE nombre=?', [archivo]);
        for (const rol of ['administrador', 'cliente']) ids.usuarios.push((await pool.query(
            "INSERT INTO usuarios(nombre,apellido,email,password,rol) VALUES ('Purga','Audit',?,'hash-prueba',?)",
            [`${randomUUID()}@example.test`, rol]))[0].insertId);
        autor = (await pool.query("INSERT INTO autores(nombre,apellido) VALUES ('Purga','Audit')"))[0].insertId;
        categoria = (await pool.query('INSERT INTO categorias(nombre) VALUES (?)', [randomUUID()]))[0].insertId;
        for (const stock of [10, 4]) {
            const id = (await pool.query('INSERT INTO libros(titulo,precio,id_autor,id_categoria) VALUES (?,25,?,?)',
                [randomUUID(), autor, categoria]))[0].insertId;
            ids.libros.push(id);
            await pool.query('INSERT INTO inventario(id_libro,stock) VALUES (?,?)', [id, stock]);
        }
        for (const [libro, cantidad, estado] of [[0, 2, 'pendiente'], [0, 3, 'confirmada'], [0, 7, 'completada'],
            [0, 8, 'cancelada'], [0, 4, 'confirmada'], [1, 1, 'pendiente']]) {
            ids.reservas.push((await pool.query('INSERT INTO reservas(id_usuario,id_libro,cantidad,estado) VALUES (?,?,?,?)',
                [ids.usuarios[1], ids.libros[libro], cantidad, estado]))[0].insertId);
        }
        ids.venta = (await pool.query("INSERT INTO ventas(id_usuario,total,estado,origen,id_reserva,metodo_pago,tipo_entrega) VALUES (?,100,'pagada','reserva',?,'efectivo','tienda')",
            [ids.usuarios[1], ids.reservas[4]]))[0].insertId;
        await pool.query('INSERT INTO detalle_venta(id_venta,id_libro,cantidad,precio_unitario,subtotal) VALUES (?,?,4,25,100)', [ids.venta, ids.libros[0]]);
        for (const modulo of ['reserva', 'reservas', 'inventario']) await pool.query(
            "INSERT INTO historial_operaciones(id_usuario,modulo,descripcion) VALUES (?,?,'Operación de prueba')", [ids.usuarios[0], modulo]);
        // Un ON DELETE CASCADE heredado no debe borrar la venta al purgar.
        await pool.query(`ALTER TABLE ventas ADD CONSTRAINT ${fk} FOREIGN KEY(id_reserva) REFERENCES reservas(id_reserva) ON DELETE CASCADE NOT VALID`);
        const antes = await snapshot();

        await t.test('contratos viejos: JWT obligatorio, 410 para cualquier método y ningún dato expuesto', async () => {
            for (const id of ids.usuarios) {
                const token = jwt.sign({ id_usuario: id }, process.env.JWT_SECRET);
                for (const ruta of ['/reservas', '/reservas/mis-reservas', `/reservas/${ids.reservas[0]}`, `/reservas/${ids.reservas[0]}/estado`, '/reportes/reservas-por-estado']) {
                    for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
                        const respuesta = await fetch(`${process.env.TEST_BASE_URL}/api${ruta}`, { method,
                            headers: { Authorization: `Bearer ${token}` } });
                        assert.equal(respuesta.status, 410, `${method} ${ruta}`);
                        assert.equal(Object.hasOwn(await respuesta.json(), 'data'), false);
                    }
                }
            }
            assert.equal((await fetch(`${process.env.TEST_BASE_URL}/api/reservas`)).status, 401);
            assert.deepEqual(await snapshot(), antes);
        });
        await t.test('una relación entrante desconocida aborta y conserva datos, stock y FK de ventas', async () => {
            await pool.query(`CREATE TABLE ${tabla}(id INT REFERENCES reservas(id_reserva))`);
            try {
                const [resultado] = await aplicar();
                assert.equal(resultado.aplicada, false);
                assert.match(resultado.error, /FK entrante no compatible/);
                assert.deepEqual(await snapshot(), antes);
                assert.equal((await pool.query('SELECT count(*)::int AS n FROM pg_constraint WHERE conname=?', [fk]))[0][0].n, 1);
            } finally { await pool.query(`DROP TABLE ${tabla}`); }
        });
        await t.test('un fallo de kardex revierte toda la purga y permite reintentar', async () => {
            await pool.query(`CREATE FUNCTION ${fallo}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fallo de purga de prueba'; END $$`);
            await pool.query(`CREATE TRIGGER ${fallo} BEFORE INSERT ON movimientos_inventario FOR EACH ROW WHEN (NEW.motivo='retiro_reservas_042') EXECUTE FUNCTION ${fallo}()`);
            try {
                const [resultado] = await aplicar();
                assert.equal(resultado.aplicada, false);
                assert.deepEqual(await snapshot(), antes);
                assert.equal((await pool.query('SELECT count(*)::int AS n FROM migraciones_datos WHERE nombre=?', [archivo]))[0][0].n, 0);
            } finally {
                await pool.query(`DROP TRIGGER ${fallo} ON movimientos_inventario`);
                await pool.query(`DROP FUNCTION ${fallo}()`);
            }
        });
        await t.test('dos instancias eliminan una sola vez; solo apartados activos sin venta reingresan', async () => {
            const resultados = (await Promise.all([aplicar(), aplicar()])).flat();
            assert.equal(resultados.filter(r => r.aplicada).length, 1);
            assert.equal(resultados.find(r => r.aplicada).filas, antes.reservas.length);
            const despues = await snapshot();
            assert.deepEqual(despues.reservas, []);
            assert.equal(despues.stock.find(i => i.id_libro === ids.libros[0]).stock, 15);
            assert.equal(despues.stock.find(i => i.id_libro === ids.libros[1]).stock, 5);
            const movimientos = despues.movimientos.filter(m => m.motivo === 'retiro_reservas_042');
            assert.equal(movimientos.length, 2);
            assert.deepEqual(movimientos.map(m => m.cantidad), [5, 1]);
            assert.deepEqual(despues.ventas, antes.ventas);
            assert.deepEqual(despues.comprobantes, antes.comprobantes);
            assert.deepEqual(despues.usuarios, antes.usuarios);
            assert.deepEqual(despues.historial, antes.historial.filter(h => !['reserva', 'reservas'].includes(h.modulo)));
            assert.equal((await pool.query('SELECT count(*)::int AS n FROM pg_constraint WHERE conname=?', [fk]))[0][0].n, 0);
            assert.equal((await pool.query('SELECT filas FROM migraciones_datos WHERE nombre=?', [archivo]))[0][0].filas, antes.reservas.length);
        });
        await t.test('repetir incluso el SQL de purga no cambia otra vez stock ni ventas', async () => {
            const previo = await snapshot();
            const conexion = await pool.getConnection();
            try { await conexion.beginTransaction(); await conexion.pgQuery(sql); await conexion.commit(); }
            catch (error) { await conexion.rollback(); throw error; }
            finally { conexion.release(); }
            assert.deepEqual(await snapshot(), previo);
        });
    } finally {
        await pool.query(`ALTER TABLE ventas DROP CONSTRAINT IF EXISTS ${fk}`);
        await pool.query(`DROP TABLE IF EXISTS ${tabla}`);
        await pool.query(`DROP TRIGGER IF EXISTS ${fallo} ON movimientos_inventario`);
        await pool.query(`DROP FUNCTION IF EXISTS ${fallo}()`);
        if (ids.venta) await pool.query('DELETE FROM ventas WHERE id_venta=?', [ids.venta]);
        for (const id of ids.libros) {
            await pool.query('DELETE FROM reservas WHERE id_libro=?', [id]);
            await pool.query('DELETE FROM movimientos_inventario WHERE id_libro=?', [id]);
            await pool.query('DELETE FROM inventario WHERE id_libro=?', [id]);
            await pool.query('DELETE FROM libros WHERE id_libro=?', [id]);
        }
        if (autor) await pool.query('DELETE FROM autores WHERE id_autor=?', [autor]);
        if (categoria) await pool.query('DELETE FROM categorias WHERE id_categoria=?', [categoria]);
        for (const id of ids.usuarios) {
            await pool.query('DELETE FROM historial_operaciones WHERE id_usuario=?', [id]);
            await pool.query('DELETE FROM usuarios WHERE id_usuario=?', [id]);
        }
        await pool.query('DELETE FROM migraciones_datos WHERE nombre=?', [archivo]);
        await pool.end();
    }
});
