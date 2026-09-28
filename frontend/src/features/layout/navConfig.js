import {
    LayoutDashboard,
    Store,
    BookOpen,
    PenTool,
    Tags,
    Boxes,
    CalendarCheck,
    ShoppingCart,
    ReceiptText,
    CreditCard,
    Users,
    Truck,
    History,
    Settings,
    Calculator,
    BookText,
} from 'lucide-react';

import { ROLES, esPersonalInterno } from '../../lib/roles';

// ============================================================
// MENÚ DEL PANEL
// Cada entrada declara qué roles la ven. `soloLectura` marca las
// pantallas que el cajero puede consultar pero no modificar (el
// backend igual bloquea cualquier escritura).
// ============================================================

export const navPrincipal = [
    // --- General ---
    { nombre: 'Resumen', ruta: '/dashboard', icono: LayoutDashboard, descripcion: 'Resumen general, estadísticas y reportes', seccion: 'General', roles: [ROLES.ADMINISTRADOR] },
    { nombre: 'Punto de venta', ruta: '/punto-venta', icono: Store, descripcion: 'Ventas del día, pagos, reservas pendientes y stock bajo', seccion: 'General', roles: [ROLES.CAJERO] },

    // --- Catálogo ---
    { nombre: 'Libros', ruta: '/libros', icono: BookOpen, descripcion: 'Gestión de libros', seccion: 'Catálogo', roles: [ROLES.ADMINISTRADOR, ROLES.CAJERO], soloLectura: true },
    { nombre: 'Autores', ruta: '/autores', icono: PenTool, descripcion: 'Gestión de autores', seccion: 'Catálogo', roles: [ROLES.ADMINISTRADOR] },
    { nombre: 'Categorías', ruta: '/categorias', icono: Tags, descripcion: 'Gestión de categorías', seccion: 'Catálogo', roles: [ROLES.ADMINISTRADOR] },
    { nombre: 'Inventario', ruta: '/inventario', icono: Boxes, descripcion: 'Stock y ubicaciones', seccion: 'Catálogo', roles: [ROLES.ADMINISTRADOR, ROLES.CAJERO], soloLectura: true },

    // --- Operaciones ---
    { nombre: 'Reservas', ruta: '/reservas', icono: CalendarCheck, descripcion: 'Gestión de reservas', seccion: 'Operaciones', roles: [ROLES.ADMINISTRADOR, ROLES.CAJERO] },
    { nombre: 'Ventas', ruta: '/ventas', icono: ShoppingCart, descripcion: 'Compras: quién compró, qué y cuánto', seccion: 'Operaciones', roles: [ROLES.ADMINISTRADOR, ROLES.CAJERO] },
    { nombre: 'Comprobantes', ruta: '/comprobantes', icono: ReceiptText, descripcion: 'Boletas y facturas emitidas', seccion: 'Operaciones', roles: [ROLES.ADMINISTRADOR, ROLES.CAJERO] },
    { nombre: 'Pagos', ruta: '/pagos', icono: CreditCard, descripcion: 'Pagos recibidos de las ventas', seccion: 'Operaciones', roles: [ROLES.ADMINISTRADOR, ROLES.CAJERO] },
    { nombre: 'Cierre de caja', ruta: '/cierre-caja', icono: Calculator, descripcion: 'Cobros del día por medio de pago, reembolsos y neto', seccion: 'Operaciones', roles: [ROLES.ADMINISTRADOR, ROLES.CAJERO] },

    // --- Administración ---
    { nombre: 'Usuarios', ruta: '/usuarios', icono: Users, descripcion: 'Cuentas, permisos y clientes con sus compras', seccion: 'Administración', roles: [ROLES.ADMINISTRADOR] },
    { nombre: 'Tarifas de envío', ruta: '/tarifas-envio', icono: Truck, descripcion: 'Precio del envío a domicilio por distrito de Lima', seccion: 'Administración', roles: [ROLES.ADMINISTRADOR] },

    // --- Control ---
    { nombre: 'Libro de Reclamaciones', ruta: '/reclamaciones', icono: BookText, descripcion: 'Reclamos y quejas: respuesta en 15 días hábiles', seccion: 'Control', roles: [ROLES.ADMINISTRADOR] },
    { nombre: 'Historial', ruta: '/historial', icono: History, descripcion: 'Auditoría de operaciones', seccion: 'Control', roles: [ROLES.ADMINISTRADOR] },
    { nombre: 'Datos de la empresa', ruta: '/configuracion/empresa', icono: Settings, descripcion: 'Configuración del emisor de comprobantes', seccion: 'Control', roles: [ROLES.ADMINISTRADOR] },
];

// Entradas que el usuario actual puede ver.
export const navPorRol = (rol) => {
    const actual = String(rol || '').trim().toLowerCase();

    if (!esPersonalInterno(actual)) return [];

    return navPrincipal.filter((item) => item.roles.includes(actual));
};
