# Mapa del frontend (React 19 + Vite + Tailwind 4) — Panel y tienda web

> Generado desde el código real el 2026-10-09 con `docs/architecture/tools/actualizar-mapa.mjs`.
> No contiene secretos: solo nombres de variables de entorno.

## Arranque

`index.html` → `src/main.jsx` → `<ErrorBoundary>` → `routes/AppRouter.jsx`:
`<ToastProvider>` → `<AuthProvider>` → `<RouterProvider>` (react-router ^7.18.3).

- **Cliente HTTP**: `lib/api/client.js` (axios). `baseURL = VITE_API_URL` (`.env.production` apunta a `https://libreria-api-v9h0.onrender.com/api`, `.env.development` a `http://localhost:3000/api`). Interceptor de petición añade `Bearer <token>`; el de respuesta devuelve `response.data` y ante **401** limpia la sesión y redirige a `/`.
- **Sesión**: `features/auth/AuthContext.jsx` + `lib/storage/index.js` (`localStorage`: `token`, `usuario`, `ultimoHistorialVisto`). Solo entra `administrador`; perfil actualiza los datos de sesión desde la API.
- **Cliente web**: `public-site/tienda/TiendaContext.jsx` y `clienteApi.js` mantienen sesión exclusiva de `cliente`, carrito por usuario/invitado e intento de compra persistente; nunca usan la sesión administrativa. `PublicLayout` los proporciona a cuenta, carrito, checkout, compras y detalle del libro.
- **Guards**: `routes/RutaProtegida.jsx` redirige a `/` sin token o sin rol administrador. `routes/RutaPorRol.jsx` exige los roles configurados (solo administrador en el panel). Un **401** limpia sesión; un **403** muestra rechazo de permisos.
- **Layout**: `features/layout/AdminLayout.jsx` (ThemeProvider, Sidebar, Topbar, Breadcrumbs, transición de página con Framer Motion).
- **Tema**: `components/providers/ThemeContext.jsx` (modo claro/oscuro y colores por zona en `localStorage`). `src/index.css` carga `styles/paleta-editorial.css` (marino, marfil y dorado compartidos con la web), `styles/theme.css` (componentes) y `styles/panel-editorial.css` (identidad del panel y modo oscuro). `public-site/tema-editorial.css` usa la misma paleta. Los iconos de navegación y búsqueda se definen juntos en `features/layout/navConfig.js`.
- **Despliegue**: Vercel (`frontend/vercel.json` reescribe todo a `index.html`).

## Rutas

| Ruta | Componente | Archivo |
|---|---|---|
| `/` | InicioPage | `public-site/pages/paginas.jsx` |
| `/catalogo` | CatalogoPublicoPage | `public-site/pages/CatalogoPage.jsx` |
| `/aplicacion` | AplicacionPage | `public-site/pages/paginas.jsx` |
| `/caracteristicas` | CaracteristicasPage | `public-site/pages/paginas.jsx` |
| `/nosotros` | NosotrosPage | `public-site/pages/paginas.jsx` |
| `/descargar` | DescargarPage | `public-site/pages/paginas.jsx` |
| `/cuenta` | CuentaClientePage | `public-site/tienda/CuentaPage.jsx` |
| `/carrito` | CarritoWebPage | `public-site/tienda/CarritoPage.jsx` |
| `/checkout` | CheckoutWebPage | `public-site/tienda/CheckoutPage.jsx` |
| `/mis-compras` | MisComprasWebPage | `public-site/tienda/MisComprasPage.jsx` |
| `/favoritos` | FavoritosWebPage | `public-site/tienda/FavoritosPage.jsx` |
| `/libro/:id` | LibroPublicoPage | `public-site/tienda/LibroPage.jsx` |
| `/admin/login` | LoginPage | `features/auth/LoginPage.jsx` |
| `/admin` | Navigate | redirección: `<Navigate to="/admin/login" replace />` |
| `/verificar-email` | VerificarEmailPage | `features/auth/VerificarEmailPage.jsx` |
| `/libro-de-reclamaciones` | TiendaProvider | — |
| `/dashboard` | DashboardPage | `features/dashboard/DashboardPage.jsx` |
| `/libros` | LibrosPage | `features/libros/LibrosPage.jsx` |
| `/autores` | AutoresPage | `features/autores/AutoresPage.jsx` |
| `/categorias` | CategoriasPage | `features/categorias/CategoriasPage.jsx` |
| `/inventario` | InventarioPage | `features/inventario/InventarioPage.jsx` |
| `/reservas` | ReservasPage | `features/reservas/ReservasPage.jsx` |
| `/pedidos` | PedidosPage | `features/pedidos/PedidosPage.jsx` |
| `/ventas` | VentasPage | `features/ventas/VentasPage.jsx` |
| `/comprobantes` | ComprobantesPage | `features/comprobantes/ComprobantesPage.jsx` |
| `/pagos` | PagosPage | `features/pagos/PagosPage.jsx` |
| `/usuarios` | UsuariosPage | `features/usuarios/UsuariosClientesPage.jsx` |
| `/clientes` | Navigate | redirección: `para(SOLO_ADMIN, <Navigate to="/usuarios?vista=clientes" replace />) }` |
| `/reclamaciones` | ReclamacionesPage | `features/reclamaciones/ReclamacionesPage.jsx` |
| `/anuncios` | AnunciosPage | `features/anuncios/AnunciosPage.jsx` |
| `/tarifas-envio` | TarifasEnvioPage | `features/tarifas/TarifasEnvioPage.jsx` |
| `/historial` | HistorialPage | `features/historial/HistorialPage.jsx` |
| `/configuracion/empresa` | EmpresaPage | `features/configuracion/EmpresaPage.jsx` |
| `/personalizacion` | Navigate | redirección: `<Navigate to="/dashboard" replace /> }` |
| `/agencias` | Navigate | redirección: `<Navigate to="/dashboard" replace /> }` |
| `/cierre-caja` | Navigate | redirección: `<Navigate to="/dashboard" replace /> }` |
| `/reportes` | Navigate | redirección: `<Navigate to="/dashboard" replace /> }` |
| `*` | Navigate | redirección: `<Navigate to="/" replace />` |

