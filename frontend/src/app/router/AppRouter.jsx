import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider, useLocation } from 'react-router-dom';
import { AuthProvider } from '../providers/AuthProvider';
import { ToastProvider } from '../providers/ToastProvider';
import RutaProtegida from './RutaProtegida';
import RutaPorRol from './RutaPorRol';
import { ROLES } from '../../panel/lib/roles';
import { CargandoPantalla } from '../../panel/ui/Spinner';

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

const PublicLayout = lazyConReintento(() => import('../../web/PublicLayout'));
const AdminLayout = lazyConReintento(() => import('../../panel/layout/AdminLayout'));
const InicioPage = lazyConReintento(() => import('../../web/paginas/paginas').then((m) => ({ default: m.InicioPage })));
const CatalogoPublicoPage = lazyConReintento(() => import('../../web/paginas/CatalogoPage'));
const AplicacionPage = lazyConReintento(() => import('../../web/paginas/AplicacionPage'));
const CaracteristicasPage = lazyConReintento(() => import('../../web/paginas/CaracteristicasPage'));
const NosotrosPage = lazyConReintento(() => import('../../web/paginas/NosotrosPage'));
const DescargarPage = lazyConReintento(() => import('../../web/paginas/DescargarPage'));
const CuentaClientePage = lazyConReintento(() => import('../../web/tienda/CuentaPage'));
const CarritoWebPage = lazyConReintento(() => import('../../web/tienda/CarritoPage'));
const CheckoutWebPage = lazyConReintento(() => import('../../web/tienda/CheckoutPage'));
const MisComprasWebPage = lazyConReintento(() => import('../../web/tienda/MisComprasPage'));
const FavoritosWebPage = lazyConReintento(() => import('../../web/tienda/FavoritosPage'));
const LibroPublicoPage = lazyConReintento(() => import('../../web/tienda/LibroPage'));

const publica = (elemento) => <Suspense fallback={null}>{elemento}</Suspense>;

const LoginPage = lazyConReintento(() => import('../../panel/auth/LoginPage'));
const VerificarEmailPage = lazyConReintento(() => import('../../panel/auth/VerificarEmailPage'));
const DashboardPage = lazyConReintento(() => import('../../panel/dashboard/DashboardPage'));
const LibrosAutoresPage = lazyConReintento(() => import('../../panel/libros/LibrosAutoresPage'));
const CategoriasPage = lazyConReintento(() => import('../../panel/categorias/CategoriasPage'));
const InventarioPage = lazyConReintento(() => import('../../panel/inventario/InventarioPage'));
const PedidosPage = lazyConReintento(() => import('../../panel/pedidos/PedidosPage'));
const VentasPage = lazyConReintento(() => import('../../panel/ventas/VentasPage'));
const GestionVentasPage = lazyConReintento(() => import('../../panel/ventas/GestionVentasPage'));
const ComprobantesPage = lazyConReintento(() => import('../../panel/comprobantes/ComprobantesPage'));
const UsuariosPage = lazyConReintento(() => import('../../panel/usuarios/UsuariosClientesPage'));
const TarifasEnvioPage = lazyConReintento(() => import('../../panel/tarifas/TarifasEnvioPage'));
const EmpresaPage = lazyConReintento(() => import('../../panel/configuracion/EmpresaPage'));
const LibroReclamacionesPage = lazyConReintento(() => import('../../web/paginas/ReclamacionesPublicasPage'));
const ReclamacionesPage = lazyConReintento(() => import('../../panel/reclamaciones/ReclamacionesPage'));
const AnunciosPage = lazyConReintento(() => import('../../panel/anuncios/AnunciosPage'));

const cargar = (elemento) => <Suspense fallback={<CargandoPantalla />}>{elemento}</Suspense>;

const para = (roles, elemento) => <RutaPorRol roles={roles}>{cargar(elemento)}</RutaPorRol>;

const AMBOS = [ROLES.ADMINISTRADOR];
const SOLO_ADMIN = [ROLES.ADMINISTRADOR];

function RedirigirOperacion({ ruta }) {
    const { search, hash } = useLocation();
    return <Navigate to={{ pathname: ruta, search, hash }} replace />;
}

const router = createBrowserRouter([
    {
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
            { path: '/libro/:id', element: publica(<LibroPublicoPage />) }
        ]
    },
    { path: '/admin/login', element: cargar(<LoginPage />) },
    { path: '/admin', element: <Navigate to="/admin/login" replace /> },
    { path: '/verificar-email', element: cargar(<VerificarEmailPage />) },
    { path: '/libro-de-reclamaciones', element: cargar(<LibroReclamacionesPage />) },
    {
        element: <RutaProtegida>{cargar(<AdminLayout />)}</RutaProtegida>,
        children: [
            { path: '/dashboard', element: para(SOLO_ADMIN, <DashboardPage />) },

            { path: '/libros', element: para(AMBOS, <LibrosAutoresPage />) },
            { path: '/autores', element: para(SOLO_ADMIN, <Navigate to="/libros?vista=autores" replace />) },
            { path: '/categorias', element: para(SOLO_ADMIN, <CategoriasPage />) },
            { path: '/inventario', element: para(AMBOS, <InventarioPage />) },

            { path: '/reservas', element: <Navigate to="/dashboard" replace /> },
            {
                path: '/ventas',
                element: para(SOLO_ADMIN, <GestionVentasPage />),
                children: [
                    { index: true, element: cargar(<VentasPage incrustado />) },
                    { path: 'pedidos', element: cargar(<PedidosPage incrustado />) },
                    { path: 'comprobantes', element: cargar(<ComprobantesPage incrustado />) }
                ]
            },

            { path: '/pedidos', element: para(SOLO_ADMIN, <RedirigirOperacion ruta="/ventas/pedidos" />) },
            { path: '/comprobantes', element: para(SOLO_ADMIN, <RedirigirOperacion ruta="/ventas/comprobantes" />) },
            { path: '/pagos', element: para(SOLO_ADMIN, <RedirigirOperacion ruta="/ventas" />) },

            { path: '/usuarios', element: para(SOLO_ADMIN, <UsuariosPage />) },
            { path: '/clientes', element: para(SOLO_ADMIN, <Navigate to="/usuarios?vista=clientes" replace />) },
            { path: '/reclamaciones', element: para(SOLO_ADMIN, <ReclamacionesPage />) },
            { path: '/anuncios', element: para(SOLO_ADMIN, <AnunciosPage />) },
            { path: '/tarifas-envio', element: para(SOLO_ADMIN, <TarifasEnvioPage />) },
            { path: '/historial', element: para(SOLO_ADMIN, <Navigate to="/dashboard" replace />) },
            { path: '/configuracion/empresa', element: para(SOLO_ADMIN, <EmpresaPage />) },

            { path: '/personalizacion', element: <Navigate to="/dashboard" replace /> },

            { path: '/agencias', element: <Navigate to="/dashboard" replace /> },

            { path: '/cierre-caja', element: <Navigate to="/dashboard" replace /> },

            { path: '/reportes', element: <Navigate to="/dashboard" replace /> }
        ]
    },
    { path: '*', element: <Navigate to="/" replace /> }
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
