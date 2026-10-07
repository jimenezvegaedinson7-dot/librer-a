const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const pool = require('../src/config/database');
const { aplicarMigracionesDatos } = require('../src/config/migraciones');

const ARCHIVO = '041_backfill_entrega_ventas_canceladas.sql';
const silencio = { log() {}, error() {} };

test('041: backfill de entrega en ventas canceladas (PostgreSQL real)', async (t) => {
    assert.equal(process.env.NODE_ENV, 'test');
    assert.match(process.env.DATABASE_URL, /@127\.0\.0\.1:/);
    const ids = { usuario: null, autor: null, categoria: null, libro: null, ventas: [] };
    const sufijo = randomUUID().slice(0, 8);
    try {
        const [[usuario]] = await pool.query(`INSERT INTO usuarios (nombre, apellido, email, password, rol, estado)
            VALUES ('Backfill','Prueba',?, 'x', 'cliente', 1) RETURNING id_usuario`, [`backfill-${sufijo}@example.test`]);
        ids.usuario = usuario.id_usuario;
        ids.autor = (await pool.query(`INSERT INTO autores (nombre, apellido) VALUES ('Autor', ?) RETURNING id_autor`, [sufijo]))[0][0].id_autor;
        ids.categoria = (await pool.query(`INSERT INTO categorias (nombre) VALUES (?) RETURNING id_categoria`, [`Backfill ${sufijo}`]))[0][0].id_categoria;
        ids.libro = (await pool.query(`INSERT INTO libros (titulo, precio, stock, id_autor, id_categoria, estado)
            VALUES (?, 40, 7, ?, ?, 1) RETURNING id_libro`, [`Libro backfill ${sufijo}`, ids.autor, ids.categoria]))[0][0].id_libro;
        await pool.query('INSERT INTO inventario (id_libro, stock, stock_minimo) VALUES (?, 7, 1)', [ids.libro]);

        // Casos pedidos: estado de la venta + estado de la entrega.
        const casos = [
            { nombre: 'cancelada + pendiente', estado: 'cancelada', entrega: 'pendiente', tipo: 'tienda', esperado: 'cancelado' },
            { nombre: 'cancelada + preparando', estado: 'cancelada', entrega: 'preparando', tipo: 'tienda', esperado: 'cancelado' },
            { nombre: 'cancelada + en_camino (domicilio)', estado: 'cancelada', entrega: 'en_camino', tipo: 'domicilio', esperado: 'cancelado' },
            { nombre: 'cancelada + cancelado', estado: 'cancelada', entrega: 'cancelado', tipo: 'tienda', esperado: 'cancelado' },
            { nombre: 'cancelada + entregado', estado: 'cancelada', entrega: 'entregado', tipo: 'tienda', esperado: 'entregado' },
            { nombre: 'pagada + pendiente', estado: 'pagada', entrega: 'pendiente', tipo: 'tienda', esperado: 'pendiente' },
        ];
        for (const caso of casos) {
            const [[venta]] = await pool.query(`INSERT INTO ventas (id_usuario, total, estado, estado_entrega, tipo_entrega, payu_payment_status, external_reference)
                VALUES (?, 40, ?, ?, ?, ?, ?) RETURNING id_venta`,
            [ids.usuario, caso.estado, caso.entrega, caso.tipo, caso.estado === 'pagada' ? 'APPROVED' : 'DECLINED', `BF-${sufijo}-${caso.entrega}-${caso.estado}`]);
            caso.id = venta.id_venta;
            ids.ventas.push(venta.id_venta);
        }

        const pagosAntes = (await pool.query('SELECT id_venta, estado, payu_payment_status, total FROM ventas WHERE id_venta = ANY(?) ORDER BY id_venta', [ids.ventas]))[0];
        const historialAntes = Number((await pool.query('SELECT COUNT(*)::int AS n FROM historial_operaciones'))[0][0].n);
        await pool.query('DELETE FROM migraciones_datos WHERE nombre = ?', [ARCHIVO]).catch(() => {});

        await t.test('primera aplicación corrige solo las canceladas no entregadas y queda registrada', async () => {
            const [resultado] = await aplicarMigracionesDatos(pool, { registro: silencio });
            assert.equal(resultado.nombre, ARCHIVO);
            assert.equal(resultado.aplicada, true);
            assert.ok(resultado.filas >= 3, `se esperaban al menos 3 filas, hubo ${resultado.filas}`);
            for (const caso of casos) {
                const [[fila]] = await pool.query('SELECT estado_entrega FROM ventas WHERE id_venta = ?', [caso.id]);
                assert.equal(fila.estado_entrega, caso.esperado, caso.nombre);
            }
            const [[registro]] = await pool.query('SELECT filas FROM migraciones_datos WHERE nombre = ?', [ARCHIVO]);
            assert.equal(Number(registro.filas), resultado.filas);
        });

        await t.test('no toca pagos, stock ni historial', async () => {
            const pagosDespues = (await pool.query('SELECT id_venta, estado, payu_payment_status, total FROM ventas WHERE id_venta = ANY(?) ORDER BY id_venta', [ids.ventas]))[0];
            assert.deepEqual(pagosDespues, pagosAntes);
            const [[inv]] = await pool.query('SELECT stock FROM inventario WHERE id_libro = ?', [ids.libro]);
            assert.equal(Number(inv.stock), 7);
            const historialDespues = Number((await pool.query('SELECT COUNT(*)::int AS n FROM historial_operaciones'))[0][0].n);
            assert.equal(historialDespues, historialAntes);
        });

        await t.test('es idempotente: el ejecutor no la repite y el SQL repetido no cambia filas', async () => {
            const [segunda] = await aplicarMigracionesDatos(pool, { registro: silencio });
            assert.deepEqual(segunda, { nombre: ARCHIVO, aplicada: false, filas: 0 });
            const sql = readFileSync(path.join(__dirname, '../database/migrations', ARCHIVO), 'utf8');
            const [filas] = await pool.query(sql);
            assert.equal(filas.length, 0);
        });
    } finally {
        if (ids.ventas.length) await pool.query('DELETE FROM ventas WHERE id_venta = ANY(?)', [ids.ventas]);
        if (ids.libro) { await pool.query('DELETE FROM inventario WHERE id_libro = ?', [ids.libro]); await pool.query('DELETE FROM libros WHERE id_libro = ?', [ids.libro]); }
        if (ids.categoria) await pool.query('DELETE FROM categorias WHERE id_categoria = ?', [ids.categoria]);
        if (ids.autor) await pool.query('DELETE FROM autores WHERE id_autor = ?', [ids.autor]);
        if (ids.usuario) await pool.query('DELETE FROM usuarios WHERE id_usuario = ?', [ids.usuario]);
        await pool.query('DELETE FROM migraciones_datos WHERE nombre = ?', [ARCHIVO]).catch(() => {});
    }
});