El panel cuelga de `<RutaProtegida><AdminLayout/></RutaProtegida>` y permite solo administrador. `/`, `/verificar-email` y `/libro-de-reclamaciones` son públicas. `/reportes` y `/cierre-caja` redirigen a `/dashboard`; `/agencias` a `/`.

## Cadena página → servicio → endpoint

Archivos que importan funciones de servicio y los endpoints que alcanzan (el componente puede ser una página, un formulario o un modal):

| Archivo | Endpoints |
|---|---|
| `features/anuncios/AnunciosPage.jsx` | `DELETE /api/anuncios/:param`<br>`GET /api/anuncios/todos`<br>`POST /api/anuncios`<br>`PUT /api/anuncios/:param` |
| `features/anuncios/CarruselPanel.jsx` | `DELETE /api/anuncios/carrusel/:param`<br>`GET /api/anuncios/carrusel/todos`<br>`GET /api/libros`<br>`POST /api/anuncios/carrusel`<br>`PUT /api/anuncios/carrusel/:param`<br>`PUT /api/anuncios/carrusel/orden` |
| `features/auth/LoginPage.jsx` | `POST /api/auth/2fa/verify-login`<br>`POST /api/auth/login`<br>`POST /api/auth/reestablecer-contrasena`<br>`POST /api/auth/solicitar-reseteo` |
| `features/auth/VerificarEmailPage.jsx` | `POST /api/auth/reenviar-codigo`<br>`POST /api/auth/verificar-email` |
| `features/autores/AutorEditModal.jsx` | `PUT /api/autores/:param` |
| `features/autores/AutorForm.jsx` | `POST /api/autores` |
| `features/autores/AutoresPage.jsx` | `DELETE /api/autores/:param`<br>`GET /api/autores`<br>`GET /api/autores/:param` |
| `features/categorias/CategoriaEditModal.jsx` | `PUT /api/categorias/:param` |
| `features/categorias/CategoriaForm.jsx` | `POST /api/categorias` |
| `features/categorias/CategoriasPage.jsx` | `DELETE /api/categorias/:param`<br>`GET /api/categorias`<br>`GET /api/categorias/:param` |
| `features/clientes/ClientesPage.jsx` | `GET /api/clientes` |
| `features/comprobantes/ComprobanteSunatModal.jsx` | `POST /api/comprobantes/:param/anular`<br>`PUT /api/comprobantes/:param/sunat` |
| `features/comprobantes/ComprobanteViewModal.jsx` | `GET /api/comprobantes/:param`<br>`GET /api/empresa` |
| `features/comprobantes/ComprobantesPage.jsx` | `GET /api/comprobantes`<br>`GET /api/comprobantes/resumen`<br>`POST /api/comprobantes/:param/enviar-email` |
| `features/configuracion/EmpresaPage.jsx` | `GET /api/empresa`<br>`PUT /api/empresa` |
| `features/dashboard/DashboardPage.jsx` | `GET /api/inventario/stock-bajo`<br>`GET /api/libros`<br>`GET /api/reportes/indicadores-ventas`<br>`GET /api/reportes/libros-mas-vendidos`<br>`GET /api/reportes/reservas-por-estado`<br>`GET /api/reportes/resumen`<br>`GET /api/reportes/ventas-por-dia`<br>`GET /api/reportes/ventas-por-estado`<br>`GET /api/reportes/ventas-por-mes` |
| `features/dashboard/dashboardService.js` | `GET /api/inventario/stock-bajo`<br>`GET /api/libros`<br>`GET /api/reportes/indicadores-ventas`<br>`GET /api/reportes/libros-mas-vendidos`<br>`GET /api/reportes/reservas-por-estado`<br>`GET /api/reportes/resumen`<br>`GET /api/reportes/ventas-por-dia`<br>`GET /api/reportes/ventas-por-estado`<br>`GET /api/reportes/ventas-por-mes` |
| `features/historial/HistorialPage.jsx` | `GET /api/historial` |
| `features/inventario/InventarioEditModal.jsx` | `PUT /api/inventario/libro/:param` |
| `features/inventario/InventarioForm.jsx` | `POST /api/inventario` |
| `features/inventario/InventarioPage.jsx` | `GET /api/inventario`<br>`GET /api/inventario/libro/:param` |
| `features/inventario/MovimientosModal.jsx` | `GET /api/inventario/movimientos`<br>`GET /api/libros` |
| `features/inventario/useLibros.js` | `GET /api/libros` |
| `features/layout/PerfilAdministrador.jsx` | `GET /api/usuarios/perfil`<br>`POST /api/auth/2fa/confirm`<br>`POST /api/auth/2fa/disable`<br>`POST /api/auth/2fa/setup`<br>`PUT /api/usuarios/foto`<br>`PUT /api/usuarios/password`<br>`PUT /api/usuarios/perfil` |
| `features/libros/LibroEditModal.jsx` | `GET /api/autores`<br>`GET /api/categorias`<br>`GET /api/libros/:param`<br>`PUT /api/libros/:param` |
| `features/libros/LibroForm.jsx` | `GET /api/libros/:param`<br>`POST /api/libros` |
| `features/libros/LibrosPage.jsx` | `DELETE /api/libros/:param`<br>`GET /api/inventario`<br>`GET /api/libros`<br>`GET /api/libros/:param` |
| `features/libros/useCatalogo.js` | `GET /api/autores`<br>`GET /api/categorias` |
| `features/notificaciones/notificacionesService.js` | `GET /api/inventario/stock-bajo`<br>`GET /api/pagos`<br>`GET /api/reservas` |
| `features/pagos/PagosPage.jsx` | `GET /api/pagos`<br>`GET /api/pagos/resumen`<br>`GET /api/ventas` |
| `features/pedidos/PedidosPage.jsx` | `GET /api/pedidos`<br>`GET /api/pedidos/:param`<br>`PUT /api/pedidos/:param/estado` |
| `features/reclamaciones/LibroReclamacionesPage.jsx` | `GET /api/empresa` |
| `features/reclamaciones/ReclamacionesPage.jsx` | `GET /api/reclamaciones`<br>`GET /api/reclamaciones/resumen`<br>`PUT /api/reclamaciones/:param/respuesta` |
| `features/reportes/useVentasDiarias.js` | `GET /api/reportes/ventas-por-dia` |
| `features/reservas/ReservaEstadoModal.jsx` | `PUT /api/reservas/:param/estado` |
| `features/reservas/ReservasPage.jsx` | `GET /api/reservas`<br>`GET /api/reservas/:param` |
| `features/tarifas/TarifaEditModal.jsx` | `POST /api/zonas-delivery`<br>`PUT /api/zonas-delivery/:param` |
| `features/tarifas/TarifasEnvioPage.jsx` | `GET /api/zonas-delivery/todos` |
| `features/usuarios/UsuariosPage.jsx` | `GET /api/usuarios`<br>`PATCH /api/usuarios/:param` |
| `features/ventas/EmitirComprobanteModal.jsx` | `GET /api/empresa`<br>`POST /api/comprobantes/:param/enviar-email`<br>`POST /api/ventas/:param/comprobante` |
| `features/ventas/ReembolsoModal.jsx` | `POST /api/ventas/:param/reembolso` |
| `features/ventas/VentasPage.jsx` | `GET /api/ventas`<br>`GET /api/ventas/:param` |
| `public-site/PublicLayout.jsx` | `GET /api/empresa`<br>`GET /api/libros` |
| `public-site/asistente/AsistenteTienda.jsx` | `GET /api/libros`<br>`POST /api/asistente` |
| `public-site/asistente/useMemoriaAsistente.js` | `DELETE /api/asistente/memoria`<br>`GET /api/asistente/memoria`<br>`PUT /api/asistente/memoria` |
| `public-site/components/ActualizarApp.jsx` | `GET /api/app/version` |
| `public-site/sections/Hero.jsx` | `GET /api/anuncios/carrusel` |
| `public-site/sections/VideoSection.jsx` | `GET /api/anuncios` |
| `public-site/tienda/AccionesLibro.jsx` | `DELETE /api/favoritos/:param`<br>`GET /api/favoritos/:param`<br>`POST /api/favoritos/:param` |
| `public-site/tienda/CheckoutPage.jsx` | `GET /api/pagos/capacidades`<br>`GET /api/ventas/:param`<br>`GET /api/zonas-delivery` |
| `public-site/tienda/CuentaPage.jsx` | `POST /api/auth/2fa/verify-login`<br>`POST /api/auth/login`<br>`POST /api/auth/reenviar-codigo`<br>`POST /api/auth/reestablecer-contrasena`<br>`POST /api/auth/registro`<br>`POST /api/auth/solicitar-reseteo`<br>`POST /api/auth/verificar-email`<br>`POST /api/auth/verificar-reseteo` |
| `public-site/tienda/FavoritosPage.jsx` | `DELETE /api/favoritos/:param`<br>`GET /api/favoritos` |
| `public-site/tienda/LibroPage.jsx` | `GET /api/autores/:param`<br>`GET /api/libros/:param` |
| `public-site/tienda/MisComprasPage.jsx` | `GET /api/pagos/:param`<br>`GET /api/ventas/:param/pago`<br>`GET /api/ventas/mis-ventas` |
| `public-site/tienda/PerfilCliente.jsx` | `PUT /api/usuarios/foto`<br>`PUT /api/usuarios/perfil` |
| `public-site/tienda/TiendaContext.jsx` | `GET /api/libros`<br>`GET /api/usuarios/perfil`<br>`GET /api/ventas/:param` |
| `public-site/tienda/persistenciaCompra.js` | `POST /api/pagos/crear-orden` |
| `public-site/tienda/useDatosCliente.js` | `GET /api/ventas/mis-ventas` |

