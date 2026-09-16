import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { LibrosPage } from './features/libros/LibrosPage';
import { AutoresPage } from './features/autores/AutoresPage';
import { CategoriasPage } from './features/categorias/CategoriasPage';
import { InventarioPage } from './features/inventario/InventarioPage';
import { ReservasPage } from './features/reservas/ReservasPage';
import { VentasPage } from './features/ventas/VentasPage';
import { UsuariosPage } from './features/usuarios/UsuariosPage';
import { ReportesPage } from './features/reportes/ReportesPage';
import { ConfiguracionPage } from './features/config/ConfiguracionPage';
import { LoginPage } from './features/auth/LoginPage';
import { AdminLayout } from './features/layout/AdminLayout';

export const AppRouter = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<AdminLayout><DashboardPage /></AdminLayout>} />
                <Route path="/libros" element={<AdminLayout><LibrosPage /></AdminLayout>} />
                <Route path="/autores" element={<AdminLayout><AutoresPage /></AdminLayout>} />
                <Route path="/categorias" element={<AdminLayout><CategoriasPage /></AdminLayout>} />
                <Route path "/inventario" element={<AdminLayout><InventarioPage /></AdminLayout>} />
                <Route path="/reservas" element={<AdminLayout><ReservasPage /></AdminLayout>} />
                <Route path="/ventas" element={<AdminLayout><VentasPage /></AdminLayout>} />
                <Route path="/clientes" element={<AdminLayout><UsuariosPage /></AdminLayout>} />
                <Route path="/reportes" element={<AdminLayout><ReportesPage /></AdminLayout>} />
                <Route path="/config" element={<AdminLayout><ConfiguracionPage /></AdminLayout>} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </Router>
    );
};