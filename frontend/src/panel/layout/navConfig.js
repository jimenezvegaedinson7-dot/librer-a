import { LayoutDashboard, Book, Tags, Boxes, ShoppingBag, Users, Truck, Building2, MessageSquareWarning, Film } from 'lucide-react';
import { ROLES, esPersonalInterno } from '../lib/roles';

export const navPrincipal = [
    {
        nombre: 'Dashboard',
        ruta: '/dashboard',
        icono: LayoutDashboard,
        descripcion: 'Resumen ecommerce, estadísticas y reportes',
        seccion: 'General',
        roles: [ROLES.ADMINISTRADOR]
    },

    { nombre: 'Libros y autores', ruta: '/libros', icono: Book, descripcion: 'Catálogo de libros y gestión de autores', seccion: 'Catálogo', roles: [ROLES.ADMINISTRADOR] },
    { nombre: 'Categorías', ruta: '/categorias', icono: Tags, descripcion: 'Gestión de categorías', seccion: 'Catálogo', roles: [ROLES.ADMINISTRADOR] },

    { nombre: 'Stock', ruta: '/inventario', icono: Boxes, descripcion: 'Stock y ubicaciones de libros', seccion: 'Catálogo', roles: [ROLES.ADMINISTRADOR] },

    {
        nombre: 'Gestión de ventas',
        ruta: '/ventas',
        icono: ShoppingBag,
        descripcion: 'Ventas y pagos, pedidos y comprobantes',
        seccion: 'Operaciones',
        roles: [ROLES.ADMINISTRADOR]
    },

    {
        nombre: 'Delivery y Tarifas',
        ruta: '/tarifas-envio',
        icono: Truck,
        descripcion: 'Configuración de tarifa única de delivery y punto de recojo',
        seccion: 'Operaciones',
        roles: [ROLES.ADMINISTRADOR]
    },

    { nombre: 'Usuarios', ruta: '/usuarios', icono: Users, descripcion: 'Cuentas, permisos y listado de clientes', seccion: 'Administración', roles: [ROLES.ADMINISTRADOR] },

    { nombre: 'Anuncios', ruta: '/anuncios', icono: Film, descripcion: 'Video publicitario de la portada web', seccion: 'Administración', roles: [ROLES.ADMINISTRADOR] },
    {
        nombre: 'Reclamaciones',
        ruta: '/reclamaciones',
        icono: MessageSquareWarning,
        descripcion: 'Reclamos y quejas: respuesta en 15 días hábiles',
        seccion: 'Administración',
        roles: [ROLES.ADMINISTRADOR]
    },

    {
        nombre: 'Empresa',
        ruta: '/configuracion/empresa',
        icono: Building2,
        descripcion: 'Configuración del emisor de comprobantes',
        seccion: 'Administración',
        roles: [ROLES.ADMINISTRADOR]
    }
];

export const navPorRol = (rol) => {
    const actual = String(rol || '')
        .trim()
        .toLowerCase();

    if (!esPersonalInterno(actual)) return [];

    return navPrincipal.filter((item) => item.roles.includes(actual));
};
