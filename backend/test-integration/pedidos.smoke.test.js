// ============================================================
// SMOKE FUNCIONAL DEL MÓDULO DE PEDIDOS (HTTP + PostgreSQL)
// ============================================================
// Prueba el contrato real de PEDIDOS sobre una venta sembrada:
//
//   · GET  /api/pedidos            → 200 (listado, admin)
//   · GET  /api/pedidos/:id        → 200 (detalle existente)
//   · GET  /api/pedidos/:id        → 404 (inexistente)
//   · PUT  /api/pedidos/:id/estado → éxito (transición válida)
//   · PUT  /api/pedidos/:id/estado → 400 (transición inválida)
//   · GET  /api/pedidos/usuario/:id_usuario → 200 (mis pedidos)
//
// Una venta con tipo_entrega 'domicilio' y estado_entrega 'pendiente'
// se siembra al inicio y se elimina al final; nada queda en la BD.
// Requiere servidor y PostgreSQL: npm run test:integration
// ============================================================

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const pool = require('../src/config/database');

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

// ------------------------------------------------------------
// Datos sembrados (se limpian en test.after)
// ------------------------------------------------------------
let idAdmin = null;
let idCliente = null;
let idAutor = null;
let idCategoria = null;
let idLibro = null;
let idVenta = null;
let idDetalle = null;

const tokenPara = (idUsuario) =>
    jwt.sign(
        { id_usuario: idUsuario },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
    );

const cabeceras = (token) => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
});

const pedir = (ruta, cabecerasPeticion, metodo = 'GET', cuerpo) => {
    const sinCuerpo = metodo === 'GET' || metodo === 'HEAD';

    return fetch(`${baseUrl}${ruta}`, {
        method: metodo,
        headers: cabecerasPeticion,
        body:
            sinCuerpo || cuerpo === undefined
                ? undefined
                : JSON.stringify(cuerpo),
    });
};

// ------------------------------------------------------------
// Sembrar datos: usuario, autor, categoría, libro y venta.
// ------------------------------------------------------------
const sembrar = async () => {
    const sufijo = crypto.randomUUID();

    const crearUsuario = async (rol) => {
        const [resultado] = await pool.query(`
            INSERT INTO usuarios
                (nombre, apellido, email, password, rol, estado)
            VALUES
                ('Pedidos', 'CI', ?, 'no-login', ?, 1)
            RETURNING id_usuario
        `, [`ped-${rol}-${sufijo}@example.test`, rol]);

        return resultado[0].id_usuario;
    };

    idAdmin = await crearUsuario('administrador');
    idCliente = await crearUsuario('cliente');

    const [autor] = await pool.query(`
        INSERT INTO autores (nombre, apellido, estado)
        VALUES ('Ped', 'Autor', 1)
        RETURNING id_autor
    `);
    idAutor = autor[0].id_autor;

    const [categoria] = await pool.query(`
        INSERT INTO categorias (nombre, estado)
        VALUES ('Pedidos Test', 1)
        RETURNING id_categoria
    `);
    idCategoria = categoria[0].id_categoria;

    const [libro] = await pool.query(`
        INSERT INTO libros
            (titulo, isbn, precio, stock, id_autor, id_categoria, estado)
        VALUES
            ('Libro de pedidos', ?, 25.50, 10, ?, ?, 1)
        RETURNING id_libro
    `, [`ISBN-PED-${sufijo.slice(0, 8)}`, idAutor, idCategoria]);
    idLibro = libro[0].id_libro;

    await pool.query(`
        INSERT INTO inventario (id_libro, stock, stock_minimo)
        VALUES (?, 10, 2)
    `, [idLibro]);

    const [libroId] = await pool.query(`
        SELECT id_libro FROM libros WHERE id_libro = ?
    `, [idLibro]);

    if (libroId.length === 0) {
        throw new Error(
            'No se pudo sembrar el libro de prueba'
        );
    }

    const [venta] = await pool.query(`
        INSERT INTO ventas
            (id_usuario, total, costo_envio, estado, estado_entrega,
             tipo_entrega, origen, correo_compra, fecha_venta)
        VALUES
            (?, 25.50, 0.00, 'pagada', 'pendiente',
             'domicilio', 'app', ?, CURRENT_TIMESTAMP)
        RETURNING id_venta
    `, [idCliente, `cliente-ped-${sufijo}@example.test`]);
    idVenta = venta[0].id_venta;

    const [detalle] = await pool.query(`
        INSERT INTO detalle_venta
            (id_venta, id_libro, cantidad, precio_unitario, subtotal)
        VALUES
            (?, ?, 1, 25.50, 25.50)
        RETURNING id_detalle
    `, [idVenta, idLibro]);
    idDetalle = detalle[0].id_detalle;
};

