# Mapa de API

> Generado desde el código real el 2026-10-22 con `docs/architecture/tools/actualizar-mapa.mjs`.
> No contiene secretos: solo nombres de variables de entorno.

Total de endpoints registrados en el backend: **123** (incluye 4 definidos directamente en `server.js`).

- **Auth**: `Pública` = sin JWT · `JWT` = requiere `Authorization: Bearer` · `JWT + admin` / `JWT + cliente` = además el rol indicado. Los arrays de middleware compartidos se expanden desde el router real.
- **React / Flutter**: archivos que llaman al endpoint (directamente o a través de su servicio). `—` = ningún cliente lo usa.
- Los parámetros se escriben como en el backend (`:id`); los clientes los construyen con interpolación.

| Método | Endpoint | Backend (controlador#función) | Middleware | React | Flutter | Auth |
|---|---|---|---|---|---|---|
| GET | `/` | inline (server.js) | — | — | — | Pública |
| GET | `/api` | inline (server.js) | — | — | — | Pública |
| GET | `/api/test-db` | inline (server.js) | JWT + rol:administrador | — | — | JWT + admin |
| GET | `/api/debug-egress` | inline (server.js) | JWT + rol:administrador | — | — | JWT + admin |
| GET | `/api/agencias/activas` | controllers/agencia.controller.js#listarAgencias | JWT | — | — | JWT |
| GET | `/api/agencias` | controllers/agencia.controller.js#listarTodasAgencias | JWT + rol:administrador | — | — | JWT + admin |
| GET | `/api/agencias/:id` | controllers/agencia.controller.js#obtenerAgencia | JWT | — | — | JWT |
| POST | `/api/agencias` | controllers/agencia.controller.js#crearAgencia | JWT + rol:administrador | — | — | JWT + admin |
| PUT | `/api/agencias/:id` | controllers/agencia.controller.js#actualizarAgencia | JWT + rol:administrador | — | — | JWT + admin |
| GET | `/api/anuncios` | controllers/anuncio.controller.js#obtenerAnuncioActivo | — | web/secciones/VideoSection.jsx | — | Pública |
| GET | `/api/anuncios/carrusel` | controllers/carrusel.controller.js#listarPublico | — | web/secciones/Hero.jsx<br>web/hooks/useCarrusel.js | — | Pública |
| GET | `/api/anuncios/protagonista` | controllers/portada.controller.js#obtenerPublico | — | web/secciones/portada3d/PortadaEspacial.jsx | — | Pública |
| GET | `/api/anuncios/protagonista/panel` | controllers/portada.controller.js#obtenerPanel | JWT + rol:administrador | panel/anuncios/ProtagonistaPanel.jsx | — | JWT + admin |
| PUT | `/api/anuncios/protagonista` | controllers/portada.controller.js#guardar | JWT + rol:administrador | panel/anuncios/ProtagonistaPanel.jsx | — | JWT + admin |
| GET | `/api/anuncios/carrusel/todos` | controllers/carrusel.controller.js#listarPanel | JWT + rol:administrador | panel/anuncios/CarruselPanel.jsx | — | JWT + admin |
| POST | `/api/anuncios/carrusel` | controllers/carrusel.controller.js#crear | JWT + rol:administrador + recibir | panel/anuncios/CarruselPanel.jsx | — | JWT + admin |
| PUT | `/api/anuncios/carrusel/orden` | controllers/carrusel.controller.js#reordenar | JWT + rol:administrador | panel/anuncios/CarruselPanel.jsx | — | JWT + admin |
| PUT | `/api/anuncios/carrusel/:id` | controllers/carrusel.controller.js#actualizar | JWT + rol:administrador + recibir | panel/anuncios/CarruselPanel.jsx | — | JWT + admin |
| DELETE | `/api/anuncios/carrusel/:id` | controllers/carrusel.controller.js#eliminar | JWT + rol:administrador | panel/anuncios/CarruselPanel.jsx | — | JWT + admin |
| GET | `/api/anuncios/todos` | controllers/anuncio.controller.js#listarAnuncios | JWT + rol:administrador | panel/anuncios/AnunciosPage.jsx | — | JWT + admin |
| POST | `/api/anuncios` | controllers/anuncio.controller.js#crearAnuncio | JWT + rol:administrador + uploadVideo(video) | panel/anuncios/AnunciosPage.jsx | — | JWT + admin |
| PUT | `/api/anuncios/:id` | controllers/anuncio.controller.js#actualizarAnuncio | JWT + rol:administrador + uploadVideo(video) | panel/anuncios/AnunciosPage.jsx | — | JWT + admin |
| DELETE | `/api/anuncios/:id` | controllers/anuncio.controller.js#eliminarAnuncio | JWT + rol:administrador | panel/anuncios/AnunciosPage.jsx | — | JWT + admin |
| GET | `/api/app/version` | controllers/app.controller.js#obtenerVersion | — | web/componentes/ActualizarApp.jsx | — | Pública |
| POST | `/api/asistente` | controllers/asistente.controller.js#conversar | limite | web/asistente/AsistenteTienda.jsx | — | Pública |
| GET | `/api/asistente/memoria` | controllers/asistente.controller.js#obtenerMemoria | limiteMemoria + JWT + rol:cliente | web/asistente/useMemoriaAsistente.js | — | JWT + cliente |
| PUT | `/api/asistente/memoria` | controllers/asistente.controller.js#guardarMemoria | limiteMemoria + JWT + rol:cliente | web/asistente/useMemoriaAsistente.js | — | JWT + cliente |
| DELETE | `/api/asistente/memoria` | controllers/asistente.controller.js#borrarMemoria | limiteMemoria + JWT + rol:cliente | web/asistente/useMemoriaAsistente.js | — | JWT + cliente |
| POST | `/api/auth/registro` | controllers/auth.controller.js#registrar | registroLimiter | web/tienda/CuentaPage.jsx | screens/registro_screen.dart | Pública |
| POST | `/api/auth/login` | controllers/auth.controller.js#login | loginLimiter | panel/auth/LoginPage.jsx<br>web/tienda/CuentaPage.jsx | screens/login_screen.dart | Pública |
| POST | `/api/auth/verificar-email` | controllers/auth.controller.js#verificarEmail | verificacionLimiter | panel/auth/VerificarEmailPage.jsx<br>web/tienda/CuentaPage.jsx | screens/verificacion_email_screen.dart | Pública |
| POST | `/api/auth/reenviar-codigo` | controllers/auth.controller.js#reenviarCodigo | verificacionLimiter | panel/auth/VerificarEmailPage.jsx<br>web/tienda/CuentaPage.jsx | screens/verificacion_email_screen.dart | Pública |
| POST | `/api/auth/solicitar-reseteo` | controllers/auth.controller.js#solicitarReseteo | verificacionLimiter | panel/auth/LoginPage.jsx<br>web/tienda/CuentaPage.jsx | screens/recuperar_contrasena_screen.dart<br>screens/reestablecer_contrasena_screen.dart | Pública |
| POST | `/api/auth/verificar-reseteo` | controllers/auth.controller.js#verificarReseteo | verificacionLimiter | web/tienda/CuentaPage.jsx | screens/reestablecer_contrasena_screen.dart | Pública |
| POST | `/api/auth/reestablecer-contrasena` | controllers/auth.controller.js#reestablecerContrasena | verificacionLimiter | panel/auth/LoginPage.jsx<br>web/tienda/CuentaPage.jsx | screens/reestablecer_contrasena_screen.dart | Pública |
| POST | `/api/auth/2fa/verify-login` | controllers/auth2fa.controller.js#verificarLogin | twoFaLimiter | panel/auth/LoginPage.jsx<br>web/tienda/CuentaPage.jsx | screens/security/two_factor_verify_screen.dart | Pública |
| POST | `/api/auth/2fa/setup` | controllers/auth2fa.controller.js#setup | JWT + twoFaLimiter | panel/layout/PerfilAdministrador.jsx | screens/security/two_factor_setup_screen.dart | JWT |
| POST | `/api/auth/2fa/confirm` | controllers/auth2fa.controller.js#confirmar | JWT + twoFaLimiter | panel/layout/PerfilAdministrador.jsx | screens/security/two_factor_setup_screen.dart | JWT |
| POST | `/api/auth/2fa/disable` | controllers/auth2fa.controller.js#desactivar | JWT + twoFaLimiter | panel/layout/PerfilAdministrador.jsx | screens/security/two_factor_disable_screen.dart | JWT |
| GET | `/api/autores` | controllers/autor.controller.js#obtenerAutores | — | panel/autores/AutoresPage.jsx<br>panel/libros/LibroEditModal.jsx<br>panel/libros/useCatalogo.js | — | Pública |
| GET | `/api/autores/:id` | controllers/autor.controller.js#obtenerAutor | — | panel/autores/AutoresPage.jsx<br>web/tienda/LibroPage.jsx | — | Pública |
| POST | `/api/autores` | controllers/autor.controller.js#crearAutor | JWT + rol:administrador | panel/autores/AutorForm.jsx | — | JWT + admin |
| PUT | `/api/autores/:id` | controllers/autor.controller.js#actualizarAutor | JWT + rol:administrador | panel/autores/AutorEditModal.jsx | — | JWT + admin |
| DELETE | `/api/autores/:id` | controllers/autor.controller.js#eliminarAutor | JWT + rol:administrador | panel/autores/AutoresPage.jsx | — | JWT + admin |
| GET | `/api/categorias` | controllers/categoria.controller.js#obtenerCategorias | — | panel/categorias/CategoriasPage.jsx<br>panel/libros/LibroEditModal.jsx<br>panel/libros/useCatalogo.js | — | Pública |
| GET | `/api/categorias/:id` | controllers/categoria.controller.js#obtenerCategoria | — | panel/categorias/CategoriasPage.jsx | — | Pública |
| POST | `/api/categorias` | controllers/categoria.controller.js#crearCategoria | JWT + rol:administrador | panel/categorias/CategoriaForm.jsx | — | JWT + admin |
| PUT | `/api/categorias/:id` | controllers/categoria.controller.js#actualizarCategoria | JWT + rol:administrador | panel/categorias/CategoriaEditModal.jsx | — | JWT + admin |
| DELETE | `/api/categorias/:id` | controllers/categoria.controller.js#eliminarCategoria | JWT + rol:administrador | panel/categorias/CategoriasPage.jsx | — | JWT + admin |
| GET | `/api/clientes` | controllers/cliente.controller.js#listarClientes | JWT + rol:administrador | panel/clientes/ClientesPage.jsx | — | JWT + admin |
| GET | `/api/comprobantes` | controllers/comprobante.controller.js#listarComprobantes | JWT + verificarPanel | panel/comprobantes/ComprobantesPage.jsx | — | JWT + admin |
| GET | `/api/comprobantes/resumen` | inline (comprobante.routes.js) | JWT + verificarPanel | panel/comprobantes/ComprobantesPage.jsx | — | JWT + admin |
| POST | `/api/comprobantes/:id/enviar-email` | controllers/comprobante.controller.js#enviarComprobanteEmail | JWT + verificarPanel | panel/comprobantes/ComprobantesPage.jsx<br>panel/ventas/EmitirComprobanteModal.jsx | — | JWT + admin |
| GET | `/api/comprobantes/:id` | controllers/comprobante.controller.js#obtenerComprobante | JWT + verificarPanel | panel/comprobantes/ComprobanteViewModal.jsx | — | JWT + admin |
| PUT | `/api/comprobantes/:id/sunat` | controllers/comprobante.controller.js#registrarSunat | JWT + rol:administrador | panel/comprobantes/ComprobanteSunatModal.jsx | — | JWT + admin |
| POST | `/api/comprobantes/:id/anular` | controllers/comprobante.controller.js#anularComprobante | JWT + rol:administrador | panel/comprobantes/ComprobanteSunatModal.jsx | — | JWT + admin |
| GET | `/api/empresa` | controllers/empresa.controller.js#obtenerEmpresa | — | panel/comprobantes/ComprobanteViewModal.jsx<br>panel/configuracion/EmpresaPage.jsx<br>panel/reclamaciones/LibroReclamacionesPage.jsx<br>panel/ventas/EmitirComprobanteModal.jsx<br>web/PublicLayout.jsx | — | Pública |
| PUT | `/api/empresa` | controllers/empresa.controller.js#actualizarEmpresa | JWT + rol:administrador | panel/configuracion/EmpresaPage.jsx | — | JWT + admin |
| GET | `/api/favoritos` | controllers/favorito.controller.js#listarMisFavoritos | JWT | web/tienda/FavoritosPage.jsx | screens/favoritos_screen.dart | JWT |
| GET | `/api/favoritos/:idLibro` | controllers/favorito.controller.js#estadoFavorito | JWT | web/tienda/AccionesLibro.jsx | screens/detalle_libro_screen.dart | JWT |
| POST | `/api/favoritos/:idLibro` | controllers/favorito.controller.js#agregarFavorito | JWT | web/tienda/AccionesLibro.jsx | screens/detalle_libro_screen.dart | JWT |
| DELETE | `/api/favoritos/:idLibro` | controllers/favorito.controller.js#quitarFavorito | JWT | web/tienda/AccionesLibro.jsx<br>web/tienda/FavoritosPage.jsx | screens/detalle_libro_screen.dart<br>screens/favoritos_screen.dart | JWT |
| GET | `/api/historial/mi-historial` | controllers/historial.controller.js#obtenerMiHistorial | JWT | — | — | JWT |
| POST | `/api/historial` | controllers/historial.controller.js#crearHistorial | JWT + rol:administrador | — | — | JWT + admin |
| GET | `/api/historial` | controllers/historial.controller.js#obtenerHistorial | JWT + rol:administrador | panel/historial/HistorialPage.jsx | — | JWT + admin |
| GET | `/api/inventario` | controllers/inventario.controller.js#obtenerInventario | JWT + verificarPanel | panel/inventario/InventarioPage.jsx<br>panel/libros/LibrosPage.jsx | — | JWT + admin |
| GET | `/api/inventario/stock-bajo` | controllers/inventario.controller.js#obtenerStockBajo | JWT + verificarPanel | panel/dashboard/DashboardPage.jsx<br>panel/dashboard/dashboardService.js<br>panel/notificaciones/notificacionesService.js | — | JWT + admin |
| GET | `/api/inventario/movimientos` | controllers/inventario.controller.js#listarMovimientos | JWT + verificarPanel | panel/inventario/MovimientosModal.jsx | — | JWT + admin |
| GET | `/api/inventario/libro/:id` | controllers/inventario.controller.js#obtenerInventarioPorLibro | JWT + verificarPanel | panel/inventario/InventarioPage.jsx | — | JWT + admin |
| POST | `/api/inventario` | controllers/inventario.controller.js#crearInventario | JWT + rol:administrador | panel/inventario/InventarioForm.jsx | — | JWT + admin |
| PUT | `/api/inventario/libro/:id/stock` | controllers/inventario.controller.js#actualizarStock | JWT + rol:administrador | — | — | JWT + admin |
| PUT | `/api/inventario/libro/:id` | controllers/inventario.controller.js#actualizarInventario | JWT + rol:administrador | panel/inventario/InventarioEditModal.jsx | — | JWT + admin |
| GET | `/api/libros` | controllers/libro.controller.js#obtenerLibros | — | panel/anuncios/CarruselPanel.jsx<br>panel/anuncios/ProtagonistaPanel.jsx<br>panel/dashboard/DashboardPage.jsx<br>panel/dashboard/dashboardService.js<br>panel/inventario/MovimientosModal.jsx<br>panel/inventario/useLibros.js<br>panel/libros/LibrosPage.jsx<br>web/asistente/AsistenteTienda.jsx<br>web/PublicLayout.jsx<br>web/tienda/TiendaContext.jsx | screens/carrito_screen.dart<br>screens/entrega_y_pago_screen.dart<br>screens/home_screen.dart<br>screens/libros_screen.dart | Pública |
| GET | `/api/libros/:id/relacionados` | controllers/libro.controller.js#obtenerRelacionados | — | web/tienda/LibroPage.jsx | — | Pública |
| GET | `/api/libros/:id` | controllers/libro.controller.js#obtenerLibro | — | panel/libros/LibroEditModal.jsx<br>panel/libros/LibroForm.jsx<br>panel/libros/LibrosPage.jsx<br>web/tienda/LibroPage.jsx | screens/detalle_libro_screen.dart | Pública |
| POST | `/api/libros` | controllers/libro.controller.js#crearLibro | JWT + rol:administrador + upload(portada) | panel/libros/LibroForm.jsx | — | JWT + admin |
| PUT | `/api/libros/:id` | controllers/libro.controller.js#actualizarLibro | JWT + rol:administrador + upload(portada) | panel/libros/LibroEditModal.jsx | — | JWT + admin |
| DELETE | `/api/libros/:id` | controllers/libro.controller.js#eliminarLibro | JWT + rol:administrador | panel/libros/LibrosPage.jsx | — | JWT + admin |
| GET | `/api/pagos/checkout/:externalReference` | controllers/pago.controller.js#renderCheckoutPage | — | — | — | Pública |
| GET | `/api/pagos/respuesta/:externalReference` | controllers/pago.controller.js#renderRespuestaPage | — | — | — | Pública |
| GET | `/api/pagos/capacidades` | controllers/pago.controller.js#obtenerCapacidadesCompra | — | web/tienda/CheckoutPage.jsx | — | Pública |
| POST | `/api/pagos/webhook` | controllers/pago.controller.js#webhookPago | webhookLimit + express.urlencoded + express.json | — | — | Pública |
| GET | `/api/pagos` | controllers/pago.controller.js#listarPagosAdmin | JWT + verificarPanel | panel/notificaciones/notificacionesService.js<br>panel/pagos/PagosPage.jsx | — | JWT + admin |
| GET | `/api/pagos/resumen` | inline (pago.routes.js) | JWT + verificarPanel | panel/pagos/PagosPage.jsx | — | JWT + admin |
| POST | `/api/pagos/crear-orden` | controllers/pago.controller.js#crearOrden | JWT | web/tienda/persistenciaCompra.js | screens/entrega_y_pago_screen.dart<br>screens/mis_compras_screen.dart<br>screens/splash_screen.dart | JWT |
| GET | `/api/pagos/:orderId` | controllers/pago.controller.js#obtenerOrden | JWT | web/tienda/MisComprasPage.jsx | screens/entrega_y_pago_screen.dart<br>screens/mis_compras_screen.dart | JWT |
| GET | `/api/pedidos` | controllers/pedido.controller.js#obtenerPedidos | JWT + verificarPanel | panel/pedidos/PedidosPage.jsx | — | JWT + admin |
| GET | `/api/pedidos/usuario/:id_usuario` | controllers/pedido.controller.js#obtenerMisPedidos | JWT | — | — | JWT |
| GET | `/api/pedidos/:id` | controllers/pedido.controller.js#obtenerPedido | JWT + verificarPanel | panel/pedidos/PedidosPage.jsx | — | JWT + admin |
| PUT | `/api/pedidos/:id/estado` | controllers/pedido.controller.js#actualizarEstadoPedido | JWT + verificarPanel | panel/pedidos/PedidosPage.jsx | — | JWT + admin |
| POST | `/api/reclamaciones` | controllers/reclamacion.controller.js#registrar | reclamacionLimiter | panel/reclamaciones/LibroReclamacionesPage.jsx | screens/libro_reclamaciones_screen.dart | Pública |
| GET | `/api/reclamaciones` | controllers/reclamacion.controller.js#listar | JWT + rol:administrador | panel/reclamaciones/ReclamacionesPage.jsx | — | JWT + admin |
| GET | `/api/reclamaciones/resumen` | controllers/reclamacion.controller.js#resumen | JWT + rol:administrador | panel/reclamaciones/ReclamacionesPage.jsx | — | JWT + admin |
| GET | `/api/reclamaciones/:id` | controllers/reclamacion.controller.js#obtener | JWT + rol:administrador | — | — | JWT + admin |
| PUT | `/api/reclamaciones/:id/respuesta` | controllers/reclamacion.controller.js#responder | JWT + rol:administrador | panel/reclamaciones/ReclamacionesPage.jsx | — | JWT + admin |
| GET | `/api/reportes/ventas-por-estado` | controllers/reporte.controller.js#obtenerVentasPorEstado | JWT + verificarPanel | panel/dashboard/DashboardPage.jsx<br>panel/dashboard/dashboardService.js | — | JWT + admin |
| GET | `/api/reportes/resumen` | controllers/reporte.controller.js#obtenerResumenGeneral | JWT + '/reservas-por-estado' + (_req, res) => res.status(410).json({ success: false, mensaje: 'El reporte de reservas fue eliminado.' }) + soloAdmin | panel/dashboard/DashboardPage.jsx<br>panel/dashboard/dashboardService.js | — | JWT + admin |
| GET | `/api/reportes/libros-mas-vendidos` | controllers/reporte.controller.js#obtenerLibrosMasVendidos | JWT + '/reservas-por-estado' + (_req, res) => res.status(410).json({ success: false, mensaje: 'El reporte de reservas fue eliminado.' }) + soloAdmin | panel/dashboard/DashboardPage.jsx<br>panel/dashboard/dashboardService.js | — | JWT + admin |
| GET | `/api/reportes/ventas-por-mes` | controllers/reporte.controller.js#obtenerVentasPorMes | JWT + '/reservas-por-estado' + (_req, res) => res.status(410).json({ success: false, mensaje: 'El reporte de reservas fue eliminado.' }) + soloAdmin | panel/dashboard/DashboardPage.jsx<br>panel/dashboard/dashboardService.js | — | JWT + admin |
| GET | `/api/reportes/ventas-por-dia` | controllers/reporte.controller.js#obtenerVentasPorDia | JWT + '/reservas-por-estado' + (_req, res) => res.status(410).json({ success: false, mensaje: 'El reporte de reservas fue eliminado.' }) + soloAdmin | panel/dashboard/DashboardPage.jsx<br>panel/dashboard/dashboardService.js<br>panel/reportes/useVentasDiarias.js | — | JWT + admin |
| GET | `/api/reportes/indicadores-ventas` | controllers/reporte.controller.js#obtenerIndicadoresVentas | JWT + '/reservas-por-estado' + (_req, res) => res.status(410).json({ success: false, mensaje: 'El reporte de reservas fue eliminado.' }) + soloAdmin | panel/dashboard/DashboardPage.jsx<br>panel/dashboard/dashboardService.js | — | JWT + admin |
| GET | `/api/ubicaciones/provincias` | controllers/ubicacion.controller.js#listarProvincias | JWT | — | — | JWT |
| GET | `/api/ubicaciones/provincias/:id_provincia/distritos` | controllers/ubicacion.controller.js#listarDistritos | JWT | — | — | JWT |
| PUT | `/api/ubicaciones/distritos/:id` | controllers/ubicacion.controller.js#actualizarTarifaDistrito | JWT + rol:administrador | — | — | JWT + admin |
| GET | `/api/usuarios` | controllers/usuario.controller.js#listarUsuarios | JWT + rol:administrador | panel/usuarios/UsuariosPage.jsx | — | JWT + admin |
| GET | `/api/usuarios/perfil` | controllers/usuario.controller.js#obtenerPerfil | JWT | panel/layout/PerfilAdministrador.jsx<br>web/tienda/TiendaContext.jsx | screens/perfil_screen.dart<br>screens/splash_screen.dart | JWT |
| PUT | `/api/usuarios/perfil` | controllers/usuario.controller.js#actualizarPerfil | JWT | panel/layout/PerfilAdministrador.jsx<br>web/tienda/PerfilCliente.jsx | screens/security/editar_perfil_screen.dart | JWT |
| PUT | `/api/usuarios/foto` | controllers/usuario.controller.js#subirFotoPerfil | JWT + uploadPerfil(foto) | panel/layout/PerfilAdministrador.jsx<br>web/tienda/PerfilCliente.jsx | screens/perfil_screen.dart | JWT |
| PUT | `/api/usuarios/password` | controllers/usuario.controller.js#cambiarPassword | JWT | panel/layout/PerfilAdministrador.jsx | screens/security/cambiar_password_screen.dart | JWT |
| DELETE | `/api/usuarios/cuenta` | controllers/usuario.controller.js#eliminarMiCuenta | JWT | — | screens/security/eliminar_cuenta_screen.dart | JWT |
| PATCH | `/api/usuarios/:id` | controllers/usuario.controller.js#adminUpdateUsuario | JWT + rol:administrador | panel/usuarios/UsuariosPage.jsx | — | JWT + admin |
| GET | `/api/ventas/mis-ventas` | controllers/venta.controller.js#obtenerMisVentas | JWT | web/tienda/MisComprasPage.jsx<br>web/tienda/useDatosCliente.js | screens/mis_compras_screen.dart<br>screens/splash_screen.dart | JWT |
| POST | `/api/ventas` | inline (venta.routes.js) | JWT | — | — | JWT |
| GET | `/api/ventas` | controllers/venta.controller.js#obtenerVentas | JWT + verificarPanel | panel/pagos/PagosPage.jsx<br>panel/ventas/VentasPage.jsx | — | JWT + admin |
| GET | `/api/ventas/:id` | controllers/venta.controller.js#obtenerVenta | JWT | panel/ventas/VentasPage.jsx<br>web/tienda/CheckoutPage.jsx<br>web/tienda/TiendaContext.jsx | — | JWT |
| GET | `/api/ventas/:id/pago` | controllers/venta.controller.js#obtenerPagoVenta | JWT | web/tienda/MisComprasPage.jsx | screens/mis_compras_screen.dart | JWT |
| PUT | `/api/ventas/:id/estado` | controllers/venta.controller.js#actualizarEstadoVenta | JWT + verificarPanel | — | — | JWT + admin |
| POST | `/api/ventas/:id/comprobante` | controllers/comprobante.controller.js#generarComprobante | JWT + verificarPanel | panel/ventas/EmitirComprobanteModal.jsx | — | JWT + admin |
| POST | `/api/ventas/:id/reembolso` | controllers/venta.controller.js#reembolsarVenta | JWT + rol:administrador | panel/ventas/ReembolsoModal.jsx | — | JWT + admin |
| GET | `/api/zonas-delivery` | controllers/zonaDelivery.controller.js#listarZonas | JWT | web/tienda/CheckoutPage.jsx | screens/entrega_y_pago_screen.dart | JWT |
| GET | `/api/zonas-delivery/todos` | controllers/zonaDelivery.controller.js#listarTodasZonas | JWT + rol:administrador | panel/tarifas/TarifasEnvioPage.jsx | — | JWT + admin |
| POST | `/api/zonas-delivery` | controllers/zonaDelivery.controller.js#crearZona | JWT + rol:administrador | — | — | JWT + admin |
| PUT | `/api/zonas-delivery/:id` | controllers/zonaDelivery.controller.js#actualizarZona | JWT + rol:administrador | panel/tarifas/TarifasEnvioPage.jsx | — | JWT + admin |

## Endpoints compartidos por React y Flutter (27)

- `POST /api/auth/registro`
- `POST /api/auth/login`
- `POST /api/auth/verificar-email`
- `POST /api/auth/reenviar-codigo`
- `POST /api/auth/solicitar-reseteo`
- `POST /api/auth/verificar-reseteo`
- `POST /api/auth/reestablecer-contrasena`
- `POST /api/auth/2fa/verify-login`
- `POST /api/auth/2fa/setup`
- `POST /api/auth/2fa/confirm`
- `POST /api/auth/2fa/disable`
- `GET /api/favoritos`
- `GET /api/favoritos/:idLibro`
- `POST /api/favoritos/:idLibro`
- `DELETE /api/favoritos/:idLibro`
- `GET /api/libros`
- `GET /api/libros/:id`
- `POST /api/pagos/crear-orden`
- `GET /api/pagos/:orderId`
- `POST /api/reclamaciones`
- `GET /api/usuarios/perfil`
- `PUT /api/usuarios/perfil`
- `PUT /api/usuarios/foto`
- `PUT /api/usuarios/password`
- `GET /api/ventas/mis-ventas`
- `GET /api/ventas/:id/pago`
- `GET /api/zonas-delivery`

## Endpoints sin cliente en el código (24)

Ni React ni Flutter los declaran. Algunos son legítimos porque se usan por URL o desde un tercero:

- `GET /` — Salud del servidor.
- `GET /api` — Salud de la API.
- `GET /api/test-db` — Diagnóstico de conexión a BD (solo admin).
- `GET /api/debug-egress` — Diagnóstico manual SMTP (JWT + administrador). DNS, TCP y salida HTTPS; sin consumidor en React/Flutter.
- `GET /api/agencias/activas` — Posiblemente no utilizado por ningún cliente.
- `GET /api/agencias` — Posiblemente no utilizado por ningún cliente.
- `GET /api/agencias/:id` — Posiblemente no utilizado por ningún cliente.
- `POST /api/agencias` — Posiblemente no utilizado por ningún cliente.
- `PUT /api/agencias/:id` — Posiblemente no utilizado por ningún cliente.
- `GET /api/anuncios/protagonista` — Posiblemente no utilizado por ningún cliente.
- `GET /api/historial/mi-historial` — Posiblemente no utilizado por ningún cliente.
- `POST /api/historial` — Posiblemente no utilizado por ningún cliente.
- `PUT /api/inventario/libro/:id/stock` — Posiblemente no utilizado por ningún cliente.
- `GET /api/pagos/checkout/:externalReference` — Lo abre el navegador web o la WebView de Flutter con la `checkout_url` que devuelve `POST /api/pagos/crear-orden`.
- `GET /api/pagos/respuesta/:externalReference` — Página de retorno (responseUrl) de PayU.
- `POST /api/pagos/webhook` — Confirmación de PayU (servidor a servidor).
- `GET /api/pedidos/usuario/:id_usuario` — Posiblemente no utilizado por ningún cliente.
- `GET /api/reclamaciones/:id` — Posiblemente no utilizado por ningún cliente.
- `GET /api/ubicaciones/provincias` — Posiblemente no utilizado por ningún cliente.
- `GET /api/ubicaciones/provincias/:id_provincia/distritos` — Posiblemente no utilizado por ningún cliente.
- `PUT /api/ubicaciones/distritos/:id` — Posiblemente no utilizado por ningún cliente.
- `POST /api/ventas` — Posiblemente no utilizado por ningún cliente.
- `PUT /api/ventas/:id/estado` — Posiblemente no utilizado por ningún cliente.
- `POST /api/zonas-delivery` — Posiblemente no utilizado por ningún cliente.
