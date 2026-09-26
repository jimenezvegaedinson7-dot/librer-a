# Mapa del frontend (React 19 + Vite + Tailwind 4) — Panel administrativo

> Generado desde el código real el 2026-09-26 con `docs/architecture/tools/actualizar-mapa.mjs`.
> No contiene secretos: solo nombres de variables de entorno.

## Arranque

`index.html` → `src/main.jsx` → `<ErrorBoundary>` → `routes/AppRouter.jsx`:
`<ToastProvider>` → `<AuthProvider>` → `<RouterProvider>` (react-router ^7.18.3).

- **Cliente HTTP**: `lib/api/client.js` (axios). `baseURL = VITE_API_URL` (`.env.production` apunta a `https://libreria-api-v9h0.onrender.com/api`, `.env.development` a `http://localhost:3000/api`). Interceptor de petición añade `Bearer <token>`; el de respuesta devuelve `response.data` y ante **401** limpia la sesión y redirige a `/`.
- **Sesión**: `features/auth/AuthContext.jsx` + `lib/storage/index.js` (`localStorage`: `token`, `usuario`, `ultimoHistorialVisto`). Solo entra el rol `administrador` (validado en `LoginPage`).
- **Guard**: `routes/RutaProtegida.jsx` redirige a `/` si no hay token.
- **Layout**: `features/layout/AdminLayout.jsx` (ThemeProvider, Sidebar, Topbar, Breadcrumbs, transición de página con Framer Motion).
- **Tema**: `components/providers/ThemeContext.jsx` (modo claro/oscuro y colores por zona en `localStorage`). Estilos globales: `src/index.css` → `src/styles/theme.css` (tokens de marca, dark mode, componentes).
- **Despliegue**: Vercel (`frontend/vercel.json` reescribe todo a `index.html`).

## Rutas

| Ruta | Componente | Archivo |
|---|---|---|
| `/` | LoginPage | `features/auth/LoginPage.jsx` |
| `/verificar-email` | VerificarEmailPage | `features/auth/VerificarEmailPage.jsx` |
| `/libro-de-reclamaciones` | LibroReclamacionesPage | `features/reclamaciones/LibroReclamacionesPage.jsx` |
| `/dashboard` | DashboardPage | `features/dashboard/DashboardPage.jsx` |
| `/libros` | LibrosPage | `features/libros/LibrosPage.jsx` |
| `/autores` | AutoresPage | `features/autores/AutoresPage.jsx` |
| `/categorias` | CategoriasPage | `features/categorias/CategoriasPage.jsx` |
| `/inventario` | InventarioPage | `features/inventario/InventarioPage.jsx` |
| `/reservas` | ReservasPage | `features/reservas/ReservasPage.jsx` |
| `/ventas` | VentasPage | `features/ventas/VentasPage.jsx` |
| `/comprobantes` | ComprobantesPage | `features/comprobantes/ComprobantesPage.jsx` |
| `/cierre-caja` | CierreCajaPage | `features/cierre/CierreCajaPage.jsx` |
| `/reclamaciones` | ReclamacionesPage | `features/reclamaciones/ReclamacionesPage.jsx` |
| `/pagos` | PagosPage | `features/pagos/PagosPage.jsx` |
| `/usuarios` | UsuariosPage | `features/usuarios/UsuariosClientesPage.jsx` |
| `/clientes` | Navigate | redirección: `<Navigate to="/usuarios?vista=clientes" replace /> }` |
| `/agencias` | Navigate | redirección: `<Navigate to="/" replace /> }` |
| `/tarifas-envio` | TarifasEnvioPage | `features/tarifas/TarifasEnvioPage.jsx` |
| `/historial` | HistorialPage | `features/historial/HistorialPage.jsx` |
| `/reportes` | Navigate | redirección: `<Navigate to="/dashboard" replace /> }` |
| `/configuracion/empresa` | EmpresaPage | `features/configuracion/EmpresaPage.jsx` |
| `/personalizacion` | PersonalizacionPage | `features/configuracion/PersonalizacionPage.jsx` |
| `*` | Navigate | redirección: `<Navigate to="/" replace />` |

