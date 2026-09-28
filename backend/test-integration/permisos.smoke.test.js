// ============================================================
// SMOKE DE PERMISOS POR ROL (HTTP + PostgreSQL)
// ============================================================
// Crea un administrador, un cajero y un cliente, y comprueba la
// matriz de permisos acordada:
//
//   · cajero  -> operación de caja: ventas, reservas, pagos,
//                comprobantes, libros e inventario (solo lectura)
//   · cajero  -> solo los agregados operativos de reportes
//   · cajero  -> sin acceso a lo exclusivo del administrador
//                (reportes administrativos, reembolsos, anulación,
//                SUNAT, usuarios, catálogo, historial)
//   · cliente -> sin acceso a las lecturas del panel, pero sí a
//                sus propias rutas y al catálogo público
//
// Solo hace lecturas y comprueba rechazos (403): ninguna petición
// llega al controlador, así que no deja datos de prueba.
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
// Consultas que el cajero comparte con el administrador.
// El cliente recibe 403 en todas.
// ------------------------------------------------------------
const PANEL_OPERATIVO = [
    '/api/ventas',
    '/api/reservas',
    '/api/pagos',
    '/api/pagos/resumen',
    '/api/comprobantes',
    '/api/comprobantes/resumen',
    '/api/inventario',
    '/api/inventario/stock-bajo',
    '/api/inventario/movimientos',
    '/api/reportes/ventas-por-estado',
    '/api/reportes/reservas-por-estado',
    '/api/reportes/stock-bajo',
    '/api/reportes/cierre-caja',
];

// ------------------------------------------------------------
// Reportes administrativos: el cajero NO debe verlos aunque
// conozca la URL. El administrador sí.
// ------------------------------------------------------------
const REPORTES_ADMIN = [
    '/api/reportes/resumen',
    '/api/reportes/libros-mas-vendidos',
    '/api/reportes/ventas-por-mes',
    '/api/reportes/ventas-por-dia',
    '/api/reportes/indicadores-ventas',
];

// Endpoints que solo puede usar el administrador.
const EXCLUSIVOS_DE_ADMIN = [
    ['POST', '/api/ventas/999999/reembolso'],
    ['PUT', '/api/comprobantes/999999/sunat'],
    ['POST', '/api/comprobantes/999999/anular'],
    ['POST', '/api/inventario'],
    ['PUT', '/api/inventario/libro/999999'],
    ['PUT', '/api/inventario/libro/999999/stock'],
    ['PUT', '/api/libros/999999'],
    ['DELETE', '/api/libros/999999'],
    ['POST', '/api/autores'],
    ['PUT', '/api/autores/999999'],
    ['POST', '/api/categorias'],
    ['PUT', '/api/categorias/999999'],
    ['PUT', '/api/ubicaciones/distritos/999999'],
    ['PATCH', '/api/usuarios/999999'],
    ['GET', '/api/usuarios'],
    ['GET', '/api/historial'],
    ['GET', '/api/reclamaciones'],
    ['PUT', '/api/empresa'],
    ['POST', '/api/historial'],
];

// Rutas públicas a propósito: el Libro de Reclamaciones y el catálogo
// se abren sin sesión, así que no son un permiso del panel.
// GET /api/empresa es público por diseño (datos del emisor).
const RUTAS_PUBLICAS = [
    '/api/empresa',
    '/api/libros',
];

// El catálogo es público, pero el administrador y el cajero también
// tienen que poder leerlo con su token (lo usa el panel).
const CATALOGO = ['/api/libros'];

// Operaciones del día que el cajero sí puede ejecutar. Se apuntan a
// un id inexistente: responden 404/400, nunca 403, lo que prueba que
// el middleware dejó pasar la petición sin tocar la base.
const OPERACIONES_DEL_PANEL = [
    ['PUT', '/api/ventas/999999/estado'],
    ['POST', '/api/ventas/999999/comprobante'],
    ['PUT', '/api/reservas/999999/estado'],
];

// Rutas que el cliente puede usar con normalidad.
const RUTAS_DEL_CLIENTE = [
    '/api/ventas/mis-ventas',
    '/api/reservas/mis-reservas',
    '/api/usuarios/perfil',
    '/api/libros',
];

const ids = [];

const crearUsuario = async (rol) => {
    const email = `perm-${rol}-${crypto.randomUUID()}@example.test`;

    const [resultado] = await pool.query(`
        INSERT INTO usuarios
            (nombre, apellido, email, password, rol, estado)
        VALUES
            ('Permisos', 'CI', ?, 'no-login', ?, 1)
        RETURNING id_usuario
    `, [email, rol]);

    const id = resultado[0].id_usuario;
    ids.push(id);

    return id;
};

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

// GET y HEAD no admiten cuerpo: fetch lanza "Request with GET/HEAD
// method cannot have body" si se lo pasamos, así que se ignora.
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

// El pool se cierra una sola vez, al final del archivo: cerrarlo
// dentro de un test rompería los siguientes.
test.after(async () => {
    for (const id of ids) {
        await pool.query('DELETE FROM usuarios WHERE id_usuario = ?', [id]);
    }
    await pool.end();
});

