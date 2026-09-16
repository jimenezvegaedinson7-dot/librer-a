import Sidebar from '@/components/ui/Sidebar';
import Topbar from '@/components/ui/Topbar';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function AdminLayout({
    children,
    className,
    ...props
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <div className={cn('min-h-screen', className)} {...props}>
            {/* Container principal */}
            <div className="flex min-h-screen">

                {/* Sidebar */}
                <Sidebar
                    onNavigate={(key) => {
                        // Navegación interna manejada por router
                        if (key === 'dashboard') navigate('/');
                        else navigate(`/${key}`);
                    }}
                    isOpen={isSidebarOpen}
                />

                {/* Contenido principal */}
                <div className="flex-1 flex flex-col overflow-y-auto">
                    <Topbar onLogout={() => console.log('logout')} />

                    <main className="flex-1 p-6 pt-0">
                        {/* Breadcrumbs */}
                        <nav className="mb-4">
                            <ol className="flex space-x-1">
                                <li>
                                    <a
                                        href="/"
                                        className="text-secondary hover:text-primary transition-colors"
                                    >
                                        Inicio
                                    </a>
                                </li>
                                {location.pathname !== '/' && (
                                    <li>
                                        <span className="text-sm text-muted-foreground">
                                            {location.pathname.replace('/', '').replace(/[A-Z]/g, ' $&')
                                                .trim()
                                        }
                                    </span>
                                </li>
                            </ol>
                        </nav>}

                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}