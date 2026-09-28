// ============================================================
// ROLES DEL SISTEMA
// Fuente única de verdad para los nombres de rol. La lista de
// valores válidos debe coincidir con la restricción CHECK de
// usuarios.rol (migración 025).
// ============================================================

const ROLES = {
    ADMINISTRADOR: 'administrador',
    CAJERO: 'cajero',
    CLIENTE: 'cliente',
};

// Roles que pueden entrar al panel administrativo.
const ROLES_PANEL = [
    ROLES.ADMINISTRADOR,
    ROLES.CAJERO,
];

// Todos los roles que un administrador puede asignar.
const ROLES_ASIGNABLES = [
    ROLES.ADMINISTRADOR,
    ROLES.CAJERO,
    ROLES.CLIENTE,
];

const normalizar = (rol) => String(rol || '').trim().toLowerCase();

const esAdministrador = (rol) =>
    normalizar(rol) === ROLES.ADMINISTRADOR;

const esCajero = (rol) =>
    normalizar(rol) === ROLES.CAJERO;

const esCliente = (rol) =>
    normalizar(rol) === ROLES.CLIENTE;

// "Personal interno": administrador y cajero. Se usa en las
// comprobaciones de propiedad (anti-IDOR) donde el dueño de una
// venta o reserva y el personal autorizado ven el mismo registro.
const esPersonalInterno = (rol) =>
    ROLES_PANEL.includes(normalizar(rol));

const esRolValido = (rol) =>
    ROLES_ASIGNABLES.includes(normalizar(rol));

module.exports = {
    ROLES,
    ROLES_PANEL,
    ROLES_ASIGNABLES,
    normalizar,
    esAdministrador,
    esCajero,
    esCliente,
    esPersonalInterno,
    esRolValido,
};