test('matriz de permisos por rol', async () => {
    const idAdmin = await crearUsuario('administrador');
    const idCajero = await crearUsuario('cajero');
    const idCliente = await crearUsuario('cliente');

    const admin = cabeceras(tokenPara(idAdmin));
    const cajero = cabeceras(tokenPara(idCajero));
    const cliente = cabeceras(tokenPara(idCliente));

    // --- Cajero: operación de caja ---
    for (const ruta of PANEL_OPERATIVO) {
        const respuesta = await pedir(ruta, cajero);

        assert.equal(
            respuesta.status,
            200,
            `cajero en ${ruta} devolvió ${respuesta.status}`
        );
    }

    // --- Cajero: los reportes administrativos le dan 403 ---
    for (const ruta of REPORTES_ADMIN) {
        const respuesta = await pedir(ruta, cajero);

        assert.equal(
            respuesta.status,
            403,
            `cajero en ${ruta} devolvió ${respuesta.status} (debería ser 403)`
        );
    }

    // --- Cajero: no toca lo exclusivo del administrador ---
    for (const [metodo, ruta] of EXCLUSIVOS_DE_ADMIN) {
        const respuesta = await pedir(ruta, cajero, metodo, {});

        assert.equal(
            respuesta.status,
            403,
            `cajero en ${metodo} ${ruta} devolvió ${respuesta.status}`
        );
    }

    // --- Cajero: puede leer el catálogo con su token ---
    for (const ruta of CATALOGO) {
        const respuesta = await pedir(ruta, cajero);

        assert.equal(
            respuesta.status,
            200,
            `cajero en ${ruta} devolvió ${respuesta.status} (debería poder leer)`
        );
    }

    // --- Cajero: el filtro deja pasar las operaciones del día ---
    for (const [metodo, ruta] of OPERACIONES_DEL_PANEL) {
        const respuesta = await pedir(ruta, cajero, metodo, {});

        assert.notEqual(
            respuesta.status,
            403,
            `cajero bloqueado en ${metodo} ${ruta}`
        );
    }

    // --- Cliente: fuera del panel ---
    for (const ruta of [...PANEL_OPERATIVO, ...REPORTES_ADMIN]) {
        const respuesta = await pedir(ruta, cliente);

        assert.equal(
            respuesta.status,
            403,
            `cliente en ${ruta} devolvió ${respuesta.status}`
        );
    }

    for (const [metodo, ruta] of EXCLUSIVOS_DE_ADMIN) {
        const respuesta = await pedir(ruta, cliente, metodo, {});

        assert.equal(
            respuesta.status,
            403,
            `cliente en ${metodo} ${ruta} devolvió ${respuesta.status}`
        );
    }

    // --- Cliente: sus propias rutas siguen funcionando ---
    for (const ruta of RUTAS_DEL_CLIENTE) {
        const respuesta = await pedir(ruta, cliente);

        assert.equal(
            respuesta.status,
            200,
            `cliente en ${ruta} devolvió ${respuesta.status}`
        );
    }

    // --- Administrador: acceso completo ---
    for (const ruta of [
        ...PANEL_OPERATIVO,
        ...REPORTES_ADMIN,
        '/api/usuarios',
        '/api/historial',
        '/api/reclamaciones',
    ]) {
        const respuesta = await pedir(ruta, admin);

        assert.equal(
            respuesta.status,
            200,
            `administrador en ${ruta} devolvió ${respuesta.status}`
        );
    }

    // --- Las rutas públicas siguen abiertas para todos ---
    for (const ruta of RUTAS_PUBLICAS) {
        const sinToken = await pedir(ruta, {});

        assert.equal(
            sinToken.status,
            200,
            `${ruta} sin token devolvió ${sinToken.status}`
        );
    }
});

test('sin token no se pasa: 401, no 403', async () => {
    for (const ruta of ['/api/ventas', '/api/reportes/resumen', '/api/usuarios']) {
        const respuesta = await pedir(ruta, {});

        assert.equal(
            respuesta.status,
            401,
            `sin token en ${ruta} devolvió ${respuesta.status}`
        );
    }
});

test('un token inválido devuelve 401 y no 403', async () => {
    const invalido = { Authorization: 'Bearer no-es-un-jwt' };

    const respuesta = await pedir('/api/ventas', invalido);

    assert.equal(respuesta.status, 401);
});

test('una cuenta eliminada no se reactiva ni cambia de rol', async () => {
    const idUsuario = await crearUsuario('cliente');
    const idAdmin = await crearUsuario('administrador');
    const admin = cabeceras(tokenPara(idAdmin));

    await pool.query(
        'UPDATE usuarios SET fecha_eliminacion = NOW(), estado = 0 WHERE id_usuario = ?',
        [idUsuario]
    );

    // Los cuatro intentos: reactivar, cajero, administrador y cliente.
    for (const cuerpo of [
        { estado: 1 },
        { rol: 'cajero' },
        { rol: 'administrador' },
        { rol: 'cliente' },
        { estado: 1, rol: 'administrador' },
    ]) {
        const respuesta = await pedir(
            `/api/usuarios/${idUsuario}`,
            admin,
            'PATCH',
            cuerpo
        );

        assert.equal(
            respuesta.status,
            403,
            `se aceptó ${JSON.stringify(cuerpo)} sobre una cuenta eliminada`
        );
    }

    const [estado] = await pool.query(
        'SELECT estado, rol FROM usuarios WHERE id_usuario = ?',
        [idUsuario]
    );

    assert.equal(Number(estado[0].estado), 0);
    assert.equal(estado[0].rol, 'cliente');
});
