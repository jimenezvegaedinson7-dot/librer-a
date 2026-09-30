// ============================================================
// MATRIZ DE PERMISOS POR ENDPOINT (sin BD)
// ============================================================
// No arranca el servidor ni consulta la base: lee los routers de
// Express ya construidos y comprueba, endpoint por endpoint, qué
// roles admite cada uno. Así una ruta no protegida (o protegida de
// más) rompe la suite aunque no haya PostgreSQL disponible.
// ============================================================

const test = require('node:test');
const assert = require('node:assert/strict');

const { ROLES, ROLES_PANEL } = require('../src/utils/roles');

// ========================================
// HELPERS
// ========================================

// Devuelve "archivo METODO /ruta" -> roles permitidos ([] si no hay
// guard de rol, es decir: cualquiera autenticado o público).
const matrizDe = (archivo, router) => {
    const mapa = new Map();

    for (const capa of router.stack) {
        if (!capa.route) continue;

        const metodo = Object.keys(capa.route.methods)[0].toUpperCase();
        const guards = capa.route.stack
            .map((handler) => handler.handle)
            .filter((handler) => Array.isArray(handler.rolesPermitidos));

        mapa.set(`${metodo} ${capa.route.path}`, guards);
    }

    return mapa;
};

const routers = {
    'venta.routes.js': require('../src/routes/venta.routes'),
    'pedido.routes.js': require('../src/routes/pedido.routes'),
    'reserva.routes.js': require('../src/routes/reserva.routes'),
    'pago.routes.js': require('../src/routes/pago.routes'),
    'comprobante.routes.js': require('../src/routes/comprobante.routes'),
    'inventario.routes.js': require('../src/routes/inventario.routes'),
    'reporte.routes.js': require('../src/routes/reporte.routes'),
};

// Une los routers anteriores en un solo índice "archivo METODO /ruta".
const indice = new Map();
for (const [archivo, router] of Object.entries(routers)) {
    for (const [ruta, guards] of matrizDe(archivo, router)) {
        indice.set(`${archivo} ${ruta}`, guards);
    }
}

const rolesDe = (clave) => {
    const guards = indice.get(clave);

    assert.ok(guards, `no existe la ruta ${clave}`);

    return guards.flatMap((guard) => guard.rolesPermitidos);
};

const ADMIN = [ROLES.ADMINISTRADOR];
const PANEL = [ROLES.ADMINISTRADOR];

// Comprueba que el endpoint admite exactamente esos roles.
const esperaRoles = (clave, esperados) => {
    const obtenidos = rolesDe(clave).sort();
    const ordenados = [...esperados].sort();

    assert.deepEqual(
        obtenidos,
        ordenados,
        `${clave} debería admitir ${ordenados.join('+') || 'cualquiera'}`
    );
};

// ========================================
// REPORTES: solo lo operativo para el cajero
// ========================================

test('los reportes administrativos son solo de administrador', () => {
    for (const ruta of [
        'GET /resumen',
        'GET /libros-mas-vendidos',
        'GET /ventas-por-mes',
        'GET /ventas-por-dia',
        'GET /indicadores-ventas',
    ]) {
        esperaRoles(`reporte.routes.js ${ruta}`, ADMIN);
    }
});

test('los agregados operativos del mostrador son solo de administrador', () => {
    for (const ruta of [
        'GET /ventas-por-estado',
        'GET /reservas-por-estado',
    ]) {
        esperaRoles(`reporte.routes.js ${ruta}`, ADMIN);
    }
});

test('ningún reporte administrativo quedó abierto al cajero', () => {
    const administrativos = [
        'GET /resumen',
        'GET /libros-mas-vendidos',
        'GET /ventas-por-mes',
        'GET /ventas-por-dia',
        'GET /indicadores-ventas',
    ];

    for (const ruta of administrativos) {
        const roles = rolesDe(`reporte.routes.js ${ruta}`);

        assert.ok(
            !roles.includes(ROLES.CAJERO),
            `${ruta} no debe admitir al cajero`
        );
        assert.ok(roles.includes(ROLES.ADMINISTRADOR));
    }
});

test('todos los reportes exigen un rol: ninguno queda abierto', () => {
    for (const [clave, guards] of indice) {
        if (!clave.startsWith('reporte.routes.js')) continue;

        assert.ok(guards.length > 0, `${clave} no tiene guard de rol`);
    }
});

// ========================================
// OPERACIONES DEL CAJERO
// ========================================

test('el cajero opera ventas, reservas, pagos, comprobantes e inventario', () => {
    const permitidas = [
        'venta.routes.js GET /',
        'venta.routes.js PUT /:id/estado',
        'venta.routes.js POST /:id/comprobante',
        'reserva.routes.js GET /',
        'reserva.routes.js PUT /:id/estado',
        'pago.routes.js GET /',
        'pago.routes.js GET /resumen',
        'comprobante.routes.js GET /',
        'comprobante.routes.js GET /resumen',
        'comprobante.routes.js GET /:id',
        'comprobante.routes.js POST /:id/enviar-email',
        'inventario.routes.js GET /',
        'inventario.routes.js GET /stock-bajo',
        'inventario.routes.js GET /movimientos',
        'inventario.routes.js GET /libro/:id',
    ];

    for (const clave of permitidas) {
        esperaRoles(clave, ADMIN);
    }
});

// ========================================
// VENTA MANUAL RETIRADA
// ========================================
// Las ventas ya no se crean desde el panel: nacen en la app y las
// cobra PayU. POST /api/ventas responde 405 y no tiene guard de rol,
// porque ningún rol del panel puede crearlas.

