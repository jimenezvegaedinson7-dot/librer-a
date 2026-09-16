import { cn } from '@/lib/utils';
import { Home, Layout, Users, Book, Folder, Box, Shield, Settings, Calendar, Loader2, Search, LogOut } from 'lucide-react';

export default function Sidebar({
    className,
    onNavigate,
    isOpen = false,
    setIsOpen,
    ...props
}) {
    const links = [
        { key: 'dashboard', label: 'Panel', icon: Home, href: '/' },
        { key: 'libros', label: 'Libros', icon: Book, href: '/libros' },
        { key: 'autores', label: 'Autores', icon: Users, href: '/autores' },
        { key: 'categorias', label: 'Categorías', icon: Folder, href: '/categorias' },
        { key: 'inventario', label: 'Inventario', icon: Box, href: '/inventario' },
        { key: 'reservas', label: 'Reservas', icon: Calendar, href: '/reservas' },
        { key: 'ventas', label: 'Ventas', icon: Box, href: '/ventas' },
        { key: 'clientes', label: 'Clientes', icon: Users, href: '/clientes' },
        { key: 'reportes', label: 'Reportes', icon: ChartBar, href: '/reportes' },
        { key: 'config', label: 'Configuración', icon: Settings, href: '/config' },
    ];

    return (
        <nav
            className={cn(
                'fixed left-0 top-0 inset-y-0 w-64 z-50 transition-all duration-300 ease-out bg-card border-r border-border shadow-lg transform rtl:rtl-visible',
                isOpen && '-translate-x-0',
                !isOpen && '-translate-x-full',
                'focusWithin:bg-white',
                className
            )}
            {...props}
        >
            <div className="h-full flex flex-col p-2">
                {/* Logo/Encabezado */}
                <div className="mb-6 text-center">
                    <img
                        src="/logo-lbl.png"
                        alt="Librería Secure"
                        className="h-10 w-auto object-contain"
                    />
                    <p className="mt-1 text-xs text-muted-foreground uppercase tracking-wider">
                        Librería Secure
                    </p>
                </div>

                {/* Navegación */}
                <nav className="flex-1 flex flex-col space-y-1">
                    {links.map((link) => {
                        const isActive = /* check active route */ false;

                        return (
                            <button
                                key={link.key}
                                onClick={() => onNavigate(link.key)}
                                className={cn(
                                    'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer select-none',
                                    isActive && 'bg-primary-50 text-primary-700',
                                    !isActive && 'text-secondary hover:text-primary hover:bg-primary-50',
                                    'focus-visible:rounded-lg focus-visible:bg-primary-50 focus-visible:text-primary-700'
                                )}
                            >
                                <icon className="w-4 h-4 shrink-0 mr-3" aria-hidden="true" />
                                <span className="line-clamp-1">{link.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Acciones adicionales */}
                <div className="mt-6 pt- border-t border-border">
                    {/* Estado de conexión o similar */}
                </div>
            </div>
        </nav>
    );
}