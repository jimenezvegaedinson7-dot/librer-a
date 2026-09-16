import { cn } from '@/lib/utils';
import { LogOut, User, Menu } from 'lucide-react';

export default function Topbar({
    className,
    onLogout,
    ...props
}) {
    return (
        <header
            className={cn(
                'fixed top-0 left-0 right-0 z-10 border-b border-border bg-white shadow-sm',
                className
            )}
            {...props}
        >
            <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-6">
                {/* Menú hamburguesa para móvil */}
                <button
                    className="md:hidden p-1 rounded-lg hover:bg-border focus-visible:bg-border focus-visible:text-foreground"
                    onClick={setIsOpen} // Assuming setIsOpen is passed or use state
                >
                    <Menu className="h-5 w-5" aria-hidden="true" />
                </button>

                {/* Título del módulo actual */}
                <h1 className="text-xl font-medium text-foreground">
                    Panel Administrativo
                </h1>

                {/* Usuario/Perfil */}
                <div className="flex items-center gap-3">
                    <button
                        className="rounded-full p-1.5 hover:bg-border focus-visible:bg-border focus-visible:text-foreground transition-colors"
                        aria-label="Perfil"
                    >
                        <User className="h-6 w-5" aria-hidden="true" />
                    </button>

                    <div className="relative">
                        <button
                            className="rounded-full p-1.5 hover:bg-border focus-visible:bg-border focus-visible:text-foreground transition-colors"
                            aria-label="Menú de perfil"
                        >
                            <User className="h-6 w-5" aria-hidden="true" />
                        </button>
                        <ul
                            className="absolute right-0 mt-2 w-32 rounded-lg border-border bg-card shadow-lg py-1 z-10 origin-bottom-right start-1/2 -translate-x-1/2"
                            role="menu"
                        >
                            <li>
                                <a
                                    href="/config"
                                    className="block rounded-sm px-3 py-1.5 text-sm text-secondary hover:text-primary hover:bg-primary-50 transition-colors"
                                >
                                    Configuración
                                </a>
                            </li>
                            <li>
                                <button
                                    onClick={onLogout}
                                    className="w-full rounded-sm px-3 py-1.5 text-sm text-red-600 hover:text-red-700 transition-colors"
                                >
                                    Cerrar sesión
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </header>
    );
}