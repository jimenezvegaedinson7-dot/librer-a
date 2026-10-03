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
import RutaPorRol from './RutaPorRol';
import { ROLES } from '../lib/roles';
import { CargandoPantalla } from '../components/ui/Spinner';

const PublicLayout = lazyConReintento(() => import('../public-site/PublicLayout'));
const InicioPage = lazyConReintento(() => import('../public-site/pages/paginas').then((m) => ({ default: m.InicioPage })));
const CatalogoPublicoPage = lazyConReintento(() => import('../public-site/pages/CatalogoPage'));
const AplicacionPage = lazyConReintento(() => import('../public-site/pages/paginas').then((m) => ({ default: m.AplicacionPage })));
const CaracteristicasPage = lazyConReintento(() => import('../public-site/pages/paginas').then((m) => ({ default: m.CaracteristicasPage })));
const NosotrosPage = lazyConReintento(() => import('../public-site/pages/paginas').then((m) => ({ default: m.NosotrosPage })));
const DescargarPage = lazyConReintento(() => import('../public-site/pages/paginas').then((m) => ({ default: m.DescargarPage })));
const CuentaClientePage = lazyConReintento(() => import('../public-site/tienda/CuentaPage'));
const CarritoWebPage = lazyConReintento(() => import('../public-site/tienda/CarritoPage'));
const CheckoutWebPage = lazyConReintento(() => import('../public-site/tienda/CheckoutPage'));
const MisComprasWebPage = lazyConReintento(() => import('../public-site/tienda/MisComprasPage'));
const FavoritosWebPage = lazyConReintento(() => import('../public-site/tienda/FavoritosPage'));
const LibroPublicoPage = lazyConReintento(() => import('../public-site/tienda/LibroPage'));

// Páginas de la web pública: sin pantalla de carga del panel.
const publica = (elemento) => <Suspense fallback={null}>{elemento}</Suspense>;
const LoginPage = lazyConReintento(() => import('../features/auth/LoginPage'));
const VerificarEmailPage = lazyConReintento(() => import('../features/auth/VerificarEmailPage'));
const DashboardPage = lazyConReintento(() => import('../features/dashboard/DashboardPage'));
const LibrosPage = lazyConReintento(() => import('../features/libros/LibrosPage'));
const AutoresPage = lazyConReintento(() => import('../features/autores/AutoresPage'));
const CategoriasPage = lazyConReintento(() => import('../features/categorias/CategoriasPage'));
const InventarioPage = lazyConReintento(() => import('../features/inventario/InventarioPage'));
const ReservasPage = lazyConReintento(() => import('../features/reservas/ReservasPage'));
const PedidosPage = lazyConReintento(() => import('../features/pedidos/PedidosPage'));
const VentasPage = lazyConReintento(() => import('../features/ventas/VentasPage'));
const ComprobantesPage = lazyConReintento(() => import('../features/comprobantes/ComprobantesPage'));
const PagosPage = lazyConReintento(() => import('../features/pagos/PagosPage'));
const UsuariosPage = lazyConReintento(() => import('../features/usuarios/UsuariosClientesPage'));
const TarifasEnvioPage = lazyConReintento(() => import('../features/tarifas/TarifasEnvioPage'));
const HistorialPage = lazyConReintento(() => import('../features/historial/HistorialPage'));
const EmpresaPage = lazyConReintento(() => import('../features/configuracion/EmpresaPage'));
const PersonalizacionPage = lazyConReintento(() => import('../features/configuracion/PersonalizacionPage'));
const LibroReclamacionesPage = lazyConReintento(() => import('../features/reclamaciones/LibroReclamacionesPage'));
const ReclamacionesPage = lazyConReintento(() => import('../features/reclamaciones/ReclamacionesPage'));
const AnunciosPage = lazyConReintento(() => import('../features/anuncios/AnunciosPage'));

const cargar = (elemento) => <Suspense fallback={<CargandoPantalla />}>{elemento}</Suspense>;

// Restringe una pantalla del panel a ciertos roles. Si el rol no está
// autorizado, RutaPorRol redirige a la portada que le corresponde.
const para = (roles, elemento) => <RutaPorRol roles={roles}>{cargar(elemento)}</RutaPorRol>;

const AMBOS = [ROLES.ADMINISTRADOR];
const SOLO_ADMIN = [ROLES.ADMINISTRADOR];

