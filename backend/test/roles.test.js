// ============================================================
// TESTS DE ROLES Y PERMISOS
// ============================================================
// Sin BD: comprueba la fuente de verdad de roles (utils/roles) y
// el middleware verificarRol / verificarPanel con req/res simulados.
// La autorización real la aplica el backend en cada endpoint; aquí
// se verifica la pieza que decide.
// ============================================================

const test = require('node:test');
const assert = require('node:assert/strict');

const {
    ROLES,
    ROLES_PANEL,
    ROLES_ASIGNABLES,
    normalizar,
    esAdministrador,
    esCliente,
    esPersonalInterno,
    esRolValido,
} = require('../src/utils/roles');

const verificarRol = require('../src/middlewares/rol.middleware');
const { verificarPanel } = verificarRol;

// ========================================
// HELPERS
// ========================================

// Ejecuta un middleware y devuelve { status, cuerpo, siguiente }.
const ejecutar = (middleware, { usuario } = {}) => {
    let siguiente = false;
    const res = {
        statusCode: null,
        cuerpo: null,
        status(codigo) {
            this.statusCode = codigo;
            return this;
        },
        json(cuerpo) {
            this.cuerpo = cuerpo;
            return this;
        },
    };

    middleware({ usuario, originalUrl: '/api/prueba' }, res, () => {
        siguiente = true;
    });

    return { status: res.statusCode, cuerpo: res.cuerpo, siguiente };
};

const como = (rol) => ({ usuario: { id_usuario: 1, rol } });

// ========================================
// utils/roles
// ========================================

test('solo administrador y cliente pertenecen al contrato actual', () => {
    assert.equal(ROLES.ADMINISTRADOR, 'administrador');
    assert.equal(ROLES.CLIENTE, 'cliente');
    assert.deepEqual(Object.values(ROLES).sort(), ['administrador', 'cliente']);
});

test('el panel solo acepta administrador', () => {
    assert.deepEqual(ROLES_PANEL, ['administrador']);
    assert.ok(!ROLES_PANEL.includes('cajero'));
    assert.ok(!ROLES_PANEL.includes(ROLES.CLIENTE));
});

test('un administrador no crea nuevos cajeros legacy', () => {
    assert.deepEqual(ROLES_ASIGNABLES, ['administrador', 'cliente']);
    assert.equal(esRolValido('cajero'), false);
    assert.ok(ROLES_ASIGNABLES.every(esRolValido));
    assert.equal(esRolValido('vendedor'), false);
    assert.equal(esRolValido(''), false);
    assert.equal(esRolValido(null), false);
});

test('normalizar tolera mayúsculas y espacios', () => {
    assert.equal(normalizar('  Cliente '), 'cliente');
    assert.equal(normalizar('ADMINISTRADOR'), 'administrador');
    assert.equal(normalizar(undefined), '');
});

test('los helpers de rol distinguen cada valor', () => {
    assert.ok(esAdministrador('administrador'));
    assert.ok(!esAdministrador('cajero'));

    assert.ok(esCliente('cliente'));
    assert.ok(!esPersonalInterno('cliente'));
});

test('esPersonalInterno no da privilegios al cajero legacy', () => {
    assert.ok(esPersonalInterno('administrador'));
    assert.equal(esPersonalInterno('cajero'), false);
    assert.equal(esPersonalInterno('cliente'), false);
    assert.equal(esPersonalInterno(undefined), false);
});

// ========================================
// middleware verificarRol
// ========================================

test('verificarRol deja pasar al rol permitido', () => {
    const { siguiente, status } = ejecutar(
        verificarRol(ROLES.ADMINISTRADOR),
        como(ROLES.ADMINISTRADOR)
    );

    assert.equal(siguiente, true);
    assert.equal(status, null);
});

test('verificarRol rechaza con 403 a un rol no permitido', () => {
    const { siguiente, status, cuerpo } = ejecutar(
        verificarRol(ROLES.ADMINISTRADOR),
        como('cajero')
    );

    assert.equal(siguiente, false);
    assert.equal(status, 403);
    assert.equal(cuerpo.success, false);
});

test('verificarRol acepta varios roles a la vez', () => {
    const middleware = verificarRol(ROLES.ADMINISTRADOR, ROLES.CLIENTE);

    assert.equal(ejecutar(middleware, como(ROLES.CLIENTE)).siguiente, true);
    assert.equal(ejecutar(middleware, como(ROLES.ADMINISTRADOR)).siguiente, true);
    assert.equal(ejecutar(middleware, como('cajero')).status, 403);
});

test('verificarRol responde 401 sin sesión', () => {
    const { status, siguiente } = ejecutar(verificarRol(ROLES.ADMINISTRADOR), {});

    assert.equal(status, 401);
    assert.equal(siguiente, false);
});

test('verificarRol falla cerrado si se configura sin roles', () => {
    const { status, siguiente } = ejecutar(verificarRol(), como(ROLES.ADMINISTRADOR));

    assert.equal(status, 403);
    assert.equal(siguiente, false);
});

test('el rol retirado tampoco puede habilitarse por configuración del middleware', () => {
    const resultado = ejecutar(verificarRol('cajero'), como('cajero'));
    assert.equal(resultado.status, 403);
    assert.equal(resultado.siguiente, false);
});

test('verificarRol compara el rol sin distinguir mayúsculas', () => {
    const { siguiente } = ejecutar(
        verificarRol(ROLES.ADMINISTRADOR),
        como('Administrador')
    );

    assert.equal(siguiente, true);
});

// ========================================
// middleware verificarPanel
// ========================================

test('verificarPanel rechaza al cajero legacy', () => {
    // CAJERO ya no tiene acceso al panel (Fase 5)
    assert.equal(ejecutar(verificarPanel, como('cajero')).siguiente, false);
});

test('verificarPanel deja pasar al administrador', () => {
    assert.equal(ejecutar(verificarPanel, como(ROLES.ADMINISTRADOR)).siguiente, true);
});

test('verificarPanel rechaza al cliente', () => {
    const { status, siguiente } = ejecutar(verificarPanel, como(ROLES.CLIENTE));

    assert.equal(status, 403);
    assert.equal(siguiente, false);
});

test('verificarPanel rechaza un rol desconocido', () => {
    assert.equal(ejecutar(verificarPanel, como('root')).status, 403);
    assert.equal(ejecutar(verificarPanel, { usuario: { rol: null } }).status, 403);
});

test('verificarPanel permite solo al administrador', () => {
    // ADMINISTRADOR tiene acceso, CAJERO y CLIENTE no
    assert.equal(ejecutar(verificarPanel, como(ROLES.ADMINISTRADOR)).siguiente, true);
    assert.equal(ejecutar(verificarPanel, como('cajero')).siguiente, false);
    assert.equal(ejecutar(verificarPanel, como(ROLES.CLIENTE)).siguiente, false);
});

// ========================================
// SEPARACIÓN DE PODERES
// ========================================

test('el cajero no puede usar un permiso exclusivo del administrador', () => {
    const soloAdmin = verificarRol(ROLES.ADMINISTRADOR);

    // Reembolsos, anulación de comprobantes, SUNAT, usuarios.
    for (const operacion of ['reembolsar', 'anular', 'sunat', 'usuarios']) {
        assert.equal(
            ejecutar(soloAdmin, como('cajero')).status,
            403,
            `el cajero no debería poder ${operacion}`
        );
    }

    assert.equal(ejecutar(soloAdmin, como(ROLES.ADMINISTRADOR)).siguiente, true);
});
