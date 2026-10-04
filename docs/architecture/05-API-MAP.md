# Mapa de API

> Generado desde el código real el 2026-10-03 con `docs/architecture/tools/actualizar-mapa.mjs`.
> No contiene secretos: solo nombres de variables de entorno.

Total de endpoints registrados en el backend: **123** (incluye 4 definidos directamente en `server.js`).

- **Auth**: `Pública` = sin JWT · `JWT` = requiere `Authorization: Bearer` · `JWT + admin` = además rol `administrador`.
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
| GET | `/api/anuncios` | controllers/anuncio.controller.js#obtenerAnuncioActivo | — | public-site/sections/VideoSection.jsx | — | Pública |
| GET | `/api/anuncios/carrusel` | controllers/carrusel.controller.js#listarPublico | — | public-site/sections/Hero.jsx | — | Pública |
| GET | `/api/anuncios/carrusel/todos` | controllers/carrusel.controller.js#listarPanel | JWT + rol:administrador | features/anuncios/CarruselPanel.jsx | — | JWT + admin |
| POST | `/api/anuncios/carrusel` | controllers/carrusel.controller.js#crear | JWT + rol:administrador + recibir | features/anuncios/CarruselPanel.jsx | — | JWT + admin |
| PUT | `/api/anuncios/carrusel/orden` | controllers/carrusel.controller.js#reordenar | JWT + rol:administrador | features/anuncios/CarruselPanel.jsx | — | JWT + admin |
| PUT | `/api/anuncios/carrusel/:id` | controllers/carrusel.controller.js#actualizar | JWT + rol:administrador + recibir | features/anuncios/CarruselPanel.jsx | — | JWT + admin |
| DELETE | `/api/anuncios/carrusel/:id` | controllers/carrusel.controller.js#eliminar | JWT + rol:administrador | features/anuncios/CarruselPanel.jsx | — | JWT + admin |
| GET | `/api/anuncios/todos` | controllers/anuncio.controller.js#listarAnuncios | JWT + rol:administrador | features/anuncios/AnunciosPage.jsx | — | JWT + admin |
| POST | `/api/anuncios` | controllers/anuncio.controller.js#crearAnuncio | JWT + rol:administrador + uploadVideo(video) | features/anuncios/AnunciosPage.jsx | — | JWT + admin |
| PUT | `/api/anuncios/:id` | controllers/anuncio.controller.js#actualizarAnuncio | JWT + rol:administrador + uploadVideo(video) | features/anuncios/AnunciosPage.jsx | — | JWT + admin |
| DELETE | `/api/anuncios/:id` | controllers/anuncio.controller.js#eliminarAnuncio | JWT + rol:administrador | features/anuncios/AnunciosPage.jsx | — | JWT + admin |
| GET | `/api/app/version` | controllers/app.controller.js#obtenerVersion | — | public-site/components/ActualizarApp.jsx | — | Pública |
| POST | `/api/asistente` | controllers/asistente.controller.js#conversar | limite | public-site/asistente/AsistenteTienda.jsx | — | Pública |
| POST | `/api/auth/registro` | controllers/auth.controller.js#registrar | registroLimiter | public-site/tienda/CuentaPage.jsx | screens/registro_screen.dart | Pública |
| POST | `/api/auth/login` | controllers/auth.controller.js#login | loginLimiter | features/auth/LoginPage.jsx<br>public-site/tienda/CuentaPage.jsx | screens/login_screen.dart | Pública |
| POST | `/api/auth/verificar-email` | controllers/auth.controller.js#verificarEmail | verificacionLimiter | features/auth/VerificarEmailPage.jsx<br>public-site/tienda/CuentaPage.jsx | screens/verificacion_email_screen.dart | Pública |
| POST | `/api/auth/reenviar-codigo` | controllers/auth.controller.js#reenviarCodigo | verificacionLimiter | features/auth/VerificarEmailPage.jsx<br>public-site/tienda/CuentaPage.jsx | screens/verificacion_email_screen.dart | Pública |
| POST | `/api/auth/solicitar-reseteo` | controllers/auth.controller.js#solicitarReseteo | verificacionLimiter | features/auth/LoginPage.jsx<br>public-site/tienda/CuentaPage.jsx | screens/recuperar_contrasena_screen.dart<br>screens/reestablecer_contrasena_screen.dart | Pública |
| POST | `/api/auth/reestablecer-contrasena` | controllers/auth.controller.js#reestablecerContrasena | verificacionLimiter | features/auth/LoginPage.jsx<br>public-site/tienda/CuentaPage.jsx | screens/reestablecer_contrasena_screen.dart | Pública |
| POST | `/api/auth/2fa/verify-login` | controllers/auth2fa.controller.js#verificarLogin | twoFaLimiter | features/auth/LoginPage.jsx<br>public-site/tienda/CuentaPage.jsx | screens/security/two_factor_verify_screen.dart | Pública |
| POST | `/api/auth/2fa/setup` | controllers/auth2fa.controller.js#setup | JWT + twoFaLimiter | features/layout/PerfilAdministrador.jsx | screens/security/two_factor_setup_screen.dart | JWT |
| POST | `/api/auth/2fa/confirm` | controllers/auth2fa.controller.js#confirmar | JWT + twoFaLimiter | features/layout/PerfilAdministrador.jsx | screens/security/two_factor_setup_screen.dart | JWT |
| POST | `/api/auth/2fa/disable` | controllers/auth2fa.controller.js#desactivar | JWT + twoFaLimiter | features/layout/PerfilAdministrador.jsx | screens/security/two_factor_disable_screen.dart | JWT |
| GET | `/api/autores` | controllers/autor.controller.js#obtenerAutores | — | features/autores/AutoresPage.jsx<br>features/libros/LibroEditModal.jsx<br>features/libros/useCatalogo.js | — | Pública |
| GET | `/api/autores/:id` | controllers/autor.controller.js#obtenerAutor | — | features/autores/AutoresPage.jsx<br>public-site/tienda/LibroPage.jsx | — | Pública |
| POST | `/api/autores` | controllers/autor.controller.js#crearAutor | JWT + rol:administrador | features/autores/AutorForm.jsx | — | JWT + admin |
| PUT | `/api/autores/:id` | controllers/autor.controller.js#actualizarAutor | JWT + rol:administrador | features/autores/AutorEditModal.jsx | — | JWT + admin |
| DELETE | `/api/autores/:id` | controllers/autor.controller.js#eliminarAutor | JWT + rol:administrador | features/autores/AutoresPage.jsx | — | JWT + admin |
| GET | `/api/categorias` | controllers/categoria.controller.js#obtenerCategorias | — | features/categorias/CategoriasPage.jsx<br>features/libros/LibroEditModal.jsx<br>features/libros/useCatalogo.js | — | Pública |
| GET | `/api/categorias/:id` | controllers/categoria.controller.js#obtenerCategoria | — | features/categorias/CategoriasPage.jsx | — | Pública |
| POST | `/api/categorias` | controllers/categoria.controller.js#crearCategoria | JWT + rol:administrador | features/categorias/CategoriaForm.jsx | — | JWT + admin |
| PUT | `/api/categorias/:id` | controllers/categoria.controller.js#actualizarCategoria | JWT + rol:administrador | features/categorias/CategoriaEditModal.jsx | — | JWT + admin |
| DELETE | `/api/categorias/:id` | controllers/categoria.controller.js#eliminarCategoria | JWT + rol:administrador | features/categorias/CategoriasPage.jsx | — | JWT + admin |
| GET | `/api/clientes` | controllers/cliente.controller.js#listarClientes | JWT + rol:administrador | features/clientes/ClientesPage.jsx | — | JWT + admin |
| GET | `/api/comprobantes` | controllers/comprobante.controller.js#listarComprobantes | JWT + verificarPanel | features/comprobantes/ComprobantesPage.jsx | — | JWT + admin |
| GET | `/api/comprobantes/resumen` | inline (comprobante.routes.js) | JWT + verificarPanel | features/comprobantes/ComprobantesPage.jsx | — | JWT + admin |
| POST | `/api/comprobantes/:id/enviar-email` | controllers/comprobante.controller.js#enviarComprobanteEmail | JWT + verificarPanel | features/comprobantes/ComprobantesPage.jsx<br>features/ventas/EmitirComprobanteModal.jsx | — | JWT + admin |
| GET | `/api/comprobantes/:id` | controllers/comprobante.controller.js#obtenerComprobante | JWT + verificarPanel | features/comprobantes/ComprobanteViewModal.jsx | — | JWT + admin |
| PUT | `/api/comprobantes/:id/sunat` | controllers/comprobante.controller.js#registrarSunat | JWT + verificarRol(ROLES.ADMINISTRADOR) | features/comprobantes/ComprobanteSunatModal.jsx | — | JWT + admin |
| POST | `/api/comprobantes/:id/anular` | controllers/comprobante.controller.js#anularComprobante | JWT + verificarRol(ROLES.ADMINISTRADOR) | features/comprobantes/ComprobanteSunatModal.jsx | — | JWT + admin |
| GET | `/api/empresa` | controllers/empresa.controller.js#obtenerEmpresa | — | features/comprobantes/ComprobanteViewModal.jsx<br>features/configuracion/EmpresaPage.jsx<br>features/reclamaciones/LibroReclamacionesPage.jsx<br>features/ventas/EmitirComprobanteModal.jsx<br>public-site/PublicLayout.jsx | — | Pública |
| PUT | `/api/empresa` | controllers/empresa.controller.js#actualizarEmpresa | JWT + rol:administrador | features/configuracion/EmpresaPage.jsx | — | JWT + admin |
| GET | `/api/favoritos` | controllers/favorito.controller.js#listarMisFavoritos | JWT | public-site/tienda/FavoritosPage.jsx | screens/favoritos_screen.dart | JWT |
| GET | `/api/favoritos/:idLibro` | controllers/favorito.controller.js#estadoFavorito | JWT | public-site/tienda/AccionesLibro.jsx | screens/detalle_libro_screen.dart | JWT |
| POST | `/api/favoritos/:idLibro` | controllers/favorito.controller.js#agregarFavorito | JWT | public-site/tienda/AccionesLibro.jsx | screens/detalle_libro_screen.dart | JWT |
| DELETE | `/api/favoritos/:idLibro` | controllers/favorito.controller.js#quitarFavorito | JWT | public-site/tienda/AccionesLibro.jsx<br>public-site/tienda/FavoritosPage.jsx | screens/detalle_libro_screen.dart<br>screens/favoritos_screen.dart | JWT |
| GET | `/api/historial/mi-historial` | controllers/historial.controller.js#obtenerMiHistorial | JWT | — | — | JWT |
| POST | `/api/historial` | controllers/historial.controller.js#crearHistorial | JWT + rol:administrador | — | — | JWT + admin |
| GET | `/api/historial` | controllers/historial.controller.js#obtenerHistorial | JWT + rol:administrador | features/historial/HistorialPage.jsx | — | JWT + admin |
| GET | `/api/inventario` | controllers/inventario.controller.js#obtenerInventario | JWT + verificarPanel | features/inventario/InventarioPage.jsx<br>features/libros/LibrosPage.jsx | — | JWT + admin |
| GET | `/api/inventario/stock-bajo` | controllers/inventario.controller.js#obtenerStockBajo | JWT + verificarPanel | features/dashboard/DashboardPage.jsx<br>features/dashboard/dashboardService.js<br>features/notificaciones/notificacionesService.js | — | JWT + admin |
| GET | `/api/inventario/movimientos` | controllers/inventario.controller.js#listarMovimientos | JWT + verificarPanel | features/inventario/MovimientosModal.jsx | — | JWT + admin |
| GET | `/api/inventario/libro/:id` | controllers/inventario.controller.js#obtenerInventarioPorLibro | JWT + verificarPanel | features/inventario/InventarioPage.jsx | — | JWT + admin |
| POST | `/api/inventario` | controllers/inventario.controller.js#crearInventario | JWT + verificarRol(ROLES.ADMINISTRADOR) | features/inventario/InventarioForm.jsx | — | JWT + admin |
| PUT | `/api/inventario/libro/:id/stock` | controllers/inventario.controller.js#actualizarStock | JWT + verificarRol(ROLES.ADMINISTRADOR) | — | — | JWT + admin |
| PUT | `/api/inventario/libro/:id` | controllers/inventario.controller.js#actualizarInventario | JWT + verificarRol(ROLES.ADMINISTRADOR) | features/inventario/InventarioEditModal.jsx | — | JWT + admin |
| GET | `/api/libros` | controllers/libro.controller.js#obtenerLibros | — | features/anuncios/CarruselPanel.jsx<br>features/dashboard/DashboardPage.jsx<br>features/dashboard/dashboardService.js<br>features/inventario/MovimientosModal.jsx<br>features/inventario/useLibros.js<br>features/libros/LibrosPage.jsx<br>features/reservas/ReservaForm.jsx<br>features/reservas/reservasService.js<br>public-site/asistente/AsistenteTienda.jsx<br>public-site/PublicLayout.jsx<br>public-site/tienda/TiendaContext.jsx | screens/carrito_screen.dart<br>screens/entrega_y_pago_screen.dart<br>screens/home_screen.dart<br>screens/libros_screen.dart | Pública |
| GET | `/api/libros/:id/relacionados` | controllers/libro.controller.js#obtenerRelacionados | — | — | — | Pública |
| GET | `/api/libros/:id` | controllers/libro.controller.js#obtenerLibro | — | features/libros/LibroEditModal.jsx<br>features/libros/LibroForm.jsx<br>features/libros/LibrosPage.jsx<br>public-site/tienda/LibroPage.jsx | screens/detalle_libro_screen.dart | Pública |
| POST | `/api/libros` | controllers/libro.controller.js#crearLibro | JWT + rol:administrador + upload(portada) | features/libros/LibroForm.jsx | — | JWT + admin |
| PUT | `/api/libros/:id` | controllers/libro.controller.js#actualizarLibro | JWT + rol:administrador + upload(portada) | features/libros/LibroEditModal.jsx | — | JWT + admin |
| DELETE | `/api/libros/:id` | controllers/libro.controller.js#eliminarLibro | JWT + rol:administrador | features/libros/LibrosPage.jsx | — | JWT + admin |
| GET | `/api/pagos/checkout/:externalReference` | controllers/pago.controller.js#renderCheckoutPage | — | — | — | Pública |
| GET | `/api/pagos/respuesta/:externalReference` | controllers/pago.controller.js#renderRespuestaPage | — | — | — | Pública |
| GET | `/api/pagos/capacidades` | controllers/pago.controller.js#obtenerCapacidadesCompra | — | public-site/tienda/CheckoutPage.jsx | — | Pública |
| POST | `/api/pagos/webhook` | controllers/pago.controller.js#webhookPago | webhookLimit + express.urlencoded + express.json | — | — | Pública |
| GET | `/api/pagos` | controllers/pago.controller.js#listarPagosAdmin | JWT + verificarPanel | features/notificaciones/notificacionesService.js<br>features/pagos/PagosPage.jsx | — | JWT + admin |
| GET | `/api/pagos/resumen` | inline (pago.routes.js) | JWT + verificarPanel | features/pagos/PagosPage.jsx | — | JWT + admin |
| POST | `/api/pagos/crear-orden` | controllers/pago.controller.js#crearOrden | JWT | public-site/tienda/CheckoutPage.jsx | screens/entrega_y_pago_screen.dart | JWT |
| GET | `/api/pagos/:orderId` | controllers/pago.controller.js#obtenerOrden | JWT | public-site/tienda/MisComprasPage.jsx | screens/entrega_y_pago_screen.dart<br>screens/mis_compras_screen.dart | JWT |
| GET | `/api/pedidos` | controllers/pedido.controller.js#obtenerPedidos | JWT + verificarPanel | features/pedidos/PedidosPage.jsx | — | JWT + admin |
| GET | `/api/pedidos/usuario/:id_usuario` | controllers/pedido.controller.js#obtenerMisPedidos | JWT | — | — | JWT |
| GET | `/api/pedidos/:id` | controllers/pedido.controller.js#obtenerPedido | JWT + verificarPanel | features/pedidos/PedidosPage.jsx | — | JWT + admin |
| PUT | `/api/pedidos/:id/estado` | controllers/pedido.controller.js#actualizarEstadoPedido | JWT + verificarPanel | features/pedidos/PedidosPage.jsx | — | JWT + admin |
| POST | `/api/reclamaciones` | controllers/reclamacion.controller.js#registrar | reclamacionLimiter | features/reclamaciones/LibroReclamacionesPage.jsx | — | Pública |
| GET | `/api/reclamaciones` | controllers/reclamacion.controller.js#listar | JWT + rol:administrador | features/reclamaciones/ReclamacionesPage.jsx | — | JWT + admin |
| GET | `/api/reclamaciones/resumen` | controllers/reclamacion.controller.js#resumen | JWT + rol:administrador | features/reclamaciones/ReclamacionesPage.jsx | — | JWT + admin |
| GET | `/api/reclamaciones/:id` | controllers/reclamacion.controller.js#obtener | JWT + rol:administrador | — | — | JWT + admin |
| PUT | `/api/reclamaciones/:id/respuesta` | controllers/reclamacion.controller.js#responder | JWT + rol:administrador | features/reclamaciones/ReclamacionesPage.jsx | — | JWT + admin |
| GET | `/api/reportes/ventas-por-estado` | controllers/reporte.controller.js#obtenerVentasPorEstado | JWT + verificarPanel | features/dashboard/DashboardPage.jsx<br>features/dashboard/dashboardService.js | — | JWT + admin |
| GET | `/api/reportes/reservas-por-estado` | controllers/reporte.controller.js#obtenerReservasPorEstado | JWT + verificarPanel | features/dashboard/DashboardPage.jsx<br>features/dashboard/dashboardService.js | — | JWT + admin |
| GET | `/api/reportes/resumen` | controllers/reporte.controller.js#obtenerResumenGeneral | JWT + soloAdmin | features/dashboard/DashboardPage.jsx<br>features/dashboard/dashboardService.js | — | JWT + admin |
| GET | `/api/reportes/libros-mas-vendidos` | controllers/reporte.controller.js#obtenerLibrosMasVendidos | JWT + soloAdmin | features/dashboard/DashboardPage.jsx<br>features/dashboard/dashboardService.js | — | JWT + admin |
| GET | `/api/reportes/ventas-por-mes` | controllers/reporte.controller.js#obtenerVentasPorMes | JWT + soloAdmin | features/dashboard/DashboardPage.jsx<br>features/dashboard/dashboardService.js | — | JWT + admin |
| GET | `/api/reportes/ventas-por-dia` | controllers/reporte.controller.js#obtenerVentasPorDia | JWT + soloAdmin | features/dashboard/DashboardPage.jsx<br>features/dashboard/dashboardService.js | — | JWT + admin |
| GET | `/api/reportes/indicadores-ventas` | controllers/reporte.controller.js#obtenerIndicadoresVentas | JWT + soloAdmin | features/dashboard/DashboardPage.jsx<br>features/dashboard/dashboardService.js | — | JWT + admin |
| GET | `/api/reservas/mis-reservas` | controllers/reserva.controller.js#obtenerMisReservas | JWT | — | screens/reservas_screen.dart | JWT |
| POST | `/api/reservas` | controllers/reserva.controller.js#crearReserva | JWT | features/reservas/ReservaForm.jsx | screens/detalle_libro_screen.dart | JWT |
| DELETE | `/api/reservas/:id` | controllers/reserva.controller.js#cancelarReserva | JWT | — | screens/reservas_screen.dart | JWT |
| GET | `/api/reservas` | controllers/reserva.controller.js#obtenerReservas | JWT + verificarPanel | features/notificaciones/notificacionesService.js<br>features/reservas/ReservasPage.jsx | — | JWT + admin |
| GET | `/api/reservas/:id` | controllers/reserva.controller.js#obtenerReserva | JWT | features/reservas/ReservasPage.jsx | — | JWT |
| PUT | `/api/reservas/:id/estado` | controllers/reserva.controller.js#actualizarEstado | JWT + verificarPanel | features/reservas/ReservaEstadoModal.jsx | — | JWT + admin |
| GET | `/api/ubicaciones/provincias` | controllers/ubicacion.controller.js#listarProvincias | JWT | — | — | JWT |
| GET | `/api/ubicaciones/provincias/:id_provincia/distritos` | controllers/ubicacion.controller.js#listarDistritos | JWT | — | — | JWT |
| PUT | `/api/ubicaciones/distritos/:id` | controllers/ubicacion.controller.js#actualizarTarifaDistrito | JWT + rol:administrador | — | — | JWT + admin |
| GET | `/api/usuarios` | controllers/usuario.controller.js#listarUsuarios | JWT + rol:administrador | features/usuarios/UsuariosPage.jsx | — | JWT + admin |
| GET | `/api/usuarios/perfil` | controllers/usuario.controller.js#obtenerPerfil | JWT | features/layout/PerfilAdministrador.jsx<br>public-site/tienda/TiendaContext.jsx | screens/perfil_screen.dart<br>screens/splash_screen.dart | JWT |
| PUT | `/api/usuarios/perfil` | controllers/usuario.controller.js#actualizarPerfil | JWT | features/layout/PerfilAdministrador.jsx | screens/security/editar_perfil_screen.dart | JWT |
| PUT | `/api/usuarios/foto` | controllers/usuario.controller.js#subirFotoPerfil | JWT + uploadPerfil(foto) | features/layout/PerfilAdministrador.jsx | screens/perfil_screen.dart | JWT |
| PUT | `/api/usuarios/password` | controllers/usuario.controller.js#cambiarPassword | JWT | features/layout/PerfilAdministrador.jsx | screens/security/cambiar_password_screen.dart | JWT |
| DELETE | `/api/usuarios/cuenta` | controllers/usuario.controller.js#eliminarMiCuenta | JWT | — | screens/security/eliminar_cuenta_screen.dart | JWT |
| PATCH | `/api/usuarios/:id` | controllers/usuario.controller.js#adminUpdateUsuario | JWT + rol:administrador | features/usuarios/UsuariosPage.jsx | — | JWT + admin |
| GET | `/api/ventas/mis-ventas` | controllers/venta.controller.js#obtenerMisVentas | JWT | public-site/tienda/MisComprasPage.jsx | screens/mis_compras_screen.dart | JWT |
| POST | `/api/ventas` | inline (venta.routes.js) | JWT | — | — | JWT |
| GET | `/api/ventas` | controllers/venta.controller.js#obtenerVentas | JWT + verificarPanel | features/pagos/PagosPage.jsx<br>features/ventas/VentasPage.jsx | — | JWT + admin |
| GET | `/api/ventas/:id` | controllers/venta.controller.js#obtenerVenta | JWT | features/ventas/VentasPage.jsx<br>public-site/tienda/CheckoutPage.jsx<br>public-site/tienda/TiendaContext.jsx | — | JWT |
| GET | `/api/ventas/:id/pago` | controllers/venta.controller.js#obtenerPagoVenta | JWT | public-site/tienda/MisComprasPage.jsx | screens/mis_compras_screen.dart | JWT |
| PUT | `/api/ventas/:id/estado` | controllers/venta.controller.js#actualizarEstadoVenta | JWT + verificarPanel | features/ventas/VentasPage.jsx | — | JWT + admin |
| POST | `/api/ventas/:id/comprobante` | controllers/comprobante.controller.js#generarComprobante | JWT + verificarPanel | features/ventas/EmitirComprobanteModal.jsx | — | JWT + admin |
| POST | `/api/ventas/:id/reembolso` | controllers/venta.controller.js#reembolsarVenta | JWT + verificarRol(ROLES.ADMINISTRADOR) | features/ventas/ReembolsoModal.jsx | — | JWT + admin |
| GET | `/api/zonas-delivery` | controllers/zonaDelivery.controller.js#listarZonas | JWT | public-site/tienda/CheckoutPage.jsx | screens/entrega_y_pago_screen.dart | JWT |
| GET | `/api/zonas-delivery/todos` | controllers/zonaDelivery.controller.js#listarTodasZonas | JWT + rol:administrador | features/tarifas/TarifasEnvioPage.jsx | — | JWT + admin |
| POST | `/api/zonas-delivery` | controllers/zonaDelivery.controller.js#crearZona | JWT + rol:administrador | features/tarifas/TarifaEditModal.jsx | — | JWT + admin |
| PUT | `/api/zonas-delivery/:id` | controllers/zonaDelivery.controller.js#actualizarZona | JWT + rol:administrador | features/tarifas/TarifaEditModal.jsx | — | JWT + admin |

