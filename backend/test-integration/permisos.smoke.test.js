const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const pool = require('../src/config/database');

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

const PANEL_OPERATIVO = [
    '/api/ventas',
    '/api/pagos',
    '/api/pagos/resumen',
    '/api/comprobantes',
    '/api/comprobantes/resumen',
    '/api/inventario',
    '/api/inventario/stock-bajo',
    '/api/inventario/movimientos',
    '/api/pedidos',
    '/api/reportes/ventas-por-estado'
];

const REPORTES_ADMIN = [
    '/api/reportes/resumen',
    '/api/reportes/libros-mas-vendidos',
    '/api/reportes/ventas-por-mes',
    '/api/reportes/ventas-por-dia',
    '/api/reportes/indicadores-ventas'
];

const EXCLUSIVOS_DE_ADMIN = [
    ['POST', '/api/ventas/999999/reembolso'],
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
    ['POST', '/api/historial']
];

const RUTAS_PUBLICAS = ['/api/empresa', '/api/libros'];
const CATALOGO = ['/api/libros'];
const RUTAS_DEL_CLIENTE = ['/api/ventas/mis-ventas', '/api/usuarios/perfil', '/api/libros'];
const ids = [];
const idsCategoria = [];
const idsAutor = [];

const crearUsuario = async (rol) => {
    const email = `perm-${rol}-${crypto.randomUUID()}@example.test`;

    const [resultado] = await pool.query(
        `INSERT INTO usuarios (nombre, apellido, email, password, rol, estado) VALUES ('Permisos', 'CI', ?, 'no-login', ?, 1) RETURNING id_usuario`,
        [email, rol]
    );

    const id = resultado[0].id_usuario;
    ids.push(id);

    return id;
};

const crearCategoria = async (nombre) => {
    const [resultado] = await pool.query(`INSERT INTO categorias (nombre, estado) VALUES (?, 1) RETURNING id_categoria`, [`${nombre}-${crypto.randomUUID().slice(0, 8)}`]);

    idsCategoria.push(resultado[0].id_categoria);

    return resultado[0].id_categoria;
};

const crearAutor = async (nombre) => {
    const [resultado] = await pool.query(`INSERT INTO autores (nombre, apellido, estado) VALUES (?, 'Prueba', 1) RETURNING id_autor`, [
        `${nombre}-${crypto.randomUUID().slice(0, 8)}`
    ]);

    idsAutor.push(resultado[0].id_autor);

    return resultado[0].id_autor;
};

const tokenPara = (idUsuario) => jwt.sign({ id_usuario: idUsuario }, process.env.JWT_SECRET, { expiresIn: '5m' });

const cabeceras = (token) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