const router = createBrowserRouter([
    {
        // Web pública comercial: cada sección es una página propia.
        element: publica(<PublicLayout />),
        children: [
            { path: '/', element: publica(<InicioPage />) },
            { path: '/catalogo', element: publica(<CatalogoPublicoPage />) },
            { path: '/aplicacion', element: publica(<AplicacionPage />) },
            { path: '/caracteristicas', element: publica(<CaracteristicasPage />) },
            { path: '/nosotros', element: publica(<NosotrosPage />) },
            { path: '/descargar', element: publica(<DescargarPage />) },
            { path: '/cuenta', element: publica(<CuentaClientePage />) },
            { path: '/carrito', element: publica(<CarritoWebPage />) },
            { path: '/checkout', element: publica(<CheckoutWebPage />) },
            { path: '/mis-compras', element: publica(<MisComprasWebPage />) },
            { path: '/favoritos', element: publica(<FavoritosWebPage />) },
            { path: '/libro/:id', element: publica(<LibroPublicoPage />) },
        ],
    },
    {
        // Login del panel administrativo (antes en la raíz).
        path: '/admin/login',
        element: cargar(<LoginPage />),
    },
    {
        path: '/admin',
        element: <Navigate to="/admin/login" replace />,
    },
    {
        path: '/verificar-email',
        element: cargar(<VerificarEmailPage />),
    },
    {
        // Público (sin sesión): lo enlazan las apps y el login.
        path: '/libro-de-reclamaciones',
        element: cargar(<LibroReclamacionesPage />),
    },
    {
        element: (
            <RutaProtegida><AdminLayout /></RutaProtegida>
        ),
        children: [
            // --- Portadas ---
            { path: '/dashboard', element: para(SOLO_ADMIN, <DashboardPage />) },

            // --- Catálogo: administración ---
            { path: '/libros', element: para(AMBOS, <LibrosPage />) },
            { path: '/autores', element: para(SOLO_ADMIN, <AutoresPage />) },
            { path: '/categorias', element: para(SOLO_ADMIN, <CategoriasPage />) },
            { path: '/inventario', element: para(AMBOS, <InventarioPage />) },

            // --- Operaciones ---
            { path: '/reservas', element: para(AMBOS, <ReservasPage />) },
            // Logística de las ventas de la app: solo el administrador
            // mueve el estado de entrega.
            { path: '/pedidos', element: para(SOLO_ADMIN, <PedidosPage />) },
            { path: '/ventas', element: para(AMBOS, <VentasPage />) },
            { path: '/comprobantes', element: para(AMBOS, <ComprobantesPage />) },
            { path: '/pagos', element: para(SOLO_ADMIN, <PagosPage />) },

            // --- Administración y control: solo administrador ---
            { path: '/usuarios', element: para(SOLO_ADMIN, <UsuariosPage />) },
            { path: '/clientes', element: para(SOLO_ADMIN, <Navigate to="/usuarios?vista=clientes" replace />) },
            { path: '/reclamaciones', element: para(SOLO_ADMIN, <ReclamacionesPage />) },
        { path: '/anuncios', element: para(SOLO_ADMIN, <AnunciosPage />) },
            { path: '/tarifas-envio', element: para(SOLO_ADMIN, <TarifasEnvioPage />) },
            { path: '/historial', element: para(SOLO_ADMIN, <HistorialPage />) },
            { path: '/configuracion/empresa', element: para(SOLO_ADMIN, <EmpresaPage />) },
            // La personalización de tema es local al navegador: no expone
            // datos del backend, así que queda disponible para ambos roles.
            { path: '/personalizacion', element: cargar(<PersonalizacionPage />) },

            // El envío por agencia ya no se ofrece (solo Lima): la página queda
            // oculta; se redirige para no romper enlaces guardados.
            { path: '/agencias', element: <Navigate to="/dashboard" replace /> },
            // El cierre de caja no tiene endpoint propio: el resumen del día
            // se ve en el dashboard. Se redirige para no romper enlaces.
            { path: '/cierre-caja', element: <Navigate to="/dashboard" replace /> },
            // Reportes se integró en el resumen; se conserva la ruta para enlaces guardados.
            { path: '/reportes', element: <Navigate to="/dashboard" replace /> },
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