const limpiar = async () => {
    if (idDetalle) {
        await pool.query(
            'DELETE FROM detalle_venta WHERE id_detalle = ?',
            [idDetalle]
        );
    }

    if (idVenta) {
        await pool.query(
            'DELETE FROM ventas WHERE id_venta = ?',
            [idVenta]
        );
    }

    if (idLibro) {
        await pool.query(
            'DELETE FROM inventario WHERE id_libro = ?',
            [idLibro]
        );
        await pool.query(
            'DELETE FROM libros WHERE id_libro = ?',
            [idLibro]
        );
    }

    if (idAutor) {
        await pool.query(
            'DELETE FROM autores WHERE id_autor = ?',
            [idAutor]
        );
    }

    if (idCategoria) {
        await pool.query(
            'DELETE FROM categorias WHERE id_categoria = ?',
            [idCategoria]
        );
    }

    for (const id of [idAdmin, idCliente]) {
        if (id) {
            await pool.query(
                'DELETE FROM historial_operaciones WHERE id_usuario = ?',
                [id]
            );
        }
    }

    for (const id of [idAdmin, idCliente]) {
        if (id) {
            await pool.query(
                'DELETE FROM usuarios WHERE id_usuario = ?',
                [id]
            );
        }
    }
};

// El pool se cierra al final del archivo, no dentro de limpiar(): si se
// cerrara aquí, cualquier test posterior de este archivo que consulte la
// base fallaría con "Cannot use a pool after calling end".
test.after(async () => {
    await pool.end();
});

