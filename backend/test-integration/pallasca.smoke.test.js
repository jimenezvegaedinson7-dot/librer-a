const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');
const ventaModel = require('../src/models/venta.model');

test('Pallasca: migración sin semillas, cobertura, tarifas definitivas e historial', async (t) => {
    const usuarios = [];
    const zonas = [];
    let autor, categoria, libro;
    const pedir = (ruta, token, method = 'GET', body) => fetch(`${process.env.TEST_BASE_URL}/api${ruta}`, {
        method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined
    });
    try {
        for (const rol of ['administrador', 'cliente']) {
            const [u] = await pool.query("INSERT INTO usuarios(nombre,apellido,email,password,rol) VALUES ('Cobertura','Test',?,'hash-test',?)",
                [`${randomUUID()}@example.test`, rol]);
            usuarios.push(u.insertId);
        }
        const admin = jwt.sign({ id_usuario: usuarios[0] }, process.env.JWT_SECRET);
        const cliente = jwt.sign({ id_usuario: usuarios[1] }, process.env.JWT_SECRET);
        const [a] = await pool.query("INSERT INTO autores(nombre,apellido) VALUES ('Cobertura','Test')"); autor = a.insertId;
        const [c] = await pool.query('INSERT INTO categorias(nombre) VALUES (?)', [`Cobertura-${randomUUID()}`]); categoria = c.insertId;
        const [l] = await pool.query('INSERT INTO libros(titulo,precio,id_autor,id_categoria,estado) VALUES (?,100,?,?,1)',
            [`Cobertura ${randomUUID()}`, autor, categoria]); libro = l.insertId;
        await pool.query('INSERT INTO inventario(id_libro,stock,stock_minimo) VALUES (?,100,2)', [libro]);
        const orden = (extra = {}) => ({ items: [{ id_libro: libro, cantidad: 2, precio: 1 }],
            tipo_entrega: 'tienda', idempotencia_clave: randomUUID(), ...extra });
        const leerVenta = async (id) => (await pool.query('SELECT * FROM ventas WHERE id_venta=?', [id]))[0][0];
        const verificarPayU = async (data, monto) => {
            const html = await (await fetch(data.checkout_url)).text();
            assert.ok(html.includes(`name="amount" value="${monto.toFixed(2)}"`), html.slice(-2000));
            assert.match(html, /name="currency"\s+value="PEN"/);
            assert.match(html, /name="signature"\s+value="[a-f0-9]{32}"/);
        };
        // Fila legacy real antes de aplicar 032: preservamos cada columna anterior.
        const [d] = await pool.query("SELECT d.id_distrito FROM distritos_lima d JOIN provincias_lima p USING(id_provincia) WHERE p.nombre='Lima' LIMIT 1");
        const [ag] = await pool.query('SELECT id_agencia FROM agencias_courier LIMIT 1');
        const [historica] = await pool.query(`INSERT INTO ventas(id_usuario,total,costo_envio,tipo_entrega,direccion,referencia,id_distrito,id_agencia,external_reference,estado)
            VALUES (?,212.50,12.50,'domicilio','Dirección Lima original','Referencia original',?,?,?,'pagada')`,
            [usuarios[1], d[0].id_distrito, ag[0]?.id_agencia || null, `historica_${randomUUID()}`]);
        const antes = await leerVenta(historica.insertId);
        const migracion = readFileSync(path.join(__dirname, '../database/migrations/032_cobertura_pallasca.sql'), 'utf8');

        await t.test('032 también actualiza una tabla legacy sin las columnas nuevas, sin reescribir sus valores', async () => {
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();
                // Tablas temporales de esta conexión: no alteran el schema de
                // la API ni los fixtures compartidos del resto de las pruebas.
                await connection.query(`CREATE TEMP TABLE zonas_delivery_pallasca (
                    id_zona SERIAL PRIMARY KEY, nombre VARCHAR(80) NOT NULL,
                    tarifa NUMERIC(10,2) NOT NULL, estado SMALLINT NOT NULL DEFAULT 1
                ) ON COMMIT DROP`);
                await connection.query(`CREATE TEMP TABLE ventas (
                    id_venta SERIAL PRIMARY KEY, total NUMERIC(10,2), costo_envio NUMERIC(10,2),
                    tipo_entrega VARCHAR(20), direccion VARCHAR(255), referencia VARCHAR(255),
                    id_distrito INT, id_agencia INT
                ) ON COMMIT DROP`);
                await connection.query(`INSERT INTO ventas(total,costo_envio,tipo_entrega,direccion,referencia,id_distrito,id_agencia)
                    VALUES (212.50,12.50,'domicilio','Dirección Lima original','Referencia original',1,1)`);
                const [original] = await connection.query('SELECT * FROM ventas');
                await connection.query(migracion); await connection.query(migracion);
                const [posterior] = await connection.query(`SELECT ${Object.keys(original[0]).join(',')} FROM ventas`);
                assert.deepEqual(posterior, original);
                const [marca] = await connection.query('SELECT cobertura_entrega,id_zona_delivery,zona_delivery_nombre FROM ventas');
                assert.deepEqual(marca[0], { cobertura_entrega: null, id_zona_delivery: null, zona_delivery_nombre: null });
                assert.equal((await connection.query('SELECT * FROM zonas_delivery_pallasca'))[0].length, 0);
            } finally {
                await connection.rollback(); connection.release();
            }
        });

        await t.test('D: migración repetible conserva ventas y ubicaciones antiguas, sin zonas iniciales', async () => {
            const [ubicacionesAntes] = await pool.query('SELECT * FROM distritos_lima ORDER BY id_distrito');
            const [zonasAntes] = await pool.query('SELECT * FROM zonas_delivery_pallasca ORDER BY id_zona');
            await pool.query(migracion); await pool.query(migracion);
            assert.deepEqual(await leerVenta(historica.insertId), antes);
            assert.deepEqual((await pool.query('SELECT * FROM distritos_lima ORDER BY id_distrito'))[0], ubicacionesAntes);
            assert.deepEqual((await pool.query('SELECT * FROM zonas_delivery_pallasca ORDER BY id_zona'))[0], zonasAntes);
            const vista = await ventaModel.obtenerPorId(historica.insertId);
            assert.equal(vista.cobertura_entrega, null);
            assert.equal(vista.provincia, 'Lima');
            assert.equal(vista.direccion, antes.direccion);
            assert.equal(vista.referencia, antes.referencia);
            assert.equal(Number(vista.costo_envio), 12.5);
            assert.equal(Number(vista.total), 212.5);
            assert.equal(vista.id_agencia, antes.id_agencia);
        });
        await t.test('A: recojo Pallasca funciona sin zonas; envío cero aun con datos manipulados', async () => {
            const r = await pedir('/pagos/crear-orden', cliente, 'POST', orden({ costo_envio: 999, id_zona_delivery: 999,
                direccion: 'Dato que no debe guardarse', referencia: 'Dato de delivery', id_distrito: d[0].id_distrito }));
            assert.equal(r.status, 201, await r.clone().text());
            const data = (await r.json()).data;
            const v = await leerVenta(data.id_venta);
            assert.equal(v.cobertura_entrega, 'pallasca');
            assert.equal(v.tipo_entrega, 'tienda');
            assert.equal(Number(v.costo_envio), 0); assert.equal(Number(v.total), 200);
            for (const campo of ['id_zona_delivery', 'zona_delivery_nombre', 'id_distrito', 'id_agencia', 'direccion', 'referencia']) assert.equal(v[campo], null);
            await verificarPayU(data, 200);
        });
        await t.test('administra zonas y restringe permisos/entradas', async () => {
            assert.equal((await pedir('/zonas-delivery')).status, 401);
            assert.equal((await pedir('/zonas-delivery/todos', cliente)).status, 403);
            assert.equal((await pedir('/zonas-delivery', cliente, 'POST', { nombre: 'Zona prueba', tarifa: 7.5, estado: 1 })).status, 403);
            for (const tarifa of [0, -1, true, '', 0.001, 2.345, 100000000]) {
                assert.equal((await pedir('/zonas-delivery', admin, 'POST', { nombre: 'Zona inválida', tarifa, estado: 1 })).status, 400);
            }
            const r = await pedir('/zonas-delivery', admin, 'POST', { nombre: `Zona de prueba ${randomUUID()}`, tarifa: 7.5, estado: 1 });
            assert.equal(r.status, 201, await r.clone().text());
            zonas.push((await r.json()).data);
            const duplicada = await pedir('/zonas-delivery', admin, 'POST', { ...zonas[0], id_zona: undefined });
            assert.equal(duplicada.status, 409);
            const inactiva = await pedir('/zonas-delivery', admin, 'POST', { nombre: `Inactiva ${randomUUID()}`, tarifa: 9, estado: 0 });
            assert.equal(inactiva.status, 201); zonas.push((await inactiva.json()).data);
            const activas = (await (await pedir('/zonas-delivery', cliente)).json()).data;
            assert.ok(activas.some(z => z.id_zona === zonas[0].id_zona));
            assert.ok(!activas.some(z => z.id_zona === zonas[1].id_zona));
        });
        await t.test('B: delivery usa tarifa BD, guarda zona/dirección/referencia y total exacto en PayU', async () => {
            const cuerpo = orden({ tipo_entrega: 'domicilio', id_zona_delivery: zonas[0].id_zona, direccion: '  Dirección Pallasca prueba  ',
                referencia: ' Frente al punto de prueba ', costo_envio: 0.01, total: 1, id_distrito: d[0].id_distrito });
            const r = await pedir('/pagos/crear-orden', cliente, 'POST', cuerpo);
            assert.equal(r.status, 201, await r.clone().text());
            const data = (await r.json()).data; const v = await leerVenta(data.id_venta);
            assert.equal(v.cobertura_entrega, 'pallasca'); assert.equal(v.id_zona_delivery, zonas[0].id_zona);
            assert.equal(v.zona_delivery_nombre, zonas[0].nombre); assert.equal(v.direccion, 'Dirección Pallasca prueba');
            assert.equal(v.referencia, 'Frente al punto de prueba'); assert.equal(v.id_distrito, null);
            assert.equal(Number(v.costo_envio), 7.5); assert.equal(Number(v.total), 207.5);
            await verificarPayU(data, 207.5);
            // Cambios futuros no recalculan ni renombran la instantánea vendida.
            const cambio = await pedir(`/zonas-delivery/${zonas[0].id_zona}`, admin, 'PUT', { nombre: `Renombrada ${randomUUID()}`, tarifa: 11, estado: 0 });
            assert.equal(cambio.status, 200);
            assert.deepEqual(await leerVenta(data.id_venta), v);
            const repetida = await pedir('/pagos/crear-orden', cliente, 'POST', cuerpo);
            assert.equal(repetida.status, 200);
            assert.equal(Number((await repetida.json()).data.total), 207.5);
            assert.deepEqual(await leerVenta(historica.insertId), antes);
            const pedidos = (await (await pedir(`/pedidos/${data.id_venta}`, admin)).json()).data;
            assert.equal(pedidos.zona_delivery_nombre, zonas[0].nombre);
            const compras = (await (await pedir('/ventas/mis-ventas', cliente)).json()).data;
            assert.equal(compras.find(p => p.id_venta === data.id_venta).cobertura_entrega, 'pallasca');
            const pagos = (await (await pedir('/pagos', admin)).json()).pagos;
            assert.equal(pagos.find(p => p.id_venta === data.id_venta).zona_delivery_nombre, zonas[0].nombre);
        });
        await t.test('C: rechaza zona inexistente/inactiva, Lima legacy, agencia y dirección inválida sin venta ni stock consumido', async () => {
            const [stockAntes] = await pool.query('SELECT stock FROM inventario WHERE id_libro=?', [libro]);
            const [ventasAntes] = await pool.query('SELECT count(*) AS n FROM ventas WHERE id_usuario=?', [usuarios[1]]);
            for (const extra of [
                { id_zona_delivery: 2147483647 }, { id_zona_delivery: zonas[0].id_zona }, { id_zona_delivery: zonas[1].id_zona },
                { id_zona_delivery: true }, { id_distrito: d[0].id_distrito }, { tipo_entrega: 'agencia' }
            ]) {
                const r = await pedir('/pagos/crear-orden', cliente, 'POST', orden({ tipo_entrega: 'domicilio', direccion: 'Dirección prueba', ...extra }));
                assert.equal(r.status, 400, await r.clone().text());
            }
            await pedir(`/zonas-delivery/${zonas[0].id_zona}`, admin, 'PUT', { nombre: zonas[0].nombre, tarifa: 7.5, estado: 1 });
            for (const extra of [{ direccion: 'abc' }, { direccion: 'a'.repeat(256) }, { referencia: true }]) {
                assert.equal((await pedir('/pagos/crear-orden', cliente, 'POST', orden({ tipo_entrega: 'domicilio',
                    id_zona_delivery: zonas[0].id_zona, direccion: 'Dirección prueba', ...extra }))).status, 400);
            }
            assert.deepEqual((await pool.query('SELECT stock FROM inventario WHERE id_libro=?', [libro]))[0], stockAntes);
            assert.deepEqual((await pool.query('SELECT count(*) AS n FROM ventas WHERE id_usuario=?', [usuarios[1]]))[0], ventasAntes);
        });
    } finally {
        if (usuarios.length) {
            await pool.query('DELETE FROM movimientos_inventario WHERE id_usuario IN (?, ?)', usuarios);
            await pool.query('DELETE FROM ventas WHERE id_usuario IN (?, ?)', usuarios);
            await pool.query('DELETE FROM historial_operaciones WHERE id_usuario IN (?, ?)', usuarios);
            await pool.query('DELETE FROM usuarios WHERE id_usuario IN (?, ?)', usuarios);
        }
        for (const z of zonas) await pool.query('DELETE FROM zonas_delivery_pallasca WHERE id_zona=?', [z.id_zona]);
        if (libro) { await pool.query('DELETE FROM inventario WHERE id_libro=?', [libro]); await pool.query('DELETE FROM libros WHERE id_libro=?', [libro]); }
        if (autor) await pool.query('DELETE FROM autores WHERE id_autor=?', [autor]);
        if (categoria) await pool.query('DELETE FROM categorias WHERE id_categoria=?', [categoria]);
        await pool.end();
    }
});
