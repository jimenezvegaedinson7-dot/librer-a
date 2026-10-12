const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');

test('cancelaciones coordinan pago, stock, seguimiento y devolución', async t => {
    assert.equal(process.env.NODE_ENV, 'test');
    const base = process.env.TEST_BASE_URL;
    assert.match(base, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
    let admin, cliente, autor, categoria, libro;
    const token = id => jwt.sign({ id_usuario: id }, process.env.JWT_SECRET);
    const pedir = async (ruta, credencial, method = 'GET', body) => {
        const r = await fetch(base + '/api' + ruta, { method,
            headers: { ...(credencial ? { Authorization: `Bearer ${credencial}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
            body: body ? JSON.stringify(body) : undefined });
        return { status: r.status, json: await r.json() };
    };
    const stock = async () => Number((await pool.query('SELECT stock FROM inventario WHERE id_libro=?', [libro]))[0][0].stock);
    const venta = async id => (await pool.query('SELECT * FROM ventas WHERE id_venta=?', [id]))[0][0];
    const crear = async (canal = 'app', cantidad = 1) => {
        const cuerpo = { canal_compra: canal, tipo_entrega: 'tienda', items: [{ id_libro: libro, cantidad }], idempotencia_clave: randomUUID() };
        const respuesta = await pedir('/pagos/crear-orden', token(cliente), 'POST', cuerpo);
        assert.equal(respuesta.status, 201, JSON.stringify(respuesta.json));
        return { ...respuesta.json.data, cuerpo };
    };
    const aprobar = async (orden, estadoPol = '4') => {
        const value = Number(orden.total).toFixed(2);
        const sign = createHash('md5').update(`${process.env.PAYU_API_KEY}~${process.env.PAYU_MERCHANT_ID}~${orden.order_id}~${Number(value).toFixed(1)}~PEN~${estadoPol}`).digest('hex');
        const r = await pedir('/pagos/webhook', null, 'POST', { reference_sale: orden.order_id, value, currency: 'PEN', state_pol: estadoPol, sign,
            merchant_id: process.env.PAYU_MERCHANT_ID, transaction_id: randomUUID(), reference_pol: randomUUID() });
        assert.equal(r.status, 200, JSON.stringify(r.json));
    };
    try {
        for (const rol of ['administrador', 'cliente']) {
            const [u] = await pool.query("INSERT INTO usuarios(nombre,apellido,email,password,rol,email_verified_at) VALUES ('Cancelación','Prueba',?,'no-login',?,NOW())", [`${randomUUID()}@example.test`, rol]);
            if (rol === 'administrador') admin = u.insertId; else cliente = u.insertId;
        }
        const [a] = await pool.query("INSERT INTO autores(nombre,apellido) VALUES ('Cancelación','Autor')"); autor = a.insertId;
        const [c] = await pool.query('INSERT INTO categorias(nombre) VALUES (?)', [`Cancelación-${randomUUID()}`]); categoria = c.insertId;
        const [l] = await pool.query('INSERT INTO libros(titulo,precio,id_autor,id_categoria) VALUES (?,25,?,?)', [`Libro ${randomUUID()}`, autor, categoria]); libro = l.insertId;
        await pool.query('INSERT INTO inventario(id_libro,stock,stock_minimo) VALUES (?,5,1)', [libro]);
        t.beforeEach(async () => {
            await pool.query('UPDATE inventario SET stock=5 WHERE id_libro=?', [libro]);
        });

        for (const canal of ['app', 'web']) await t.test(`${canal}: cancelar sin pago cierra compra y libera stock exactamente una vez`, async () => {
            const orden = await crear(canal, 2);
            if (canal === 'web') await aprobar(orden, '7');
            assert.equal(await stock(), 3);
            const cancelada = await pedir(`/pedidos/${orden.id_venta}/estado`, token(admin), 'PUT', { estado: 'cancelado' });
            assert.equal(cancelada.status, 200, JSON.stringify(cancelada.json));
            assert.equal(cancelada.json.data.estado, 'cancelada');
            assert.equal((await venta(orden.id_venta)).estado_entrega, 'cancelado');
            assert.equal(await stock(), 5);
            const repetida = await pedir(`/pedidos/${orden.id_venta}/estado`, token(admin), 'PUT', { estado: 'cancelado' });
            assert.equal(repetida.status, 400);
            assert.equal(await stock(), 5);
            const recuperada = await pedir('/pagos/crear-orden', token(cliente), 'POST', orden.cuerpo);
            assert.equal(recuperada.status, 200);
            assert.equal(recuperada.json.data.id_venta, orden.id_venta);
            assert.equal(recuperada.json.data.checkout_url, null);
            assert.equal(recuperada.json.data.status, 'DECLINED');
            const pago = await pedir(`/ventas/${orden.id_venta}/pago`, token(cliente));
            assert.equal(pago.json.data.checkout_url, null);
            const html = await (await fetch(orden.checkout_url)).text();
            assert.doesNotMatch(html, /id="payu-form"/);
            const compras = (await pedir('/ventas/mis-ventas', token(cliente))).json.data;
            assert.equal(compras.find(v => v.id_venta === orden.id_venta).estado, 'cancelada');
        });

        await t.test('dos cancelaciones concurrentes no duplican la devolución de existencias', async () => {
            const orden = await crear();
            const respuestas = await Promise.all([1, 2].map(() => pedir(`/pedidos/${orden.id_venta}/estado`, token(admin), 'PUT', { estado: 'cancelado' })));
            assert.deepEqual(respuestas.map(r => r.status).sort(), [200, 400]);
            assert.equal(await stock(), 5);
        });

        await t.test('aprobación tardía conserva cancelación, marca revisión y no aparta stock nuevamente', async () => {
            const orden = await crear();
            await pedir(`/pedidos/${orden.id_venta}/estado`, token(admin), 'PUT', { estado: 'cancelado' });
            await aprobar(orden);
            const actual = await venta(orden.id_venta);
            assert.equal(actual.estado, 'cancelada');
            assert.equal(actual.pago_revision_motivo, 'aprobacion_tardia');
            assert.equal(await stock(), 5);
            const recuperar = await pedir('/pagos/crear-orden', token(cliente), 'POST', orden.cuerpo);
            assert.equal(recuperar.json.data.status, 'REVISION');
            assert.equal(recuperar.json.data.checkout_url, null);
        });

        await t.test('webhook y cancelación simultáneos conservan el cobro o marcan revisión sin duplicar stock', async () => {
            const orden = await crear();
            const [cancelacion] = await Promise.all([
                pedir(`/pedidos/${orden.id_venta}/estado`, token(admin), 'PUT', { estado: 'cancelado' }),
                aprobar(orden),
            ]);
            assert.equal(cancelacion.status, 200, JSON.stringify(cancelacion.json));
            const actual = await venta(orden.id_venta);
            assert.equal(actual.estado_entrega, 'cancelado');
            assert.equal(actual.payu_payment_status, 'APPROVED');
            if (actual.estado === 'pagada') {
                assert.equal(await stock(), 4);
                assert.equal(actual.pago_revision_motivo, null);
            } else {
                assert.equal(actual.estado, 'cancelada');
                assert.equal(await stock(), 5);
                assert.equal(actual.pago_revision_motivo, 'aprobacion_tardia');
            }
        });

        await t.test('un fallo de kardex revierte cancelación y stock; el reintento confirma una sola devolución', async () => {
            const orden = await crear();
            const nombre = `fallo_cancelacion_${randomUUID().replaceAll('-', '')}`;
            await pool.query(`CREATE FUNCTION ${nombre}() RETURNS trigger AS $$
                BEGIN
                    IF NEW.id_libro = ${Number(libro)} AND NEW.motivo = 'cancelacion_venta' THEN
                        RAISE EXCEPTION 'Fallo de kardex de prueba';
                    END IF;
                    RETURN NEW;
                END;
            $$ LANGUAGE plpgsql`);
            try {
                await pool.query(`CREATE TRIGGER ${nombre} BEFORE INSERT ON movimientos_inventario FOR EACH ROW EXECUTE FUNCTION ${nombre}()`);
                const fallida = await pedir(`/pedidos/${orden.id_venta}/estado`, token(admin), 'PUT', { estado: 'cancelado' });
                assert.equal(fallida.status, 500);
                assert.equal((await venta(orden.id_venta)).estado, 'pendiente');
                assert.equal((await venta(orden.id_venta)).estado_entrega, 'pendiente');
                assert.equal(await stock(), 4);
            } finally {
                await pool.query(`DROP TRIGGER IF EXISTS ${nombre} ON movimientos_inventario`);
                await pool.query(`DROP FUNCTION ${nombre}()`);
            }
            assert.equal((await pedir(`/pedidos/${orden.id_venta}/estado`, token(admin), 'PUT', { estado: 'cancelado' })).status, 200);
            assert.equal(await stock(), 5);
        });

        await t.test('cancelar entrega pagada conserva cobro y stock; la devolución sigue su proceso separado', async () => {
            const orden = await crear();
            await aprobar(orden);
            const cancelada = await pedir(`/pedidos/${orden.id_venta}/estado`, token(admin), 'PUT', { estado: 'cancelado' });
            assert.equal(cancelada.status, 200);
            assert.equal(cancelada.json.data.estado, 'pagada');
            assert.equal(await stock(), 4);
            const solicitar = await pedir(`/ventas/${orden.id_venta}/reembolso`, token(admin), 'POST', { accion: 'solicitar', motivo: 'No se recogió la compra' });
            assert.equal(solicitar.status, 200, JSON.stringify(solicitar.json));
            assert.equal(await stock(), 4);
            const confirmar = await pedir(`/ventas/${orden.id_venta}/reembolso`, token(admin), 'POST', {
                accion: 'confirmar', motivo: 'No se recogió la compra', referencia_reembolso: 'REF-PRUEBA', evidencia_reembolso: 'https://example.test/evidencia', devolver_stock: true,
            });
            assert.equal(confirmar.status, 200, JSON.stringify(confirmar.json));
            assert.equal((await venta(orden.id_venta)).estado, 'reembolsada');
            assert.equal(await stock(), 5);
        });
    } finally {
        if (libro) await pool.query('DELETE FROM movimientos_inventario WHERE id_libro=?', [libro]);
        if (cliente) await pool.query('DELETE FROM ventas WHERE id_usuario=?', [cliente]);
        if (admin) await pool.query('DELETE FROM historial_operaciones WHERE id_usuario=?', [admin]);
        for (const id of [admin, cliente]) if (id) await pool.query('DELETE FROM usuarios WHERE id_usuario=?', [id]);
        if (libro) { await pool.query('DELETE FROM inventario WHERE id_libro=?', [libro]); await pool.query('DELETE FROM libros WHERE id_libro=?', [libro]); }
        if (autor) await pool.query('DELETE FROM autores WHERE id_autor=?', [autor]);
        if (categoria) await pool.query('DELETE FROM categorias WHERE id_categoria=?', [categoria]);
        await pool.end();
    }
});
