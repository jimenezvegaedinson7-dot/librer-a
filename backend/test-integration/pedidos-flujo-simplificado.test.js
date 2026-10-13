const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');
const ventas = require('../src/models/venta.model');

test('pedidos: confirmación física, tres tramos, resumen e historial sin alterar pago', async t => {
    assert.equal(process.env.NODE_ENV, 'test');
    assert.match(process.env.DATABASE_URL, /@127\.0\.0\.1:\d+\/audit$/);
    const ids = { usuarios: [], ventas: [] };
    let autor, categoria, libro, zona;
    const http = async (ruta, body, method = body === undefined ? 'GET' : 'PUT', token = ids.admin) => {
        const response = await fetch(`${process.env.TEST_BASE_URL}/api${ruta}`, { method,
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body) });
        return { status: response.status, body: await response.json() };
    };
    const fila = async id => (await pool.query('SELECT * FROM ventas WHERE id_venta=?', [id]))[0][0];
    const stock = async () => Number((await pool.query('SELECT stock FROM inventario WHERE id_libro=?', [libro]))[0][0].stock);
    const cobro = v => Object.fromEntries(['estado', 'total', 'costo_envio', 'external_reference', 'payu_order_id', 'payu_payment_id', 'payu_payment_status', 'fecha_pago'].map(campo => [campo, v[campo]]));
    const crear = async (tipo, aprobar = true) => {
        const ref = randomUUID();
        const orden = await ventas.crear({ id_usuario: ids.usuarios[1], detalles: [{ id_libro: libro, cantidad: 1 }],
            external_reference: ref, canal_compra: 'app', tipo_entrega: tipo, correo_compra: 'logistica@example.test',
            ...(tipo === 'domicilio' ? { direccion: 'Jr. Comercio 123, Pallasca', id_zona_delivery: zona } : {}) });
        ids.ventas.push(orden.id_venta);
        if (aprobar) {
            const importe = Number(orden.total).toFixed(2);
            const body = { merchant_id: process.env.PAYU_MERCHANT_ID, reference_sale: ref, value: importe, currency: 'PEN', state_pol: '4', transaction_id: randomUUID() };
            body.sign = createHash('md5').update(`${process.env.PAYU_API_KEY}~${body.merchant_id}~${ref}~${Number(importe).toFixed(1)}~PEN~4`).digest('hex');
            assert.equal((await http('/pagos/webhook', body, 'POST', null)).status, 200);
        }
        return orden.id_venta;
    };
    const mover = (id, estado, extra = { confirmado: true }) => http(`/pedidos/${id}/estado`, { estado, ...extra });
    try {
        for (const rol of ['administrador', 'cliente']) ids.usuarios.push((await pool.query("INSERT INTO usuarios(nombre,apellido,email,password,rol,email_verified_at) VALUES ('Flujo','Audit',?,'hash-prueba',?,NOW())", [randomUUID() + '@example.test', rol]))[0].insertId);
        [ids.admin, ids.cliente] = ids.usuarios.map(id_usuario => jwt.sign({ id_usuario }, process.env.JWT_SECRET));
        autor = (await pool.query("INSERT INTO autores(nombre,apellido) VALUES ('Flujo','Audit')"))[0].insertId;
        categoria = (await pool.query('INSERT INTO categorias(nombre) VALUES (?)', [randomUUID()]))[0].insertId;
        libro = (await pool.query('INSERT INTO libros(titulo,precio,id_autor,id_categoria) VALUES (?,25,?,?)', [randomUUID(), autor, categoria]))[0].insertId;
        await pool.query('INSERT INTO inventario(id_libro,stock) VALUES (?,100)', [libro]);
        zona = (await pool.query('INSERT INTO zonas_delivery_pallasca(nombre,tarifa) VALUES (?,10)', [randomUUID()]))[0].insertId;

        for (const [tipo, intermedio, incompatible] of [['domicilio', 'en_camino', 'listo_recojo'], ['tienda', 'listo_recojo', 'en_camino']]) {
            await t.test(`${tipo}: no avanza sin confirmación, no cruza tipos y entrega no cambia cobro ni stock`, async () => {
                const id = await crear(tipo), antes = await fila(id), existencias = await stock();
                for (const confirmado of [undefined, false, 'true']) {
                    assert.equal((await mover(id, intermedio, { confirmado })).status, 400);
                    assert.deepEqual(await fila(id), antes);
                }
                assert.equal((await mover(id, 'preparando')).status, 400);
                assert.equal((await mover(id, incompatible)).status, 400);
                assert.equal((await mover(id, 'entregado')).status, 400);
                assert.equal((await http(`/pedidos/${id}/estado`, { estado: intermedio, confirmado: true }, 'PUT', ids.cliente)).status, 403);
                assert.equal((await mover(id, intermedio, { confirmado: true, estado_anterior: 'pendiente' })).status, 200);
                assert.equal((await fila(id)).estado_entrega, intermedio);
                assert.deepEqual(cobro(await fila(id)), cobro(antes));
                assert.equal((await mover(id, 'entregado', { confirmado: true, estado_anterior: 'pendiente' })).status, 409);
                const resultados = await Promise.all([mover(id, 'entregado'), mover(id, 'entregado')]);
                assert.deepEqual(resultados.map(r => r.status).sort(), [200, 400]);
                const despues = await fila(id);
                assert.equal(despues.estado_entrega, 'entregado');
                assert.equal(despues.estado, 'pagada');
                assert.deepEqual(cobro(despues), cobro(antes));
                assert.equal(await stock(), existencias);
                for (const destino of ['pendiente', intermedio, 'cancelado']) assert.equal((await mover(id, destino)).status, 400);
                const historial = (await pool.query("SELECT descripcion FROM historial_operaciones WHERE modulo='pedidos' AND descripcion LIKE ? ORDER BY id_historial", [`Pedido #${id} actualizado%`]))[0];
                assert.equal(historial.length, 2);
                assert.match(historial[1].descripcion, new RegExp(`de "${intermedio}" a "entregado"`));
                const propias = (await http('/ventas/mis-ventas', undefined, 'GET', ids.cliente)).body.data.find(v => v.id_venta === id);
                assert.equal(propias.estado, 'pagada');
                assert.equal(propias.estado_entrega, 'entregado');
            });
        }
        await t.test('alias antiguo se interpreta al filtrar y leer sin reescribirlo', async () => {
            const id = await crear('tienda');
            await pool.query("UPDATE ventas SET estado_entrega='preparando' WHERE id_venta=?", [id]);
            const antes = await fila(id);
            const listado = await http('/pedidos?estado=pendiente');
            assert.equal(listado.status, 200);
            assert.equal(listado.body.data.find(p => p.id_venta === id).estado_entrega, 'preparando');
            assert.equal(listado.body.resumen.conteos.pendiente, 1);
            assert.equal(listado.body.resumen.total, 3);
            assert.equal(listado.body.resumen.conteos.entregado, 2);
            const global = await http('/pedidos');
            assert.deepEqual(listado.body.resumen, global.body.resumen, 'Filtrar estado conserva el denominador');
            const tienda = await http('/pedidos?tipo=tienda&estado=pendiente');
            assert.equal(tienda.body.resumen.total, 2);
            assert.equal(tienda.body.resumen.porcentajes.pendiente, 50);
            assert.deepEqual(await fila(id), antes);
            assert.equal((await mover(id, 'listo_recojo', { confirmado: true, estado_anterior: 'preparando' })).status, 200);
        });
        await t.test('sin pago no se prepara; cancelar conserva el reintegro transaccional', async () => {
            const id = await crear('domicilio', false), antes = await stock();
            assert.equal((await mover(id, 'en_camino')).status, 409);
            assert.equal((await mover(id, 'cancelado', {})).status, 200);
            assert.equal((await fila(id)).estado, 'cancelada');
            assert.equal(await stock(), antes + 1);
        });
        await t.test('si falla el historial, el avance se revierte completamente', async () => {
            const id = await crear('tienda'), antes = await fila(id);
            const nombre = 'fallo_pedido_' + randomUUID().replaceAll('-', '');
            await pool.query(`CREATE FUNCTION ${nombre}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fallo de historial de prueba'; END $$`);
            await pool.query(`CREATE TRIGGER ${nombre} BEFORE INSERT ON historial_operaciones FOR EACH ROW WHEN (NEW.modulo='pedidos') EXECUTE FUNCTION ${nombre}()`);
            try { assert.equal((await mover(id, 'listo_recojo')).status, 500); assert.deepEqual(await fila(id), antes); }
            finally { await pool.query(`DROP TRIGGER ${nombre} ON historial_operaciones`); await pool.query(`DROP FUNCTION ${nombre}()`); }
            assert.equal((await mover(id, 'listo_recojo')).status, 200);
        });
        await t.test('filtros de tipo o estado desconocidos se rechazan de forma controlada', async () => {
            for (const ruta of ['/pedidos?tipo=agencia', '/pedidos?estado=desconocido', '/pedidos?estado=pendiente&estado=en_camino']) assert.equal((await http(ruta)).status, 400);
        });
    } finally {
        for (const id of ids.ventas) await pool.query('DELETE FROM ventas WHERE id_venta=?', [id]);
        if (libro) { await pool.query('DELETE FROM movimientos_inventario WHERE id_libro=?', [libro]); await pool.query('DELETE FROM inventario WHERE id_libro=?', [libro]); await pool.query('DELETE FROM libros WHERE id_libro=?', [libro]); }
        if (zona) await pool.query('DELETE FROM zonas_delivery_pallasca WHERE id_zona=?', [zona]);
        if (autor) await pool.query('DELETE FROM autores WHERE id_autor=?', [autor]);
        if (categoria) await pool.query('DELETE FROM categorias WHERE id_categoria=?', [categoria]);
        for (const id of ids.usuarios) { await pool.query('DELETE FROM historial_operaciones WHERE id_usuario=?', [id]); await pool.query('DELETE FROM usuarios WHERE id_usuario=?', [id]); }
        await pool.end();
    }
});
