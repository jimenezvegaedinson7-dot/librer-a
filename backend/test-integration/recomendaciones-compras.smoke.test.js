const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');

test('recomendaciones personales según compras confirmadas', async (t) => {
    const autores = [],
        categorias = [],
        usuarios = [],
        libros = [],
        ventas = [];
    const pedir = (token, extra = '') => fetch(`${process.env.TEST_BASE_URL}/api/libros/recomendados${extra}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    try {
        for (let n = 0; n < 3; n++) {
            const [a] = await pool.query('INSERT INTO autores(nombre,apellido) VALUES (?,?)', [`Autor ${randomUUID()}`, 'Recomendaciones']);
            autores.push(a.insertId);
            const [c] = await pool.query('INSERT INTO categorias(nombre) VALUES (?)', [`Categoría ${randomUUID()}`]);
            categorias.push(c.insertId);
            const [u] = await pool.query('INSERT INTO usuarios(nombre,apellido,email,password,rol) VALUES (?,?,?,?,?)', [
                'Cliente',
                'Recomendaciones',
                `${randomUUID()}@example.test`,
                'hash-prueba',
                n === 2 ? 'administrador' : 'cliente'
            ]);
            usuarios.push(u.insertId);
        }
        const tokens = usuarios.map((id_usuario) => jwt.sign({ id_usuario }, process.env.JWT_SECRET));
        const crearLibro = async (autor, categoria, stock = 5, estado = 1) => {
            const [r] = await pool.query('INSERT INTO libros(titulo,precio,stock,id_autor,id_categoria,estado,descuento_porcentaje) VALUES (?,100,999,?,?,?,25)', [
                `Libro ${randomUUID()}`,
                autor,
                categoria,
                estado
            ]);
            libros.push(r.insertId);
            await pool.query('INSERT INTO inventario(id_libro,stock,stock_minimo) VALUES (?,?,1)', [r.insertId, stock]);
            return r.insertId;
        };
        const comprar = async (usuario, libro, estado) => {
            const [v] = await pool.query("INSERT INTO ventas(id_usuario,total,estado,canal_compra,origen,costo_envio) VALUES (?,75,?,'web','app',0)", [usuario, estado]);
            ventas.push(v.insertId);
            await pool.query('INSERT INTO detalle_venta(id_venta,id_libro,cantidad,precio_unitario,subtotal) VALUES (?,?,1,75,75)', [v.insertId, libro]);
            return v.insertId;
        };
        const comprado = await crearLibro(autores[0], categorias[0]);
        const ambos = await crearLibro(autores[0], categorias[0]);
        const autor = await crearLibro(autores[0], categorias[1]);
        const categoria = await crearLibro(autores[1], categorias[0]);
        const agotado = await crearLibro(autores[0], categorias[0], 0);
        const inactivo = await crearLibro(autores[0], categorias[0], 5, 0);
        const ajeno = await crearLibro(autores[2], categorias[2]);
        const otroAjeno = await crearLibro(autores[2], categorias[2]);
        await comprar(usuarios[0], comprado, 'pagada');
        await comprar(usuarios[1], ajeno, 'entregada');
        const pendiente = await comprar(usuarios[0], ajeno, 'pendiente');

        await t.test('requiere sesión cliente y no confunde la ruta con un ID de libro', async () => {
            assert.equal((await pedir()).status, 401);
            assert.equal((await pedir(tokens[2])).status, 403);
        });
        await t.test('prioriza autor y categoría, después autor y después categoría', async () => {
            const res = await pedir(tokens[0]);
            assert.equal(res.status, 200);
            assert.match(res.headers.get('cache-control'), /private.*no-store/);
            const data = (await res.json()).data;
            assert.deepEqual(
                data.map((l) => l.id_libro),
                [ambos, autor, categoria]
            );
            assert.deepEqual(
                data.map((l) => l.motivo_recomendacion),
                ['autor_categoria', 'autor', 'categoria']
            );
            assert.ok(data.every((l) => Number(l.precio_final) === 75 && Number(l.descuento_vigente) === 1));
            assert.ok(data.every((l) => ![comprado, agotado, inactivo, ajeno, otroAjeno].includes(l.id_libro)));
        });
        await t.test('ignora IDs solicitados por URL y mantiene aislados los perfiles', async () => {
            const data = (await (await pedir(tokens[0], `?id_usuario=${usuarios[1]}`)).json()).data;
            assert.deepEqual(
                data.map((l) => l.id_libro),
                [ambos, autor, categoria]
            );
            const otra = (await (await pedir(tokens[1])).json()).data;
            assert.deepEqual(
                otra.map((l) => l.id_libro),
                [otroAjeno]
            );
        });
        await t.test('pendientes, canceladas y reembolsadas no generan nuevas afinidades', async () => {
            for (const estado of ['pendiente', 'cancelada', 'reembolsada']) {
                await pool.query('UPDATE ventas SET estado=? WHERE id_venta=?', [estado, pendiente]);
                const data = (await (await pedir(tokens[0])).json()).data;
                assert.ok(data.every((l) => ![ajeno, otroAjeno].includes(l.id_libro)));
            }
        });
        await t.test('la afinidad se actualiza cuando el servidor confirma una compra', async () => {
            await pool.query("UPDATE ventas SET estado='pagada' WHERE id_venta=?", [pendiente]);
            const data = (await (await pedir(tokens[0])).json()).data;
            assert.ok(data.some((l) => l.id_libro === otroAjeno));
            assert.ok(data.every((l) => l.id_libro !== ajeno && l.id_libro !== comprado));
        });
        await t.test('respuesta limitada a ocho candidatos sin duplicados', async () => {
            for (let n = 0; n < 12; n++) await crearLibro(autores[0], categorias[0]);
            const data = (await (await pedir(tokens[0])).json()).data;
            assert.equal(data.length, 8);
            assert.equal(new Set(data.map((l) => l.id_libro)).size, 8);
        });
        await t.test('sin compras confirmadas devuelve una lista vacía', async () => {
            for (const id of ventas) await pool.query("UPDATE ventas SET estado='cancelada' WHERE id_venta=?", [id]);
            assert.deepEqual((await (await pedir(tokens[0])).json()).data, []);
        });
    } finally {
        for (const id of ventas) await pool.query('DELETE FROM ventas WHERE id_venta=?', [id]);
        for (const id of libros) {
            await pool.query('DELETE FROM inventario WHERE id_libro=?', [id]);
            await pool.query('DELETE FROM libros WHERE id_libro=?', [id]);
        }
        for (const id of usuarios) await pool.query('DELETE FROM usuarios WHERE id_usuario=?', [id]);
        for (const id of autores) await pool.query('DELETE FROM autores WHERE id_autor=?', [id]);
        for (const id of categorias) await pool.query('DELETE FROM categorias WHERE id_categoria=?', [id]);
        await pool.end();
    }
});
