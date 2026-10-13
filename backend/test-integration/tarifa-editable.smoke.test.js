const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');
const { aplicarMigracionesDatos } = require('../src/config/migraciones');

test('tarifa única editable: permisos, cobro vigente, concurrencia e historial atómico', async t => {
    assert.equal(process.env.NODE_ENV, 'test');
    assert.match(process.env.DATABASE_URL, /@127\.0\.0\.1:\d+\/audit$/);
    let admin, cliente, libro, autor, categoria;
    const ciudad = (await pool.query("SELECT * FROM zonas_delivery_pallasca WHERE nombre='Ciudad de Pallasca'"))[0][0];
    const token = id => jwt.sign({ id_usuario: id }, process.env.JWT_SECRET);
    const http = async (ruta, body, id = admin, method = body === undefined ? 'GET' : 'PUT') => {
        const r = await fetch(process.env.TEST_BASE_URL + '/api' + ruta, { method,
            headers: { ...(id ? { Authorization: `Bearer ${token(id)}` } : {}), 'Content-Type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body) });
        return { status: r.status, body: await r.json() };
    };
    const tarifa = async () => Number((await pool.query('SELECT tarifa FROM zonas_delivery_pallasca WHERE id_zona=?', [ciudad.id_zona]))[0][0].tarifa);
    const cambiar = (precio, anterior = 5, id = admin) => http(`/zonas-delivery/${ciudad.id_zona}`, { tarifa: precio, tarifa_anterior: anterior }, id);
    const historial = async () => Number((await pool.query("SELECT count(*) AS n FROM historial_operaciones WHERE id_usuario=? AND modulo='tarifas_envio'", [admin]))[0][0].n);
    const comprar = (extra = {}) => http('/pagos/crear-orden', { items: [{ id_libro: libro, cantidad: 1 }], tipo_entrega: 'domicilio',
        direccion: 'Jr. Comercio 123, Pallasca', idempotencia_clave: randomUUID(), ...extra }, cliente, 'POST');
    const fila = async id => (await pool.query('SELECT * FROM ventas WHERE id_venta=?', [id]))[0][0];
    try {
        for (const rol of ['administrador', 'cliente']) {
            const [u] = await pool.query("INSERT INTO usuarios(nombre,apellido,email,password,rol,email_verified_at) VALUES ('Tarifa','Prueba',?,'no-login',?,NOW())", [randomUUID() + '@example.test', rol]);
            if (rol === 'administrador') admin = u.insertId; else cliente = u.insertId;
        }
        autor = (await pool.query("INSERT INTO autores(nombre,apellido) VALUES ('Tarifa','Autor')"))[0].insertId;
        categoria = (await pool.query('INSERT INTO categorias(nombre) VALUES (?)', [randomUUID()]))[0].insertId;
        libro = (await pool.query('INSERT INTO libros(titulo,precio,id_autor,id_categoria) VALUES (?,25,?,?)', [randomUUID(), autor, categoria]))[0].insertId;
        await pool.query('INSERT INTO inventario(id_libro,stock) VALUES (?,50)', [libro]);
        t.beforeEach(async () => { await pool.query('UPDATE zonas_delivery_pallasca SET tarifa=5 WHERE id_zona=?', [ciudad.id_zona]); });

        await t.test('cliente/anónimo rechazados; importe inválido y referencias ajenas no escriben', async () => {
            const n = await historial();
            assert.equal((await cambiar(7, 5, cliente)).status, 403);
            assert.equal((await cambiar(7, 5, null)).status, 401);
            for (const precio of [0, -1, true, null, '', {}, [], 1.234, 100000000]) {
                assert.equal((await cambiar(precio)).status, 400);
                assert.equal(await tarifa(), 5);
            }
            assert.equal((await http(`/zonas-delivery/${ciudad.id_zona}`, { tarifa: 7 })).status, 400);
            assert.equal((await http(`/zonas-delivery/${ciudad.id_zona}`, { tarifa: 7, tarifa_anterior: 5, nombre: 'Otra ciudad' })).status, 409);
            assert.equal((await http('/zonas-delivery/2147483647', { tarifa: 7, tarifa_anterior: 5 })).status, 404);
            assert.equal(await historial(), n);
        });
        await t.test('S/7.50 se publica, nuevas compras web/app lo cobran y reintento antiguo conserva S/5', async () => {
            const clave = randomUUID();
            const antigua = await comprar({ idempotencia_clave: clave });
            assert.equal(antigua.status, 201); const original = await fila(antigua.body.data.id_venta);
            assert.equal(Number(original.total), 30); assert.equal(Number(original.costo_envio), 5);
            const cambio = await cambiar('7.50');
            assert.equal(cambio.status, 200); assert.equal(cambio.body.data.tarifa, 7.5);
            const caps = await http('/pagos/capacidades', undefined, null);
            assert.equal(caps.body.data.entrega.tarifa, 7.5);
            const zonas = await http('/zonas-delivery', undefined, cliente);
            assert.equal(zonas.body.data.length, 1); assert.equal(Number(zonas.body.data[0].tarifa), 7.5);
            for (const canal_compra of ['web', 'app']) {
                const r = await comprar({ canal_compra, costo_envio: 0, total: 1 });
                assert.equal(r.status, 201, JSON.stringify(r.body));
                assert.equal(Number(r.body.data.total), 32.5); assert.equal(Number(r.body.data.costo_envio), 7.5);
                const html = await (await fetch(r.body.data.checkout_url)).text();
                assert.match(html, /name="amount"\s+value="32\.50"/);
            }
            const recojo = await comprar({ tipo_entrega: 'tienda', costo_envio: 999 });
            assert.equal(recojo.status, 201); assert.equal(Number(recojo.body.data.total), 25); assert.equal(Number(recojo.body.data.costo_envio), 0);
            const reintento = await comprar({ idempotencia_clave: clave });
            assert.equal(reintento.status, 200); assert.equal(Number(reintento.body.data.total), 30);
            assert.deepEqual(await fila(original.id_venta), original);
            // Los arranques posteriores no ejecutan de nuevo el precio inicial.
            await aplicarMigracionesDatos(pool, { lista: [], registro: { log() {}, error() {} } });
            await pool.query("INSERT INTO migraciones_datos(nombre,filas) VALUES ('043_delivery_fijo_pallasca.sql',0) ON CONFLICT DO NOTHING");
            await aplicarMigracionesDatos(pool, { lista: ['043_delivery_fijo_pallasca.sql'], registro: { log() {}, error() {} } });
            assert.equal(await tarifa(), 7.5);
        });
        await t.test('dos administradores con la misma tarifa anterior: un cambio, un conflicto, una auditoría', async () => {
            const n = await historial();
            const resultados = await Promise.all([cambiar(7), cambiar(7.5)]);
            assert.deepEqual(resultados.map(r => r.status).sort(), [200, 409]);
            assert.equal(await historial(), n + 1);
            const actual = await tarifa();
            assert.equal((await cambiar(actual, actual)).status, 200);
            assert.equal(await historial(), n + 1, 'Sin cambios no duplica historial');
        });
        await t.test('fallo de auditoría revierte la tarifa; permite reintentar sin efectos parciales', async () => {
            const nombre = 'tarifa_' + randomUUID().replaceAll('-', '');
            await pool.query(`CREATE FUNCTION ${nombre}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fallo de auditoría desechable'; END $$`);
            await pool.query(`CREATE TRIGGER ${nombre} BEFORE INSERT ON historial_operaciones FOR EACH ROW WHEN (NEW.modulo='tarifas_envio') EXECUTE FUNCTION ${nombre}()`);
            const n = await historial();
            try { assert.equal((await cambiar(8)).status, 500); assert.equal(await tarifa(), 5); assert.equal(await historial(), n); }
            finally { await pool.query(`DROP TRIGGER ${nombre} ON historial_operaciones`); await pool.query(`DROP FUNCTION ${nombre}()`); }
            assert.equal((await cambiar(8)).status, 200);
        });
    } finally {
        await pool.query('UPDATE zonas_delivery_pallasca SET tarifa=? WHERE id_zona=?', [ciudad.tarifa, ciudad.id_zona]);
        if (cliente) await pool.query('DELETE FROM ventas WHERE id_usuario=?', [cliente]);
        if (libro) { await pool.query('DELETE FROM movimientos_inventario WHERE id_libro=?', [libro]); await pool.query('DELETE FROM inventario WHERE id_libro=?', [libro]); await pool.query('DELETE FROM libros WHERE id_libro=?', [libro]); }
        if (autor) await pool.query('DELETE FROM autores WHERE id_autor=?', [autor]);
        if (categoria) await pool.query('DELETE FROM categorias WHERE id_categoria=?', [categoria]);
        for (const id of [admin, cliente]) if (id) { await pool.query('DELETE FROM historial_operaciones WHERE id_usuario=?', [id]); await pool.query('DELETE FROM usuarios WHERE id_usuario=?', [id]); }
        await pool.end();
    }
});