const pedir = (ruta, cabecerasPeticion, metodo = 'GET', cuerpo) => {
    const sinCuerpo = metodo === 'GET' || metodo === 'HEAD';

    return fetch(`${baseUrl}${ruta}`, { method: metodo, headers: cabecerasPeticion, body: sinCuerpo || cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
};

test.after(async () => {
    for (const id of ids) {
        await pool.query('DELETE FROM usuarios WHERE id_usuario = ?', [id]);
    }

    for (const id of idsCategoria) {
        await pool.query('DELETE FROM categorias WHERE id_categoria = ?', [id]);
    }
    for (const id of idsAutor) {
        await pool.query('DELETE FROM autores WHERE id_autor = ?', [id]);
    }
    await pool.end();
});

test('matriz de permisos por rol', async () => {
    const idAdmin = await crearUsuario('administrador');
    const idCajero = await crearUsuario('cliente');
    const idCliente = await crearUsuario('cliente');

    const admin = cabeceras(tokenPara(idAdmin));

    const cajero = cabeceras(jwt.sign({ id_usuario: idCajero, rol: 'cajero' }, process.env.JWT_SECRET, { expiresIn: '5m' }));
    const cliente = cabeceras(tokenPara(idCliente));

    for (const ruta of [...PANEL_OPERATIVO, ...REPORTES_ADMIN]) {
        const respuesta = await pedir(ruta, cajero);

        assert.equal(respuesta.status, 403, `cajero en ${ruta} devolvió ${respuesta.status} (debería ser 403)`);
    }

    for (const [metodo, ruta] of EXCLUSIVOS_DE_ADMIN) {
        const respuesta = await pedir(ruta, cajero, metodo, {});

        assert.equal(respuesta.status, 403, `cajero en ${metodo} ${ruta} devolvió ${respuesta.status}`);
    }

    for (const ruta of CATALOGO) {
        const respuesta = await pedir(ruta, cajero);

        assert.equal(respuesta.status, 200, `cajero en ${ruta} devolvió ${respuesta.status} (catálogo público)`);
    }

    for (const ruta of [...PANEL_OPERATIVO, ...REPORTES_ADMIN]) {
        const respuesta = await pedir(ruta, cliente);

        assert.equal(respuesta.status, 403, `cliente en ${ruta} devolvió ${respuesta.status}`);
    }

    for (const [metodo, ruta] of EXCLUSIVOS_DE_ADMIN) {
        const respuesta = await pedir(ruta, cliente, metodo, {});

        assert.equal(respuesta.status, 403, `cliente en ${metodo} ${ruta} devolvió ${respuesta.status}`);
    }

    for (const ruta of RUTAS_DEL_CLIENTE) {
        const respuesta = await pedir(ruta, cliente);

        assert.equal(respuesta.status, 200, `cliente en ${ruta} devolvió ${respuesta.status}`);
    }

    for (const ruta of [...PANEL_OPERATIVO, ...REPORTES_ADMIN, '/api/usuarios', '/api/historial', '/api/reclamaciones']) {
        const respuesta = await pedir(ruta, admin);

        assert.equal(respuesta.status, 200, `administrador en ${ruta} devolvió ${respuesta.status}`);
    }

    for (const ruta of RUTAS_PUBLICAS) {
        const sinToken = await pedir(ruta, {});

        assert.equal(sinToken.status, 200, `${ruta} sin token devolvió ${sinToken.status}`);
    }
});

test('los favoritos del cliente funcionan sobre el esquema canónico', async () => {
    const idCliente = await crearUsuario('cliente');
    const cliente = cabeceras(tokenPara(idCliente));

    const idCategoria = await crearCategoria('Favoritos');
    const idAutor = await crearAutor('Favoritos');
    const [libro] = await pool.query(
        `INSERT INTO libros (titulo, isbn, precio, stock, id_autor, id_categoria, estado) VALUES ('Libro favorito', ?, 19.90, 5, ?, ?, 1) RETURNING id_libro`,
        [`ISBN-FAV-${crypto.randomUUID().slice(0, 8)}`, idAutor, idCategoria]
    );

    const idLibro = libro[0].id_libro;

    try {
        const antes = await pedir(`/api/favoritos/${idLibro}`, cliente);
        assert.equal(antes.status, 200, `consultar favorito devolvió ${antes.status}`);
        assert.equal((await antes.json()).data.es_favorito, false, 'un libro recién creado no debe ser favorito');

        const agregar = await pedir(`/api/favoritos/${idLibro}`, cliente, 'POST');
        assert.equal(agregar.status, 200, `agregar favorito devolvió ${agregar.status}`);
        assert.equal((await agregar.json()).data.es_favorito, true, 'tras agregar, el libro debe quedar como favorito');

        const listado = await pedir('/api/favoritos', cliente);
        assert.equal(listado.status, 200);
        assert.ok(
            (await listado.json()).data.some((f) => f.id_libro === idLibro),
            'el listado debe incluir el favorito recién agregado'
        );

        const quitar = await pedir(`/api/favoritos/${idLibro}`, cliente, 'DELETE');
        assert.equal(quitar.status, 200, `quitar favorito devolvió ${quitar.status}`);
        assert.equal((await quitar.json()).data.es_favorito, false, 'tras quitar, el libro debe dejar de ser favorito');

        const otroId = await crearUsuario('cliente');
        const listadoAjeno = await pedir('/api/favoritos', cabeceras(tokenPara(otroId)));
        assert.equal(listadoAjeno.status, 200);
        assert.ok(!(await listadoAjeno.json()).data.some((f) => f.id_libro === idLibro), 'los favoritos son privados por usuario');
    } finally {
        await pool.query('DELETE FROM libros WHERE id_libro = ?', [idLibro]);
    }
});

test('sin token no se pasa: 401, no 403', async () => {
    const protegidos = [
        '/api/ventas',
        '/api/ventas/mis-ventas',
        '/api/usuarios',
        '/api/usuarios/perfil',
        '/api/reportes/resumen',
        '/api/reservas',
        '/api/inventario',
        '/api/pedidos',
        '/api/historial',
        '/api/reclamaciones'
    ];

    for (const ruta of protegidos) {
        const respuesta = await pedir(ruta, {});

        assert.equal(respuesta.status, 401, `${ruta} sin token devolvió ${respuesta.status} (debería ser 401)`);
    }

    const eliminada = await pedir('/api/ruta-eliminada', {});
    assert.equal(eliminada.status, 404, `ruta eliminada devolvió ${eliminada.status} (debería ser 404)`);

    const idAdmin = await crearUsuario('administrador');
    const admin = cabeceras(tokenPara(idAdmin));
    const eliminadaConToken = await pedir('/api/reportes/cierre-caja', admin);
    assert.equal(eliminadaConToken.status, 404, `ruta eliminada con token devolvió ${eliminadaConToken.status} (debería ser 404)`);
});

test('un token inválido devuelve 401 y no 403', async () => {
    const invalido = { Authorization: 'Bearer no-es-un-jwt' };

    const respuesta = await pedir('/api/reportes/resumen', invalido);

    assert.equal(respuesta.status, 401);
});

test('una cuenta eliminada no se reactiva ni cambia de rol', async () => {
    const idUsuario = await crearUsuario('cliente');
    const idAdmin = await crearUsuario('administrador');
    const admin = cabeceras(tokenPara(idAdmin));

    await pool.query('UPDATE usuarios SET fecha_eliminacion = NOW(), estado = 0 WHERE id_usuario = ?', [idUsuario]);

    for (const cuerpo of [{ estado: 1 }, { rol: 'cajero' }, { rol: 'administrador' }, { rol: 'cliente' }, { estado: 1, rol: 'administrador' }]) {
        const respuesta = await pedir(`/api/usuarios/${idUsuario}`, admin, 'PATCH', cuerpo);

        assert.equal(respuesta.status, 403, `se aceptó ${JSON.stringify(cuerpo)} sobre una cuenta eliminada`);
    }

    const [estado] = await pool.query('SELECT estado, rol FROM usuarios WHERE id_usuario = ?', [idUsuario]);

    assert.equal(Number(estado[0].estado), 0);
    assert.equal(estado[0].rol, 'cliente');
});
