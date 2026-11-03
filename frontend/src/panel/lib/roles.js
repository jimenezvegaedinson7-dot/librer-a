export const ROLES = { ADMINISTRADOR: 'administrador', CLIENTE: 'cliente' };

const ROLES_PANEL = [ROLES.ADMINISTRADOR];

export const ETIQUETAS_ROL = { [ROLES.CLIENTE]: 'Cliente', [ROLES.ADMINISTRADOR]: 'Administrador' };

const normalizar = (rol) =>
    String(rol || '')
        .trim()
        .toLowerCase();

export const etiquetaRol = (rol) => ETIQUETAS_ROL[normalizar(rol)] || 'Rol no válido';

export const esAdministrador = (rol) => normalizar(rol) === ROLES.ADMINISTRADOR;

export const esPersonalInterno = (rol) => ROLES_PANEL.includes(normalizar(rol));

export const inicioPorRol = () => '/dashboard';
