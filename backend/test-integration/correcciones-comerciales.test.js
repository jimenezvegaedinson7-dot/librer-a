const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const pool = require('../src/config/database');
const ventas = require('../src/models/venta.model');
const reservas = require('../src/models/reserva.model');
const comprobantes = require('../src/models/comprobante.model');
const jwt = require('jsonwebtoken');
const { readFileSync } = require('node:fs');
const path = require('node:path');

test('correcciones comerciales: invariantes transaccionales y documentos', async t => {
    assert.equal(process.env.NODE_ENV, 'test');
    assert.match(process.env.DATABASE_URL, /@127\.0\.0\.1:/);
    const ids = { usuarios: [], libros: [], ventas: [], reservas: [] };
    let autor, categoria, razonOriginal;
    const pedir = (ruta, token, method = 'GET', body) => fetch(`${process.env.TEST_BASE_URL}/api${ruta}`, {
        method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    const stock = async id => Number((await pool.query('SELECT stock FROM inventario WHERE id_libro=?', [id]))[0][0].stock);
    const fila = async id => (await pool.query('SELECT * FROM ventas WHERE id_venta=?', [id]))[0][0];
    try {
        await t.test('migraciones nuevas son repetibles y no reescriben registros', async () => {
            const antes = (await pool.query('SELECT id_usuario,email,sesion_version FROM usuarios ORDER BY id_usuario'))[0];
            for (const nombre of ['036_correcciones_negocio.sql', '037_administracion.sql', '038_version_sesion.sql']) {
                const sql = readFileSync(path.join(__dirname, '../database/migrations', nombre), 'utf8');
                await pool.query(sql); await pool.query(sql);
            }
            assert.deepEqual((await pool.query('SELECT id_usuario,email,sesion_version FROM usuarios ORDER BY id_usuario'))[0], antes);
        });
        for (const rol of ['administrador', 'cliente', 'cliente']) {
            const [u] = await pool.query("INSERT INTO usuarios(nombre,apellido,email,password,rol,email_verified_at) VALUES ('Comercial','Test',?,'fake',?,NOW())", [`${randomUUID()}@example.test`, rol]);
            ids.usuarios.push(u.insertId);
        }
        const tokens = ids.usuarios.map(id_usuario => jwt.sign({ id_usuario }, process.env.JWT_SECRET));
        const [a] = await pool.query("INSERT INTO autores(nombre,apellido) VALUES ('Comercial','Test')"); autor = a.insertId;
        const [c] = await pool.query('INSERT INTO categorias(nombre) VALUES (?)', [`Comercial ${randomUUID()}`]); categoria = c.insertId;
        for (let i = 0; i < 2; i++) {
            const [l] = await pool.query('INSERT INTO libros(titulo,precio,id_autor,id_categoria) VALUES (?,10,?,?)', [`Libro ${randomUUID()}`, autor, categoria]);
            ids.libros.push(l.insertId);
            await pool.query('INSERT INTO inventario(id_libro,stock) VALUES (?,100)', [l.insertId]);
        }
        const crear = async (extra = {}) => {
            const { estado, ...datos } = extra;
            const v = await ventas.crear({ id_usuario: ids.usuarios[1], detalles: [{ id_libro: ids.libros[0], cantidad: 1 }], tipo_entrega: 'tienda',
                canal_compra: 'app', external_reference: randomUUID(), ...datos });
            if (estado === 'pagada') await ventas.aplicarPago({ externalReference: (await fila(v.id_venta)).external_reference,
                payuOrderId: randomUUID(), payuPaymentId: randomUUID(), payuPaymentStatus: 'APPROVED', monto: v.total, moneda: 'PEN' });
            ids.ventas.push(v.id_venta); return v.id_venta;
        };
        await t.test('BC01: venta pagada no se cancela bajo bloqueo ni devuelve stock', async () => {
            const id = await crear({ estado: 'pagada' }); const antes = await stock(ids.libros[0]);
            await assert.rejects(ventas.actualizarEstado(id, 'cancelada'), e => e.status === 409);
            assert.equal((await fila(id)).estado, 'pagada'); assert.equal(await stock(ids.libros[0]), antes);
        });
        await t.test('BC02: app pendiente/cancelada/reembolsada no avanza en logística', async () => {
            const id = await crear();
            for (const estado of ['pendiente', 'cancelada', 'reembolsada']) {
                await pool.query('UPDATE ventas SET estado=? WHERE id_venta=?', [estado, id]);
                await assert.rejects(ventas.actualizarEstadoEntrega(id, 'preparando'), e => e.status === 409);
            }
        });
        await t.test('BC03: entrega logística no reingresa stock sin devolución física', async () => {
            const id = await crear({ estado: 'pagada' });
            for (const estado of ['preparando', 'listo_recojo', 'entregado']) await ventas.actualizarEstadoEntrega(id, estado);
            const antes = await stock(ids.libros[0]);
            await ventas.reembolsar(id, { accion: 'solicitar', motivo: 'Devolución solo monetaria', idUsuario: ids.usuarios[0] });
            const resultado = await ventas.reembolsar(id, { motivo: 'Devolución solo monetaria', devolverStock: false,
                idUsuario: ids.usuarios[0], referencia: `refund-${id}`, evidencia: 'Comprobante PayU verificado en panel del proveedor' });
            assert.equal(resultado.stock_devuelto, false); assert.equal(await stock(ids.libros[0]), antes);
            await assert.rejects(ventas.reembolsar(id, { motivo: 'Segundo intento', devolverStock: true }), e => e.status === 409);
        });
        await t.test('BC15: carritos inversos adquieren bloqueos en orden determinista', async () => {
            const a = ids.libros.map(id_libro => ({ id_libro, cantidad: 1 }));
            const resultados = await Promise.all([crear({ detalles: a }), crear({ detalles: [...a].reverse() })]);
            assert.equal(resultados.length, 2);
            assert.deepEqual(ventas.agruparDetalles([...a].reverse()), a);
        });
        await t.test('BC10: total cero revierte venta, stock y kardex', async () => {
            await pool.query('UPDATE libros SET precio=0 WHERE id_libro=?', [ids.libros[1]]);
            const antes = await stock(ids.libros[1]);
            await assert.rejects(crear({ detalles: [{ id_libro: ids.libros[1], cantidad: 1 }] }), /mayor que cero/);
            assert.equal(await stock(ids.libros[1]), antes);
            await pool.query('UPDATE libros SET precio=10 WHERE id_libro=?', [ids.libros[1]]);
        });
        await t.test('BC04/07/13: aplicar pago es atómico, no degrada aprobado y registra fecha una vez', async () => {
            const id = await crear(), ref = (await fila(id)).external_reference;
            const pago = { externalReference: ref, payuOrderId: '100', payuPaymentId: '200', payuPaymentStatus: 'APPROVED', monto: 10, moneda: 'PEN' };
            const a = await ventas.aplicarPago(pago); assert.equal(a.cambio_estado, true);
            const fecha = (await fila(id)).fecha_pago; assert.ok(fecha);
            assert.equal((await ventas.aplicarPago(pago)).cambio_estado, false);
            assert.equal((await ventas.aplicarPago({ ...pago, payuPaymentStatus: 'PENDING' })).ignorado, true);
            assert.equal((await fila(id)).payu_payment_status, 'APPROVED');
            assert.equal(String((await fila(id)).fecha_pago), String(fecha));
            await assert.rejects(ventas.aplicarPago({ ...pago, monto: 99 }), e => e.status === 409);
            await assert.rejects(ventas.aplicarPago({ ...pago, moneda: 'USD' }), e => e.status === 409);
        });
        await t.test('un fallo de BD en webhook no marca duplicado ni confirma la venta', async () => {
            const id = await crear(), ref = (await fila(id)).external_reference;
            const nombre = `audit_pago_${randomUUID().replace(/-/g, '')}`;
            await pool.query(`CREATE FUNCTION ${nombre}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fallo local simulado'; END $$`);
            await pool.query(`CREATE TRIGGER ${nombre} BEFORE UPDATE ON ventas FOR EACH ROW WHEN (OLD.id_venta=${Number(id)}) EXECUTE FUNCTION ${nombre}()`);
            const body = { merchant_id: process.env.PAYU_MERCHANT_ID, reference_sale: ref, value: '10.00', currency: 'PEN', state_pol: '4', transaction_id: randomUUID() };
            body.sign = createHash('md5').update(`${process.env.PAYU_API_KEY}~${body.merchant_id}~${ref}~10.0~PEN~4`).digest('hex');
            try {
                const r = await pedir('/pagos/webhook', null, 'POST', body); assert.equal(r.status, 500);
                assert.equal((await fila(id)).estado, 'pendiente'); assert.equal((await fila(id)).payu_payment_status, null);
            } finally {
                await pool.query(`DROP TRIGGER ${nombre} ON ventas`); await pool.query(`DROP FUNCTION ${nombre}()`);
            }
            const recuperado = await pedir('/pagos/webhook', null, 'POST', body); assert.equal(recuperado.status, 200);
            assert.equal((await fila(id)).estado, 'pagada');
        });
        await t.test('reserva administrativa y suplantación no crean nuevas operaciones', async () => {
            const r = await pedir('/reservas', tokens[0], 'POST', { id_libro: ids.libros[0], cantidad: 1, id_usuario_cliente: ids.usuarios[1] });
            assert.equal(r.status, 405);
            assert.equal((await pedir('/reservas', tokens[1], 'POST', { id_libro: ids.libros[0], cantidad: 1, id_usuario_cliente: ids.usuarios[2] })).status, 405);
            assert.equal((await pedir('/reservas', tokens[0], 'POST', { id_libro: ids.libros[0], cantidad: 1 })).status, 405);
        });
        await t.test('BC08: un libro inactivo no permite apartar stock', async () => {
            const antes = await stock(ids.libros[1]);
            await pool.query('UPDATE libros SET estado=0 WHERE id_libro=?', [ids.libros[1]]);
            await assert.rejects(reservas.crear({ id_usuario: ids.usuarios[1], id_libro: ids.libros[1], cantidad: 1 }), e => e.status === 405);
            assert.equal(await stock(ids.libros[1]), antes);
            await pool.query('UPDATE libros SET estado=1 WHERE id_libro=?', [ids.libros[1]]);
        });
        await t.test('reserva histórica no cobra promociones ni genera comprobante nuevo', async () => {
            const [registro] = await pool.query("INSERT INTO reservas(id_usuario,id_libro,cantidad,estado) VALUES (?,?,1,'confirmada')", [ids.usuarios[1], ids.libros[0]]);
            const r = registro.insertId; ids.reservas.push(r);
            await pool.query('UPDATE libros SET descuento_porcentaje=20 WHERE id_libro=?', [ids.libros[0]]);
            const antes = await stock(ids.libros[0]);
            const obsoleto = await pedir(`/reservas/${r}/estado`, tokens[0], 'PUT', { estado: 'completada', metodo_pago: 'efectivo', precio_unitario_esperado: 10 });
            assert.equal(obsoleto.status, 409); assert.equal((await reservas.obtenerPorId(r)).estado, 'confirmada');
            const bien = await pedir(`/reservas/${r}/estado`, tokens[0], 'PUT', { estado: 'completada', metodo_pago: 'efectivo', precio_unitario_esperado: 8 });
            assert.equal(bien.status, 409); assert.equal(await stock(ids.libros[0]), antes);
            assert.equal((await reservas.obtenerPorId(r)).estado, 'confirmada');
            await pool.query('UPDATE libros SET descuento_porcentaje=NULL WHERE id_libro=?', [ids.libros[0]]);
        });
        await t.test('comprobante conserva emisor y títulos; factura usa el RUC guardado', async () => {
            const id = await crear({ estado: 'pagada', cliente_documento: '20123456789', cliente_tipo_documento: 'RUC', cliente_nombre: 'Empresa Test' });
            const c = await comprobantes.generarComprobante({ id_venta: id, tipo: 'factura' });
            const previo = await comprobantes.obtenerComprobante(c.id_comprobante);
            razonOriginal = (await pool.query('SELECT razon_social FROM empresa LIMIT 1'))[0][0]?.razon_social;
            await pool.query('UPDATE libros SET titulo=? WHERE id_libro=?', ['Nombre posterior', ids.libros[0]]);
            await pool.query('UPDATE empresa SET razon_social=?', ['Emisor posterior']);
            const despues = await comprobantes.obtenerComprobante(c.id_comprobante);
            assert.equal(despues.razon_social, previo.razon_social); assert.deepEqual(despues.detalle, previo.detalle);
            assert.deepEqual(despues.empresa_snapshot, previo.empresa_snapshot);
        });
        await t.test('job recupera una aprobación sin webhook y solo notifica la transición nueva', async () => {
            const id = await crear(), ref = (await fila(id)).external_reference;
            await pool.query("UPDATE ventas SET fecha_venta=NOW()-INTERVAL '40 minutes' WHERE id_venta=?", [id]);
            const original = global.fetch;
            let notificaciones = 0;
            global.fetch = async () => new Response(JSON.stringify({ code: 'SUCCESS', result: { payload: [{
                id: 111, referenceCode: ref, status: 'CAPTURED',
                additionalValues: { TX_VALUE: { value: 10, currency: 'PEN' } },
                transactions: [{ id: 'tx-local', transactionResponse: { state: 'APPROVED' } }]
            }] } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            try {
                await ventas.cancelarOrdenesAbandonadas(30, { alSincronizarPago: () => { notificaciones++; } });
                assert.equal((await fila(id)).estado, 'pagada'); assert.equal(notificaciones, 1);
                await ventas.cancelarOrdenesAbandonadas(30, { alSincronizarPago: () => { notificaciones++; } });
                assert.equal(notificaciones, 1);
            } finally { global.fetch = original; }
        });
        await t.test('boleta superior a S/700 no acepta documentos inventados de formato inválido', async () => {
            const id = await crear({ estado: 'pagada', detalles: [{ id_libro: ids.libros[0], cantidad: 80 }] });
            await assert.rejects(comprobantes.generarComprobante({ id_venta: id, tipo: 'boleta',
                cliente_nombre: 'Cliente Local', cliente_tipo_documento: 'DNI', cliente_dni_ruc: 'x' }), e => e.status === 400);
        });
        await t.test('reportes atribuyen el ingreso al cobro y conservan la creación del pedido', async () => {
            const id = await crear({ estado: 'pagada' });
            await pool.query("UPDATE ventas SET fecha_venta='2020-01-02 12:00:00',fecha_pago='2020-02-03 12:00:00' WHERE id_venta=?", [id]);
            const reportes = require('../src/models/reporte.model');
            const serie = await reportes.obtenerVentasPorDia();
            const dia = serie.find(d => Number(d.dia) === 3 && Number(d.mes_numero) === 2 && Number(d.anio) === 2020);
            assert.ok(dia); assert.equal(Number(dia.total_vendido), 10);
            assert.equal(String((await fila(id)).fecha_venta.toISOString()).slice(0, 10), '2020-01-02');
        });
    } finally {
        if (razonOriginal !== undefined) await pool.query('UPDATE empresa SET razon_social=?', [razonOriginal]);
        if (ids.usuarios.length) {
            const ph = ids.usuarios.map(() => '?').join(',');
            await pool.query(`DELETE FROM comprobantes WHERE id_venta IN (SELECT id_venta FROM ventas WHERE id_usuario IN (${ph}))`, ids.usuarios);
            await pool.query(`DELETE FROM detalle_venta WHERE id_venta IN (SELECT id_venta FROM ventas WHERE id_usuario IN (${ph}))`, ids.usuarios);
            await pool.query(`DELETE FROM ventas WHERE id_usuario IN (${ph})`, ids.usuarios);
            await pool.query(`DELETE FROM reservas WHERE id_usuario IN (${ph})`, ids.usuarios);
            await pool.query(`DELETE FROM historial_operaciones WHERE id_usuario IN (${ph})`, ids.usuarios);
        }
        for (const id of ids.libros) {
            await pool.query('DELETE FROM movimientos_inventario WHERE id_libro=?', [id]);
            await pool.query('DELETE FROM inventario WHERE id_libro=?', [id]);
            await pool.query('DELETE FROM libros WHERE id_libro=?', [id]);
        }
        if (categoria) await pool.query('DELETE FROM categorias WHERE id_categoria=?', [categoria]);
        if (autor) await pool.query('DELETE FROM autores WHERE id_autor=?', [autor]);
        for (const id of ids.usuarios) await pool.query('DELETE FROM usuarios WHERE id_usuario=?', [id]);
        await pool.end();
    }
});
