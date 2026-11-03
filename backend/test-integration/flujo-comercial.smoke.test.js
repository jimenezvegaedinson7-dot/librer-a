const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const pool = require('../src/config/database');
const ventaModel = require('../src/models/venta.model');

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

const sembrados = {
    admin: null,
    cajero: null,
    cliente: null,
    autores: [],
    categorias: [],
    libros: [],
    ventas: [],
    ventaWebhook: null,
    ventaLegacyPanel: null,
    ventaLegacyReserva: null,
    reservas: [],
    detalles: [],
    pedidos: []
};

const tokenPara = (idUsuario, rol) => jwt.sign({ id_usuario: idUsuario, ...(rol ? { rol } : {}) }, process.env.JWT_SECRET, { expiresIn: '5m' });

const cabeceras = (token) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

const pedir = (ruta, cabecerasPeticion, metodo = 'GET', cuerpo) => {
    const sinCuerpo = metodo === 'GET' || metodo === 'HEAD';

    return fetch(`${baseUrl}${ruta}`, { method: metodo, headers: cabecerasPeticion, body: sinCuerpo || cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
};

const redondearValorWebhook = (valor) => {
    const conDos = Number(valor).toFixed(2);

    return conDos.endsWith('0') ? Number(valor).toFixed(1) : conDos;
};

const firmarWebhook = ({ apiKey, merchantId, referenceSale, value, currency, statePol }) =>
    crypto
        .createHash('md5')
        .update(`${apiKey}~${merchantId}~${referenceSale}~${redondearValorWebhook(value)}~${currency}~${statePol}`)
        .digest('hex');

const llamarWebhook = ({ externalReference, value, transactionId, statePol = '4' }) => {
    const apiKey = process.env.PAYU_API_KEY;
    const merchantId = process.env.PAYU_MERCHANT_ID;

    const cuerpo = new URLSearchParams({
        merchant_id: merchantId,
        reference_sale: externalReference,
        value,
        currency: 'PEN',
        state_pol: statePol,
        transaction_id: transactionId,
        reference_pol: `RP-${transactionId}`,
        email_buyer: 'cliente-wbk@example.test',
        sign: firmarWebhook({ apiKey, merchantId, referenceSale: externalReference, value, currency: 'PEN', statePol })
    });

    return fetch(`${baseUrl}/api/pagos/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: cuerpo.toString() });
};

const sembrar = async () => {
    const sufijo = crypto.randomUUID();

    const crearUsuario = async (rol, etiqueta = rol) => {
        const [resultado] = await pool.query(
            `INSERT INTO usuarios (nombre, apellido, email, password, rol, estado) VALUES ('Comercial', 'CI', ?, 'no-login', ?, 1) RETURNING id_usuario`,
            [`com-${etiqueta}-${sufijo}@example.test`, rol]
        );

        return resultado[0].id_usuario;
    };

    sembrados.admin = await crearUsuario('administrador');
    sembrados.cajero = await crearUsuario('cliente', 'ex-cajero');
    sembrados.cliente = await crearUsuario('cliente');

    const [autor] = await pool.query(`INSERT INTO autores (nombre, apellido, estado) VALUES ('Com', 'Autor', 1) RETURNING id_autor`);
    sembrados.autores.push(autor[0].id_autor);

    const crearLibro = async (titulo, isbn, precio, stock) => {
        const [categoria] = await pool.query(`INSERT INTO categorias (nombre, estado) VALUES (?, 1) RETURNING id_categoria`, [`Cat ${titulo}`]);
        sembrados.categorias.push(categoria[0].id_categoria);

        const [libro] = await pool.query(`INSERT INTO libros (titulo, isbn, precio, stock, id_autor, id_categoria, estado) VALUES (?, ?, ?, ?, ?, ?, 1) RETURNING id_libro`, [
            titulo,
            isbn,
            precio,
            stock,
            autor[0].id_autor,
            categoria[0].id_categoria
        ]);
        sembrados.libros.push(libro[0].id_libro);

        await pool.query(`INSERT INTO inventario (id_libro, stock, stock_minimo) VALUES (?, ?, 2)`, [libro[0].id_libro, stock]);

        return libro[0].id_libro;
    };

    sembrados.libroManual = await crearLibro('Libro de venta manual', `ISBN-VEN-${sufijo.slice(0, 8)}`, 32.0, 5);

    sembrados.libroReserva = await crearLibro('Libro de reserva', `ISBN-RES-${sufijo.slice(8, 16)}`, 18.9, 2);

    sembrados.libroConcurrencia = await crearLibro('Libro de concurrencia', `ISBN-CON-${sufijo.slice(16, 24)}`, 40.0, 1);

    sembrados.libroWebhook = await crearLibro('Libro del webhook', `ISBN-WBK-${sufijo.slice(24, 32)}`, 25.5, 10);
};

const sembrarVentaWebhook = async () => {
    const sufijo = crypto.randomUUID();
    const externalReference = `WBK-${crypto.randomUUID()}`;

    const [venta] = await pool.query(
        `INSERT INTO ventas (id_usuario, total, costo_envio, estado, estado_entrega, tipo_entrega, origen, external_reference, correo_compra, fecha_venta) VALUES (?, 25.50, 0.00, 'pendiente', 'pendiente', 'tienda', 'app', ?, ?, CURRENT_TIMESTAMP) RETURNING id_venta`,
        [sembrados.cliente, externalReference, `cliente-wbk-${sufijo}@example.test`]
    );
    sembrados.ventaWebhook = venta[0].id_venta;
    sembrados.ventas.push(sembrados.ventaWebhook);

    const [detalle] = await pool.query(`INSERT INTO detalle_venta (id_venta, id_libro, cantidad, precio_unitario, subtotal) VALUES (?, ?, 1, 25.50, 25.50) RETURNING id_detalle`, [
        sembrados.ventaWebhook,
        sembrados.libroWebhook
    ]);
    sembrados.detalles.push(detalle[0].id_detalle);

    return externalReference;
};

const sembrarVentasLegacy = async () => {
    const [panel] = await pool.query(
        `INSERT INTO ventas (id_usuario, total, costo_envio, estado, estado_entrega, tipo_entrega, origen, metodo_pago, cliente_nombre, fecha_venta) VALUES (?, 32.00, 0.00, 'pagada', 'entregado', 'tienda', 'panel', 'efectivo', 'Cliente de mostrador', CURRENT_TIMESTAMP) RETURNING id_venta`,
        [sembrados.cliente]
    );
    sembrados.ventaLegacyPanel = panel[0].id_venta;
    sembrados.ventas.push(sembrados.ventaLegacyPanel);

    const [reserva] = await pool.query(
        `INSERT INTO ventas (id_usuario, total, costo_envio, estado, estado_entrega, tipo_entrega, origen, metodo_pago, fecha_venta) VALUES (?, 18.90, 0.00, 'pagada', 'entregado', 'tienda', 'reserva', 'efectivo', CURRENT_TIMESTAMP) RETURNING id_venta`,
        [sembrados.cliente]
    );
    sembrados.ventaLegacyReserva = reserva[0].id_venta;
    sembrados.ventas.push(sembrados.ventaLegacyReserva);
};

const limpiar = async () => {
    const ids = sembrados.libros;

    if (ids.length === 0) {
        await pool.end();
        return;
    }

    const ph = ids.map(() => '?').join(',');

    const [detalleVentas] = await pool.query(`SELECT DISTINCT id_venta FROM detalle_venta WHERE id_libro IN (${ph})`, ids);

    const ventaIds = [...new Set([...sembrados.ventas, ...detalleVentas.map((r) => r.id_venta)])].filter(Boolean);

    if (ventaIds.length > 0) {
        const vp = ventaIds.map(() => '?').join(',');

        await pool.query(`DELETE FROM comprobantes WHERE id_venta IN (${vp})`, ventaIds);
    }

    await pool.query(`DELETE FROM detalle_venta WHERE id_libro IN (${ph})`, ids);

    await pool.query(`DELETE FROM reservas WHERE id_libro IN (${ph})`, ids);

    if (ventaIds.length > 0) {
        const vp = ventaIds.map(() => '?').join(',');

        await pool.query(`DELETE FROM ventas WHERE id_venta IN (${vp})`, ventaIds);
    }

    await pool.query(`DELETE FROM inventario WHERE id_libro IN (${ph})`, ids);
    await pool.query(`DELETE FROM libros WHERE id_libro IN (${ph})`, ids);

    for (const id of sembrados.categorias) {
        await pool.query('DELETE FROM categorias WHERE id_categoria = ?', [id]);
    }

    for (const id of sembrados.autores) {
        await pool.query('DELETE FROM autores WHERE id_autor = ?', [id]);
    }

    const usuarios = [sembrados.admin, sembrados.cajero, sembrados.cliente].filter(Boolean);

    for (const id of usuarios) {
        await pool.query('DELETE FROM historial_operaciones WHERE id_usuario = ?', [id]);
    }

    for (const id of usuarios) {
        await pool.query('DELETE FROM usuarios WHERE id_usuario = ?', [id]);
    }

    await pool.end();
};

const leerStock = async (idLibro) => {
    const [filas] = await pool.query('SELECT stock FROM inventario WHERE id_libro = ?', [idLibro]);

    return filas.length > 0 ? Number(filas[0].stock) : null;
};

const contarVentas = async () => {
    if (sembrados.ventas.length === 0) return 0;

    const marcadores = sembrados.ventas.map(() => '?').join(', ');

    const [filas] = await pool.query(`SELECT COUNT(*) AS total FROM ventas WHERE id_venta IN (${marcadores})`, sembrados.ventas);

    return Number(filas[0].total);
};

const leerVenta = async (idVenta) => {
    const [filas] = await pool.query('SELECT * FROM ventas WHERE id_venta = ?', [idVenta]);

    return filas[0] || null;
};

test('matriz funcional del flujo comercial', async (t) => {
    await sembrar();
    await sembrarVentasLegacy();

    const admin = cabeceras(tokenPara(sembrados.admin));
    const cajero = cabeceras(tokenPara(sembrados.cajero, 'cajero'));
    const cliente = cabeceras(tokenPara(sembrados.cliente));

    try {
        await t.test('POST /api/ventas no crea venta manual', async () => {
            const ventasAntes = await contarVentas();
            const stockAntes = await leerStock(sembrados.libroManual);

            const intento = await pedir('/api/ventas', admin, 'POST', {
                detalles: [{ id_libro: sembrados.libroManual, cantidad: 1 }],
                tipo_entrega: 'tienda',
                metodo_pago: 'efectivo',
                origen: 'app'
            });
            const intentoTexto = await intento.text();

            assert.ok([403, 404, 405].includes(intento.status), `POST /api/ventas debe estar bloqueado (403/404/405), pero devolvió ${intento.status}: ${intentoTexto}`);
            assert.notEqual(intento.status, 201, 'el panel no puede crear ventas');

            const ventasDespues = await contarVentas();
            assert.equal(ventasDespues, ventasAntes, 'el intento bloqueado no debe crear ninguna venta');

            assert.equal(await leerStock(sembrados.libroManual), stockAntes, 'el intento bloqueado no debe tocar el stock');
        });

        await t.test('no se puede falsificar el origen de una venta', async () => {
            const [antes] = await pool.query(`SELECT origen, estado, total FROM ventas WHERE id_venta = ?`, [sembrados.ventaWebhook]);

            const intento = await pedir(`/api/ventas/${sembrados.ventaWebhook}/estado`, admin, 'PUT', { estado: 'panel' });

            assert.ok(intento.status >= 400, `un origen inválido debe rechazarse, pero devolvió ${intento.status}`);

            const [despues] = await pool.query(`SELECT origen, estado, total FROM ventas WHERE id_venta = ?`, [sembrados.ventaWebhook]);

            assert.equal(despues.origen, antes.origen, 'el origen no debe poder cambiarse por API');
            assert.equal(despues.estado, antes.estado, 'el estado no debe cambiar');
            assert.equal(Number(despues.total), Number(antes.total), 'el total no debe poder alterarse');
        });

        await t.test('las ventas legacy panel/reserva se conservan', async () => {
            const panel = await leerVenta(sembrados.ventaLegacyPanel);
            const reserva = await leerVenta(sembrados.ventaLegacyReserva);

            assert.equal(panel.origen, 'panel', 'debe seguir siendo panel');
            assert.equal(reserva.origen, 'reserva', 'debe seguir siendo reserva');

            const listado = await pedir('/api/ventas', admin);
            assert.equal(listado.status, 200);
            const cuerpo = await listado.json();
            const ids = cuerpo.data.map((v) => v.id_venta);

            assert.ok(ids.includes(sembrados.ventaLegacyPanel), 'la venta legacy de panel debe verse en el listado');
            assert.ok(ids.includes(sembrados.ventaLegacyReserva), 'la venta legacy de reserva debe verse en el listado');
        });

        await t.test('listado global y detalle de venta', async () => {
            const listado = await pedir('/api/ventas', admin);
            assert.equal(listado.status, 200, `búsqueda global de ventas devolvió ${listado.status}`);

            const detalle = await pedir(`/api/ventas/${sembrados.ventaLegacyPanel}`, admin);
            assert.equal(detalle.status, 200, `detalle existente devolvió ${detalle.status}`);
            const detalleCuerpo = await detalle.json();
            assert.equal(detalleCuerpo.data.id_venta, sembrados.ventaLegacyPanel);
            assert.ok(Array.isArray(detalleCuerpo.data.detalles), 'el detalle debe incluir sus ítems');

            const inexistente = await pedir('/api/ventas/999999', admin);
            assert.equal(inexistente.status, 404, `detalle inexistente devolvió ${inexistente.status} (debería ser 404)`);
        });

        await t.test('reservas eliminadas: las rutas antiguas no modifican registros ni stock', async () => {
            const crearReserva = await pedir('/api/reservas', cliente, 'POST', { id_libro: sembrados.libroReserva, cantidad: 1 });
            const crearTexto = await crearReserva.text();
            assert.equal(crearReserva.status, 410, `crear reserva devolvió ${crearReserva.status}: ${crearTexto}`);

            const [historica] = await pool.query('INSERT INTO reservas(id_usuario,id_libro,cantidad) VALUES (?,?,1)', [sembrados.cliente, sembrados.libroReserva]);
            await pool.query('UPDATE inventario SET stock=stock-1 WHERE id_libro=?', [sembrados.libroReserva]);
            const idReserva = historica.insertId;
            sembrados.reservas.push(idReserva);
            assert.ok(idReserva > 0, 'la reserva debe tener un id');

            assert.equal(await leerStock(sembrados.libroReserva), 1, 'crear la reserva debe apartar 1 del stock');

            const cancelar = await pedir(`/api/reservas/${idReserva}`, cliente, 'DELETE');
            const cancelarTexto = await cancelar.text();
            assert.equal(cancelar.status, 410, `cancelar reserva devolvió ${cancelar.status}: ${cancelarTexto}`);
            assert.equal(JSON.parse(cancelarTexto).success, false);

            const [reservaFila] = await pool.query('SELECT estado FROM reservas WHERE id_reserva = ?', [idReserva]);
            assert.equal(reservaFila[0].estado, 'pendiente', 'la ruta retirada no debe mutar registros legacy');

            assert.equal(await leerStock(sembrados.libroReserva), 1, 'solo la purga transaccional puede liberar un apartado antiguo');
        });

        const externalReference = await sembrarVentaWebhook();

        await t.test('webhook de PayU duplicado es idempotente', async () => {
            assert.ok(process.env.PAYU_API_KEY, 'PAYU_API_KEY debe existir');
            assert.ok(process.env.PAYU_MERCHANT_ID, 'PAYU_MERCHANT_ID debe existir');

            const primero = await llamarWebhook({ externalReference, value: '25.50', transactionId: 'TX-DUP-001' });
            const primeroTexto = await primero.text();
            assert.equal(primero.status, 200, `primer webhook devolvió ${primero.status}: ${primeroTexto}`);
            assert.equal(JSON.parse(primeroTexto).procesado, true);

            const fila = await leerVenta(sembrados.ventaWebhook);
            assert.equal(fila.estado, 'pagada', 'el webhook aprobado debe marcar la venta como pagada');

            const segundo = await llamarWebhook({ externalReference, value: '25.50', transactionId: 'TX-DUP-001' });
            assert.equal(segundo.status, 200, `segundo webhook devolvió ${segundo.status}`);
            assert.equal((await segundo.json()).duplicado, true, 'el webhook repetido debe responderse como duplicado');
        });

        await t.test('reintento con la misma idempotencia_clave no duplica la venta', async () => {
            assert.ok(process.env.PAYU_API_KEY, 'PAYU_API_KEY debe existir');

            const clave = crypto.randomUUID();

            const cuerpo = {
                items: [{ id_libro: sembrados.libroManual, cantidad: 1 }],
                correo_compra: 'reintento@example.test',
                direccion: 'Av. Siempre Viva 742',
                idempotencia_clave: clave,
                tipo_entrega: 'tienda',
                costo_envio: 999
            };

            const stockAntes = await leerStock(sembrados.libroManual);
            const ventasAntes = await contarVentas();

            const primera = await pedir('/api/pagos/crear-orden', cliente, 'POST', cuerpo);
            const primeraCuerpo = await primera.json().catch(() => ({}));

            assert.ok(primera.status >= 200 && primera.status < 300, `la primera orden debe crearse, devolvió ${primera.status}`);
            assert.equal(primeraCuerpo.ya_existia, false);

            const idPrimera = primeraCuerpo.data?.id_venta;
            assert.ok(idPrimera, `la creación debe devolver data.id_venta, llegó: ${JSON.stringify(primeraCuerpo).slice(0, 200)}`);
            sembrados.ventas.push(idPrimera);

            const ventaRecojo = await leerVenta(idPrimera);
            assert.equal(Number(ventaRecojo.costo_envio), 0, 'el recojo no cobra una tarifa enviada por el cliente');
            const [precios] = await pool.query('SELECT precio FROM libros WHERE id_libro = ?', [sembrados.libroManual]);
            assert.equal(Number(ventaRecojo.total), Number(precios[0].precio), 'total de recojo = precio real del libro');

            const segunda = await pedir('/api/pagos/crear-orden', cliente, 'POST', cuerpo);
            const segundaCuerpo = await segunda.json().catch(() => ({}));

            assert.equal(segunda.status, 200, `el reintento debe devolver la orden existente, devolvió ${segunda.status}`);
            assert.equal(segundaCuerpo.ya_existia, true, 'el reintento debe reconocerse como la misma orden');
            assert.equal(segundaCuerpo.data?.id_venta, idPrimera, 'el reintento debe devolver la MISMA venta');

            assert.equal(await contarVentas(), ventasAntes + 1, 'el reintento no debe crear una segunda venta');
            assert.equal(await leerStock(sembrados.libroManual), stockAntes - 1, 'el reintento no debe descontar stock dos veces');
        });

        await t.test('la orden cobra el precio con descuento vigente y no el vencido', async () => {
            const [precios] = await pool.query('SELECT precio FROM libros WHERE id_libro = ?', [sembrados.libroManual]);
            const lista = Number(precios[0].precio);
            const oferta = Number((lista * 0.5).toFixed(2));
            const ordenTotal = async () => {
                const r = await pedir('/api/pagos/crear-orden', cliente, 'POST', {
                    items: [{ id_libro: sembrados.libroManual, cantidad: 1 }],
                    correo_compra: 'oferta@example.test',
                    direccion: 'Av. Siempre Viva 742',
                    idempotencia_clave: crypto.randomUUID(),
                    tipo_entrega: 'tienda'
                });
                const cuerpo = await r.json().catch(() => ({}));
                assert.ok(r.status >= 200 && r.status < 300, `orden con oferta devolvió ${r.status}: ${JSON.stringify(cuerpo).slice(0, 200)}`);
                sembrados.ventas.push(cuerpo.data.id_venta);
                return Number((await leerVenta(cuerpo.data.id_venta)).total);
            };
            try {
                await pool.query('UPDATE libros SET precio_oferta = ?, descuento_hasta = NULL WHERE id_libro = ?', [oferta, sembrados.libroManual]);
                assert.equal(await ordenTotal(), oferta, 'con oferta vigente se cobra el precio de oferta');

                const publico = await (await fetch(`${baseUrl}/api/libros/${sembrados.libroManual}`)).json();
                const libro = publico.data || publico.libro || publico;
                assert.equal(Number(libro.precio_final), oferta, 'la API pública anuncia el mismo precio que se cobra');

                await pool.query("UPDATE libros SET descuento_hasta = (NOW() AT TIME ZONE 'America/Lima')::date - 1 WHERE id_libro = ?", [sembrados.libroManual]);
                assert.equal(await ordenTotal(), lista, 'una promoción vencida ya no rebaja el precio');
            } finally {
                await pool.query('UPDATE libros SET precio_oferta = NULL, descuento_porcentaje = NULL, descuento_hasta = NULL WHERE id_libro = ?', [sembrados.libroManual]);
            }
        });

        await t.test('idempotencia_clave inválida se rechaza con 400', async () => {
            const cuerpo = { items: [{ id_libro: sembrados.libroManual, cantidad: 1 }], correo_compra: 'idem-invalida@example.test', tipo_entrega: 'tienda' };

            const sinClave = await pedir('/api/pagos/crear-orden', cliente, 'POST', cuerpo);
            assert.equal(sinClave.status, 400, `sin idempotencia_clave debe dar 400, no ${sinClave.status}`);

            const larga = await pedir('/api/pagos/crear-orden', cliente, 'POST', { ...cuerpo, idempotencia_clave: 'a'.repeat(200) });
            assert.equal(larga.status, 400, `una clave de 200 caracteres debe dar 400, no ${larga.status}`);

            const noTexto = await pedir('/api/pagos/crear-orden', cliente, 'POST', { ...cuerpo, idempotencia_clave: 12345 });
            assert.equal(noTexto.status, 400, `una clave numérica debe dar 400, no ${noTexto.status}`);
        });

        await t.test('concurrencia stock=1 no produce sobreventa', async () => {
            const antes = await leerStock(sembrados.libroConcurrencia);
            assert.equal(antes, 1, 'el libro de prueba parte de stock 1');

            const intentarVenta = (etiqueta) =>
                ventaModel
                    .crear({
                        id_usuario: sembrados.cliente,
                        detalles: [{ id_libro: sembrados.libroConcurrencia, cantidad: 1 }],
                        tipo_entrega: 'domicilio',
                        direccion: 'Av. Siempre Viva 742',
                        id_distrito: null,
                        correo_compra: `conc-${etiqueta}@example.test`,
                        external_reference: `CON-${etiqueta}-${crypto.randomUUID()}`,
                        estado: 'pendiente'
                    })
                    .then((v) => ({ ok: true, venta: v }))
                    .catch((e) => ({ ok: false, error: e }));

            const [a, b] = await Promise.all([intentarVenta('A'), intentarVenta('B')]);

            const exitos = [a, b].filter((r) => r.ok);
            const fallos = [a, b].filter((r) => !r.ok);

            assert.equal(exitos.length, 1, `exactamente una de las dos ventas debe prosperar, pero prosperaron ${exitos.length}`);
            assert.equal(fallos.length, 1, 'la otra debe fallar por stock insuficiente');
            assert.match(fallos[0].error.message, /stock insuficiente/i, `el fallo debe ser por stock: ${fallos[0].error.message}`);

            const idGanadora = exitos[0].venta?.id_venta ?? exitos[0].venta;
            if (idGanadora) {
                sembrados.ventas.push(idGanadora);
            }

            assert.equal(await leerStock(sembrados.libroConcurrencia), 0, 'el stock final debe ser 0, jamás negativo');
        });

        await t.test('GET /api/pedidos respeta la matriz de roles', async () => {
            const comoAdmin = await pedir('/api/pedidos', admin);
            assert.equal(comoAdmin.status, 200, `admin debe ver pedidos: ${comoAdmin.status}`);
            const cuerpoAdmin = await comoAdmin.json();
            assert.ok(Array.isArray(cuerpoAdmin.data), 'el listado de pedidos debe ser un arreglo');

            assert.ok(
                cuerpoAdmin.data.some((p) => p.id_venta === sembrados.ventaWebhook),
                'el pedido de la app debe aparecer en /api/pedidos'
            );

            const pedido = cuerpoAdmin.data.find((p) => p.id_venta === sembrados.ventaWebhook);
            for (const campo of ['estado', 'estado_entrega', 'tipo_entrega', 'total', 'fecha_venta']) {
                assert.ok(campo in pedido, `el pedido debe exponer "${campo}" para la pantalla`);
            }

            const filtrado = await pedir('/api/pedidos?tipo=domicilio', admin);
            assert.equal(filtrado.status, 200, `filtrar por tipo debe responder 200, no ${filtrado.status}`);
            const cuerpoFiltrado = await filtrado.json();
            assert.ok(
                cuerpoFiltrado.data.every((p) => p.tipo_entrega === 'domicilio'),
                'el filtro por tipo no debe devolver otros tipos'
            );

            const filtroInvalido = await pedir('/api/pedidos?tipo=inventado', admin);
            assert.equal(filtroInvalido.status, 400, `un filtro desconocido debe rechazarse, dio ${filtroInvalido.status}`);
            assert.equal((await filtroInvalido.json()).success, false);

            const comoCajero = await pedir('/api/pedidos', cajero);
            assert.equal(comoCajero.status, 403, `el cajero no debe ver pedidos: ${comoCajero.status}`);

            const comoCliente = await pedir('/api/pedidos', cliente);
            assert.equal(comoCliente.status, 403, `el cliente no debe ver pedidos: ${comoCliente.status}`);

            const sinToken = await pedir('/api/pedidos');
            assert.equal(sinToken.status, 401, `sin token debe ser 401: ${sinToken.status}`);
        });

        await t.test('transiciones logísticas válidas e inválidas', async () => {
            const crearPedido = async (tipoEntrega) => {
                const [venta] = await pool.query(
                    `INSERT INTO ventas (id_usuario, total, costo_envio, estado, estado_entrega, tipo_entrega, origen, external_reference, payu_order_id, correo_compra, fecha_pago, fecha_venta) VALUES (?, 40.00, 0.00, 'pagada', 'pendiente', ?, 'app', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id_venta`,
                    [sembrados.cliente, tipoEntrega, `PED-${crypto.randomUUID()}`, `PAY-${crypto.randomUUID()}`, 'pedidos@example.test']
                );

                sembrados.ventas.push(venta[0].id_venta);
                return venta[0].id_venta;
            };

            const mover = (id, estado) => pedir(`/api/pedidos/${id}/estado`, admin, 'PUT', { estado, confirmado: true });

            const recojo = await crearPedido('tienda');

            const r1 = await mover(recojo, 'preparando');
            assert.equal(r1.status, 400, `el paso retirado se rechaza: ${r1.status}`);

            const r2 = await mover(recojo, 'listo_recojo');
            assert.equal(r2.status, 200, `pendiente → listo_recojo: ${r2.status}`);

            const r3 = await mover(recojo, 'entregado');
            assert.equal(r3.status, 200, `listo_recojo → entregado: ${r3.status}`);

            const rFinal = await mover(recojo, 'preparando');
            assert.equal(rFinal.status, 400, `entregado → preparando debe rechazarse: ${rFinal.status}`);

            const delivery = await crearPedido('domicilio');

            const d1 = await mover(delivery, 'preparando');
            assert.equal(d1.status, 400, `el paso retirado se rechaza: ${d1.status}`);

            const d2 = await mover(delivery, 'en_camino');
            assert.equal(d2.status, 200, `pendiente → en_camino: ${d2.status}`);

            const d3 = await mover(delivery, 'entregado');
            assert.equal(d3.status, 200, `en_camino → entregado: ${d3.status}`);

            const dFinal = await mover(delivery, 'en_camino');
            assert.equal(dFinal.status, 400, `entregado → en_camino debe rechazarse: ${dFinal.status}`);

            const salto = await crearPedido('domicilio');
            const saltoDirecto = await mover(salto, 'entregado');
            assert.equal(saltoDirecto.status, 400, `pendiente → entregado debe rechazarse: ${saltoDirecto.status}`);

            const saltoRecojo = await crearPedido('domicilio');
            const aListo = await mover(saltoRecojo, 'listo_recojo');
            assert.equal(aListo.status, 400, `pendiente → listo_recojo en un delivery debe rechazarse: ${aListo.status}`);

            const saltoCamino = await crearPedido('tienda');
            const aCamino = await mover(saltoCamino, 'en_camino');
            assert.equal(aCamino.status, 400, `pendiente → en_camino en un recojo debe rechazarse: ${aCamino.status}`);

            const invalido = await mover(saltoRecojo, 'inventado');
            assert.equal(invalido.status, 400, `un estado inexistente debe rechazarse: ${invalido.status}`);

            const trasMover = await leerVenta(recojo);
            assert.equal(trasMover.estado, 'pagada', 'la entrega final conserva el estado comercial');
            assert.equal(Number(trasMover.total), 40, 'mover la entrega no debe alterar el total');
            assert.ok(trasMover.payu_order_id, 'mover la entrega no debe borrar la orden de PayU');
            assert.equal(trasMover.estado_entrega, 'entregado', 'el estado_entrega debe quedar en entregado');
        });

        await t.test('un tipo de entrega legacy inválido se rechaza con 409', async () => {
            const [sinCheck] = await pool.query(
                `INSERT INTO ventas (id_usuario, total, costo_envio, estado, estado_entrega, tipo_entrega, origen, external_reference, payu_order_id, correo_compra, fecha_pago, fecha_venta) VALUES (?, 40.00, 0.00, 'pagada', 'pendiente', 'domicilio', 'app', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id_venta`,
                [sembrados.cliente, `PED-${crypto.randomUUID()}`, `PAY-${crypto.randomUUID()}`, 'legacy@example.test']
            );

            const idLegacy = sinCheck[0].id_venta;
            sembrados.ventas.push(idLegacy);

            const clienteRestricciones = await pool._pool.connect();

            try {
                try {
                    await clienteRestricciones.query('BEGIN');
                    await clienteRestricciones.query('ALTER TABLE ventas DROP CONSTRAINT ventas_tipo_entrega_check');
                    await clienteRestricciones.query('ALTER TABLE ventas DROP CONSTRAINT ventas_tipo_estado_entrega_check');
                    await clienteRestricciones.query('COMMIT');
                } catch (error) {
                    await clienteRestricciones.query('ROLLBACK').catch(() => {});
                    throw error;
                }

                await pool.query('UPDATE ventas SET tipo_entrega = ? WHERE id_venta = ?', ['agencia', idLegacy]);

                const r = await pedir(`/api/pedidos/${idLegacy}/estado`, admin, 'PUT', { estado: 'en_camino', confirmado: true });

                assert.equal(r.status, 409, `un tipo legacy inválido debe dar 409, no ${r.status}`);
                const cuerpo409 = await r.json();

                assert.match(cuerpo409?.mensaje || '', /tipo de entrega/i, 'el mensaje debe explicar que el tipo de entrega es el problema');

                const [tras] = await pool.query('SELECT estado_entrega FROM ventas WHERE id_venta = ?', [idLegacy]);
                assert.equal(tras[0].estado_entrega, 'pendiente', 'un 409 no debe haber modificado el estado');

                await pool.query('UPDATE ventas SET tipo_entrega = NULL WHERE id_venta = ?', [idLegacy]);

                const nulo = await pedir(`/api/pedidos/${idLegacy}/estado`, admin, 'PUT', { estado: 'en_camino', confirmado: true });
                const cuerpoNulo = await nulo.json().catch(() => ({}));

                assert.equal(nulo.status, 409, `un tipo NULL debe dar 409, no ${nulo.status}`);
                assert.match(cuerpoNulo?.mensaje || '', /tipo de entrega/i, 'el mensaje de NULL también debe señalar el tipo de entrega');
            } finally {
                try {
                    await clienteRestricciones.query('BEGIN');

                    await clienteRestricciones.query('UPDATE ventas SET tipo_entrega = $1 WHERE id_venta = $2', ['tienda', idLegacy]);
                    await clienteRestricciones.query(
                        `ALTER TABLE ventas ADD CONSTRAINT ventas_tipo_entrega_check CHECK (tipo_entrega IS NULL OR tipo_entrega IN ('domicilio', 'tienda'))`
                    );
                    await clienteRestricciones.query(
                        `ALTER TABLE ventas ADD CONSTRAINT ventas_tipo_estado_entrega_check CHECK (tipo_entrega IS NULL OR (tipo_entrega = 'domicilio' AND estado_entrega IN ('pendiente', 'preparando', 'en_camino', 'entregado', 'cancelado')) OR (tipo_entrega = 'tienda' AND estado_entrega IN ('pendiente', 'preparando', 'listo_recojo', 'entregado', 'cancelado')))`
                    );
                    await clienteRestricciones.query('COMMIT');
                } catch (error) {
                    await clienteRestricciones.query('ROLLBACK').catch(() => {});
                    throw error;
                } finally {
                    clienteRestricciones.release();
                }
            }
        });

        await t.test('crear con tipo inexistente se rechaza, sin tipo se asume tienda', async () => {
            const stockAntes = await leerStock(sembrados.libroManual);
            const ventasAntes = await contarVentas();

            const cuerpoBase = {
                items: [{ id_libro: sembrados.libroManual, cantidad: 1 }],
                correo_compra: 'tipo-invalido@example.test',
                direccion: 'Av. Siempre Viva 742',
                idempotencia_clave: crypto.randomUUID()
            };

            const typo = await pedir('/api/pagos/crear-orden', cliente, 'POST', { ...cuerpoBase, idempotencia_clave: crypto.randomUUID(), tipo_entrega: 'domiciloi' });
            const cuerpoTypo = await typo.json().catch(() => ({}));

            assert.equal(typo.status, 400, `un tipo inexistente debe dar 400, no ${typo.status}`);
            assert.match(cuerpoTypo?.mensaje || '', /domiciloi/, 'el mensaje debe repetir el valor rechazado para que el cliente lo detecte');

            const agencia = await pedir('/api/pagos/crear-orden', cliente, 'POST', { ...cuerpoBase, idempotencia_clave: crypto.randomUUID(), tipo_entrega: 'agencia' });
            const cuerpoAgencia = await agencia.json().catch(() => ({}));

            assert.equal(agencia.status, 400, `agencia debe rechazarse, no ${agencia.status}`);
            assert.match(cuerpoAgencia?.mensaje || '', /agencia ya no est[áa] disponible/i, 'agencia merece su propio mensaje, no el de "tipo inexistente"');

            const agenciaEspaciada = await pedir('/api/pagos/crear-orden', cliente, 'POST', { ...cuerpoBase, idempotencia_clave: crypto.randomUUID(), tipo_entrega: ' agencia ' });
            const cuerpoAgenciaEspaciada = await agenciaEspaciada.json().catch(() => ({}));

            assert.equal(agenciaEspaciada.status, 400, `' agencia ' debe rechazarse, no ${agenciaEspaciada.status}`);
            assert.match(cuerpoAgenciaEspaciada?.mensaje || '', /agencia ya no est[áa] disponible/i, 'los espacios no deben cambiar el mensaje de agencia');

            for (const valor of [123, true, ['domicilio']]) {
                const noTexto = await pedir('/api/pagos/crear-orden', cliente, 'POST', { ...cuerpoBase, idempotencia_clave: crypto.randomUUID(), tipo_entrega: valor });

                assert.equal(noTexto.status, 400, `tipo_entrega ${JSON.stringify(valor)} (no texto) debe dar 400, no ${noTexto.status}`);
            }

            const sinTipo = await pedir('/api/pagos/crear-orden', cliente, 'POST', {
                ...cuerpoBase,
                idempotencia_clave: crypto.randomUUID(),
                correo_compra: 'sin-tipo@example.test'
            });

            assert.notEqual(sinTipo.status, 400, `omitir el tipo no debe romper apps antiguas, pero devolvió ${sinTipo.status}`);

            const ordenCreada = sinTipo.status >= 200 && sinTipo.status < 300;

            if (ordenCreada) {
                const cuerpoSinTipo = await sinTipo.json().catch(() => ({}));
                const idSinTipo = cuerpoSinTipo.data?.id_venta;

                assert.ok(idSinTipo, 'la orden creada debe traer data.id_venta');
                sembrados.ventas.push(idSinTipo);

                assert.equal(await contarVentas(), ventasAntes + 1, 'solo debe existir la venta del caso sin tipo');
                assert.equal(await leerStock(sembrados.libroManual), stockAntes - 1, 'el pedido válido es el único que descuenta stock');

                const filaSinTipo = await leerVenta(idSinTipo);
                assert.equal(filaSinTipo.tipo_entrega, 'tienda', 'omitir el tipo debe assumir recojo en tienda');
            } else {
                assert.equal(await contarVentas(), ventasAntes, 'un rechazo no debe crear ninguna venta');
                assert.equal(await leerStock(sembrados.libroManual), stockAntes, 'un rechazo no debe descontar stock');
            }
        });

        await t.test('las rutas retiradas siguen fuera', async () => {
            const puntoVenta = await pedir('/api/punto-venta', admin);
            assert.equal(puntoVenta.status, 404, 'punto de venta debe estar fuera');

            const cierreCaja = await pedir('/api/reportes/cierre-caja', admin);
            assert.equal(cierreCaja.status, 404, 'el cierre de caja no tiene endpoint');
        });
    } finally {
        await limpiar();
    }
});
