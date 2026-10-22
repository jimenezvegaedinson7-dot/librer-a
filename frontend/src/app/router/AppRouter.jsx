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

import { AuthProvider } from '../providers/AuthContext';
import { ToastProvider } from '../providers/ToastProvider';
import AdminLayout from '../../panel/layout/AdminLayout';
import RutaProtegida from './RutaProtegida';
import RutaPorRol from './RutaPorRol';
import { ROLES } from '../../panel/lib/roles';
import { CargandoPantalla } from '../../panel/ui/Spinner';
import { TiendaProvider } from '../../web/tienda/TiendaContext';

const PublicLayout = lazyConReintento(() => import('../../web/PublicLayout'));
const InicioPage = lazyConReintento(() => import('../../web/paginas/paginas').then((m) => ({ default: m.InicioPage })));
const CatalogoPublicoPage = lazyConReintento(() => import('../../web/paginas/CatalogoPage'));
const AplicacionPage = lazyConReintento(() => import('../../web/paginas/paginas').then((m) => ({ default: m.AplicacionPage })));
const CaracteristicasPage = lazyConReintento(() => import('../../web/paginas/paginas').then((m) => ({ default: m.CaracteristicasPage })));
const NosotrosPage = lazyConReintento(() => import('../../web/paginas/paginas').then((m) => ({ default: m.NosotrosPage })));
const DescargarPage = lazyConReintento(() => import('../../web/paginas/paginas').then((m) => ({ default: m.DescargarPage })));
const CuentaClientePage = lazyConReintento(() => import('../../web/tienda/CuentaPage'));
const CarritoWebPage = lazyConReintento(() => import('../../web/tienda/CarritoPage'));
const CheckoutWebPage = lazyConReintento(() => import('../../web/tienda/CheckoutPage'));
const MisComprasWebPage = lazyConReintento(() => import('../../web/tienda/MisComprasPage'));
const FavoritosWebPage = lazyConReintento(() => import('../../web/tienda/FavoritosPage'));
const LibroPublicoPage = lazyConReintento(() => import('../../web/tienda/LibroPage'));

// Páginas de la web pública: sin pantalla de carga del panel.
const publica = (elemento) => <Suspense fallback={null}>{elemento}</Suspense>;
const LoginPage = lazyConReintento(() => import('../../panel/auth/LoginPage'));
const VerificarEmailPage = lazyConReintento(() => import('../../panel/auth/VerificarEmailPage'));
const DashboardPage = lazyConReintento(() => import('../../panel/dashboard/DashboardPage'));
const LibrosPage = lazyConReintento(() => import('../../panel/libros/LibrosPage'));
const AutoresPage = lazyConReintento(() => import('../../panel/autores/AutoresPage'));
const CategoriasPage = lazyConReintento(() => import('../../panel/categorias/CategoriasPage'));
const InventarioPage = lazyConReintento(() => import('../../panel/inventario/InventarioPage'));
const PedidosPage = lazyConReintento(() => import('../../panel/pedidos/PedidosPage'));
const VentasPage = lazyConReintento(() => import('../../panel/ventas/VentasPage'));
const ComprobantesPage = lazyConReintento(() => import('../../panel/comprobantes/ComprobantesPage'));
const PagosPage = lazyConReintento(() => import('../../panel/pagos/PagosPage'));
const UsuariosPage = lazyConReintento(() => import('../../panel/usuarios/UsuariosClientesPage'));
const TarifasEnvioPage = lazyConReintento(() => import('../../panel/tarifas/TarifasEnvioPage'));
const HistorialPage = lazyConReintento(() => import('../../panel/historial/HistorialPage'));
const EmpresaPage = lazyConReintento(() => import('../../panel/configuracion/EmpresaPage'));
const LibroReclamacionesPage = lazyConReintento(() => import('../../panel/reclamaciones/LibroReclamacionesPage'));
const ReclamacionesPage = lazyConReintento(() => import('../../panel/reclamaciones/ReclamacionesPage'));
const AnunciosPage = lazyConReintento(() => import('../../panel/anuncios/AnunciosPage'));

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
        element: cargar(<TiendaProvider catalogo={{ libros: [], cargando: false }}><LibroReclamacionesPage /></TiendaProvider>),
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
            { path: '/reservas', element: <Navigate to="/dashboard" replace /> },
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
            { path: '/personalizacion', element: <Navigate to="/dashboard" replace /> },

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