## Servicios (`features/*/*Service.js`)

| Servicio | Función | Endpoint |
|---|---|---|
| `features/anuncios/anunciosService.js` | `listarAnuncios` | `GET /api/anuncios/todos` |
| `features/anuncios/anunciosService.js` | `obtenerAnuncioActivo` | `GET /api/anuncios` |
| `features/anuncios/anunciosService.js` | `crearAnuncio` | `POST /api/anuncios` |
| `features/anuncios/anunciosService.js` | `actualizarAnuncio` | `PUT /api/anuncios/:param` |
| `features/anuncios/anunciosService.js` | `eliminarAnuncio` | `DELETE /api/anuncios/:param` |
| `features/anuncios/carruselService.js` | `listarImagenesCarrusel` | `GET /api/anuncios/carrusel/todos` |
| `features/anuncios/carruselService.js` | `crearImagenCarrusel` | `POST /api/anuncios/carrusel` |
| `features/anuncios/carruselService.js` | `actualizarImagenCarrusel` | `PUT /api/anuncios/carrusel/:param`<br>`PUT /api/anuncios/carrusel/:param` |
| `features/anuncios/carruselService.js` | `ordenarCarrusel` | `PUT /api/anuncios/carrusel/orden` |
| `features/anuncios/carruselService.js` | `eliminarImagenCarrusel` | `DELETE /api/anuncios/carrusel/:param` |
| `features/auth/authService.js` | `login` | `POST /api/auth/login` |
| `features/auth/authService.js` | `verificarEmail` | `POST /api/auth/verificar-email` |
| `features/auth/authService.js` | `reenviarCodigo` | `POST /api/auth/reenviar-codigo` |
| `features/auth/authService.js` | `verificarLoginOtp` | `POST /api/auth/2fa/verify-login` |
| `features/auth/authService.js` | `setup2fa` | `POST /api/auth/2fa/setup` |
| `features/auth/authService.js` | `confirmar2fa` | `POST /api/auth/2fa/confirm` |
| `features/auth/authService.js` | `desactivar2fa` | `POST /api/auth/2fa/disable` |
| `features/auth/authService.js` | `solicitarReseteo` | `POST /api/auth/solicitar-reseteo` |
| `features/auth/authService.js` | `restablecerContrasena` | `POST /api/auth/reestablecer-contrasena` |
| `features/auth/perfilService.js` | `obtenerPerfil` | `GET /api/usuarios/perfil` |
| `features/auth/perfilService.js` | `actualizarPerfil` | `PUT /api/usuarios/perfil` |
| `features/auth/perfilService.js` | `actualizarFoto` | `PUT /api/usuarios/foto` |
| `features/auth/perfilService.js` | `cambiarPassword` | `PUT /api/usuarios/password` |
| `features/autores/autoresService.js` | `listarAutores` | `GET /api/autores` |
| `features/autores/autoresService.js` | `obtenerAutor` | `GET /api/autores/:param` |
| `features/autores/autoresService.js` | `crearAutor` | `POST /api/autores` |
| `features/autores/autoresService.js` | `actualizarAutor` | `PUT /api/autores/:param` |
| `features/autores/autoresService.js` | `eliminarAutor` | `DELETE /api/autores/:param` |
| `features/categorias/categoriasService.js` | `listarCategorias` | `GET /api/categorias` |
| `features/categorias/categoriasService.js` | `obtenerCategoria` | `GET /api/categorias/:param` |
| `features/categorias/categoriasService.js` | `crearCategoria` | `POST /api/categorias` |
| `features/categorias/categoriasService.js` | `actualizarCategoria` | `PUT /api/categorias/:param` |
| `features/categorias/categoriasService.js` | `eliminarCategoria` | `DELETE /api/categorias/:param` |
| `features/clientes/clientesService.js` | `listarClientes` | `GET /api/clientes` |
| `features/comprobantes/comprobantesService.js` | `listarComprobantes` | `GET /api/comprobantes` |
| `features/comprobantes/comprobantesService.js` | `obtenerComprobante` | `GET /api/comprobantes/:param` |
| `features/comprobantes/comprobantesService.js` | `emitirComprobante` | `POST /api/ventas/:param/comprobante` |
| `features/comprobantes/comprobantesService.js` | `enviarComprobanteEmail` | `POST /api/comprobantes/:param/enviar-email` |
| `features/comprobantes/comprobantesService.js` | `obtenerResumen` | `GET /api/comprobantes/resumen` |
| `features/comprobantes/comprobantesService.js` | `registrarSunat` | `PUT /api/comprobantes/:param/sunat` |
| `features/comprobantes/comprobantesService.js` | `anularComprobante` | `POST /api/comprobantes/:param/anular` |
| `features/configuracion/empresaService.js` | `obtenerEmpresa` | `GET /api/empresa` |
| `features/configuracion/empresaService.js` | `actualizarEmpresa` | `PUT /api/empresa` |
| `features/dashboard/dashboardService.js` | `obtenerLibros` | `GET /api/libros` (vía features/libros/librosService.js#listarLibros) |
| `features/dashboard/dashboardService.js` | `obtenerResumen` | `GET /api/reportes/resumen` (vía features/reportes/reportesService.js#obtenerResumen) |
| `features/dashboard/dashboardService.js` | `obtenerLibrosMasVendidos` | `GET /api/reportes/libros-mas-vendidos` (vía features/reportes/reportesService.js#obtenerLibrosMasVendidos) |
| `features/dashboard/dashboardService.js` | `obtenerVentasPorEstado` | `GET /api/reportes/ventas-por-estado` (vía features/reportes/reportesService.js#obtenerVentasPorEstado) |
| `features/dashboard/dashboardService.js` | `obtenerReservasPorEstado` | `GET /api/reportes/reservas-por-estado` (vía features/reportes/reportesService.js#obtenerReservasPorEstado) |
| `features/dashboard/dashboardService.js` | `obtenerVentasPorMes` | `GET /api/reportes/ventas-por-mes` (vía features/reportes/reportesService.js#obtenerVentasPorMes) |
| `features/dashboard/dashboardService.js` | `obtenerVentasPorDia` | `GET /api/reportes/ventas-por-dia` (vía features/reportes/reportesService.js#obtenerVentasPorDia) |
| `features/dashboard/dashboardService.js` | `obtenerIndicadoresVentas` | `GET /api/reportes/indicadores-ventas` (vía features/reportes/reportesService.js#obtenerIndicadoresVentas) |
| `features/dashboard/dashboardService.js` | `obtenerStockBajo` | `GET /api/inventario/stock-bajo` (vía features/reportes/reportesService.js#obtenerStockBajo) |
| `features/historial/historialService.js` | `obtenerHistorial` | `GET /api/historial` |
| `features/inventario/inventarioService.js` | `listarInventario` | `GET /api/inventario` |
| `features/inventario/inventarioService.js` | `obtenerInventarioLibro` | `GET /api/inventario/libro/:param` |
| `features/inventario/inventarioService.js` | `crearInventario` | `POST /api/inventario` |
| `features/inventario/inventarioService.js` | `actualizarInventario` | `PUT /api/inventario/libro/:param` |
| `features/inventario/inventarioService.js` | `listarMovimientos` | `GET /api/inventario/movimientos` |
| `features/inventario/inventarioService.js` | `listarLibros` | `GET /api/libros` (vía features/libros/librosService.js#listarLibros) |
| `features/libros/librosService.js` | `listarLibros` | `GET /api/libros` |
| `features/libros/librosService.js` | `obtenerLibro` | `GET /api/libros/:param` |
| `features/libros/librosService.js` | `crearLibro` | `POST /api/libros`<br>`GET /api/libros/:param` (vía features/libros/librosService.js#obtenerLibro) |
| `features/libros/librosService.js` | `actualizarLibro` | `PUT /api/libros/:param`<br>`GET /api/libros/:param` (vía features/libros/librosService.js#obtenerLibro)<br>`GET /api/libros/:param` (vía features/libros/librosService.js#obtenerLibro) |
| `features/libros/librosService.js` | `eliminarLibro` | `DELETE /api/libros/:param` |
| `features/libros/librosService.js` | `listarAutores` | `GET /api/autores` |
| `features/libros/librosService.js` | `listarCategorias` | `GET /api/categorias` |
| `features/pagos/pagosService.js` | `listarPagos` | `GET /api/pagos` |
| `features/pagos/pagosService.js` | `obtenerResumen` | `GET /api/pagos/resumen` |
| `features/pedidos/pedidosService.js` | `listarPedidos` | `GET /api/pedidos` |
| `features/pedidos/pedidosService.js` | `obtenerPedido` | `GET /api/pedidos/:param` |
| `features/pedidos/pedidosService.js` | `listarPedidosFiltrados` | `GET /api/pedidos` |
| `features/pedidos/pedidosService.js` | `cambiarEstadoPedido` | `PUT /api/pedidos/:param/estado` |
| `features/reclamaciones/reclamacionesService.js` | `listarReclamaciones` | `GET /api/reclamaciones` |
| `features/reclamaciones/reclamacionesService.js` | `obtenerResumenReclamaciones` | `GET /api/reclamaciones/resumen` |
| `features/reclamaciones/reclamacionesService.js` | `responderReclamacion` | `PUT /api/reclamaciones/:param/respuesta` |
| `features/reclamaciones/reclamacionesService.js` | `obtenerEmpresaPublica` | `GET /api/empresa` |
| `features/reportes/reportesService.js` | `obtenerResumen` | `GET /api/reportes/resumen` |
| `features/reportes/reportesService.js` | `obtenerLibrosMasVendidos` | `GET /api/reportes/libros-mas-vendidos` |
| `features/reportes/reportesService.js` | `obtenerVentasPorEstado` | `GET /api/reportes/ventas-por-estado` |
| `features/reportes/reportesService.js` | `obtenerReservasPorEstado` | `GET /api/reportes/reservas-por-estado` |
| `features/reportes/reportesService.js` | `obtenerStockBajo` | `GET /api/inventario/stock-bajo` |
| `features/reportes/reportesService.js` | `obtenerVentasPorMes` | `GET /api/reportes/ventas-por-mes` |
| `features/reportes/reportesService.js` | `obtenerVentasPorDia` | `GET /api/reportes/ventas-por-dia` |
| `features/reportes/reportesService.js` | `obtenerIndicadoresVentas` | `GET /api/reportes/indicadores-ventas` |
| `features/reservas/reservasService.js` | `listarReservas` | `GET /api/reservas` |
| `features/reservas/reservasService.js` | `obtenerReserva` | `GET /api/reservas/:param` |
| `features/reservas/reservasService.js` | `actualizarEstadoReserva` | `PUT /api/reservas/:param/estado` |
| `features/tarifas/tarifasService.js` | `listarZonasDelivery` | `GET /api/zonas-delivery/todos` |
| `features/tarifas/tarifasService.js` | `guardarZonaDelivery` | `PUT /api/zonas-delivery/:param`<br>`POST /api/zonas-delivery` |
| `features/usuarios/usuariosService.js` | `listarUsuarios` | `GET /api/usuarios` |
| `features/usuarios/usuariosService.js` | `actualizarUsuario` | `PATCH /api/usuarios/:param` |
| `features/ventas/ventasService.js` | `listarVentas` | `GET /api/ventas` |
| `features/ventas/ventasService.js` | `obtenerVenta` | `GET /api/ventas/:param` |
| `features/ventas/ventasService.js` | `reembolsarVenta` | `POST /api/ventas/:param/reembolso` |
| `features/ventas/ventasService.js` | `listarLibros` | `GET /api/libros` (vía features/libros/librosService.js#listarLibros) |
| `public-site/hooks/useApiPublica.js` | `useCatalogo` | `GET /api/libros` |
| `public-site/hooks/useApiPublica.js` | `useAnuncioActivo` | `GET /api/anuncios` |
| `public-site/hooks/useApiPublica.js` | `useEmpresa` | `GET /api/empresa` |
| `public-site/hooks/useApiPublica.js` | `useVersionApp` | `GET /api/app/version` |
| `public-site/hooks/useCarrusel.js` | `useCarrusel` | `GET /api/anuncios/carrusel` |
| `public-site/tienda/clienteApi.js` | `login` | `POST /api/auth/login` |
| `public-site/tienda/clienteApi.js` | `registro` | `POST /api/auth/registro` |
| `public-site/tienda/clienteApi.js` | `verificarEmail` | `POST /api/auth/verificar-email` |
| `public-site/tienda/clienteApi.js` | `reenviarCodigo` | `POST /api/auth/reenviar-codigo` |
| `public-site/tienda/clienteApi.js` | `solicitarReseteo` | `POST /api/auth/solicitar-reseteo` |
| `public-site/tienda/clienteApi.js` | `verificarReseteo` | `POST /api/auth/verificar-reseteo` |
| `public-site/tienda/clienteApi.js` | `restablecer` | `POST /api/auth/reestablecer-contrasena` |
| `public-site/tienda/clienteApi.js` | `verificar2fa` | `POST /api/auth/2fa/verify-login` |
| `public-site/tienda/clienteApi.js` | `perfil` | `GET /api/usuarios/perfil` |
| `public-site/tienda/clienteApi.js` | `actualizarPerfil` | `PUT /api/usuarios/perfil` |
| `public-site/tienda/clienteApi.js` | `subirFoto` | `PUT /api/usuarios/foto` |
| `public-site/tienda/clienteApi.js` | `catalogo` | `GET /api/libros` |
| `public-site/tienda/clienteApi.js` | `asistente` | `POST /api/asistente` |
| `public-site/tienda/clienteApi.js` | `libro` | `GET /api/libros/:param` |
| `public-site/tienda/clienteApi.js` | `autor` | `GET /api/autores/:param` |
| `public-site/tienda/clienteApi.js` | `favoritos` | `GET /api/favoritos` |
| `public-site/tienda/clienteApi.js` | `memoriaAsistente` | `GET /api/asistente/memoria` |
| `public-site/tienda/clienteApi.js` | `guardarMemoriaAsistente` | `PUT /api/asistente/memoria` |
| `public-site/tienda/clienteApi.js` | `borrarMemoriaAsistente` | `DELETE /api/asistente/memoria` |
| `public-site/tienda/clienteApi.js` | `favorito` | `GET /api/favoritos/:param` |
| `public-site/tienda/clienteApi.js` | `agregarFavorito` | `POST /api/favoritos/:param` |
| `public-site/tienda/clienteApi.js` | `quitarFavorito` | `DELETE /api/favoritos/:param` |
| `public-site/tienda/clienteApi.js` | `zonas` | `GET /api/zonas-delivery` |
| `public-site/tienda/clienteApi.js` | `capacidades` | `GET /api/pagos/capacidades` |
| `public-site/tienda/clienteApi.js` | `crearOrden` | `POST /api/pagos/crear-orden` |
| `public-site/tienda/clienteApi.js` | `compras` | `GET /api/ventas/mis-ventas` |
| `public-site/tienda/clienteApi.js` | `compra` | `GET /api/ventas/:param` |
| `public-site/tienda/clienteApi.js` | `pagoCompra` | `GET /api/ventas/:param/pago` |
| `public-site/tienda/clienteApi.js` | `verificarPago` | `GET /api/pagos/:param` |

## Componentes compartidos (`components/`)

| Archivo | Usado por (nº de archivos) |
|---|---|
| `components/catalogo/PortadaCatalogo.jsx` | 3 |
| `components/providers/ToastProvider.jsx` | 17 |
| `components/ui/Acciones.jsx` | 14 |
| `components/ui/Alert.jsx` | 34 |
| `components/ui/Badge.jsx` | 23 |
| `components/ui/Button.jsx` | 48 |
| `components/ui/Card.jsx` | 20 |
| `components/ui/Celebracion.jsx` | 2 |
| `components/ui/ConfirmarAccion.jsx` | 3 |
| `components/ui/ConfirmarEliminacion.jsx` | 4 |
| `components/ui/DataTable.jsx` | 15 |
| `components/ui/EmptyState.jsx` | 17 |
| `components/ui/ErrorBoundary.jsx` | 1 |
| `components/ui/EstadoModal.jsx` | 1 |
| `components/ui/Ficha.jsx` | 10 |
| `components/ui/Form.jsx` | 36 |
| `components/ui/FormularioAlta.jsx` | 3 |
| `components/ui/Indicadores.jsx` | 13 |
| `components/ui/Modal.jsx` | 29 |
| `components/ui/PageHeader.jsx` | 16 |
| `components/ui/Pagination.jsx` | 13 |
| `components/ui/Spinner.jsx` | 4 |
| `components/ui/TableSkeleton.jsx` | 17 |
| `public-site/components/ActualizarApp.jsx` | 1 |
| `public-site/components/BarraMovil.jsx` | 1 |
| `public-site/components/CierreDescarga.jsx` | 1 |
| `public-site/components/EtiquetasLibro.jsx` | 2 |
| `public-site/components/ImagenCarga.jsx` | 2 |
| `public-site/components/Migas.jsx` | 2 |
| `public-site/components/Precarga.jsx` | 1 |
| `public-site/components/PrecioOferta.jsx` | 5 |
| `public-site/components/PublicFooter.jsx` | 1 |
| `public-site/components/PublicHeader.jsx` | 1 |

## Hooks y utilidades

- `lib/api/client.js`
- `lib/hooks/useFormulario.js`
- `lib/hooks/usePaginaPanel.js`
- `lib/roles.js`
- `lib/storage/index.js`
- `lib/utils/cuentas.js`
- `lib/utils/entrega.js`
- `lib/utils/exportarCsv.js`
- `lib/utils/format.js`
- `lib/utils/numeroALetras.js`
- `lib/utils/portadasLibro.js`
- `lib/utils/seguimientoPedido.js`
- `lib/utils/sonido.js`
- `lib/utils/url.js`
- `lib/utils/validaciones.js`
- `public-site/lib/formato.js`
- `public-site/lib/precarga.js`
- `public-site/lib/useCarruselAutomatico.js`

## Framer Motion (`motion/react`) — 26 archivos

- `components/providers/ToastProvider.jsx`
- `components/ui/Celebracion.jsx`
- `components/ui/EmptyState.jsx`
- `components/ui/Indicadores.jsx`
- `components/ui/Modal.jsx`
- `features/auth/LoginPage.jsx`
- `features/auth/VerificarEmailPage.jsx`
- `features/dashboard/DashboardPage.jsx`
- `features/dashboard/Decoraciones.jsx`
- `features/dashboard/DetalleTarjeta.jsx`
- `features/dashboard/MejorRegistro.jsx`
- `features/dashboard/Pastel3D.jsx`
- `features/dashboard/StatCard.jsx`
- `features/dashboard/StatusDonut.jsx`
- `features/dashboard/StockBajo.jsx`
- `features/dashboard/useContador.js`
- `features/layout/AdminLayout.jsx`
- `features/layout/PerfilAdministrador.jsx`
- `features/layout/Sidebar.jsx`
- `features/notificaciones/PanelNotificaciones.jsx`
- `features/tarifas/TarifasEnvioPage.jsx`
- `features/usuarios/UsuariosClientesPage.jsx`
- `features/ventas/VentasPage.jsx`
- `public-site/components/PublicHeader.jsx`
- `public-site/PublicLayout.jsx`
- `public-site/sections/FeatureStory.jsx`

## Módulo Dashboard (Resumen)

`DashboardPage.jsx` carga en paralelo `/api/reportes/{resumen, libros-mas-vendidos, ventas-por-estado, reservas-por-estado, ventas-por-mes, ventas-por-dia, indicadores-ventas, stock-bajo}` y `GET /api/libros` (los tres últimos de reportes con `.catch` para no bloquear). Componentes: `StatCard`/`MiniStat`, `MejorRegistro`, `SalesChart` (30 días / 12 meses, métrica, tabla), `TopBooks`, `StatusDonut` (barra apilada de estados), `StockBajo`, `RecentBooks`; utilidades en `graficoUtils.js`.