Todas excepto `/` y `/verificar-email` cuelgan de `<RutaProtegida><AdminLayout/></RutaProtegida>`. `/reportes` redirige a `/dashboard` (Reportes se integró en el Resumen).

## Cadena página → servicio → endpoint

Archivos que importan funciones de servicio y los endpoints que alcanzan (el componente puede ser una página, un formulario o un modal):

| Archivo | Endpoints |
|---|---|
| `features/agencias/AgenciaEditModal.jsx` | `PUT /api/agencias/:param` |
| `features/agencias/AgenciasPage.jsx` | `GET /api/agencias`<br>`POST /api/agencias` |
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
| `features/dashboard/DashboardPage.jsx` | `GET /api/libros`<br>`GET /api/reportes/indicadores-ventas`<br>`GET /api/reportes/libros-mas-vendidos`<br>`GET /api/reportes/reservas-por-estado`<br>`GET /api/reportes/resumen`<br>`GET /api/reportes/stock-bajo`<br>`GET /api/reportes/ventas-por-dia`<br>`GET /api/reportes/ventas-por-estado`<br>`GET /api/reportes/ventas-por-mes` |
| `features/dashboard/dashboardService.js` | `GET /api/libros`<br>`GET /api/reportes/indicadores-ventas`<br>`GET /api/reportes/libros-mas-vendidos`<br>`GET /api/reportes/reservas-por-estado`<br>`GET /api/reportes/resumen`<br>`GET /api/reportes/stock-bajo`<br>`GET /api/reportes/ventas-por-dia`<br>`GET /api/reportes/ventas-por-estado`<br>`GET /api/reportes/ventas-por-mes` |
| `features/historial/HistorialPage.jsx` | `GET /api/historial` |
| `features/inventario/InventarioEditModal.jsx` | `PUT /api/inventario/libro/:param` |
| `features/inventario/InventarioForm.jsx` | `POST /api/inventario` |
| `features/inventario/InventarioPage.jsx` | `GET /api/inventario`<br>`GET /api/inventario/libro/:param` |
| `features/inventario/MovimientosModal.jsx` | `GET /api/inventario/movimientos`<br>`GET /api/libros` |
| `features/inventario/useLibros.js` | `GET /api/libros` |
| `features/layout/PerfilAdministrador.jsx` | `GET /api/usuarios/perfil`<br>`POST /api/auth/2fa/confirm`<br>`POST /api/auth/2fa/disable`<br>`POST /api/auth/2fa/setup`<br>`PUT /api/usuarios/foto`<br>`PUT /api/usuarios/password`<br>`PUT /api/usuarios/perfil` |
| `features/libros/LibroEditModal.jsx` | `GET /api/autores`<br>`GET /api/categorias`<br>`PUT /api/libros/:param` |
| `features/libros/LibroForm.jsx` | `POST /api/libros` |
| `features/libros/LibrosPage.jsx` | `DELETE /api/libros/:param`<br>`GET /api/inventario`<br>`GET /api/libros`<br>`GET /api/libros/:param` |
| `features/libros/useCatalogo.js` | `GET /api/autores`<br>`GET /api/categorias` |
| `features/notificaciones/notificacionesService.js` | `GET /api/pagos`<br>`GET /api/reportes/stock-bajo`<br>`GET /api/reservas` |
| `features/pagos/PagosPage.jsx` | `GET /api/pagos`<br>`GET /api/pagos/resumen`<br>`GET /api/ventas` |
| `features/reclamaciones/LibroReclamacionesPage.jsx` | `GET /api/empresa`<br>`POST /api/reclamaciones` |
| `features/reclamaciones/ReclamacionesPage.jsx` | `GET /api/reclamaciones`<br>`GET /api/reclamaciones/resumen`<br>`PUT /api/reclamaciones/:param/respuesta` |
| `features/reservas/ReservaEstadoModal.jsx` | `PUT /api/reservas/:param/estado` |
| `features/reservas/ReservaForm.jsx` | `GET /api/libros`<br>`POST /api/reservas` |
| `features/reservas/ReservasPage.jsx` | `GET /api/reservas`<br>`GET /api/reservas/:param` |
| `features/reservas/reservasService.js` | `GET /api/libros` |
| `features/tarifas/TarifaEditModal.jsx` | `PUT /api/ubicaciones/distritos/:param` |
| `features/tarifas/TarifasEnvioPage.jsx` | `GET /api/ubicaciones/provincias`<br>`GET /api/ubicaciones/provincias/:param/distritos` |
| `features/usuarios/UsuariosPage.jsx` | `GET /api/usuarios`<br>`PATCH /api/usuarios/:param` |
| `features/ventas/EmitirComprobanteModal.jsx` | `GET /api/empresa`<br>`POST /api/comprobantes/:param/enviar-email`<br>`POST /api/ventas/:param/comprobante` |
| `features/ventas/ReembolsoModal.jsx` | `POST /api/ventas/:param/reembolso` |
| `features/ventas/VentaForm.jsx` | `GET /api/libros`<br>`GET /api/ubicaciones/provincias`<br>`GET /api/ubicaciones/provincias/:param/distritos`<br>`POST /api/ventas` |
| `features/ventas/VentasPage.jsx` | `GET /api/ventas`<br>`GET /api/ventas/:param`<br>`PUT /api/ventas/:param/estado` |

