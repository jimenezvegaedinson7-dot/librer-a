import { lazy, Suspense } from 'react';

import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';

import { AuthProvider } from '../features/auth/AuthContext';
import { ToastProvider } from '../components/providers/ToastProvider';
import AdminLayout from '../features/layout/AdminLayout';
import RutaProtegida from './RutaProtegida';
import { CargandoPantalla } from '../components/ui/Spinner';

const LoginPage = lazy(() => import('../features/auth/LoginPage'));
const VerificarEmailPage = lazy(() => import('../features/auth/VerificarEmailPage'));
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'));
const LibrosPage = lazy(() => import('../features/libros/LibrosPage'));
const AutoresPage = lazy(() => import('../features/autores/AutoresPage'));
const CategoriasPage = lazy(() => import('../features/categorias/CategoriasPage'));
const InventarioPage = lazy(() => import('../features/inventario/InventarioPage'));
const ReservasPage = lazy(() => import('../features/reservas/ReservasPage'));
const VentasPage = lazy(() => import('../features/ventas/VentasPage'));
const ComprobantesPage = lazy(() => import('../features/comprobantes/ComprobantesPage'));
const PagosPage = lazy(() => import('../features/pagos/PagosPage'));
const UsuariosPage = lazy(() => import('../features/usuarios/UsuariosPage'));
const ClientesPage = lazy(() => import('../features/clientes/ClientesPage'));
const AgenciasPage = lazy(() => import('../features/agencias/AgenciasPage'));
const HistorialPage = lazy(() => import('../features/historial/HistorialPage'));
const ReportesPage = lazy(() => import('../features/reportes/ReportesPage'));
const EmpresaPage = lazy(() => import('../features/configuracion/EmpresaPage'));

const cargar = (elemento) => <Suspense fallback={<CargandoPantalla />}>{elemento}</Suspense>;

const router = createBrowserRouter([
    {
        path: '/',
        element: <LoginPage />,
    },
    {
        path: '/verificar-email',
        element: cargar(<VerificarEmailPage />),
    },
    {
        element: (
            <RutaProtegida><AdminLayout /></RutaProtegida>
        ),
        children: [
            { path: '/dashboard', element: cargar(<DashboardPage />) },
            { path: '/libros', element: cargar(<LibrosPage />) },
            { path: '/autores', element: cargar(<AutoresPage />) },
            { path: '/categorias', element: cargar(<CategoriasPage />) },
            { path: '/inventario', element: cargar(<InventarioPage />) },
            { path: '/reservas', element: cargar(<ReservasPage />) },
            { path: '/ventas', element: cargar(<VentasPage />) },
            { path: '/comprobantes', element: cargar(<ComprobantesPage />) },
            { path: '/pagos', element: cargar(<PagosPage />) },
            { path: '/usuarios', element: cargar(<UsuariosPage />) },
            { path: '/clientes', element: cargar(<ClientesPage />) },
            { path: '/agencias', element: cargar(<AgenciasPage />) },
            { path: '/historial', element: cargar(<HistorialPage />) },
            { path: '/reportes', element: cargar(<ReportesPage />) },
            { path: '/configuracion/empresa', element: cargar(<EmpresaPage />) },
        ],
    },
    {
        path: '*',
        element: <Navigate to="/" replace />,
    },
]);

export default function AppRouter() {
    return (
        <ToastProvider>
            <AuthProvider>
                <RouterProvider router={router} />
            </AuthProvider>
        </ToastProvider>
    );
}
