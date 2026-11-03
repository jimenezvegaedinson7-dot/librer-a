const ROLES = { ADMINISTRADOR: 'administrador', CLIENTE: 'cliente' };
const ROLES_PANEL = [ROLES.ADMINISTRADOR];
const ROLES_ASIGNABLES = [ROLES.ADMINISTRADOR, ROLES.CLIENTE];

const normalizar = (rol) =>
    String(rol || '')
        .trim()
        .toLowerCase();

const esAdministrador = (rol) => normalizar(rol) === ROLES.ADMINISTRADOR;

const esCliente = (rol) => normalizar(rol) === ROLES.CLIENTE;

const esPersonalInterno = (rol) => ROLES_PANEL.includes(normalizar(rol));

const esRolValido = (rol) => ROLES_ASIGNABLES.includes(normalizar(rol));

module.exports = { ROLES, ROLES_PANEL, ROLES_ASIGNABLES, normalizar, esAdministrador, esCliente, esPersonalInterno, esRolValido };