## Servicios (`features/*/*Service.js`)

| Servicio | Función | Endpoint |
|---|---|---|
| `features/agencias/agenciasService.js` | `listarAgencias` | `GET /api/agencias` |
| `features/agencias/agenciasService.js` | `listarAgenciasActivas` | `GET /api/agencias/activas` |
| `features/agencias/agenciasService.js` | `obtenerAgencia` | `GET /api/agencias/:param` |
| `features/agencias/agenciasService.js` | `crearAgencia` | `POST /api/agencias` |
| `features/agencias/agenciasService.js` | `actualizarAgencia` | `PUT /api/agencias/:param` |
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
| `features/dashboard/dashboardService.js` | `obtenerStockBajo` | `GET /api/reportes/stock-bajo` (vía features/reportes/reportesService.js#obtenerStockBajo) |
| `features/historial/historialService.js` | `obtenerHistorial` | `GET /api/historial` |
| `features/inventario/inventarioService.js` | `listarInventario` | `GET /api/inventario` |
| `features/inventario/inventarioService.js` | `obtenerInventarioLibro` | `GET /api/inventario/libro/:param` |
| `features/inventario/inventarioService.js` | `crearInventario` | `POST /api/inventario` |
| `features/inventario/inventarioService.js` | `actualizarInventario` | `PUT /api/inventario/libro/:param` |
| `features/inventario/inventarioService.js` | `listarMovimientos` | `GET /api/inventario/movimientos` |
| `features/inventario/inventarioService.js` | `listarLibros` | `GET /api/libros` (vía features/libros/librosService.js#listarLibros) |
| `features/libros/librosService.js` | `listarLibros` | `GET /api/libros` |
| `features/libros/librosService.js` | `obtenerLibro` | `GET /api/libros/:param` |
| `features/libros/librosService.js` | `crearLibro` | `POST /api/libros` |
| `features/libros/librosService.js` | `actualizarLibro` | `PUT /api/libros/:param` |
| `features/libros/librosService.js` | `eliminarLibro` | `DELETE /api/libros/:param` |
| `features/libros/librosService.js` | `listarAutores` | `GET /api/autores` |
| `features/libros/librosService.js` | `listarCategorias` | `GET /api/categorias` |
| `features/pagos/pagosService.js` | `listarPagos` | `GET /api/pagos` |
| `features/pagos/pagosService.js` | `obtenerResumen` | `GET /api/pagos/resumen` |
| `features/reclamaciones/reclamacionesService.js` | `registrarReclamacion` | `POST /api/reclamaciones` |
| `features/reclamaciones/reclamacionesService.js` | `listarReclamaciones` | `GET /api/reclamaciones` |
| `features/reclamaciones/reclamacionesService.js` | `obtenerResumenReclamaciones` | `GET /api/reclamaciones/resumen` |
| `features/reclamaciones/reclamacionesService.js` | `responderReclamacion` | `PUT /api/reclamaciones/:param/respuesta` |
| `features/reclamaciones/reclamacionesService.js` | `obtenerEmpresaPublica` | `GET /api/empresa` |
| `features/reportes/reportesService.js` | `obtenerResumen` | `GET /api/reportes/resumen` |
| `features/reportes/reportesService.js` | `obtenerLibrosMasVendidos` | `GET /api/reportes/libros-mas-vendidos` |
| `features/reportes/reportesService.js` | `obtenerVentasPorEstado` | `GET /api/reportes/ventas-por-estado` |
| `features/reportes/reportesService.js` | `obtenerReservasPorEstado` | `GET /api/reportes/reservas-por-estado` |
| `features/reportes/reportesService.js` | `obtenerStockBajo` | `GET /api/reportes/stock-bajo` |
| `features/reportes/reportesService.js` | `obtenerVentasPorMes` | `GET /api/reportes/ventas-por-mes` |
| `features/reportes/reportesService.js` | `obtenerVentasPorDia` | `GET /api/reportes/ventas-por-dia` |
| `features/reportes/reportesService.js` | `obtenerIndicadoresVentas` | `GET /api/reportes/indicadores-ventas` |
| `features/reservas/reservasService.js` | `listarReservas` | `GET /api/reservas` |
| `features/reservas/reservasService.js` | `obtenerReserva` | `GET /api/reservas/:param` |
| `features/reservas/reservasService.js` | `crearReserva` | `POST /api/reservas` |
| `features/reservas/reservasService.js` | `actualizarEstadoReserva` | `PUT /api/reservas/:param/estado` |
| `features/reservas/reservasService.js` | `listarLibrosActivos` | `GET /api/libros` (vía features/libros/librosService.js#listarLibros) |
| `features/tarifas/tarifasService.js` | `listarDistritosLima` | `GET /api/ubicaciones/provincias`<br>`GET /api/ubicaciones/provincias/:param/distritos` |
| `features/tarifas/tarifasService.js` | `actualizarTarifaDistrito` | `PUT /api/ubicaciones/distritos/:param` |
| `features/usuarios/usuariosService.js` | `listarUsuarios` | `GET /api/usuarios` |
| `features/usuarios/usuariosService.js` | `actualizarUsuario` | `PATCH /api/usuarios/:param` |
| `features/ventas/ubicacionesService.js` | `listarProvincias` | `GET /api/ubicaciones/provincias` |
| `features/ventas/ubicacionesService.js` | `listarDistritos` | `GET /api/ubicaciones/provincias/:param/distritos` |
| `features/ventas/ubicacionesService.js` | `listarDistritosParaEnvio` | `GET /api/ubicaciones/provincias` (vía features/ventas/ubicacionesService.js#listarProvincias)<br>`GET /api/ubicaciones/provincias/:param/distritos` (vía features/ventas/ubicacionesService.js#listarDistritos) |
| `features/ventas/ventasService.js` | `listarVentas` | `GET /api/ventas` |
| `features/ventas/ventasService.js` | `obtenerVenta` | `GET /api/ventas/:param` |
| `features/ventas/ventasService.js` | `crearVenta` | `POST /api/ventas` |
| `features/ventas/ventasService.js` | `reembolsarVenta` | `POST /api/ventas/:param/reembolso` |
| `features/ventas/ventasService.js` | `cambiarEstadoVenta` | `PUT /api/ventas/:param/estado` |
| `features/ventas/ventasService.js` | `listarLibros` | `GET /api/libros` (vía features/libros/librosService.js#listarLibros) |

## Componentes compartidos (`components/`)

| Archivo | Usado por (nº de archivos) |
|---|---|
| `components/providers/ThemeContext.jsx` | 4 |
| `components/providers/ToastProvider.jsx` | 15 |
| `components/ui/Acciones.jsx` | 13 |
| `components/ui/Alert.jsx` | 35 |
| `components/ui/Badge.jsx` | 22 |
| `components/ui/Button.jsx` | 50 |
| `components/ui/Card.jsx` | 21 |
| `components/ui/Celebracion.jsx` | 2 |
| `components/ui/ConfirmarAccion.jsx` | 3 |
| `components/ui/ConfirmarEliminacion.jsx` | 2 |
| `components/ui/DataTable.jsx` | 14 |
| `components/ui/EmptyState.jsx` | 15 |
| `components/ui/ErrorBoundary.jsx` | 1 |
| `components/ui/EstadoModal.jsx` | 1 |
| `components/ui/Ficha.jsx` | 9 |
| `components/ui/Form.jsx` | 39 |
| `components/ui/FormularioAlta.jsx` | 5 |
| `components/ui/Modal.jsx` | 28 |
| `components/ui/PageHeader.jsx` | 18 |
| `components/ui/Pagination.jsx` | 13 |
| `components/ui/Spinner.jsx` | 4 |
| `components/ui/TableSkeleton.jsx` | 16 |

## Hooks y utilidades

- `lib/api/client.js`
- `lib/hooks/useFormulario.js`
- `lib/storage/index.js`
- `lib/utils/cuentas.js`
- `lib/utils/exportarCsv.js`
- `lib/utils/format.js`
- `lib/utils/numeroALetras.js`
- `lib/utils/sonido.js`
- `lib/utils/url.js`
- `lib/utils/validaciones.js`

## Framer Motion (`motion/react`) — 19 archivos

- `components/providers/ToastProvider.jsx`
- `components/ui/Celebracion.jsx`
- `components/ui/EmptyState.jsx`
- `components/ui/Modal.jsx`
- `features/auth/LoginPage.jsx`
- `features/auth/VerificarEmailPage.jsx`
- `features/dashboard/DashboardPage.jsx`
- `features/dashboard/Decoraciones.jsx`
- `features/dashboard/MejorRegistro.jsx`
- `features/dashboard/StatCard.jsx`
- `features/dashboard/StatusDonut.jsx`
- `features/dashboard/StockBajo.jsx`
- `features/layout/AdminLayout.jsx`
- `features/layout/PerfilAdministrador.jsx`
- `features/layout/Sidebar.jsx`
- `features/notificaciones/PanelNotificaciones.jsx`
- `features/tarifas/TarifasEnvioPage.jsx`
- `features/usuarios/UsuariosClientesPage.jsx`
- `features/ventas/VentasPage.jsx`

## Módulo Dashboard (Resumen)

`DashboardPage.jsx` carga en paralelo `/api/reportes/{resumen, libros-mas-vendidos, ventas-por-estado, reservas-por-estado, ventas-por-mes, ventas-por-dia, indicadores-ventas, stock-bajo}` y `GET /api/libros` (los tres últimos de reportes con `.catch` para no bloquear). Componentes: `StatCard`/`MiniStat`, `MejorRegistro`, `SalesChart` (30 días / 12 meses, métrica, tabla), `TopBooks`, `StatusDonut` (barra apilada de estados), `StockBajo`, `RecentBooks`; utilidades en `graficoUtils.js`.
