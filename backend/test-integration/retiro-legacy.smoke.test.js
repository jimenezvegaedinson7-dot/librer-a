const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');
const ventas = require('../src/models/venta.model');
const reservas = require('../src/models/reserva.model');
const comprobantes = require('../src/models/comprobante.model');

// Los avisos por correo se envían en segundo plano: antes de contar se espera
// a que el buzón de prueba deje de recibir (o a que llegue la cantidad pedida).
const correosEnBuzon = async () => (await (await fetch(process.env.SMTP_TEST_URL)).json()).mensajes.length;
async function correosEstables({ hasta = null, maximoMs = 8000 } = {}) {
    let previo = await correosEnBuzon(), quietos = 0;
    for (const inicio = Date.now(); Date.now() - inicio < maximoMs;) {
        await new Promise(r => setTimeout(r, 150));
        const actual = await correosEnBuzon();
        quietos = actual === previo ? quietos + 1 : 0;
        previo = actual;
        if ((hasta === null || actual >= hasta) && quietos >= 4) break;
    }
    return previo;
}

test('retiro legacy: HTTP + PostgreSQL desechable + SMTP local', async t => {
    assert.equal(process.env.NODE_ENV, 'test');
    assert.match(process.env.DATABASE_URL, /@127\.0\.0\.1:\d+\/audit$/);
    const usuarios = [], libros = [], ventaIds = [];
    const inesperados = [];
    let autor, categoria, admin, cliente;
    const http = async (ruta, body, method = body === undefined ? 'GET' : 'POST', token = admin, esperado500 = false) => {
        const res = await fetch(`${process.env.TEST_BASE_URL}/api${ruta}`, { method,
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body) });
        const data = await res.json();
        if (res.status >= 500 && !esperado500) inesperados.push({ ruta, status: res.status });
        return { status: res.status, body: data };
    };
    const fila = async id => (await pool.query('SELECT * FROM ventas WHERE id_venta=?', [id]))[0][0];
    const stock = async () => Number((await pool.query('SELECT stock FROM inventario WHERE id_libro=?', [libros[0]]))[0][0].stock);
    const conteoVentas = async () => Number((await pool.query('SELECT count(*) AS n FROM ventas WHERE id_usuario=?', [usuarios[1]]))[0][0].n);
    const snapshot = async id => ({ venta: await fila(id), stock: await stock(),
        comprobantes: (await pool.query('SELECT * FROM comprobantes WHERE id_venta=? ORDER BY id_comprobante', [id]))[0],
        movimientos: (await pool.query('SELECT * FROM movimientos_inventario WHERE id_libro=? ORDER BY id_movimiento', [libros[0]]))[0] });
    const seedReserva = async estado => {
        const [r] = await pool.query('INSERT INTO reservas(id_usuario,id_libro,cantidad,estado,fecha_vencimiento) VALUES (?,?,1,?,CURRENT_DATE+7)',
            [usuarios[1], libros[0], estado]);
        await pool.query('UPDATE inventario SET stock=stock-1 WHERE id_libro=?', [libros[0]]);
        return r.insertId;
    };
    const crear = async (tipo = 'tienda', aprobar = true) => {
        const ref = randomUUID();
        const v = await ventas.crear({ id_usuario: usuarios[1], detalles: [{ id_libro: libros[0], cantidad: 1 }],
            tipo_entrega: tipo, external_reference: ref, canal_compra: 'web', correo_compra: 'entrega-audit@example.test' });
        ventaIds.push(v.id_venta);
        if (aprobar) {
            const tx = randomUUID();
            const body = { merchant_id: process.env.PAYU_MERCHANT_ID, reference_sale: ref, value: '25.00', currency: 'PEN',
                state_pol: '4', transaction_id: tx, reference_pol: randomUUID() };
            body.sign = createHash('md5').update(`${process.env.PAYU_API_KEY}~${body.merchant_id}~${ref}~25.0~PEN~4`).digest('hex');
            assert.equal((await http('/pagos/webhook', body)).status, 200);
        }
        return v.id_venta;
    };
    const mover = (id, estado) => http(`/pedidos/${id}/estado`, { estado }, 'PUT');
    const solicitar = id => http(`/ventas/${id}/reembolso`, { accion: 'solicitar', motivo: 'Devolución solicitada por el cliente' });
    const confirmar = (id, extra = {}, esperado500 = false) => http(`/ventas/${id}/reembolso`, {
        accion: 'confirmar', motivo: 'Devolución verificada en panel PayU', referencia_reembolso: `refund-${id}`,
        evidencia_reembolso: `Comprobante de devolución PayU verificado por administrador, operación refund-${id}.`, ...extra
    }, 'POST', admin, esperado500);
    try {
        for (const rol of ['administrador', 'cliente']) {
            const [u] = await pool.query("INSERT INTO usuarios(nombre,apellido,email,password,rol,email_verified_at) VALUES ('Retiro','Audit',?,'fake',?,NOW())", [randomUUID()+'@example.test', rol]);
            usuarios.push(u.insertId);
        }
        [admin, cliente] = usuarios.map(id_usuario => jwt.sign({ id_usuario }, process.env.JWT_SECRET));
        autor = (await pool.query("INSERT INTO autores(nombre,apellido) VALUES ('Retiro','Audit')"))[0].insertId;
        categoria = (await pool.query('INSERT INTO categorias(nombre) VALUES (?)', [randomUUID()]))[0].insertId;
        libros.push((await pool.query('INSERT INTO libros(titulo,precio,id_autor,id_categoria) VALUES (?,25,?,?)', [randomUUID(), autor, categoria]))[0].insertId);
        await pool.query('INSERT INTO inventario(id_libro,stock) VALUES (?,100)', [libros[0]]);
        const r = await seedReserva('confirmada');

        await t.test('POST reservas retirado para admin y cliente: ninguna fila, venta ni stock nuevo', async () => {
            const antes = await stock(), n = await conteoVentas();
            const total = Number((await pool.query('SELECT count(*) AS n FROM reservas WHERE id_usuario=?', [usuarios[1]]))[0][0].n);
            for (const token of [admin, cliente]) assert.equal((await http('/reservas', { id_libro: libros[0], cantidad: 1, id_usuario_cliente: usuarios[1] }, 'POST', token)).status, 405);
            assert.equal(await stock(), antes); assert.equal(await conteoVentas(), n);
            assert.equal(Number((await pool.query('SELECT count(*) AS n FROM reservas WHERE id_usuario=?', [usuarios[1]]))[0][0].n), total);
        });
        for (const metodo of ['efectivo', 'yape', 'plin', 'transferencia', 'tarjeta', 'payu']) {
            await t.test(`reserva + ${metodo}: completar bloqueado sin venta`, async () => {
                const n = await conteoVentas(), s = await stock();
                assert.equal((await http(`/reservas/${r}/estado`, { estado: 'completada', metodo_pago: metodo }, 'PUT')).status, 409);
                assert.equal(await conteoVentas(), n); assert.equal(await stock(), s);
                assert.equal((await reservas.obtenerPorId(r)).estado, 'confirmada');
            });
        }
        await t.test('históricos legibles; id_reserva nunca habilita cobro, entrega, comprobante o devolución', async () => {
            assert.equal((await http(`/reservas/${r}`)).status, 200);
            assert.ok((await http('/reservas/mis-reservas', undefined, 'GET', cliente)).body.data.some(v => v.id_reserva === r));
            for (const origen of ['panel', 'reserva']) {
                const [v] = await pool.query("INSERT INTO ventas(id_usuario,total,estado,origen,id_reserva,metodo_pago,tipo_entrega) VALUES (?,25,'pagada',?,?,'efectivo','tienda')", [usuarios[1], origen, r]);
                ventaIds.push(v.insertId);
                assert.equal((await http(`/ventas/${v.insertId}`)).status, 200);
                const antes = await snapshot(v.insertId);
                assert.equal((await solicitar(v.insertId)).status, 409);
                assert.equal((await mover(v.insertId, 'preparando')).status, 409);
                assert.equal((await http(`/ventas/${v.insertId}/comprobante`, { tipo: 'boleta' })).status, 409);
                assert.deepEqual(await snapshot(v.insertId), antes);
                await assert.rejects(ventas.crear({ origen, id_reserva: r }), e => e.status === 409);
            }
        });
        await t.test('cancelación histórica concurrente libera stock exactamente una vez', async () => {
            const antes = await stock();
            const results = await Promise.all([1, 2].map(() => http(`/reservas/${r}`, undefined, 'DELETE', cliente)));
            assert.deepEqual(results.map(v => v.status).sort(), [200, 409]);
            assert.equal(await stock(), antes + 1);
            assert.equal((await http(`/reservas/${r}`, undefined, 'DELETE', cliente)).status, 409);
            assert.equal(await stock(), antes + 1);
            assert.equal((await pool.query("SELECT count(*) AS n FROM movimientos_inventario WHERE id_libro=? AND motivo='cancelacion_reserva'", [libros[0]]))[0][0].n, '1');
        });
        for (const estado of ['pendiente', 'preparando', 'cancelado', 'en_camino', 'listo_recojo']) {
            await t.test(`Ventas no confirma entrega con logística ${estado}`, async () => {
                const id = await crear(estado === 'en_camino' ? 'domicilio' : 'tienda');
                await pool.query('UPDATE ventas SET estado_entrega=? WHERE id_venta=?', [estado, id]);
                const antes = await snapshot(id);
                assert.equal((await http(`/ventas/${id}/estado`, { estado: 'entregada' }, 'PUT')).status, 409);
                await assert.rejects(ventas.actualizarEstado(id, 'entregada'), e => e.status === 409);
                assert.deepEqual(await snapshot(id), antes);
                if (estado === 'cancelado') assert.equal((await mover(id, 'entregado')).status, 400);
            });
        }
        for (const tipo of ['tienda', 'domicilio']) {
            await t.test(`Pedidos ${tipo}: entrega válida sincroniza y notifica una sola vez sin tocar cobro/stock`, async () => {
                const id = await crear(tipo), antes = await fila(id), s = await stock(), n = await conteoVentas();
                assert.equal((await mover(id, 'entregado')).status, 400);
                assert.equal((await mover(id, 'preparando')).status, 200);
                assert.equal((await mover(id, tipo === 'tienda' ? 'listo_recojo' : 'en_camino')).status, 200);
                const correosAntes = await correosEstables();
                const results = await Promise.all([1, 2].map(() => mover(id, 'entregado')));
                assert.deepEqual(results.map(v => v.status).sort(), [200, 400]);
                const despues = await fila(id);
                assert.equal(despues.estado, 'entregada'); assert.equal(despues.estado_entrega, 'entregado');
                for (const campo of ['payu_payment_id', 'payu_order_id', 'payu_payment_status', 'total']) assert.equal(despues[campo], antes[campo]);
                assert.equal(await stock(), s); assert.equal(await conteoVentas(), n);
                assert.equal((await mover(id, 'entregado')).status, 400);
                assert.equal(await correosEstables({ hasta: correosAntes + 1 }), correosAntes + 1);
            });
        }
        for (const extra of [{ metodo_pago: 'efectivo' }, { metodo_pago: 'yape' }, { metodo_pago: 'plin' }, { metodo_pago: 'transferencia' },
            { metodo_pago: 'tarjeta' }, { payu_payment_id: null }, { external_reference: null }, { payu_order_id: null }, { payu_payment_status: 'DECLINED' }]) {
            await t.test(`sin PayU elegible ${JSON.stringify(extra)}: sin efectos parciales`, async () => {
                const id = await crear();
                const [campo, valor] = Object.entries(extra)[0];
                await pool.query(`UPDATE ventas SET ${campo}=? WHERE id_venta=?`, [valor, id]);
                const antes = await snapshot(id);
                assert.equal((await solicitar(id)).status, 409);
                assert.deepEqual(await snapshot(id), antes);
            });
        }
        await t.test('pago asociado a otra venta no se acepta', async () => {
            const a = await crear(), b = await crear();
            await pool.query('UPDATE ventas SET payu_payment_id=? WHERE id_venta=?', [(await fila(a)).payu_payment_id, b]);
            const antes = await snapshot(b);
            assert.equal((await solicitar(b)).status, 409);
            assert.deepEqual(await snapshot(b), antes);
        });
        await t.test('solicitud PayU queda pendiente: sin stock ni comprobante; confirmación exige evidencia', async () => {
            const id = await crear();
            const c = await comprobantes.generarComprobante({ id_venta: id, tipo: 'boleta' });
            const antes = await snapshot(id);
            assert.equal((await solicitar(id)).status, 200);
            const pendiente = await snapshot(id);
            assert.equal(pendiente.venta.estado, 'pagada'); assert.equal(pendiente.venta.estado_reembolso, 'pendiente_verificacion');
            assert.equal(pendiente.venta.reembolso_solicitado_por, usuarios[0]); assert.ok(pendiente.venta.fecha_solicitud_reembolso);
            assert.equal(pendiente.stock, antes.stock); assert.deepEqual(pendiente.comprobantes, antes.comprobantes);
            assert.equal((await mover(id, 'preparando')).status, 409);
            for (const extra of [{ referencia_reembolso: null }, { evidencia_reembolso: null }, { evidencia_reembolso: 'x' }]) {
                assert.equal((await confirmar(id, extra)).status, 422);
                assert.deepEqual(await snapshot(id), pendiente);
            }
            const ok = await confirmar(id);
            assert.equal(ok.status, 200); assert.equal(ok.body.data.dinero_devuelto_por_api, false);
            assert.equal(ok.body.data.verificado_por_payu_api, false);
            assert.equal(ok.body.data.estado_reembolso, 'confirmado');
            const final = await snapshot(id);
            assert.equal(final.venta.estado, 'reembolsada'); assert.equal(final.venta.reembolso_confirmado_por, usuarios[0]);
            assert.ok(final.venta.fecha_reembolso); assert.equal(final.stock, antes.stock + 1);
            assert.equal(final.comprobantes.find(v => v.id_comprobante === c.id_comprobante).estado, 'anulado');
            assert.equal((await confirmar(id)).status, 409); assert.deepEqual(await snapshot(id), final);
            assert.equal((await pool.query("SELECT count(*) AS n FROM historial_operaciones WHERE id_usuario=? AND descripcion LIKE ?", [usuarios[0], `%venta #${id} confirmada documentalmente%`]))[0][0].n, '1');
        });
        await t.test('error durante anulación revierte estado, stock, kardex y comprobante; reintento no duplica', async () => {
            const id = await crear();
            await comprobantes.generarComprobante({ id_venta: id, tipo: 'boleta' }); await solicitar(id);
            const antes = await snapshot(id), nombre = `fault_${randomUUID().replaceAll('-', '')}`;
            await pool.query(`CREATE FUNCTION ${nombre}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fallo desechable deliberado'; END $$`);
            await pool.query(`CREATE TRIGGER ${nombre} BEFORE UPDATE ON comprobantes FOR EACH ROW WHEN (OLD.id_venta=${id}) EXECUTE FUNCTION ${nombre}()`);
            try { assert.equal((await confirmar(id, {}, true)).status, 500); assert.deepEqual(await snapshot(id), antes); }
            finally { await pool.query(`DROP TRIGGER ${nombre} ON comprobantes`); await pool.query(`DROP FUNCTION ${nombre}()`); }
            const results = await Promise.all([confirmar(id), confirmar(id)]);
            assert.deepEqual(results.map(v => v.status).sort(), [200, 409]);
            assert.equal(await stock(), antes.stock + 1);
        });
        await t.test('aprobación tardía devuelve dinero documentalmente pero no restaura stock dos veces', async () => {
            const id = await crear('tienda', false);
            await ventas.actualizarEstado(id, 'cancelada');
            const ref = (await fila(id)).external_reference;
            await ventas.aplicarPago({ externalReference: ref, payuOrderId: randomUUID(), payuPaymentId: randomUUID(), payuPaymentStatus: 'APPROVED', monto: 25, moneda: 'PEN' });
            const antes = await stock();
            assert.equal((await solicitar(id)).status, 200);
            assert.equal((await confirmar(id, { devolver_stock: true })).status, 200);
            assert.equal(await stock(), antes);
        });
        await t.test('migración 040 repetible no reescribe el historial', async () => {
            const antes = (await pool.query('SELECT * FROM ventas WHERE id_usuario=? ORDER BY id_venta', [usuarios[1]]))[0];
            const sql = readFileSync(path.join(__dirname, '../database/migrations/040_devoluciones_payu.sql'), 'utf8');
            await pool.query(sql); await pool.query(sql);
            assert.deepEqual((await pool.query('SELECT * FROM ventas WHERE id_usuario=? ORDER BY id_venta', [usuarios[1]]))[0], antes);
        });
        await t.test('ningún 5xx inesperado en los casos transversales', () => assert.deepEqual(inesperados, []));
    } finally {
        if (usuarios.length) {
            const ph = usuarios.map(() => '?').join(',');
            await pool.query(`DELETE FROM comprobantes WHERE id_venta IN (SELECT id_venta FROM ventas WHERE id_usuario IN (${ph}))`, usuarios);
            await pool.query(`DELETE FROM detalle_venta WHERE id_venta IN (SELECT id_venta FROM ventas WHERE id_usuario IN (${ph}))`, usuarios);
            await pool.query(`DELETE FROM ventas WHERE id_usuario IN (${ph})`, usuarios);
            await pool.query(`DELETE FROM reservas WHERE id_usuario IN (${ph})`, usuarios);
            await pool.query(`DELETE FROM historial_operaciones WHERE id_usuario IN (${ph})`, usuarios);
        }
        for (const id of libros) {
            await pool.query('DELETE FROM movimientos_inventario WHERE id_libro=?', [id]);
            await pool.query('DELETE FROM inventario WHERE id_libro=?', [id]);
            await pool.query('DELETE FROM libros WHERE id_libro=?', [id]);
        }
        if (categoria) await pool.query('DELETE FROM categorias WHERE id_categoria=?', [categoria]);
        if (autor) await pool.query('DELETE FROM autores WHERE id_autor=?', [autor]);
        for (const id of usuarios) await pool.query('DELETE FROM usuarios WHERE id_usuario=?', [id]);
        await pool.end();
    }
});
