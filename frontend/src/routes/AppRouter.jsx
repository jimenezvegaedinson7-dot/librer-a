import { lazy, Suspense } from 'react';

const lazyConReintento = (importador) =>
    lazy(() => {
        let reintentos = 0;
        const intentar = () =>
            importador().catch((error) => {
                if (reintentos < 2) {
                    reintentos += 1;
                    return new Promise((r) => setTimeout(r, 800)).then(intentar);
                }
                window.location.reload();
                throw error;
            });
        return intentar();
    });

import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';

import { AuthProvider } from '../features/auth/AuthContext';
import { ToastProvider } from '../components/providers/ToastProvider';
import AdminLayout from '../features/layout/AdminLayout';
import RutaProtegida from './RutaProtegida';
import { CargandoPantalla } from '../components/ui/Spinner';

const LoginPage = lazyConReintento(() => import('../features/auth/LoginPage'));
const VerificarEmailPage = lazyConReintento(() => import('../features/auth/VerificarEmailPage'));
const DashboardPage = lazyConReintento(() => import('../features/dashboard/DashboardPage'));
const LibrosPage = lazyConReintento(() => import('../features/libros/LibrosPage'));
const AutoresPage = lazyConReintento(() => import('../features/autores/AutoresPage'));
const CategoriasPage = lazyConReintento(() => import('../features/categorias/CategoriasPage'));
const InventarioPage = lazyConReintento(() => import('../features/inventario/InventarioPage'));
const ReservasPage = lazyConReintento(() => import('../features/reservas/ReservasPage'));
const VentasPage = lazyConReintento(() => import('../features/ventas/VentasPage'));
const ComprobantesPage = lazyConReintento(() => import('../features/comprobantes/ComprobantesPage'));
const PagosPage = lazyConReintento(() => import('../features/pagos/PagosPage'));
const UsuariosPage = lazyConReintento(() => import('../features/usuarios/UsuariosClientesPage'));
const AgenciasPage = lazyConReintento(() => import('../features/agencias/AgenciasPage'));
const HistorialPage = lazyConReintento(() => import('../features/historial/HistorialPage'));
const EmpresaPage = lazyConReintento(() => import('../features/configuracion/EmpresaPage'));
const PersonalizacionPage = lazyConReintento(() => import('../features/configuracion/PersonalizacionPage'));

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
            { path: '/clientes', element: <Navigate to="/usuarios?vista=clientes" replace /> },
            { path: '/agencias', element: cargar(<AgenciasPage />) },
            { path: '/historial', element: cargar(<HistorialPage />) },
            // Reportes se integró en el resumen; se conserva la ruta para enlaces guardados.
            { path: '/reportes', element: <Navigate to="/dashboard" replace /> },
            { path: '/configuracion/empresa', element: cargar(<EmpresaPage />) },
            { path: '/personalizacion', element: cargar(<PersonalizacionPage />) },
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