## Endpoints compartidos por React y Flutter (26)

- `POST /api/auth/registro`
- `POST /api/auth/login`
- `POST /api/auth/verificar-email`
- `POST /api/auth/reenviar-codigo`
- `POST /api/auth/solicitar-reseteo`
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
- `POST /api/reservas`
- `GET /api/usuarios/perfil`
- `PUT /api/usuarios/perfil`
- `PUT /api/usuarios/foto`
- `PUT /api/usuarios/password`
- `GET /api/ventas/mis-ventas`
- `GET /api/ventas/:id/pago`
- `GET /api/zonas-delivery`

## Endpoints sin cliente en el código (20)

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
- `GET /api/historial/mi-historial` — Posiblemente no utilizado por ningún cliente.
- `POST /api/historial` — Posiblemente no utilizado por ningún cliente.
- `PUT /api/inventario/libro/:id/stock` — Posiblemente no utilizado por ningún cliente.
- `GET /api/libros/:id/relacionados` — Posiblemente no utilizado por ningún cliente.
- `GET /api/pagos/checkout/:externalReference` — Lo abre el navegador con la `checkout_url` que devuelve `POST /api/pagos/crear-orden` (Flutter la lanza con url_launcher).
- `GET /api/pagos/respuesta/:externalReference` — Página de retorno (responseUrl) de PayU.
- `POST /api/pagos/webhook` — Confirmación de PayU (servidor a servidor).
- `GET /api/pedidos/usuario/:id_usuario` — Posiblemente no utilizado por ningún cliente.
- `GET /api/reclamaciones/:id` — Posiblemente no utilizado por ningún cliente.
- `PUT /api/ubicaciones/distritos/:id` — Posiblemente no utilizado por ningún cliente.
- `POST /api/ventas` — Posiblemente no utilizado por ningún cliente.