test('contrato funcional de pedidos', async () => {
    await sembrar();

    const admin = cabeceras(tokenPara(idAdmin));
    const cliente = cabeceras(tokenPara(idCliente));

    try {
        // --- Listado (admin) ---
        const listado = await pedir('/api/pedidos', admin);
        assert.equal(
            listado.status,
            200,
            `listado de pedidos devolvió ${listado.status}`
        );
        const cuerpo = await listado.json();
        assert.equal(cuerpo.success, true);
        assert.ok(
            Array.isArray(cuerpo.data),
            'la respuesta del listado debe ser un arreglo'
        );
        assert.ok(
            cuerpo.data.some((p) => p.id_venta === idVenta),
            'la venta sembrada debe aparecer en el listado'
        );

        // --- Detalle existente (admin) ---
        const detalle = await pedir(
            `/api/pedidos/${idVenta}`,
            admin
        );
        assert.equal(
            detalle.status,
            200,
            `detalle existente devolvió ${detalle.status}`
        );
        const detalleCuerpo = await detalle.json();
        assert.equal(detalleCuerpo.data.id_venta, idVenta);
        assert.equal(
            detalleCuerpo.data.estado_entrega,
            'pendiente'
        );

        // --- Detalle inexistente → 404 (no 500) ---
        const inexistente = await pedir(
            '/api/pedidos/999999',
            admin
        );
        assert.equal(
            inexistente.status,
            404,
            `detalle inexistente devolvió ${inexistente.status}`
        );

        // --- Transición válida: pendiente → preparando ---
        const valida = await pedir(
            `/api/pedidos/${idVenta}/estado`,
            admin,
            'PUT',
            { estado: 'preparando' }
        );
        assert.equal(
            valida.status,
            200,
            `transición válida devolvió ${valida.status}`
        );
        const validaCuerpo = await valida.json();
        assert.equal(
            validaCuerpo.data.estado_entrega,
            'preparando'
        );

        // --- Transición inválida: preparando → entregado (salta etapas) ---
        const invalida = await pedir(
            `/api/pedidos/${idVenta}/estado`,
            admin,
            'PUT',
            { estado: 'entregado' }
        );
        assert.equal(
            invalida.status,
            400,
            `transición inválida devolvió ${invalida.status} (debería ser 400)`
        );

        // --- Transición al mismo estado → 400 ---
        const misma = await pedir(
            `/api/pedidos/${idVenta}/estado`,
            admin,
            'PUT',
            { estado: 'preparando' }
        );
        assert.equal(
            misma.status,
            400,
            `mismo estado devolvió ${misma.status} (debería ser 400)`
        );

        // --- Mis pedidos (cliente autenticado) ---
        const misPedidos = await pedir(
            `/api/pedidos/usuario/${idCliente}`,
            cliente
        );
        assert.equal(
            misPedidos.status,
            200,
            `mis pedidos devolvió ${misPedidos.status}`
        );
        const misPedidosCuerpo = await misPedidos.json();
        assert.ok(
            misPedidosCuerpo.data.some((p) => p.id_venta === idVenta),
            'el cliente debe ver su venta en mis pedidos'
        );

        // --- El cliente NO accede a las rutas del panel de pedidos ---
        const listadoCliente = await pedir('/api/pedidos', cliente);
        assert.equal(
            listadoCliente.status,
            403,
            `cliente en listado de pedidos devolvió ${listadoCliente.status}`
        );

        // --- Cancelación: camino de éxito completo ---
        // estaba en 'preparando', así que cancelar es un salto válido.
        // Antes esto no se probaba por HTTP, solo en la lógica.
        // El libro se siembra con 10 y esta venta no lo descuenta, así que
        // la foto previa es la única referencia válida para comparar.
        const [filasStockPrevio] = await pool.query(
            'SELECT stock FROM libros WHERE id_libro = ?',
            [idLibro]
        );
        const stockPrevio = Number(filasStockPrevio[0].stock);

        const cancelacion = await pedir(
            `/api/pedidos/${idVenta}/estado`,
            admin,
            'PUT',
            { estado: 'cancelado' }
        );
        assert.equal(
            cancelacion.status,
            200,
            `la cancelación debe permitirse, devolvió ${cancelacion.status}`
        );

        // pool es un wrapper compatible con mysql2: devuelve [filas, fields].
        const [filasTrasCancelar] = await pool.query(
            'SELECT estado, estado_entrega FROM ventas WHERE id_venta = ?',
            [idVenta]
        );

        assert.equal(
            filasTrasCancelar[0].estado_entrega,
            'cancelado',
            'el estado logístico debe quedar en cancelado'
        );
        assert.equal(
            filasTrasCancelar[0].estado,
            'pagada',
            'cancelar la entrega no debe alterar el estado comercial'
        );

        // Cancelar la entrega no toca el stock: la venta es de una fila ya
        // sembrada, así que el número debe seguir siendo el de antes.
        const [filasStock] = await pool.query(
            'SELECT stock FROM libros WHERE id_libro = ?',
            [idLibro]
        );
        assert.equal(
            Number(filasStock[0].stock),
            stockPrevio,
            'cancelar la entrega no debe modificar el stock'
        );

        // --- Desde un estado final no se sale ---
        const desdeCancelado = await pedir(
            `/api/pedidos/${idVenta}/estado`,
            admin,
            'PUT',
            { estado: 'preparando' }
        );
        assert.equal(
            desdeCancelado.status,
            400,
            `un pedido cancelado no debe volver a moverse, devolvió ${desdeCancelado.status}`
        );
        assert.notEqual(
            desdeCancelado.status,
            500,
            'un rechazo por estado final no puede ser un 5xx'
        );
    } finally {
        await limpiar();
    }
});

test('ruta de estado de pedido sin token devuelve 401', async () => {
    const respuesta = await pedir(
        '/api/pedidos/1/estado',
        {},
        'PUT',
        { estado: 'preparando' }
    );

    assert.equal(
        respuesta.status,
        401,
        `PUT /api/pedidos/1/estado sin token devolvió ${respuesta.status}`
    );
});