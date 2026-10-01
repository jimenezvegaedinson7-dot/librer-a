// ============================================================
// ROLES DEL SISTEMA
// Fuente única de verdad para los nombres de rol. La lista de
// valores válidos debe coincidir con la restricción CHECK de
// usuarios.rol (migración 029).
// ============================================================

const ROLES = {
    ADMINISTRADOR: 'administrador',
    CLIENTE: 'cliente',
};

// Roles que pueden entrar al panel administrativo.
const ROLES_PANEL = [
    ROLES.ADMINISTRADOR,
];

// Todos los roles que un administrador puede asignar.
const ROLES_ASIGNABLES = [
    ROLES.ADMINISTRADOR,
    ROLES.CLIENTE,
];

const normalizar = (rol) => String(rol || '').trim().toLowerCase();

const esAdministrador = (rol) =>
    normalizar(rol) === ROLES.ADMINISTRADOR;

const esCliente = (rol) =>
    normalizar(rol) === ROLES.CLIENTE;

// "Personal interno": solo administrador. Se usa en las
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
    esCliente,
    esPersonalInterno,
    esRolValido,
};
