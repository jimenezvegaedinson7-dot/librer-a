import {
    LayoutDashboard,
    BookOpen,
    PenTool,
    Tags,
    Boxes,
    ShoppingCart,
    ReceiptText,
    CreditCard,
    Users,
    Truck,
    History,
    Settings,
    BookText,
} from 'lucide-react';

import { ROLES, esPersonalInterno } from '../../lib/roles';

// ============================================================
// MENÚ DEL PANEL 100% VIRTUAL
// Panel orientado a ecommerce: sin módulos presenciales (POS,
// cierre de caja). Las nuevas ventas nacen del flujo
// APP + PayU. panel/reserva son LEGACIO.
// ============================================================

export const navPrincipal = [
    // --- General ---
    { nombre: 'Dashboard', ruta: '/dashboard', icono: LayoutDashboard, descripcion: 'Resumen ecommerce, estadísticas y reportes', seccion: 'General', roles: [ROLES.ADMINISTRADOR] },

    // --- Catálogo ---
    { nombre: 'Libros', ruta: '/libros', icono: BookOpen, descripcion: 'Gestión de libros', seccion: 'Catálogo', roles: [ROLES.ADMINISTRADOR], soloLectura: true },
    { nombre: 'Autores', ruta: '/autores', icono: PenTool, descripcion: 'Gestión de autores', seccion: 'Catálogo', roles: [ROLES.ADMINISTRADOR] },
    { nombre: 'Categorías', ruta: '/categorias', icono: Tags, descripcion: 'Gestión de categorías', seccion: 'Catálogo', roles: [ROLES.ADMINISTRADOR] },

    // --- Inventario ---
    { nombre: 'Stock', ruta: '/inventario', icono: Boxes, descripcion: 'Stock y ubicaciones de libros', seccion: 'Inventario', roles: [ROLES.ADMINISTRADOR] },

    // --- Operaciones ---
    { nombre: 'Pedidos', ruta: '/pedidos', icono: Truck, descripcion: 'Seguimiento de delivery y recojo de las ventas de la app', seccion: 'Operaciones', roles: [ROLES.ADMINISTRADOR] },
    { nombre: 'Ventas', ruta: '/ventas', icono: ShoppingCart, descripcion: 'Ventas online ecommerce', seccion: 'Operaciones', roles: [ROLES.ADMINISTRADOR] },
    { nombre: 'Pagos', ruta: '/pagos', icono: CreditCard, descripcion: 'Pagos online recibidos via PayU', seccion: 'Operaciones', roles: [ROLES.ADMINISTRADOR] },
    { nombre: 'Comprobantes', ruta: '/comprobantes', icono: ReceiptText, descripcion: 'Boletas y facturas emitidas', seccion: 'Operaciones', roles: [ROLES.ADMINISTRADOR] },

    // --- Logística ---
    { nombre: 'Delivery y Tarifas', ruta: '/tarifas-envio', icono: Truck, descripcion: 'Tarifas de envío a domicilio por distrito de Lima', seccion: 'Logística', roles: [ROLES.ADMINISTRADOR] },

    // --- Administración ---
    { nombre: 'Usuarios', ruta: '/usuarios', icono: Users, descripcion: 'Cuentas, permisos y listado de clientes', seccion: 'Administración', roles: [ROLES.ADMINISTRADOR] },

    // --- Control ---
    { nombre: 'Reclamaciones', ruta: '/reclamaciones', icono: BookText, descripcion: 'Reclamos y quejas: respuesta en 15 días hábiles', seccion: 'Control', roles: [ROLES.ADMINISTRADOR] },
    { nombre: 'Historial', ruta: '/historial', icono: History, descripcion: 'Auditoría de operaciones importantes', seccion: 'Control', roles: [ROLES.ADMINISTRADOR] },

    // --- Configuración ---
    { nombre: 'Empresa', ruta: '/configuracion/empresa', icono: Settings, descripcion: 'Configuración del emisor de comprobantes', seccion: 'Configuración', roles: [ROLES.ADMINISTRADOR] },
];

// Entradas que el usuario actual puede ver.
export const navPorRol = (rol) => {
    const actual = String(rol || '').trim().toLowerCase();

    if (!esPersonalInterno(actual)) return [];

    return navPrincipal.filter((item) => item.roles.includes(actual));
};
