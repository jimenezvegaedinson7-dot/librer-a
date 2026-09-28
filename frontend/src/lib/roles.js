// ============================================================
// ROLES DEL PANEL
// Espejo de backend/src/utils/roles.js. Solo se usa para decidir
// qué se muestra y a dónde se redirige: la autorización real
// siempre la aplica el backend (verificarRol + anti-IDOR).
// ============================================================

export const ROLES = {
    ADMINISTRADOR: 'administrador',
    CAJERO: 'cajero',
    CLIENTE: 'cliente',
};

export const ROLES_PANEL = [
    ROLES.ADMINISTRADOR,
    ROLES.CAJERO,
];

const normalizar = (rol) => String(rol || '').trim().toLowerCase();

export const esAdministrador = (rol) => normalizar(rol) === ROLES.ADMINISTRADOR;

export const esCajero = (rol) => normalizar(rol) === ROLES.CAJERO;

export const esCliente = (rol) => normalizar(rol) === ROLES.CLIENTE;

// Personal del panel: administrador y cajero.
export const esPersonalInterno = (rol) => ROLES_PANEL.includes(normalizar(rol));

// Única pantalla que puede abrir un cajero.
export const INICIO_CAJERO = '/punto-venta';

// A dónde va cada rol después de iniciar sesión.
export const inicioPorRol = (rol) => (esCajero(rol) ? INICIO_CAJERO : '/dashboard');
