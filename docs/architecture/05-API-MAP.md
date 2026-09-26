# Mapa de API

> Generado desde el código real el 2026-09-26 con `docs/architecture/tools/actualizar-mapa.mjs`.
> No contiene secretos: solo nombres de variables de entorno.

Total de endpoints registrados en el backend: **103** (incluye 4 definidos directamente en `server.js`).

- **Auth**: `Pública` = sin JWT · `JWT` = requiere `Authorization: Bearer` · `JWT + admin` = además rol `administrador`.
- **React / Flutter**: archivos que llaman al endpoint (directamente o a través de su servicio). `—` = ningún cliente lo usa.
- Los parámetros se escriben como en el backend (`:id`); los clientes los construyen con interpolación.

| Método | Endpoint | Backend (controlador#función) | Middleware | React | Flutter | Auth |
|---|---|---|---|---|---|---|
| GET | `/` | inline (server.js) | — | — | — | Pública |
| GET | `/api` | inline (server.js) | — | — | — | Pública |
| GET | `/api/test-db` | inline (server.js) | JWT + rol:administrador | — | — | JWT + admin |
| GET | `/api/debug-egress` | inline (server.js) | — | — | — | Pública |
| GET | `/api/agencias/activas` | controllers/agencia.controller.js#listarAgencias | JWT | declarado en features/agencias/agenciasService.js#listarAgenciasActivas (sin uso) | — | JWT |
| GET | `/api/agencias` | controllers/agencia.controller.js#listarTodasAgencias | JWT + rol:administrador | features/agencias/AgenciasPage.jsx | — | JWT + admin |
| GET | `/api/agencias/:id` | controllers/agencia.controller.js#obtenerAgencia | JWT | declarado en features/agencias/agenciasService.js#obtenerAgencia (sin uso) | — | JWT |
| POST | `/api/agencias` | controllers/agencia.controller.js#crearAgencia | JWT + rol:administrador | features/agencias/AgenciasPage.jsx | — | JWT + admin |
| PUT | `/api/agencias/:id` | controllers/agencia.controller.js#actualizarAgencia | JWT + rol:administrador | features/agencias/AgenciaEditModal.jsx | — | JWT + admin |
| GET | `/api/app/version` | controllers/app.controller.js#obtenerVersion | — | — | — | Pública |
| POST | `/api/auth/registro` | controllers/auth.controller.js#registrar | registroLimiter | — | screens/registro_screen.dart | Pública |
| POST | `/api/auth/login` | controllers/auth.controller.js#login | loginLimiter | features/auth/LoginPage.jsx | screens/login_screen.dart | Pública |
| POST | `/api/auth/verificar-email` | controllers/auth.controller.js#verificarEmail | verificacionLimiter | features/auth/VerificarEmailPage.jsx | screens/verificacion_email_screen.dart | Pública |
| POST | `/api/auth/reenviar-codigo` | controllers/auth.controller.js#reenviarCodigo | verificacionLimiter | features/auth/VerificarEmailPage.jsx | screens/verificacion_email_screen.dart | Pública |
| POST | `/api/auth/solicitar-reseteo` | controllers/auth.controller.js#solicitarReseteo | verificacionLimiter | features/auth/LoginPage.jsx | screens/recuperar_contrasena_screen.dart<br>screens/reestablecer_contrasena_screen.dart | Pública |
| POST | `/api/auth/reestablecer-contrasena` | controllers/auth.controller.js#reestablecerContrasena | verificacionLimiter | features/auth/LoginPage.jsx | screens/reestablecer_contrasena_screen.dart | Pública |
| POST | `/api/auth/2fa/verify-login` | controllers/auth2fa.controller.js#verificarLogin | twoFaLimiter | features/auth/LoginPage.jsx | screens/security/two_factor_verify_screen.dart | Pública |
| POST | `/api/auth/2fa/setup` | controllers/auth2fa.controller.js#setup | JWT + twoFaLimiter | features/layout/PerfilAdministrador.jsx | screens/security/two_factor_setup_screen.dart | JWT |
| POST | `/api/auth/2fa/confirm` | controllers/auth2fa.controller.js#confirmar | JWT + twoFaLimiter | features/layout/PerfilAdministrador.jsx | screens/security/two_factor_setup_screen.dart | JWT |
| POST | `/api/auth/2fa/disable` | controllers/auth2fa.controller.js#desactivar | JWT + twoFaLimiter | features/layout/PerfilAdministrador.jsx | screens/security/two_factor_disable_screen.dart | JWT |
| GET | `/api/autores` | controllers/autor.controller.js#obtenerAutores | — | features/autores/AutoresPage.jsx<br>features/libros/LibroEditModal.jsx<br>features/libros/useCatalogo.js | — | Pública |
| GET | `/api/autores/:id` | controllers/autor.controller.js#obtenerAutor | — | features/autores/AutoresPage.jsx | — | Pública |
| POST | `/api/autores` | controllers/autor.controller.js#crearAutor | JWT + rol:administrador | features/autores/AutorForm.jsx | — | JWT + admin |
| PUT | `/api/autores/:id` | controllers/autor.controller.js#actualizarAutor | JWT + rol:administrador | features/autores/AutorEditModal.jsx | — | JWT + admin |
| DELETE | `/api/autores/:id` | controllers/autor.controller.js#eliminarAutor | JWT + rol:administrador | features/autores/AutoresPage.jsx | — | JWT + admin |
| GET | `/api/categorias` | controllers/categoria.controller.js#obtenerCategorias | — | features/categorias/CategoriasPage.jsx<br>features/libros/LibroEditModal.jsx<br>features/libros/useCatalogo.js | — | Pública |
| GET | `/api/categorias/:id` | controllers/categoria.controller.js#obtenerCategoria | — | features/categorias/CategoriasPage.jsx | — | Pública |
| POST | `/api/categorias` | controllers/categoria.controller.js#crearCategoria | JWT + rol:administrador | features/categorias/CategoriaForm.jsx | — | JWT + admin |
| PUT | `/api/categorias/:id` | controllers/categoria.controller.js#actualizarCategoria | JWT + rol:administrador | features/categorias/CategoriaEditModal.jsx | — | JWT + admin |
| DELETE | `/api/categorias/:id` | controllers/categoria.controller.js#eliminarCategoria | JWT + rol:administrador | features/categorias/CategoriasPage.jsx | — | JWT + admin |
| GET | `/api/clientes` | controllers/cliente.controller.js#listarClientes | JWT + rol:administrador | features/clientes/ClientesPage.jsx | — | JWT + admin |
| GET | `/api/comprobantes` | controllers/comprobante.controller.js#listarComprobantes | JWT + rol:administrador | features/comprobantes/ComprobantesPage.jsx | — | JWT + admin |
| GET | `/api/comprobantes/resumen` | inline (comprobante.routes.js) | JWT + rol:administrador | features/comprobantes/ComprobantesPage.jsx | — | JWT + admin |
| POST | `/api/comprobantes/:id/enviar-email` | controllers/comprobante.controller.js#enviarComprobanteEmail | JWT + rol:administrador | features/comprobantes/ComprobantesPage.jsx<br>features/ventas/EmitirComprobanteModal.jsx | — | JWT + admin |
| PUT | `/api/comprobantes/:id/sunat` | controllers/comprobante.controller.js#registrarSunat | JWT + rol:administrador | features/comprobantes/ComprobanteSunatModal.jsx | — | JWT + admin |
| POST | `/api/comprobantes/:id/anular` | controllers/comprobante.controller.js#anularComprobante | JWT + rol:administrador | features/comprobantes/ComprobanteSunatModal.jsx | — | JWT + admin |
| GET | `/api/comprobantes/:id` | controllers/comprobante.controller.js#obtenerComprobante | JWT + rol:administrador | features/comprobantes/ComprobanteViewModal.jsx | — | JWT + admin |
| GET | `/api/empresa` | controllers/empresa.controller.js#obtenerEmpresa | — | features/comprobantes/ComprobanteViewModal.jsx<br>features/configuracion/EmpresaPage.jsx<br>features/reclamaciones/LibroReclamacionesPage.jsx<br>features/ventas/EmitirComprobanteModal.jsx | — | Pública |
| PUT | `/api/empresa` | controllers/empresa.controller.js#actualizarEmpresa | JWT + rol:administrador | features/configuracion/EmpresaPage.jsx | — | JWT + admin |
| GET | `/api/favoritos` | controllers/favorito.controller.js#listarMisFavoritos | JWT | — | screens/favoritos_screen.dart | JWT |
| GET | `/api/favoritos/:idLibro` | controllers/favorito.controller.js#estadoFavorito | JWT | — | screens/detalle_libro_screen.dart | JWT |
| POST | `/api/favoritos/:idLibro` | controllers/favorito.controller.js#agregarFavorito | JWT | — | screens/detalle_libro_screen.dart | JWT |
| DELETE | `/api/favoritos/:idLibro` | controllers/favorito.controller.js#quitarFavorito | JWT | — | screens/detalle_libro_screen.dart<br>screens/favoritos_screen.dart | JWT |
| GET | `/api/historial/mi-historial` | controllers/historial.controller.js#obtenerMiHistorial | JWT | — | — | JWT |
| POST | `/api/historial` | controllers/historial.controller.js#crearHistorial | JWT + rol:administrador | — | — | JWT + admin |
| GET | `/api/historial` | controllers/historial.controller.js#obtenerHistorial | JWT + rol:administrador | features/historial/HistorialPage.jsx | — | JWT + admin |
| GET | `/api/inventario` | controllers/inventario.controller.js#obtenerInventario | JWT + rol:administrador | features/inventario/InventarioPage.jsx<br>features/libros/LibrosPage.jsx | — | JWT + admin |
| GET | `/api/inventario/stock-bajo` | controllers/inventario.controller.js#obtenerStockBajo | JWT + rol:administrador | — | — | JWT + admin |
| GET | `/api/inventario/movimientos` | controllers/inventario.controller.js#listarMovimientos | JWT + rol:administrador | features/inventario/MovimientosModal.jsx | — | JWT + admin |
| GET | `/api/inventario/libro/:id` | controllers/inventario.controller.js#obtenerInventarioPorLibro | JWT + rol:administrador | features/inventario/InventarioPage.jsx | — | JWT + admin |
| POST | `/api/inventario` | controllers/inventario.controller.js#crearInventario | JWT + rol:administrador | features/inventario/InventarioForm.jsx | — | JWT + admin |
| PUT | `/api/inventario/libro/:id/stock` | controllers/inventario.controller.js#actualizarStock | JWT + rol:administrador | — | — | JWT + admin |
| PUT | `/api/inventario/libro/:id` | controllers/inventario.controller.js#actualizarInventario | JWT + rol:administrador | features/inventario/InventarioEditModal.jsx | — | JWT + admin |
| GET | `/api/libros` | controllers/libro.controller.js#obtenerLibros | — | features/dashboard/DashboardPage.jsx<br>features/dashboard/dashboardService.js<br>features/inventario/MovimientosModal.jsx<br>features/inventario/useLibros.js<br>features/libros/LibrosPage.jsx<br>features/reservas/ReservaForm.jsx<br>features/reservas/reservasService.js<br>features/ventas/VentaForm.jsx | screens/home_screen.dart<br>screens/libros_screen.dart | Pública |
| GET | `/api/libros/:id` | controllers/libro.controller.js#obtenerLibro | — | features/libros/LibrosPage.jsx | screens/detalle_libro_screen.dart | Pública |
| POST | `/api/libros` | controllers/libro.controller.js#crearLibro | JWT + rol:administrador + upload(portada) | features/libros/LibroForm.jsx | — | JWT + admin |
| PUT | `/api/libros/:id` | controllers/libro.controller.js#actualizarLibro | JWT + rol:administrador + upload(portada) | features/libros/LibroEditModal.jsx | — | JWT + admin |
| DELETE | `/api/libros/:id` | controllers/libro.controller.js#eliminarLibro | JWT + rol:administrador | features/libros/LibrosPage.jsx | — | JWT + admin |
| GET | `/api/pagos/checkout/:externalReference` | controllers/pago.controller.js#renderCheckoutPage | — | — | — | Pública |
| GET | `/api/pagos/respuesta/:externalReference` | controllers/pago.controller.js#renderRespuestaPage | — | — | — | Pública |
| POST | `/api/pagos/webhook` | controllers/pago.controller.js#webhookPago | webhookLimit + express.urlencoded + express.json | — | — | Pública |
| GET | `/api/pagos` | controllers/pago.controller.js#listarPagosAdmin | JWT + rol:administrador | features/notificaciones/notificacionesService.js<br>features/pagos/PagosPage.jsx | — | JWT + admin |
| GET | `/api/pagos/resumen` | inline (pago.routes.js) | JWT + rol:administrador | features/pagos/PagosPage.jsx | — | JWT + admin |
| POST | `/api/pagos/crear-orden` | controllers/pago.controller.js#crearOrden | JWT | — | screens/entrega_y_pago_screen.dart | JWT |
| GET | `/api/pagos/:orderId` | controllers/pago.controller.js#obtenerOrden | JWT | — | screens/entrega_y_pago_screen.dart<br>screens/mis_compras_screen.dart | JWT |
| POST | `/api/reclamaciones` | controllers/reclamacion.controller.js#registrar | reclamacionLimiter | features/reclamaciones/LibroReclamacionesPage.jsx | — | Pública |
| GET | `/api/reclamaciones` | controllers/reclamacion.controller.js#listar | JWT + rol:administrador | features/reclamaciones/ReclamacionesPage.jsx | — | JWT + admin |
| GET | `/api/reclamaciones/resumen` | controllers/reclamacion.controller.js#resumen | JWT + rol:administrador | features/reclamaciones/ReclamacionesPage.jsx | — | JWT + admin |
| GET | `/api/reclamaciones/:id` | controllers/reclamacion.controller.js#obtener | JWT + rol:administrador | — | — | JWT + admin |
| PUT | `/api/reclamaciones/:id/respuesta` | controllers/reclamacion.controller.js#responder | JWT + rol:administrador | features/reclamaciones/ReclamacionesPage.jsx | — | JWT + admin |
| GET | `/api/reportes/resumen` | controllers/reporte.controller.js#obtenerResumenGeneral | JWT + rol:administrador | features/dashboard/DashboardPage.jsx<br>features/dashboard/dashboardService.js | — | JWT + admin |
| GET | `/api/reportes/libros-mas-vendidos` | controllers/reporte.controller.js#obtenerLibrosMasVendidos | JWT + rol:administrador | features/dashboard/DashboardPage.jsx<br>features/dashboard/dashboardService.js | — | JWT + admin |
| GET | `/api/reportes/ventas-por-estado` | controllers/reporte.controller.js#obtenerVentasPorEstado | JWT + rol:administrador | features/dashboard/DashboardPage.jsx<br>features/dashboard/dashboardService.js | — | JWT + admin |
| GET | `/api/reportes/reservas-por-estado` | controllers/reporte.controller.js#obtenerReservasPorEstado | JWT + rol:administrador | features/dashboard/DashboardPage.jsx<br>features/dashboard/dashboardService.js | — | JWT + admin |
| GET | `/api/reportes/stock-bajo` | controllers/reporte.controller.js#obtenerStockBajo | JWT + rol:administrador | features/dashboard/DashboardPage.jsx<br>features/dashboard/dashboardService.js<br>features/notificaciones/notificacionesService.js | — | JWT + admin |
| GET | `/api/reportes/ventas-por-mes` | controllers/reporte.controller.js#obtenerVentasPorMes | JWT + rol:administrador | features/dashboard/DashboardPage.jsx<br>features/dashboard/dashboardService.js | — | JWT + admin |
| GET | `/api/reportes/ventas-por-dia` | controllers/reporte.controller.js#obtenerVentasPorDia | JWT + rol:administrador | features/dashboard/DashboardPage.jsx<br>features/dashboard/dashboardService.js | — | JWT + admin |
| GET | `/api/reportes/indicadores-ventas` | controllers/reporte.controller.js#obtenerIndicadoresVentas | JWT + rol:administrador | features/dashboard/DashboardPage.jsx<br>features/dashboard/dashboardService.js | — | JWT + admin |
| GET | `/api/reportes/cierre-caja` | controllers/reporte.controller.js#obtenerCierreCaja | JWT + rol:administrador | — | — | JWT + admin |
| GET | `/api/reservas/mis-reservas` | controllers/reserva.controller.js#obtenerMisReservas | JWT | — | screens/reservas_screen.dart | JWT |
| POST | `/api/reservas` | controllers/reserva.controller.js#crearReserva | JWT | features/reservas/ReservaForm.jsx | screens/detalle_libro_screen.dart | JWT |
| DELETE | `/api/reservas/:id` | controllers/reserva.controller.js#cancelarReserva | JWT | — | screens/reservas_screen.dart | JWT |
| GET | `/api/reservas` | controllers/reserva.controller.js#obtenerReservas | JWT + rol:administrador | features/notificaciones/notificacionesService.js<br>features/reservas/ReservasPage.jsx | — | JWT + admin |
| GET | `/api/reservas/:id` | controllers/reserva.controller.js#obtenerReserva | JWT | features/reservas/ReservasPage.jsx | — | JWT |
| PUT | `/api/reservas/:id/estado` | controllers/reserva.controller.js#actualizarEstado | JWT + rol:administrador | features/reservas/ReservaEstadoModal.jsx | — | JWT + admin |
| GET | `/api/ubicaciones/provincias` | controllers/ubicacion.controller.js#listarProvincias | JWT | features/tarifas/TarifasEnvioPage.jsx<br>features/ventas/VentaForm.jsx | screens/entrega_y_pago_screen.dart | JWT |
| GET | `/api/ubicaciones/provincias/:id_provincia/distritos` | controllers/ubicacion.controller.js#listarDistritos | JWT | features/tarifas/TarifasEnvioPage.jsx<br>features/ventas/VentaForm.jsx | screens/entrega_y_pago_screen.dart | JWT |
| PUT | `/api/ubicaciones/distritos/:id` | controllers/ubicacion.controller.js#actualizarTarifaDistrito | JWT + rol:administrador | features/tarifas/TarifaEditModal.jsx | — | JWT + admin |
| GET | `/api/usuarios` | controllers/usuario.controller.js#listarUsuarios | JWT + rol:administrador | features/usuarios/UsuariosPage.jsx | — | JWT + admin |
| GET | `/api/usuarios/perfil` | controllers/usuario.controller.js#obtenerPerfil | JWT | features/layout/PerfilAdministrador.jsx | screens/perfil_screen.dart<br>screens/splash_screen.dart | JWT |
| PUT | `/api/usuarios/perfil` | controllers/usuario.controller.js#actualizarPerfil | JWT | features/layout/PerfilAdministrador.jsx | screens/security/editar_perfil_screen.dart | JWT |
| PUT | `/api/usuarios/foto` | controllers/usuario.controller.js#subirFotoPerfil | JWT + uploadPerfil(foto) | features/layout/PerfilAdministrador.jsx | screens/perfil_screen.dart | JWT |
| PUT | `/api/usuarios/password` | controllers/usuario.controller.js#cambiarPassword | JWT | features/layout/PerfilAdministrador.jsx | screens/security/cambiar_password_screen.dart | JWT |
| DELETE | `/api/usuarios/cuenta` | controllers/usuario.controller.js#eliminarMiCuenta | JWT | — | screens/security/eliminar_cuenta_screen.dart | JWT |
| PATCH | `/api/usuarios/:id` | controllers/usuario.controller.js#adminUpdateUsuario | JWT + rol:administrador | features/usuarios/UsuariosPage.jsx | — | JWT + admin |
| GET | `/api/ventas/mis-ventas` | controllers/venta.controller.js#obtenerMisVentas | JWT | — | screens/mis_compras_screen.dart | JWT |
| POST | `/api/ventas` | controllers/venta.controller.js#crearVenta | JWT + rol:administrador | features/ventas/VentaForm.jsx | — | JWT + admin |
| GET | `/api/ventas` | controllers/venta.controller.js#obtenerVentas | JWT + rol:administrador | features/pagos/PagosPage.jsx<br>features/ventas/VentasPage.jsx | — | JWT + admin |
| GET | `/api/ventas/:id` | controllers/venta.controller.js#obtenerVenta | JWT | features/ventas/VentasPage.jsx | — | JWT |
| GET | `/api/ventas/:id/pago` | controllers/venta.controller.js#obtenerPagoVenta | JWT | — | screens/mis_compras_screen.dart | JWT |
| PUT | `/api/ventas/:id/estado` | controllers/venta.controller.js#actualizarEstadoVenta | JWT + rol:administrador | features/ventas/VentasPage.jsx | — | JWT + admin |
| POST | `/api/ventas/:id/reembolso` | controllers/venta.controller.js#reembolsarVenta | JWT + rol:administrador | features/ventas/ReembolsoModal.jsx | — | JWT + admin |
| POST | `/api/ventas/:id/comprobante` | controllers/comprobante.controller.js#generarComprobante | JWT + rol:administrador | features/ventas/EmitirComprobanteModal.jsx | — | JWT + admin |

## Endpoints compartidos por React y Flutter (18)

- `POST /api/auth/login`
- `POST /api/auth/verificar-email`
- `POST /api/auth/reenviar-codigo`
- `POST /api/auth/solicitar-reseteo`
- `POST /api/auth/reestablecer-contrasena`
- `POST /api/auth/2fa/verify-login`
- `POST /api/auth/2fa/setup`
- `POST /api/auth/2fa/confirm`
- `POST /api/auth/2fa/disable`
- `GET /api/libros`
- `GET /api/libros/:id`
- `POST /api/reservas`
- `GET /api/ubicaciones/provincias`
- `GET /api/ubicaciones/provincias/:id_provincia/distritos`
- `GET /api/usuarios/perfil`
- `PUT /api/usuarios/perfil`
- `PUT /api/usuarios/foto`
- `PUT /api/usuarios/password`

## Endpoints sin cliente en el código (14)

Ni React ni Flutter los declaran. Algunos son legítimos porque se usan por URL o desde un tercero:

- `GET /` — Salud del servidor.
- `GET /api` — Salud de la API.
- `GET /api/test-db` — Diagnóstico de conexión a BD (solo admin).
- `GET /api/debug-egress` — ⚠️ Diagnóstico de salida SMTP **público, sin JWT**. Posiblemente no utilizado; revisar si debe existir en producción.
- `GET /api/app/version` — Posiblemente no utilizado por ningún cliente.
- `GET /api/historial/mi-historial` — Posiblemente no utilizado por ningún cliente.
- `POST /api/historial` — Posiblemente no utilizado por ningún cliente.
- `GET /api/inventario/stock-bajo` — Posiblemente no utilizado por ningún cliente.
- `PUT /api/inventario/libro/:id/stock` — Posiblemente no utilizado por ningún cliente.
- `GET /api/pagos/checkout/:externalReference` — Lo abre el navegador con la `checkout_url` que devuelve `POST /api/pagos/crear-orden` (Flutter la lanza con url_launcher).
- `GET /api/pagos/respuesta/:externalReference` — Página de retorno (responseUrl) de PayU.
- `POST /api/pagos/webhook` — Confirmación de PayU (servidor a servidor).
- `GET /api/reclamaciones/:id` — Posiblemente no utilizado por ningún cliente.
- `GET /api/reportes/cierre-caja` — Posiblemente no utilizado por ningún cliente.
