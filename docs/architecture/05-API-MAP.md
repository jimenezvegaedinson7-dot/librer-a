# Mapa de API

> Generado desde el código real el 2026-11-21 con `docs/architecture/tools/actualizar-mapa.mjs`.
> No contiene secretos: solo nombres de variables de entorno.

Total de endpoints registrados en el backend: **119**. Los routers se montan desde `src/app/rutas.js`.

- **Auth**: `Pública` = sin JWT · `JWT` = requiere `Authorization: Bearer` · `JWT + admin` / `JWT + cliente` = además el rol indicado. Los arrays de middleware compartidos se expanden desde el router real.
- **React / Flutter**: archivos que llaman al endpoint (directamente o a través de su servicio). `—` = ningún cliente lo usa.
- Los parámetros se escriben como en el backend (`:id`); los clientes los construyen con interpolación.

| Método | Endpoint | Backend (controlador#función) | Middleware | React | Flutter | Auth |
|---|---|---|---|---|---|---|
| GET | `/api/agencias/activas` | controllers/agencia.controller.js#listarAgencias | JWT | — | — | JWT |
| GET | `/api/agencias` | controllers/agencia.controller.js#listarTodasAgencias | JWT + rol:administrador | — | — | JWT + admin |
| GET | `/api/agencias/:id` | controllers/agencia.controller.js#obtenerAgencia | JWT | — | — | JWT |
| POST | `/api/agencias` | controllers/agencia.controller.js#crearAgencia | JWT + rol:administrador | — | — | JWT + admin |
| PUT | `/api/agencias/:id` | controllers/agencia.controller.js#actualizarAgencia | JWT + rol:administrador | — | — | JWT + admin |
| GET | `/api/anuncios` | controllers/anuncio.controller.js#obtenerAnuncioActivo | — | components/web/secciones/VideoSection.jsx | — | Pública |
| GET | `/api/anuncios/carrusel` | controllers/carrusel.controller.js#listarPublico | — | — | — | Pública |
| GET | `/api/anuncios/carrusel/todos` | controllers/carrusel.controller.js#listarPanel | JWT + rol:administrador | — | — | JWT + admin |
| POST | `/api/anuncios/carrusel` | controllers/carrusel.controller.js#crear | JWT + rol:administrador + recibir | — | — | JWT + admin |
| PUT | `/api/anuncios/carrusel/orden` | controllers/carrusel.controller.js#reordenar | JWT + rol:administrador | — | — | JWT + admin |
| PUT | `/api/anuncios/carrusel/:id` | controllers/carrusel.controller.js#actualizar | JWT + rol:administrador + recibir | — | — | JWT + admin |
| DELETE | `/api/anuncios/carrusel/:id` | controllers/carrusel.controller.js#eliminar | JWT + rol:administrador | — | — | JWT + admin |
| GET | `/api/anuncios/todos` | controllers/anuncio.controller.js#listarAnuncios | JWT + rol:administrador | views/panel/anuncios/AnunciosPage.jsx | — | JWT + admin |
| POST | `/api/anuncios` | controllers/anuncio.controller.js#crearAnuncio | JWT + rol:administrador + uploadVideo(video) | views/panel/anuncios/AnunciosPage.jsx | — | JWT + admin |
| PUT | `/api/anuncios/:id` | controllers/anuncio.controller.js#actualizarAnuncio | JWT + rol:administrador + uploadVideo(video) | views/panel/anuncios/AnunciosPage.jsx | — | JWT + admin |
| DELETE | `/api/anuncios/:id` | controllers/anuncio.controller.js#eliminarAnuncio | JWT + rol:administrador | views/panel/anuncios/AnunciosPage.jsx | — | JWT + admin |
| GET | `/api/app/version` | controllers/app.controller.js#obtenerVersion | — | components/web/ActualizarApp.jsx | — | Pública |
| POST | `/api/asistente` | controllers/asistente.controller.js#conversar | limite | components/web/asistente/AsistenteTienda.jsx | — | Pública |
| GET | `/api/asistente/memoria` | controllers/asistente.controller.js#obtenerMemoria | limiteMemoria + JWT + rol:cliente | hooks/web/asistente/useMemoriaAsistente.js | — | JWT + cliente |
| PUT | `/api/asistente/memoria` | controllers/asistente.controller.js#guardarMemoria | limiteMemoria + JWT + rol:cliente | hooks/web/asistente/useMemoriaAsistente.js | — | JWT + cliente |
| DELETE | `/api/asistente/memoria` | controllers/asistente.controller.js#borrarMemoria | limiteMemoria + JWT + rol:cliente | hooks/web/asistente/useMemoriaAsistente.js | — | JWT + cliente |
| POST | `/api/auth/registro` | controllers/auth.controller.js#registrar | registroLimiter | views/web/tienda/CuentaPage.jsx | screens/registro_screen.dart | Pública |
| POST | `/api/auth/login` | controllers/auth.controller.js#login | loginLimiter | views/panel/auth/LoginPage.jsx<br>views/web/tienda/CuentaPage.jsx | screens/login_screen.dart | Pública |
| POST | `/api/auth/verificar-email` | controllers/auth.controller.js#verificarEmail | verificacionLimiter | views/panel/auth/VerificarEmailPage.jsx<br>views/web/tienda/CuentaPage.jsx | screens/verificacion_email_screen.dart | Pública |
| POST | `/api/auth/reenviar-codigo` | controllers/auth.controller.js#reenviarCodigo | verificacionLimiter | views/panel/auth/VerificarEmailPage.jsx<br>views/web/tienda/CuentaPage.jsx | screens/verificacion_email_screen.dart | Pública |
| POST | `/api/auth/solicitar-reseteo` | controllers/auth.controller.js#solicitarReseteo | verificacionLimiter | views/panel/auth/LoginPage.jsx<br>views/web/tienda/CuentaPage.jsx | screens/recuperar_contrasena_screen.dart<br>screens/reestablecer_contrasena_screen.dart | Pública |
| POST | `/api/auth/verificar-reseteo` | controllers/auth.controller.js#verificarReseteo | verificacionLimiter | views/web/tienda/CuentaPage.jsx | screens/reestablecer_contrasena_screen.dart | Pública |
| POST | `/api/auth/reestablecer-contrasena` | controllers/auth.controller.js#reestablecerContrasena | verificacionLimiter | views/panel/auth/LoginPage.jsx<br>views/web/tienda/CuentaPage.jsx | screens/reestablecer_contrasena_screen.dart | Pública |
| POST | `/api/auth/2fa/verify-login` | controllers/auth2fa.controller.js#verificarLogin | twoFaLimiter | views/panel/auth/LoginPage.jsx<br>views/web/tienda/CuentaPage.jsx | screens/security/two_factor_verify_screen.dart | Pública |
| POST | `/api/auth/2fa/setup` | controllers/auth2fa.controller.js#setup | JWT + twoFaLimiter | components/panel/layout/PerfilAdministrador.jsx | screens/security/two_factor_setup_screen.dart | JWT |
| POST | `/api/auth/2fa/confirm` | controllers/auth2fa.controller.js#confirmar | JWT + twoFaLimiter | components/panel/layout/PerfilAdministrador.jsx | screens/security/two_factor_setup_screen.dart | JWT |
| POST | `/api/auth/2fa/disable` | controllers/auth2fa.controller.js#desactivar | JWT + twoFaLimiter | components/panel/layout/PerfilAdministrador.jsx | screens/security/two_factor_disable_screen.dart | JWT |
| GET | `/api/autores` | controllers/autor.controller.js#obtenerAutores | — | components/panel/libros/LibroEditModal.jsx<br>hooks/panel/libros/useCatalogo.js<br>views/panel/autores/AutoresPage.jsx | — | Pública |
| GET | `/api/autores/:id` | controllers/autor.controller.js#obtenerAutor | — | views/panel/autores/AutoresPage.jsx<br>views/web/tienda/LibroPage.jsx | — | Pública |
| POST | `/api/autores` | controllers/autor.controller.js#crearAutor | JWT + rol:administrador | components/panel/autores/AutorForm.jsx | — | JWT + admin |
| PUT | `/api/autores/:id` | controllers/autor.controller.js#actualizarAutor | JWT + rol:administrador | components/panel/autores/AutorEditModal.jsx | — | JWT + admin |
| DELETE | `/api/autores/:id` | controllers/autor.controller.js#eliminarAutor | JWT + rol:administrador | views/panel/autores/AutoresPage.jsx | — | JWT + admin |
| GET | `/api/categorias` | controllers/categoria.controller.js#obtenerCategorias | — | components/panel/libros/LibroEditModal.jsx<br>hooks/panel/libros/useCatalogo.js<br>views/panel/categorias/CategoriasPage.jsx | — | Pública |
| GET | `/api/categorias/:id` | controllers/categoria.controller.js#obtenerCategoria | — | views/panel/categorias/CategoriasPage.jsx | — | Pública |
| POST | `/api/categorias` | controllers/categoria.controller.js#crearCategoria | JWT + rol:administrador | components/panel/categorias/CategoriaForm.jsx | — | JWT + admin |
| PUT | `/api/categorias/:id` | controllers/categoria.controller.js#actualizarCategoria | JWT + rol:administrador | components/panel/categorias/CategoriaEditModal.jsx | — | JWT + admin |
| DELETE | `/api/categorias/:id` | controllers/categoria.controller.js#eliminarCategoria | JWT + rol:administrador | views/panel/categorias/CategoriasPage.jsx | — | JWT + admin |
| GET | `/api/clientes` | controllers/cliente.controller.js#listarClientes | JWT + rol:administrador | — | — | JWT + admin |
| GET | `/api/comprobantes` | controllers/comprobante.controller.js#listarComprobantes | JWT + verificarPanel | views/panel/comprobantes/ComprobantesPage.jsx | — | JWT + admin |
| GET | `/api/comprobantes/resumen` | inline (comprobante.routes.js) | JWT + verificarPanel | views/panel/comprobantes/ComprobantesPage.jsx | — | JWT + admin |
| POST | `/api/comprobantes/:id/enviar-email` | controllers/comprobante.controller.js#enviarComprobanteEmail | JWT + verificarPanel | components/panel/ventas/EmitirComprobanteModal.jsx<br>views/panel/comprobantes/ComprobantesPage.jsx | — | JWT + admin |
| GET | `/api/comprobantes/:id` | controllers/comprobante.controller.js#obtenerComprobante | JWT + verificarPanel | components/panel/comprobantes/ComprobanteViewModal.jsx | — | JWT + admin |
| POST | `/api/comprobantes/:id/anular` | controllers/comprobante.controller.js#anularComprobante | JWT + rol:administrador | components/panel/comprobantes/AnularComprobanteModal.jsx | — | JWT + admin |
| GET | `/api/empresa` | controllers/empresa.controller.js#obtenerEmpresa | — | components/panel/comprobantes/ComprobanteViewModal.jsx<br>components/panel/ventas/EmitirComprobanteModal.jsx<br>components/web/PublicLayout.jsx<br>views/panel/configuracion/EmpresaPage.jsx<br>views/web/publicas/LibroReclamacionesPage.jsx | — | Pública |
| PUT | `/api/empresa` | controllers/empresa.controller.js#actualizarEmpresa | JWT + rol:administrador | views/panel/configuracion/EmpresaPage.jsx | — | JWT + admin |
| GET | `/api/favoritos` | controllers/favorito.controller.js#listarMisFavoritos | JWT | views/web/tienda/FavoritosPage.jsx | screens/favoritos_screen.dart | JWT |
| GET | `/api/favoritos/:idLibro` | controllers/favorito.controller.js#estadoFavorito | JWT | components/web/tienda/AccionesLibro.jsx | screens/detalle_libro_screen.dart | JWT |
| POST | `/api/favoritos/:idLibro` | controllers/favorito.controller.js#agregarFavorito | JWT | components/web/tienda/AccionesLibro.jsx | screens/detalle_libro_screen.dart | JWT |
| DELETE | `/api/favoritos/:idLibro` | controllers/favorito.controller.js#quitarFavorito | JWT | components/web/tienda/AccionesLibro.jsx<br>views/web/tienda/FavoritosPage.jsx | screens/detalle_libro_screen.dart<br>screens/favoritos_screen.dart | JWT |
| GET | `/api/historial/mi-historial` | controllers/historial.controller.js#obtenerMiHistorial | JWT | — | — | JWT |
| POST | `/api/historial` | controllers/historial.controller.js#crearHistorial | JWT + rol:administrador | — | — | JWT + admin |
| GET | `/api/historial` | controllers/historial.controller.js#obtenerHistorial | JWT + rol:administrador | — | — | JWT + admin |
| GET | `/api/inventario` | controllers/inventario.controller.js#obtenerInventario | JWT + verificarPanel | views/panel/inventario/InventarioPage.jsx<br>views/panel/libros/LibrosPage.jsx | — | JWT + admin |
| GET | `/api/inventario/stock-bajo` | controllers/inventario.controller.js#obtenerStockBajo | JWT + verificarPanel | services/panel/dashboard/dashboardService.js<br>services/panel/notificaciones/notificacionesService.js<br>views/panel/dashboard/DashboardPage.jsx | — | JWT + admin |
| GET | `/api/inventario/movimientos` | controllers/inventario.controller.js#listarMovimientos | JWT + verificarPanel | components/panel/inventario/MovimientosModal.jsx | — | JWT + admin |
| GET | `/api/inventario/libro/:id` | controllers/inventario.controller.js#obtenerInventarioPorLibro | JWT + verificarPanel | views/panel/inventario/InventarioPage.jsx | — | JWT + admin |
| POST | `/api/inventario` | controllers/inventario.controller.js#crearInventario | JWT + rol:administrador | components/panel/inventario/InventarioForm.jsx | — | JWT + admin |
| PUT | `/api/inventario/libro/:id/stock` | controllers/inventario.controller.js#actualizarStock | JWT + rol:administrador | — | — | JWT + admin |
| PUT | `/api/inventario/libro/:id` | controllers/inventario.controller.js#actualizarInventario | JWT + rol:administrador | components/panel/inventario/InventarioEditModal.jsx | — | JWT + admin |
| GET | `/api/libros` | controllers/libro.controller.js#obtenerLibros | — | components/panel/inventario/MovimientosModal.jsx<br>components/web/asistente/AsistenteTienda.jsx<br>components/web/PublicLayout.jsx<br>components/web/tienda/TiendaProvider.jsx<br>hooks/panel/inventario/useLibros.js<br>services/panel/dashboard/dashboardService.js<br>views/panel/dashboard/DashboardPage.jsx<br>views/panel/libros/LibrosPage.jsx<br>views/web/publicas/BuscarPage.jsx | screens/carrito_screen.dart<br>screens/entrega_y_pago_screen.dart<br>screens/home_screen.dart<br>screens/libros_screen.dart | Pública |
| GET | `/api/libros/recomendados` | controllers/libro.controller.js#obtenerRecomendados | JWT + rol:cliente | components/web/tienda/RecomendacionesCompra.jsx | — | JWT + cliente |
| GET | `/api/libros/:id/relacionados` | controllers/libro.controller.js#obtenerRelacionados | — | views/web/tienda/LibroPage.jsx | — | Pública |
| GET | `/api/libros/:id` | controllers/libro.controller.js#obtenerLibro | — | components/panel/libros/LibroEditModal.jsx<br>components/panel/libros/LibroForm.jsx<br>views/panel/libros/LibrosPage.jsx<br>views/web/tienda/LibroPage.jsx | screens/detalle_libro_screen.dart | Pública |
| POST | `/api/libros` | controllers/libro.controller.js#crearLibro | JWT + rol:administrador + upload(portada) | components/panel/libros/LibroForm.jsx | — | JWT + admin |
| PUT | `/api/libros/:id` | controllers/libro.controller.js#actualizarLibro | JWT + rol:administrador + upload(portada) | components/panel/libros/LibroEditModal.jsx | — | JWT + admin |
| DELETE | `/api/libros/:id` | controllers/libro.controller.js#eliminarLibro | JWT + rol:administrador | views/panel/libros/LibrosPage.jsx | — | JWT + admin |
| GET | `/api/pagos/checkout/:externalReference` | controllers/pago.controller.js#renderCheckoutPage | — | — | — | Pública |
| GET | `/api/pagos/respuesta/:externalReference` | controllers/pago.controller.js#renderRespuestaPage | — | — | — | Pública |
| GET | `/api/pagos/capacidades` | controllers/pago.controller.js#obtenerCapacidadesCompra | — | views/web/tienda/CheckoutPage.jsx | — | Pública |
| POST | `/api/pagos/webhook` | controllers/pago.controller.js#webhookPago | webhookLimit + express.urlencoded + express.json | — | — | Pública |
| GET | `/api/pagos` | controllers/pago.controller.js#listarPagosAdmin | JWT + verificarPanel | services/panel/notificaciones/notificacionesService.js | — | JWT + admin |
| GET | `/api/pagos/resumen` | inline (pago.routes.js) | JWT + verificarPanel | — | — | JWT + admin |
| POST | `/api/pagos/crear-orden` | controllers/pago.controller.js#crearOrden | JWT | services/web/tienda/persistenciaCompra.js | screens/entrega_y_pago_screen.dart<br>screens/mis_compras_screen.dart<br>screens/splash_screen.dart | JWT |
| GET | `/api/pagos/:orderId` | controllers/pago.controller.js#obtenerOrden | JWT | views/web/tienda/MisComprasPage.jsx | screens/entrega_y_pago_screen.dart<br>screens/mis_compras_screen.dart | JWT |
| GET | `/api/pedidos` | controllers/pedido.controller.js#obtenerPedidos | JWT + verificarPanel | views/panel/pedidos/PedidosPage.jsx | — | JWT + admin |
| GET | `/api/pedidos/usuario/:id_usuario` | controllers/pedido.controller.js#obtenerMisPedidos | JWT | — | — | JWT |
| GET | `/api/pedidos/:id` | controllers/pedido.controller.js#obtenerPedido | JWT + verificarPanel | views/panel/pedidos/PedidosPage.jsx | — | JWT + admin |
| PUT | `/api/pedidos/:id/estado` | controllers/pedido.controller.js#actualizarEstadoPedido | JWT + verificarPanel | views/panel/pedidos/PedidosPage.jsx | — | JWT + admin |
| POST | `/api/reclamaciones` | controllers/reclamacion.controller.js#registrar | reclamacionLimiter | views/web/publicas/LibroReclamacionesPage.jsx | screens/libro_reclamaciones_screen.dart | Pública |
| GET | `/api/reclamaciones` | controllers/reclamacion.controller.js#listar | JWT + rol:administrador | views/panel/reclamaciones/ReclamacionesPage.jsx | — | JWT + admin |
| GET | `/api/reclamaciones/resumen` | controllers/reclamacion.controller.js#resumen | JWT + rol:administrador | views/panel/reclamaciones/ReclamacionesPage.jsx | — | JWT + admin |
| GET | `/api/reclamaciones/:id` | controllers/reclamacion.controller.js#obtener | JWT + rol:administrador | — | — | JWT + admin |
| PUT | `/api/reclamaciones/:id/respuesta` | controllers/reclamacion.controller.js#responder | JWT + rol:administrador | views/panel/reclamaciones/ReclamacionesPage.jsx | — | JWT + admin |
| GET | `/api/reportes/ventas-por-estado` | controllers/reporte.controller.js#obtenerVentasPorEstado | JWT + verificarPanel | services/panel/dashboard/dashboardService.js<br>views/panel/dashboard/DashboardPage.jsx | — | JWT + admin |
| GET | `/api/reportes/resumen` | controllers/reporte.controller.js#obtenerResumenGeneral | JWT + '/reservas-por-estado' + (_req, res) => res.status(410).json({ success: false, mensaje: 'El reporte de reservas fue eliminado.' }) + soloAdmin | services/panel/dashboard/dashboardService.js<br>views/panel/dashboard/DashboardPage.jsx | — | JWT + admin |
| GET | `/api/reportes/libros-mas-vendidos` | controllers/reporte.controller.js#obtenerLibrosMasVendidos | JWT + '/reservas-por-estado' + (_req, res) => res.status(410).json({ success: false, mensaje: 'El reporte de reservas fue eliminado.' }) + soloAdmin | services/panel/dashboard/dashboardService.js<br>views/panel/dashboard/DashboardPage.jsx | — | JWT + admin |
| GET | `/api/reportes/ventas-por-mes` | controllers/reporte.controller.js#obtenerVentasPorMes | JWT + '/reservas-por-estado' + (_req, res) => res.status(410).json({ success: false, mensaje: 'El reporte de reservas fue eliminado.' }) + soloAdmin | services/panel/dashboard/dashboardService.js<br>views/panel/dashboard/DashboardPage.jsx | — | JWT + admin |
| GET | `/api/reportes/ventas-por-dia` | controllers/reporte.controller.js#obtenerVentasPorDia | JWT + '/reservas-por-estado' + (_req, res) => res.status(410).json({ success: false, mensaje: 'El reporte de reservas fue eliminado.' }) + soloAdmin | services/panel/dashboard/dashboardService.js<br>views/panel/dashboard/DashboardPage.jsx | — | JWT + admin |
| GET | `/api/reportes/indicadores-ventas` | controllers/reporte.controller.js#obtenerIndicadoresVentas | JWT + '/reservas-por-estado' + (_req, res) => res.status(410).json({ success: false, mensaje: 'El reporte de reservas fue eliminado.' }) + soloAdmin | services/panel/dashboard/dashboardService.js<br>views/panel/dashboard/DashboardPage.jsx | — | JWT + admin |
| GET | `/` | controllers/sistema.controller.js#saludServidor | — | — | — | Pública |
| GET | `/api` | controllers/sistema.controller.js#saludApi | — | — | — | Pública |
| GET | `/api/test-db` | controllers/sistema.controller.js#probarBaseDeDatos | JWT + rol:administrador | — | — | JWT + admin |
| GET | `/api/ubicaciones/provincias` | controllers/ubicacion.controller.js#listarProvincias | JWT | — | — | JWT |
| GET | `/api/ubicaciones/provincias/:id_provincia/distritos` | controllers/ubicacion.controller.js#listarDistritos | JWT | — | — | JWT |
| PUT | `/api/ubicaciones/distritos/:id` | controllers/ubicacion.controller.js#actualizarTarifaDistrito | JWT + rol:administrador | — | — | JWT + admin |
| GET | `/api/usuarios` | controllers/usuario.controller.js#listarUsuarios | JWT + rol:administrador | views/panel/usuarios/UsuariosPage.jsx | — | JWT + admin |
| GET | `/api/usuarios/perfil` | controllers/usuario.controller.js#obtenerPerfil | JWT | components/panel/layout/PerfilAdministrador.jsx<br>components/web/tienda/TiendaProvider.jsx | screens/perfil_screen.dart<br>screens/splash_screen.dart | JWT |
| PUT | `/api/usuarios/perfil` | controllers/usuario.controller.js#actualizarPerfil | JWT | components/panel/layout/PerfilAdministrador.jsx<br>components/web/tienda/PerfilCliente.jsx | screens/security/editar_perfil_screen.dart | JWT |
| PUT | `/api/usuarios/foto` | controllers/usuario.controller.js#subirFotoPerfil | JWT + uploadPerfil(foto) | components/panel/layout/PerfilAdministrador.jsx<br>components/web/tienda/PerfilCliente.jsx | screens/perfil_screen.dart | JWT |
| PUT | `/api/usuarios/password` | controllers/usuario.controller.js#cambiarPassword | JWT | components/panel/layout/PerfilAdministrador.jsx | screens/security/cambiar_password_screen.dart | JWT |
| DELETE | `/api/usuarios/cuenta` | controllers/usuario.controller.js#eliminarMiCuenta | JWT | — | screens/security/eliminar_cuenta_screen.dart | JWT |
| PATCH | `/api/usuarios/:id` | controllers/usuario.controller.js#adminUpdateUsuario | JWT + rol:administrador | views/panel/usuarios/UsuariosPage.jsx | — | JWT + admin |
| GET | `/api/ventas/mis-ventas` | controllers/venta.controller.js#obtenerMisVentas | JWT | hooks/web/tienda/useDatosCliente.js<br>views/web/tienda/MisComprasPage.jsx | screens/mis_compras_screen.dart<br>screens/splash_screen.dart | JWT |
| POST | `/api/ventas` | inline (venta.routes.js) | JWT | — | — | JWT |
| GET | `/api/ventas` | controllers/venta.controller.js#obtenerVentas | JWT + verificarPanel | views/panel/ventas/VentasPage.jsx | — | JWT + admin |
| GET | `/api/ventas/:id` | controllers/venta.controller.js#obtenerVenta | JWT | components/web/tienda/TiendaProvider.jsx<br>views/panel/ventas/VentasPage.jsx<br>views/web/tienda/CheckoutPage.jsx | — | JWT |
| GET | `/api/ventas/:id/pago` | controllers/venta.controller.js#obtenerPagoVenta | JWT | views/web/tienda/MisComprasPage.jsx | screens/mis_compras_screen.dart | JWT |
| PUT | `/api/ventas/:id/estado` | controllers/venta.controller.js#actualizarEstadoVenta | JWT + verificarPanel | — | — | JWT + admin |
| POST | `/api/ventas/:id/comprobante` | controllers/comprobante.controller.js#generarComprobante | JWT + verificarPanel | components/panel/ventas/EmitirComprobanteModal.jsx | — | JWT + admin |
| POST | `/api/ventas/:id/reembolso` | controllers/venta.controller.js#reembolsarVenta | JWT + rol:administrador | components/panel/ventas/ReembolsoModal.jsx | — | JWT + admin |
| GET | `/api/zonas-delivery` | controllers/zonaDelivery.controller.js#listarZonas | JWT | views/web/tienda/CheckoutPage.jsx | screens/entrega_y_pago_screen.dart | JWT |
| GET | `/api/zonas-delivery/todos` | controllers/zonaDelivery.controller.js#listarTodasZonas | JWT + rol:administrador | views/panel/tarifas/TarifasEnvioPage.jsx | — | JWT + admin |
| POST | `/api/zonas-delivery` | controllers/zonaDelivery.controller.js#crearZona | JWT + rol:administrador | — | — | JWT + admin |
| PUT | `/api/zonas-delivery/:id` | controllers/zonaDelivery.controller.js#actualizarZona | JWT + rol:administrador | views/panel/tarifas/TarifasEnvioPage.jsx | — | JWT + admin |

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

## Endpoints sin cliente en el código (31)

Ni React ni Flutter los declaran. Algunos son legítimos porque se usan por URL o desde un tercero:

- `GET /api/agencias/activas` — Posiblemente no utilizado por ningún cliente.
- `GET /api/agencias` — Posiblemente no utilizado por ningún cliente.
- `GET /api/agencias/:id` — Posiblemente no utilizado por ningún cliente.
- `POST /api/agencias` — Posiblemente no utilizado por ningún cliente.
- `PUT /api/agencias/:id` — Posiblemente no utilizado por ningún cliente.
- `GET /api/anuncios/carrusel` — Posiblemente no utilizado por ningún cliente.
- `GET /api/anuncios/carrusel/todos` — Posiblemente no utilizado por ningún cliente.
- `POST /api/anuncios/carrusel` — Posiblemente no utilizado por ningún cliente.
- `PUT /api/anuncios/carrusel/orden` — Posiblemente no utilizado por ningún cliente.
- `PUT /api/anuncios/carrusel/:id` — Posiblemente no utilizado por ningún cliente.
- `DELETE /api/anuncios/carrusel/:id` — Posiblemente no utilizado por ningún cliente.
- `GET /api/clientes` — Posiblemente no utilizado por ningún cliente.
- `GET /api/historial/mi-historial` — Posiblemente no utilizado por ningún cliente.
- `POST /api/historial` — Posiblemente no utilizado por ningún cliente.
- `GET /api/historial` — Posiblemente no utilizado por ningún cliente.
- `PUT /api/inventario/libro/:id/stock` — Posiblemente no utilizado por ningún cliente.
- `GET /api/pagos/checkout/:externalReference` — Lo abre el navegador web o la WebView de Flutter con la `checkout_url` que devuelve `POST /api/pagos/crear-orden`.
- `GET /api/pagos/respuesta/:externalReference` — Página de retorno (responseUrl) de PayU.
- `POST /api/pagos/webhook` — Confirmación de PayU (servidor a servidor).
- `GET /api/pagos/resumen` — Posiblemente no utilizado por ningún cliente.
- `GET /api/pedidos/usuario/:id_usuario` — Posiblemente no utilizado por ningún cliente.
- `GET /api/reclamaciones/:id` — Posiblemente no utilizado por ningún cliente.
- `GET /` — Salud del servidor.
- `GET /api` — Salud de la API.
- `GET /api/test-db` — Diagnóstico de conexión a BD (solo admin).
- `GET /api/ubicaciones/provincias` — Posiblemente no utilizado por ningún cliente.
- `GET /api/ubicaciones/provincias/:id_provincia/distritos` — Posiblemente no utilizado por ningún cliente.
- `PUT /api/ubicaciones/distritos/:id` — Posiblemente no utilizado por ningún cliente.
- `POST /api/ventas` — Posiblemente no utilizado por ningún cliente.
- `PUT /api/ventas/:id/estado` — Posiblemente no utilizado por ningún cliente.
- `POST /api/zonas-delivery` — Posiblemente no utilizado por ningún cliente.
