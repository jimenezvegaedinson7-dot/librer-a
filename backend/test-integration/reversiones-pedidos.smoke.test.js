const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { randomUUID, createHash } = require('node:crypto');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');
const ventas = require('../src/models/venta.model');
const pagos = require('../src/controllers/pago.controller');

test('reversiones y cancelaciones: stock físico, cierre documental y contratos de pago', async t => {
    assert.equal(process.env.NODE_ENV, 'test');
    assert.match(process.env.DATABASE_URL, /@127\.0\.0\.1:/);
    const base = process.env.TEST_BASE_URL;
    assert.match(base, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
    let admin, cliente, autor, categoria, libro, zona;
    const token = id => jwt.sign({ id_usuario: id }, process.env.JWT_SECRET);
    const pedir = async (ruta, method = 'GET', body, id = admin) => {
        const r = await fetch(base + '/api' + ruta, { method,
            headers: { ...(id ? { Authorization: `Bearer ${token(id)}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
            body: body ? JSON.stringify(body) : undefined });
        return { status: r.status, body: await r.json() };
    };
    const fila = async id => (await pool.query('SELECT * FROM ventas WHERE id_venta=?', [id]))[0][0];
    const stock = async () => Number((await pool.query('SELECT stock FROM inventario WHERE id_libro=?', [libro]))[0][0].stock);
    const entradas = async () => Number((await pool.query("SELECT COUNT(*) AS n FROM movimientos_inventario WHERE id_libro=? AND tipo='entrada'", [libro]))[0][0].n);
    const crear = async (tipo = 'tienda', canal = 'app') => {
        const cuerpo = { canal_compra: canal, tipo_entrega: tipo, items: [{ id_libro: libro, cantidad: 1 }], idempotencia_clave: randomUUID(),
            ...(tipo === 'domicilio' ? { id_zona_delivery: zona, direccion: 'Dirección desechable Pallasca' } : {}) };
        const r = await pedir('/pagos/crear-orden', 'POST', cuerpo, cliente);
        assert.equal(r.status, 201, JSON.stringify(r.body));
        return { ...r.body.data, cuerpo, tx: randomUUID(), payuId: String(100000 + r.body.data.id_venta) };
    };
    const aprobar = async orden => {
        const value = Number(orden.total).toFixed(2);
        const sign = createHash('md5').update(`${process.env.PAYU_API_KEY}~${process.env.PAYU_MERCHANT_ID}~${orden.order_id}~${Number(value).toFixed(1)}~PEN~4`).digest('hex');
        const r = await pedir('/pagos/webhook', 'POST', { reference_sale: orden.order_id, value, currency: 'PEN', state_pol: '4', sign,
            merchant_id: process.env.PAYU_MERCHANT_ID, transaction_id: orden.tx, reference_pol: orden.payuId }, null);
        assert.equal(r.status, 200, JSON.stringify(r.body));
    };
    const mover = (orden, estado) => pedir(`/pedidos/${orden.id_venta}/estado`, 'PUT', { estado });
    const solicitar = orden => pedir(`/ventas/${orden.id_venta}/reembolso`, 'POST', { accion: 'solicitar', motivo: 'Devolución externa documentada' });
    const confirmar = (orden, extra = {}) => pedir(`/ventas/${orden.id_venta}/reembolso`, 'POST', { accion: 'confirmar', motivo: 'Devolución externa documentada',
        referencia_reembolso: `REF-${orden.id_venta}`, evidencia_reembolso: 'https://example.test/comprobante-devolucion', devolver_stock: false, ...extra });
    const revertir = (orden, status, extra = {}) => ventas.aplicarPago({ externalReference: orden.order_id, payuOrderId: orden.payuId,
        payuPaymentId: orden.tx, payuPaymentStatus: status, monto: orden.total, moneda: 'PEN', ...extra });

    // Reports se emula por HTTP local. Controller, servicio, validaciones y SQL
    // son reales; ninguna consulta sale hacia PayU ni usa credenciales reales.
    const consultar = async (orden, status, { caida = false, porId = false, extra = {} } = {}) => {
        const payload = { id: Number(orden.payuId), referenceCode: orden.order_id, status,
            additionalValues: { TX_VALUE: { value: orden.total, currency: 'PEN' } },
            transactions: [{ id: orden.tx, transactionResponse: { state: 'APPROVED' } }], ...extra };
        const upstream = http.createServer((_req, res) => {
            res.writeHead(caida ? 503 : 200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: 'SUCCESS', result: { payload: [payload] } }));
        }).listen(0, '127.0.0.1');
        await new Promise(resolve => upstream.once('listening', resolve));
        const original = global.fetch;
        global.fetch = (url, options) => {
            assert.match(String(url), /^https:\/\/sandbox\.api\.payulatam\.com\/reports-api\//);
            return original(`http://127.0.0.1:${upstream.address().port}/reports`, options);
        };
        try {
            let codigo = 200, body;
            const res = { status(n) { codigo = n; return this; }, json(data) { body = JSON.parse(JSON.stringify(data)); return data; } };
            await pagos.obtenerOrden({ params: { orderId: porId ? orden.payuId : orden.order_id }, usuario: { id_usuario: cliente, rol: 'cliente' } }, res);
            return { status: codigo, body };
        } finally {
            global.fetch = original;
            upstream.closeAllConnections();
            await new Promise(resolve => upstream.close(resolve));
        }
    };
    try {
        for (const rol of ['administrador', 'cliente']) {
            const [u] = await pool.query("INSERT INTO usuarios(nombre,apellido,email,password,rol,email_verified_at) VALUES ('Reversión','Prueba',?,'no-login',?,NOW())", [`${randomUUID()}@example.test`, rol]);
            if (rol === 'administrador') admin = u.insertId; else cliente = u.insertId;
        }
        const [a] = await pool.query("INSERT INTO autores(nombre,apellido) VALUES ('Reversión','Autor')"); autor = a.insertId;
        const [c] = await pool.query('INSERT INTO categorias(nombre) VALUES (?)', [`Reversión-${randomUUID()}`]); categoria = c.insertId;
        const [l] = await pool.query('INSERT INTO libros(titulo,precio,id_autor,id_categoria) VALUES (?,25,?,?)', [`Libro ${randomUUID()}`, autor, categoria]); libro = l.insertId;
        await pool.query('INSERT INTO inventario(id_libro,stock,stock_minimo) VALUES (?,5,1)', [libro]);
        const [z] = await pool.query('INSERT INTO zonas_delivery_pallasca(nombre,tarifa,estado) VALUES (?,1,1)', [`Zona ${randomUUID()}`]); zona = z.insertId;
        t.beforeEach(async () => { await pool.query('UPDATE inventario SET stock=5 WHERE id_libro=?', [libro]); });

        for (const paso of ['pendiente', 'preparando', 'en_camino']) for (const devolver of [false, true]) {
            await t.test(`delivery ${paso} → cancelado: confirmación física ${devolver} determina reingreso`, async () => {
                const orden = await crear('domicilio'); await aprobar(orden);
                if (paso !== 'pendiente') assert.equal((await mover(orden, paso)).status, 200);
                assert.equal((await mover(orden, 'cancelado')).status, 200);
                assert.equal((await fila(orden.id_venta)).estado, 'pagada');
                assert.equal(await stock(), 4);
                const n = await entradas();
                assert.equal((await solicitar(orden)).status, 200);
                const r = await confirmar(orden, { devolver_stock: devolver });
                assert.equal(r.status, 200, JSON.stringify(r.body));
                assert.equal(r.body.data.stock_devuelto, devolver);
                assert.equal(await stock(), devolver ? 5 : 4);
                assert.equal(await entradas(), n + Number(devolver));
                assert.equal((await confirmar(orden, { devolver_stock: true })).status, 409);
                assert.equal(await stock(), devolver ? 5 : 4);
            });
        }

        for (const status of ['REFUNDED', 'CHARGED_BACK']) {
            await t.test(`${status}: revisión bloquea preparar y entregar, pero permite cancelar aun con solicitud pendiente`, async () => {
                const orden = await crear(); await aprobar(orden);
                const fecha = (await fila(orden.id_venta)).fecha_pago;
                const r = await consultar(orden, status);
                assert.equal(r.status, 200, JSON.stringify(r.body));
                assert.equal(r.body.data.requiere_revision, true);
                assert.equal(r.body.data.estado_reembolso, null);
                assert.equal(r.body.data.payu_payment_status, status);
                assert.equal(r.body.data.fecha_pago, fecha.toISOString());
                assert.equal((await fila(orden.id_venta)).pago_revision_motivo, 'reversion_payu');
                const pedidos = await pedir('/pedidos');
                const pedido = pedidos.body.data.find(v => v.id_venta === orden.id_venta);
                assert.equal(pedido.pago_revision_motivo, 'reversion_payu');
                assert.equal(pedido.requiere_revision, true);
                assert.equal(pedido.estado_reembolso, null);
                assert.equal(pedido.fecha_pago, fecha.toISOString());
                assert.equal((await mover(orden, 'preparando')).status, 409);
                await assert.rejects(ventas.actualizarEstadoEntrega(orden.id_venta, 'preparando', admin), e => e.status === 409);
                await pool.query("UPDATE ventas SET estado_entrega='listo_recojo' WHERE id_venta=?", [orden.id_venta]);
                assert.equal((await mover(orden, 'entregado')).status, 409);
                // También protege una fila previa sin motivo, por el estado monetario.
                await pool.query('UPDATE ventas SET pago_revision_motivo=NULL WHERE id_venta=?', [orden.id_venta]);
                await assert.rejects(ventas.actualizarEstadoEntrega(orden.id_venta, 'entregado', admin), e => e.status === 409);
                assert.equal((await solicitar(orden)).status, 200);
                assert.equal((await mover(orden, 'cancelado')).status, 200);
                assert.equal(await stock(), 4);
                assert.equal((await confirmar(orden)).status, 200);
                assert.equal(await stock(), 5);
            });

            for (const antes of [false, true]) await t.test(`${status}: aprobación tardía cierra documentalmente sin duplicar stock (solicitud previa ${antes})`, async () => {
                const orden = await crear('domicilio', 'web');
                assert.equal((await mover(orden, 'cancelado')).status, 200);
                await aprobar(orden);
                const actual = await fila(orden.id_venta), n = await entradas();
                const aprobadaSinReports = await consultar(orden, 'APPROVED', { caida: true });
                const reintentoAprobada = await pedir('/pagos/crear-orden', 'POST', orden.cuerpo, cliente);
                for (const respuesta of [aprobadaSinReports, reintentoAprobada]) {
                    assert.equal(respuesta.status, 200, JSON.stringify(respuesta.body));
                    assert.equal(respuesta.body.data.status, 'REVISION');
                    assert.equal(respuesta.body.data.estado_venta, 'cancelada');
                    assert.equal(respuesta.body.data.requiere_revision, true);
                    assert.equal(respuesta.body.data.pago_revision_motivo, 'aprobacion_tardia');
                    assert.equal(respuesta.body.data.fecha_pago, actual.fecha_pago.toISOString());
                    assert.equal(respuesta.body.data.estado_reembolso, null);
                }
                if (antes) assert.equal((await solicitar(orden)).status, 200);
                const r = await consultar(orden, status);
                assert.equal(r.status, 200, JSON.stringify(r.body));
                assert.equal(r.body.data.status, 'REVISION');
                assert.equal(r.body.data.pago_revision_motivo, 'aprobacion_tardia');
                assert.equal(r.body.data.requiere_revision, true);
                assert.equal(r.body.data.fecha_pago, actual.fecha_pago.toISOString());
                assert.equal(r.body.data.estado_reembolso, antes ? 'pendiente_verificacion' : null);
                assert.equal((await fila(orden.id_venta)).pago_revision_fecha.toISOString(), actual.pago_revision_fecha.toISOString());
                if (!antes) assert.equal((await solicitar(orden)).status, 200);
                const sinEvidencia = await confirmar(orden, { evidencia_reembolso: null });
                assert.equal(sinEvidencia.status, 422);
                assert.equal(await stock(), 5);
                const recuperada = await pedir('/pagos/crear-orden', 'POST', orden.cuerpo, cliente);
                const consultaCaida = await consultar(orden, status, { caida: true, porId: true });
                for (const respuesta of [recuperada, consultaCaida]) {
                    assert.equal(respuesta.status, 200, JSON.stringify(respuesta.body));
                    assert.equal(respuesta.body.data.status, 'REVISION');
                    assert.equal(respuesta.body.data.requiere_revision, true);
                    assert.equal(respuesta.body.data.pago_revision_motivo, 'aprobacion_tardia');
                    assert.equal(respuesta.body.data.estado_reembolso, 'pendiente_verificacion');
                    assert.equal(respuesta.body.data.fecha_pago, actual.fecha_pago.toISOString());
                }
                assert.equal(recuperada.body.data.checkout_url, null);
                assert.doesNotMatch(await (await fetch(orden.checkout_url)).text(), /id="payu-form"/);
                const confirmarDos = await Promise.all([confirmar(orden, { devolver_stock: true }), confirmar(orden, { devolver_stock: true })]);
                assert.deepEqual(confirmarDos.map(v => v.status).sort(), [200, 409]);
                assert.equal(await stock(), 5);
                assert.equal(await entradas(), n);
                const cerrada = await fila(orden.id_venta);
                assert.equal(cerrada.estado, 'reembolsada');
                assert.equal(cerrada.estado_reembolso, 'confirmado');
                assert.equal(cerrada.pago_revision_motivo, null);
                await revertir(orden, status);
                const final = await consultar(orden, status, { caida: true });
                assert.equal(final.body.data.status, 'REFUNDED');
                assert.equal(final.body.data.requiere_revision, false);
                assert.equal(await entradas(), n);
            });

            await t.test(`${status}: importes, moneda, referencia y transacción incorrectos no alteran el cobro`, async () => {
                const orden = await crear(); await aprobar(orden);
                const antes = await fila(orden.id_venta), n = await entradas();
                for (const extra of [{ monto: 99 }, { moneda: 'USD' }, { reportedReference: 'otra-venta' },
                    { payuOrderId: 'otro-order' }, { payuPaymentId: 'otra-transaccion' }]) {
                    await assert.rejects(revertir(orden, status, extra), e => e.status === 409);
                    assert.deepEqual(await fila(orden.id_venta), antes);
                    assert.equal(await stock(), 4);
                    assert.equal(await entradas(), n);
                }
            });
        }

        await t.test('una revisión no monetaria también bloquea el avance sin impedir cancelación', async () => {
            const orden = await crear(); await aprobar(orden);
            await pool.query("UPDATE ventas SET pago_revision_motivo='reversion_payu' WHERE id_venta=?", [orden.id_venta]);
            assert.equal((await mover(orden, 'preparando')).status, 409);
            await assert.rejects(ventas.actualizarEstadoEntrega(orden.id_venta, 'preparando', admin), e => e.status === 409);
            assert.equal((await mover(orden, 'cancelado')).status, 200);
            assert.equal(await stock(), 4);
        });

        await t.test('FOR UPDATE revalida una reversión confirmada mientras el avance espera el bloqueo', async () => {
            const orden = await crear(); await aprobar(orden);
            const lock = await pool.getConnection();
            let avance;
            try {
                await lock.beginTransaction();
                await lock.query('SELECT id_venta FROM ventas WHERE id_venta=? FOR UPDATE', [orden.id_venta]);
                avance = ventas.actualizarEstadoEntrega(orden.id_venta, 'preparando', admin).then(
                    () => ({ aceptado: true }), error => ({ error }));
                // Esperar al lock real en PostgreSQL, no a un retraso arbitrario.
                let esperando = false;
                for (let i = 0; i < 100; i++) {
                    await lock.query('SELECT pg_stat_clear_snapshot()');
                    const [actividad] = await lock.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%estado_entrega%FOR UPDATE%'");
                    if (actividad.length) { esperando = true; break; }
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
                assert.equal(esperando, true, 'El avance debe esperar el bloqueo de la venta');
                await lock.query("UPDATE ventas SET payu_payment_status='REFUNDED',pago_revision_motivo='reversion_payu' WHERE id_venta=?", [orden.id_venta]);
                await lock.commit();
                const resultado = await avance;
                assert.equal(resultado.error?.status, 409);
                assert.equal((await fila(orden.id_venta)).estado_entrega, 'pendiente');
                assert.equal(await stock(), 4);
            } finally {
                await lock.rollback(); lock.release();
                if (avance) await avance;
            }
        });
    } finally {
        if (libro) await pool.query('DELETE FROM movimientos_inventario WHERE id_libro=?', [libro]);
        if (cliente) await pool.query('DELETE FROM ventas WHERE id_usuario=?', [cliente]);
        if (admin) await pool.query('DELETE FROM historial_operaciones WHERE id_usuario=?', [admin]);
        for (const id of [admin, cliente]) if (id) await pool.query('DELETE FROM usuarios WHERE id_usuario=?', [id]);
        if (libro) { await pool.query('DELETE FROM inventario WHERE id_libro=?', [libro]); await pool.query('DELETE FROM libros WHERE id_libro=?', [libro]); }
        if (autor) await pool.query('DELETE FROM autores WHERE id_autor=?', [autor]);
        if (categoria) await pool.query('DELETE FROM categorias WHERE id_categoria=?', [categoria]);
        if (zona) await pool.query('DELETE FROM zonas_delivery_pallasca WHERE id_zona=?', [zona]);
        await pool.end();
    }
});