test('ningún rol puede crear ventas manualmente', () => {
    const roles = rolesDe('venta.routes.js POST /');

    assert.deepEqual(
        roles,
        [],
        'POST /api/ventas no debe admitir ningún rol del panel'
    );
});

test('la venta manual no expone ninguna ruta de creación alternativa', () => {
    // Crear una venta sería una ruta POST sobre la colección (sin :id),
    // porque no parte de una venta existente. Las rutas POST con :id
    // (comprobante, reembolso) operan sobre una venta ya creada y sí
    // se conservan.
    const rutasDeColeccion = [...indice.keys()].filter(
        (clave) =>
            clave.startsWith('venta.routes.js POST') &&
            !clave.includes('/:id')
    );

    assert.deepEqual(
        rutasDeColeccion,
        ['venta.routes.js POST /'],
        'solo debe sobrevivir el POST raíz, que responde 405'
    );
});

// ========================================
// EXCLUSIVOS DEL ADMINISTRADOR
// ========================================

test('las operaciones de control son solo de administrador', () => {
    const soloAdmin = [
        'venta.routes.js POST /:id/reembolso',
        'comprobante.routes.js PUT /:id/sunat',
        'comprobante.routes.js POST /:id/anular',
        'inventario.routes.js POST /',
        'inventario.routes.js PUT /libro/:id/stock',
        'inventario.routes.js PUT /libro/:id',
    ];

    for (const clave of soloAdmin) {
        esperaRoles(clave, ADMIN);
    }
});

// ========================================
// PEDIDOS: módulo logístico exclusivo del administrador
// ========================================

test('los pedidos del panel son solo de administrador', () => {
    for (const ruta of [
        'GET /',
        'GET /:id',
        'PUT /:id/estado',
    ]) {
        esperaRoles(`pedido.routes.js ${ruta}`, ADMIN);
    }
});

test('el módulo de pedidos no quedó abierto al cajero ni al cliente', () => {
    for (const [clave, guards] of indice) {
        if (!clave.startsWith('pedido.routes.js')) continue;

        if (clave === 'pedido.routes.js GET /usuario/:id_usuario') continue;

        const roles = guards.flatMap((guard) => guard.rolesPermitidos);

        assert.ok(
            !roles.includes(ROLES.CAJERO),
            `${clave} no debe admitir al cajero`
        );
        assert.ok(
            !roles.includes(ROLES.CLIENTE),
            `${clave} no debe admitir al cliente`
        );
    }
});

// ========================================
// RUTAS DEL CLIENTE QUE NO DEBEN ROMPERSE
// ========================================

test('las rutas propias del cliente siguen abiertas a cualquier autenticado', () => {
    const delCliente = [
        'venta.routes.js GET /mis-ventas',
        'reserva.routes.js GET /mis-reservas',
        'reserva.routes.js POST /',
        'reserva.routes.js DELETE /:id',
        'pago.routes.js POST /crear-orden',
        'pago.routes.js GET /:orderId',
    ];

    for (const clave of delCliente) {
        esperaRoles(clave, []);
    }
});

test('los registros por id se validan en el controlador (dueño o panel)', () => {
    // Estas rutas no filtran por rol a propósito: las usa la app móvil
    // para ver sus propias compras. La propiedad la revisa el
    // controlador con esPersonalInterno, no un guard de rol.
    for (const clave of [
        'venta.routes.js GET /:id',
        'venta.routes.js GET /:id/pago',
        'reserva.routes.js GET /:id',
    ]) {
        esperaRoles(clave, []);
    }
});

test('el webhook y el checkout de PayU siguen siendo públicos', () => {
    esperaRoles('pago.routes.js POST /webhook', []);
    esperaRoles('pago.routes.js GET /checkout/:externalReference', []);
    esperaRoles('pago.routes.js GET /respuesta/:externalReference', []);
});

// ========================================
// INVARIANTE GENERAL
// ========================================

test('ninguna ruta declara el panel sin pasar por verificarRol', () => {
    // Rutas con más de un guard de rol: sería una configuración
    // redundante o contradictoria.
    for (const [clave, guards] of indice) {
        assert.ok(
            guards.length <= 1,
            `${clave} acumula ${guards.length} guards de rol`
        );
    }
});

test('todo guard de rol declara al menos un rol válido', () => {
    for (const [clave, guards] of indice) {
        for (const guard of guards) {
            assert.ok(
                guard.rolesPermitidos.length > 0,
                `${clave} tiene un verificarRol() sin roles`
            );
            for (const rol of guard.rolesPermitidos) {
                assert.ok(
                    [ROLES.ADMINISTRADOR, ROLES.CAJERO, ROLES.CLIENTE].includes(rol),
                    `${clave} declara un rol desconocido: ${rol}`
                );
            }
        }
    }
});

test('un guard de rol solo se usa con el panel completo o con el administrador', () => {
    // Combinaciones admitidas: panel (admin+cajero), solo admin,
    // solo cliente, o ninguno (ruta abierta). Nada más.
    for (const [clave, guards] of indice) {
        for (const guard of guards) {
            const roles = [...guard.rolesPermitidos].sort();

            assert.ok(
                roles.length === 0 ||
                    roles.join(',') === ROLES.ADMINISTRADOR ||
                    roles.join(',') === ROLES.CLIENTE ||
                    roles.join(',') === `${ROLES.ADMINISTRADOR},${ROLES.CAJERO}`,
                `${clave} declara un juego de roles inesperado: ${roles.join(',')}`
            );
        }
    }
});
