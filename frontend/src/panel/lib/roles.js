// ============================================================
// ROLES DEL PANEL
// Espejo de backend/src/utils/roles.js. Solo se usa para decidir
// qué se muestra y a dónde se redirige: la autorización real
// siempre la aplica el backend (verificarRol + anti-IDOR).
// ============================================================

export const ROLES = {
    ADMINISTRADOR: 'administrador',
    CLIENTE: 'cliente',
};

export const ROLES_PANEL = [
    ROLES.ADMINISTRADOR,
];

export const ETIQUETAS_ROL = {
    [ROLES.CLIENTE]: 'Cliente',
    [ROLES.ADMINISTRADOR]: 'Administrador',
};

const normalizar = (rol) => String(rol || '').trim().toLowerCase();

export const etiquetaRol = (rol) => ETIQUETAS_ROL[normalizar(rol)] || 'Rol no válido';

export const esAdministrador = (rol) => normalizar(rol) === ROLES.ADMINISTRADOR;

export const esCliente = (rol) => normalizar(rol) === ROLES.CLIENTE;

// Personal del panel: solo administrador.
export const esPersonalInterno = (rol) => ROLES_PANEL.includes(normalizar(rol));

// A dónde va cada rol después de iniciar sesión. El panel es solo de
// administrador, así que todos los roles aterrizan en el dashboard y el
// backend se encarga de rechazar el acceso de quien no corresponda.
export const inicioPorRol = () => '/dashboard';
