# Mapa del backend (Node.js + Express + PostgreSQL)

> Generado desde el código real el 2026-09-26 con `docs/architecture/tools/actualizar-mapa.mjs`.
> No contiene secretos: solo nombres de variables de entorno.

## Arranque (`backend/server.js`)

1. `dotenv` y comprobación obligatoria de `TWO_FACTOR_ENCRYPTION_KEY` (≥ 16 caracteres; si falta, el proceso no arranca).
2. `helmet` (sin CSP, CORP cross-origin) → `cors` con lista blanca `FRONTEND_ORIGINS` (por defecto `http://localhost:5173`) → `express.json({ limit: '1mb' })` → `baseLimiter`.
3. Estáticos: `/uploads` → `backend/uploads` (portadas y fotos locales cuando Cloudinary no está configurado).
4. Endpoints en línea: `GET /`, `GET /api`, `GET /api/test-db` (JWT + admin), `GET /api/debug-egress` (público).
5. Montaje de 19 routers bajo `/api/*` → 404 JSON → `error.middleware`.
6. `iniciarJobs()` (limpieza cada 5 min) y 3 migraciones idempotentes en línea (tabla `favoritos`; columnas `cliente_documento`/`cliente_tipo_documento` en `ventas`; `enviado_por_email`/`fecha_envio_email` en `comprobantes`).
7. `app.listen(PORT || 3000)`.

## Montaje de routers

| Prefijo | Archivo de rutas |
|---|---|
| `/api/agencias` | `routes/agencia.routes.js` |
| `/api/app` | `routes/app.routes.js` |
| `/api/auth` | `routes/auth.routes.js` |
| `/api/autores` | `routes/autor.routes.js` |
| `/api/categorias` | `routes/categoria.routes.js` |
| `/api/clientes` | `routes/cliente.routes.js` |
| `/api/comprobantes` | `routes/comprobante.routes.js` |
| `/api/empresa` | `routes/empresa.routes.js` |
| `/api/favoritos` | `routes/favorito.routes.js` |
| `/api/historial` | `routes/historial.routes.js` |
| `/api/inventario` | `routes/inventario.routes.js` |
| `/api/libros` | `routes/libro.routes.js` |
| `/api/pagos` | `routes/pago.routes.js` |
| `/api/reclamaciones` | `routes/reclamacion.routes.js` |
| `/api/reportes` | `routes/reporte.routes.js` |
| `/api/reservas` | `routes/reserva.routes.js` |
| `/api/ubicaciones` | `routes/ubicacion.routes.js` |
| `/api/usuarios` | `routes/usuario.routes.js` |
| `/api/ventas` | `routes/venta.routes.js` |

## Configuración (`src/config`)

| Archivo | Responsabilidad |
|---|---|
| `config/database.js` | Pool `pg` (PostgreSQL). `DATABASE_URL` o `DB_HOST/DB_USER/DB_PASSWORD/DB_NAME/DB_PORT`; SSL en producción. **Adaptador compatible con mysql2**: convierte `?` → `$n`, añade `RETURNING *` a los INSERT y devuelve `[rows, fields]` con `insertId/affectedRows`. Expone `getConnection()` para transacciones. |
| `config/payu.js` | Parámetros de PayU y `PUBLIC_BASE_URL` (URLs de checkout/respuesta/webhook). |

## Middlewares (`src/middlewares`)

| Archivo | Uso |
|---|---|
| `auth.middleware.js` | `verificarToken`: exige `Authorization: Bearer <jwt>`, valida con `jwt.verify` y deja `req.usuario`. |
| `rol.middleware.js` | `verificarRol('administrador')`: restringe por rol. |
| `rateLimit.js` | `baseLimiter` (global), `loginLimiter`, `registroLimiter`, `verificacionLimiter`, `twoFaLimiter`, `webhookLimit`. |
| `upload.middleware.js` | Multer en memoria, 5 MB, validación de tipo; sube la portada a Cloudinary si está configurado (`req.file.cloudinaryUrl`) o al disco `/uploads`. Campo `portada`. |
| `uploadPerfil.middleware.js` | Igual para fotos de perfil. Campo `foto`. |
| `error.middleware.js` | Manejador global de errores (después del 404). |

## Utilidades, servicios y jobs

| Archivo | Responsabilidad |
|---|---|
| `utils/mailer.js` | Correo con **nodemailer** (SMTP_*): verificación, reseteo, reserva creada, pedido entregado, comprobantes (PDF con **html-pdf-node**). |
| `utils/cloudinary.js` | Subida/eliminación de imágenes en Cloudinary (CLOUDINARY_*), `publicIdDesdeUrl`. |
| `utils/crypto.js` | Cifrado/descifrado del secreto 2FA con `TWO_FACTOR_ENCRYPTION_KEY`. |
| `utils/transiciones.js` | Máquinas de estado permitidas de `VENTA` y `RESERVA` (`permitirTransicion`). |
| `utils/payuStatus.js` | Traduce estados de PayU a estados de venta. |
| `utils/validaciones.js` | `validarId`, `esEmailValido`, `esNumeroNoNegativo`, `esCantidadPositiva`, `esEstadoValido`… |
| `utils/fileType.js` | Detección del tipo real de archivo por firma (uploads). |
| `utils/numeroALetras.js` | Importe en letras para comprobantes. |
| `services/payu.service.js` | Integración **PayU WebCheckout**: crear orden, formulario de checkout, consulta de orden. |
| `jobs/limpieza.js` | Cada 5 min: `reservaModel.cancelarVencidas()` y cancelación de ventas abandonadas (ventaModel). |

## Autenticación (JWT + 2FA)

- `POST /api/auth/login` → `usuario.model#buscarPorEmail` + bcrypt. Si el usuario tiene 2FA activo devuelve `requires_2fa` y un **`two_factor_token` JWT de 5 min**; si no, el **JWT de sesión (24 h)**.
- `POST /api/auth/2fa/verify-login` valida el token temporal y el código TOTP (**otplib**; secreto cifrado con `utils/crypto`) y emite el JWT de 24 h.
- `/2fa/setup` genera secreto + QR (**qrcode**), `/2fa/confirm` lo activa, `/2fa/disable` exige contraseña + código.
- Registro con verificación de correo por código; recuperación de contraseña por código (`solicitar-reseteo` → `reestablecer-contrasena`).

## Endpoints por módulo

Cadena: **MÉTODO RUTA → archivo de rutas → middleware → controlador#función → modelo#función → tablas PostgreSQL**.

### Rutas en server.js

| Método | Ruta | Middleware | Controlador | Modelos / servicios | Tablas |
|---|---|---|---|---|---|
| GET | `/` | — | inline (server.js) | — | — |
| GET | `/api` | — | inline (server.js) | — | — |

### /api/test-db

| Método | Ruta | Middleware | Controlador | Modelos / servicios | Tablas |
|---|---|---|---|---|---|
| GET | `/api/test-db` | JWT + rol:administrador | inline (server.js) | — | — |

### /api/debug-egress

| Método | Ruta | Middleware | Controlador | Modelos / servicios | Tablas |
|---|---|---|---|---|---|
| GET | `/api/debug-egress` | — | inline (server.js) | — | — |

### /api/agencias

| Método | Ruta | Middleware | Controlador | Modelos / servicios | Tablas |
|---|---|---|---|---|---|
| GET | `/api/agencias/activas` | JWT | controllers/agencia.controller.js#listarAgencias | `agencia.model.js#obtenerActivas` | agencias_courier |
| GET | `/api/agencias` | JWT + rol:administrador | controllers/agencia.controller.js#listarTodasAgencias | `agencia.model.js#obtenerTodas` | agencias_courier |
| GET | `/api/agencias/:id` | JWT | controllers/agencia.controller.js#obtenerAgencia | `agencia.model.js#obtenerPorId` | agencias_courier |
| POST | `/api/agencias` | JWT + rol:administrador | controllers/agencia.controller.js#crearAgencia | `agencia.model.js#crear` | agencias_courier |
| PUT | `/api/agencias/:id` | JWT + rol:administrador | controllers/agencia.controller.js#actualizarAgencia | `agencia.model.js#actualizar`<br>`agencia.model.js#obtenerPorId` | agencias_courier |

### /api/app

| Método | Ruta | Middleware | Controlador | Modelos / servicios | Tablas |
|---|---|---|---|---|---|
| GET | `/api/app/version` | — | controllers/app.controller.js#obtenerVersion | — | — |

### /api/auth

| Método | Ruta | Middleware | Controlador | Modelos / servicios | Tablas |
|---|---|---|---|---|---|
| POST | `/api/auth/registro` | registroLimiter | controllers/auth.controller.js#registrar | `usuario.model.js#buscarPorEmail`<br>`usuario.model.js#crear`<br>`usuario.model.js#guardarCodigoVerificacion` | usuarios |
| POST | `/api/auth/login` | loginLimiter | controllers/auth.controller.js#login | `usuario.model.js#buscarPorEmail` | usuarios |
| POST | `/api/auth/verificar-email` | verificacionLimiter | controllers/auth.controller.js#verificarEmail | `usuario.model.js#buscarPorEmail`<br>`usuario.model.js#marcarEmailVerificado` | usuarios |
| POST | `/api/auth/reenviar-codigo` | verificacionLimiter | controllers/auth.controller.js#reenviarCodigo | `usuario.model.js#buscarPorEmail`<br>`usuario.model.js#guardarCodigoVerificacion` | usuarios |
| POST | `/api/auth/solicitar-reseteo` | verificacionLimiter | controllers/auth.controller.js#solicitarReseteo | `usuario.model.js#buscarPorEmail`<br>`usuario.model.js#guardarCodigoVerificacion` | usuarios |
| POST | `/api/auth/reestablecer-contrasena` | verificacionLimiter | controllers/auth.controller.js#reestablecerContrasena | `usuario.model.js#actualizarPassword`<br>`usuario.model.js#buscarPorEmail`<br>`usuario.model.js#limpiarCodigoVerificacion` | usuarios |
| POST | `/api/auth/2fa/verify-login` | twoFaLimiter | controllers/auth2fa.controller.js#verificarLogin | `usuario.model.js#buscarPorIdConPassword`<br>`usuario.model.js#obtenerSecreto2FA` | usuarios |
| POST | `/api/auth/2fa/setup` | JWT + twoFaLimiter | controllers/auth2fa.controller.js#setup | `usuario.model.js#buscarPorId`<br>`usuario.model.js#guardarSecreto2FA` | usuarios |
| POST | `/api/auth/2fa/confirm` | JWT + twoFaLimiter | controllers/auth2fa.controller.js#confirmar | `usuario.model.js#activar2FA`<br>`usuario.model.js#buscarPorIdConPassword`<br>`usuario.model.js#obtenerSecreto2FA` | usuarios |
| POST | `/api/auth/2fa/disable` | JWT + twoFaLimiter | controllers/auth2fa.controller.js#desactivar | `usuario.model.js#buscarPorIdConPassword`<br>`usuario.model.js#desactivar2FA`<br>`usuario.model.js#obtenerSecreto2FA` | usuarios |

### /api/autores

| Método | Ruta | Middleware | Controlador | Modelos / servicios | Tablas |
|---|---|---|---|---|---|
| GET | `/api/autores` | — | controllers/autor.controller.js#obtenerAutores | `autor.model.js#obtenerTodos` | autores |
| GET | `/api/autores/:id` | — | controllers/autor.controller.js#obtenerAutor | `autor.model.js#obtenerPorId` | autores |
| POST | `/api/autores` | JWT + rol:administrador | controllers/autor.controller.js#crearAutor | `autor.model.js#crear`<br>`historial.model.js#crear` | autores, historial_operaciones |
| PUT | `/api/autores/:id` | JWT + rol:administrador | controllers/autor.controller.js#actualizarAutor | `autor.model.js#actualizar`<br>`autor.model.js#obtenerPorId`<br>`historial.model.js#crear` | autores, historial_operaciones |
| DELETE | `/api/autores/:id` | JWT + rol:administrador | controllers/autor.controller.js#eliminarAutor | `autor.model.js#eliminar`<br>`autor.model.js#obtenerPorId`<br>`historial.model.js#crear`<br>`usuario.model.js#buscarPorIdConPassword` | autores, historial_operaciones, usuarios |

### /api/categorias

| Método | Ruta | Middleware | Controlador | Modelos / servicios | Tablas |
|---|---|---|---|---|---|
| GET | `/api/categorias` | — | controllers/categoria.controller.js#obtenerCategorias | `categoria.model.js#obtenerTodos` | categorias |
| GET | `/api/categorias/:id` | — | controllers/categoria.controller.js#obtenerCategoria | `categoria.model.js#obtenerPorId` | categorias |
| POST | `/api/categorias` | JWT + rol:administrador | controllers/categoria.controller.js#crearCategoria | `categoria.model.js#crear`<br>`historial.model.js#crear` | categorias, historial_operaciones |
| PUT | `/api/categorias/:id` | JWT + rol:administrador | controllers/categoria.controller.js#actualizarCategoria | `categoria.model.js#actualizar`<br>`categoria.model.js#obtenerPorId`<br>`historial.model.js#crear` | categorias, historial_operaciones |
| DELETE | `/api/categorias/:id` | JWT + rol:administrador | controllers/categoria.controller.js#eliminarCategoria | `categoria.model.js#eliminar`<br>`categoria.model.js#obtenerPorId`<br>`historial.model.js#crear`<br>`usuario.model.js#buscarPorIdConPassword` | categorias, historial_operaciones, usuarios |

### /api/clientes

| Método | Ruta | Middleware | Controlador | Modelos / servicios | Tablas |
|---|---|---|---|---|---|
| GET | `/api/clientes` | JWT + rol:administrador | controllers/cliente.controller.js#listarClientes | `cliente.model.js#listarClientes` | usuarios, ventas |

### /api/comprobantes

| Método | Ruta | Middleware | Controlador | Modelos / servicios | Tablas |
|---|---|---|---|---|---|
| GET | `/api/comprobantes` | JWT + rol:administrador | controllers/comprobante.controller.js#listarComprobantes | `comprobante.model.js#listarComprobantes` | comprobantes, usuarios, ventas |
| GET | `/api/comprobantes/resumen` | JWT + rol:administrador | inline (comprobante.routes.js) | `comprobante.model.js#listarResumen` | comprobantes |
| POST | `/api/comprobantes/:id/enviar-email` | JWT + rol:administrador | controllers/comprobante.controller.js#enviarComprobanteEmail | `comprobante.model.js#obtenerComprobante`<br>`empresa.model.js#obtenerEmpresa` | comprobantes, empresa, usuarios, ventas |
| PUT | `/api/comprobantes/:id/sunat` | JWT + rol:administrador | controllers/comprobante.controller.js#registrarSunat | `comprobante.model.js#registrarSunat`<br>`historial.model.js#crear` | comprobantes, historial_operaciones |
| POST | `/api/comprobantes/:id/anular` | JWT + rol:administrador | controllers/comprobante.controller.js#anularComprobante | `comprobante.model.js#anular`<br>`historial.model.js#crear` | comprobantes, historial_operaciones |
| GET | `/api/comprobantes/:id` | JWT + rol:administrador | controllers/comprobante.controller.js#obtenerComprobante | `comprobante.model.js#obtenerComprobante` | comprobantes, usuarios, ventas |

### /api/empresa

| Método | Ruta | Middleware | Controlador | Modelos / servicios | Tablas |
|---|---|---|---|---|---|
| GET | `/api/empresa` | — | controllers/empresa.controller.js#obtenerEmpresa | `empresa.model.js#obtenerEmpresa` | empresa |
| PUT | `/api/empresa` | JWT + rol:administrador | controllers/empresa.controller.js#actualizarEmpresa | `empresa.model.js#actualizarEmpresa` | empresa |

### /api/favoritos

| Método | Ruta | Middleware | Controlador | Modelos / servicios | Tablas |
|---|---|---|---|---|---|
| GET | `/api/favoritos` | JWT | controllers/favorito.controller.js#listarMisFavoritos | `favorito.model.js#listar` | autores, categorias, favoritos, inventario, libros |
| GET | `/api/favoritos/:idLibro` | JWT | controllers/favorito.controller.js#estadoFavorito | `favorito.model.js#esFavorito` | favoritos |
| POST | `/api/favoritos/:idLibro` | JWT | controllers/favorito.controller.js#agregarFavorito | `favorito.model.js#agregar`<br>`libro.model.js#obtenerPorId` | autores, categorias, favoritos, inventario, libros |
| DELETE | `/api/favoritos/:idLibro` | JWT | controllers/favorito.controller.js#quitarFavorito | `favorito.model.js#quitar` | favoritos |

### /api/historial

| Método | Ruta | Middleware | Controlador | Modelos / servicios | Tablas |
|---|---|---|---|---|---|
| GET | `/api/historial/mi-historial` | JWT | controllers/historial.controller.js#obtenerMiHistorial | `historial.model.js#obtenerPorUsuario` | historial_operaciones |
| POST | `/api/historial` | JWT + rol:administrador | controllers/historial.controller.js#crearHistorial | `historial.model.js#crear` | historial_operaciones |
| GET | `/api/historial` | JWT + rol:administrador | controllers/historial.controller.js#obtenerHistorial | `historial.model.js#obtenerTodos` | historial_operaciones, usuarios |

### /api/inventario

| Método | Ruta | Middleware | Controlador | Modelos / servicios | Tablas |
|---|---|---|---|---|---|
| GET | `/api/inventario` | JWT + rol:administrador | controllers/inventario.controller.js#obtenerInventario | `inventario.model.js#obtenerTodos` | inventario, libros |
| GET | `/api/inventario/stock-bajo` | JWT + rol:administrador | controllers/inventario.controller.js#obtenerStockBajo | `inventario.model.js#obtenerStockBajo` | inventario, libros |
| GET | `/api/inventario/movimientos` | JWT + rol:administrador | controllers/inventario.controller.js#listarMovimientos | `inventario.model.js#listarMovimientos` | libros, movimientos_inventario, usuarios |
| GET | `/api/inventario/libro/:id` | JWT + rol:administrador | controllers/inventario.controller.js#obtenerInventarioPorLibro | `inventario.model.js#obtenerPorLibro` | inventario, libros |
| POST | `/api/inventario` | JWT + rol:administrador | controllers/inventario.controller.js#crearInventario | `historial.model.js#crear`<br>`inventario.model.js#crear`<br>`inventario.model.js#obtenerPorLibro` | historial_operaciones, inventario, libros |
| PUT | `/api/inventario/libro/:id/stock` | JWT + rol:administrador | controllers/inventario.controller.js#actualizarStock | `historial.model.js#crear`<br>`inventario.model.js#actualizarStock` | historial_operaciones, inventario |
| PUT | `/api/inventario/libro/:id` | JWT + rol:administrador | controllers/inventario.controller.js#actualizarInventario | `historial.model.js#crear`<br>`inventario.model.js#actualizar`<br>`inventario.model.js#obtenerPorLibro` | historial_operaciones, inventario, libros |

### /api/libros

| Método | Ruta | Middleware | Controlador | Modelos / servicios | Tablas |
|---|---|---|---|---|---|
| GET | `/api/libros` | — | controllers/libro.controller.js#obtenerLibros | `libro.model.js#obtenerTodos` | autores, categorias, inventario, libros |
| GET | `/api/libros/:id` | — | controllers/libro.controller.js#obtenerLibro | `libro.model.js#obtenerPorId` | autores, categorias, inventario, libros |
| POST | `/api/libros` | JWT + rol:administrador + upload(portada) | controllers/libro.controller.js#crearLibro | `historial.model.js#crear`<br>`inventario.model.js#crear`<br>`inventario.model.js#obtenerPorLibro`<br>`libro.model.js#crear`<br>`libro.model.js#eliminar` | historial_operaciones, inventario, libros |
| PUT | `/api/libros/:id` | JWT + rol:administrador + upload(portada) | controllers/libro.controller.js#actualizarLibro | `historial.model.js#crear`<br>`libro.model.js#actualizar`<br>`libro.model.js#obtenerPorId` | autores, categorias, historial_operaciones, inventario, libros |
| DELETE | `/api/libros/:id` | JWT + rol:administrador | controllers/libro.controller.js#eliminarLibro | `historial.model.js#crear`<br>`inventario.model.js#eliminarMovimientosPorLibro`<br>`inventario.model.js#eliminarPorLibro`<br>`libro.model.js#obtenerPorId`<br>`usuario.model.js#buscarPorIdConPassword` | autores, categorias, detalle_venta, historial_operaciones, inventario, libros, movimientos_inventario, reservas, usuarios |

### /api/pagos

| Método | Ruta | Middleware | Controlador | Modelos / servicios | Tablas |
|---|---|---|---|---|---|
| GET | `/api/pagos/checkout/:externalReference` | — | controllers/pago.controller.js#renderCheckoutPage | `payu.service.js#construirFormularioCheckout`<br>`venta.model.js#buscarPorReferenciaExterna` | ventas |
| GET | `/api/pagos/respuesta/:externalReference` | — | controllers/pago.controller.js#renderRespuestaPage | — | — |
| POST | `/api/pagos/webhook` | webhookLimit + express.urlencoded + express.json | controllers/pago.controller.js#webhookPago | `usuario.model.js#buscarPorId`<br>`venta.model.js#actualizarDatosPago`<br>`venta.model.js#actualizarEstado`<br>`venta.model.js#buscarPorReferenciaExterna` | detalle_venta, inventario, usuarios, ventas |
| GET | `/api/pagos` | JWT + rol:administrador | controllers/pago.controller.js#listarPagosAdmin | `venta.model.js#listarPagosAdmin` | usuarios, ventas |
| GET | `/api/pagos/resumen` | JWT + rol:administrador | inline (pago.routes.js) | `pago.model.js#listarResumen` | ventas |
| POST | `/api/pagos/crear-orden` | JWT | controllers/pago.controller.js#crearOrden | `payu.service.js#crearOrden`<br>`ubicacion.model.js#esDistritoDeLima`<br>`ubicacion.model.js#existeDistrito`<br>`usuario.model.js#buscarPorId`<br>`venta.model.js#crear` | detalle_venta, distritos_lima, inventario, libros, provincias_lima, usuarios, ventas |
| GET | `/api/pagos/:orderId` | JWT | controllers/pago.controller.js#obtenerOrden | `payu.service.js#obtenerOrdenDiagnostico`<br>`usuario.model.js#buscarPorId`<br>`venta.model.js#actualizarDatosPago`<br>`venta.model.js#actualizarEstado`<br>`venta.model.js#buscarPorPayuOrderId`<br>`venta.model.js#buscarPorReferenciaExterna` | detalle_venta, inventario, usuarios, ventas |

### /api/reclamaciones

| Método | Ruta | Middleware | Controlador | Modelos / servicios | Tablas |
|---|---|---|---|---|---|
| POST | `/api/reclamaciones` | reclamacionLimiter | controllers/reclamacion.controller.js#registrar | `empresa.model.js#obtenerEmpresa`<br>`reclamacion.model.js#crear` | empresa, reclamaciones |
| GET | `/api/reclamaciones` | JWT + rol:administrador | controllers/reclamacion.controller.js#listar | `reclamacion.model.js#listar` | reclamaciones |
| GET | `/api/reclamaciones/resumen` | JWT + rol:administrador | controllers/reclamacion.controller.js#resumen | `reclamacion.model.js#resumen` | reclamaciones |
| GET | `/api/reclamaciones/:id` | JWT + rol:administrador | controllers/reclamacion.controller.js#obtener | `reclamacion.model.js#obtener` | reclamaciones |
| PUT | `/api/reclamaciones/:id/respuesta` | JWT + rol:administrador | controllers/reclamacion.controller.js#responder | `empresa.model.js#obtenerEmpresa`<br>`historial.model.js#crear`<br>`reclamacion.model.js#responder` | empresa, historial_operaciones, reclamaciones |

### /api/reportes

| Método | Ruta | Middleware | Controlador | Modelos / servicios | Tablas |
|---|---|---|---|---|---|
| GET | `/api/reportes/resumen` | JWT + rol:administrador | controllers/reporte.controller.js#obtenerResumenGeneral | `reporte.model.js#obtenerResumenGeneral` | autores, categorias, inventario, libros, reservas, usuarios, ventas |
| GET | `/api/reportes/libros-mas-vendidos` | JWT + rol:administrador | controllers/reporte.controller.js#obtenerLibrosMasVendidos | `reporte.model.js#obtenerLibrosMasVendidos` | detalle_venta, libros, ventas |
| GET | `/api/reportes/ventas-por-estado` | JWT + rol:administrador | controllers/reporte.controller.js#obtenerVentasPorEstado | `reporte.model.js#obtenerVentasPorEstado` | ventas |
| GET | `/api/reportes/reservas-por-estado` | JWT + rol:administrador | controllers/reporte.controller.js#obtenerReservasPorEstado | `reporte.model.js#obtenerReservasPorEstado` | reservas |
| GET | `/api/reportes/stock-bajo` | JWT + rol:administrador | controllers/reporte.controller.js#obtenerStockBajo | `reporte.model.js#obtenerStockBajo` | inventario, libros |
| GET | `/api/reportes/ventas-por-mes` | JWT + rol:administrador | controllers/reporte.controller.js#obtenerVentasPorMes | `reporte.model.js#obtenerVentasPorMes` | ventas |
| GET | `/api/reportes/ventas-por-dia` | JWT + rol:administrador | controllers/reporte.controller.js#obtenerVentasPorDia | `reporte.model.js#obtenerVentasPorDia` | ventas |
| GET | `/api/reportes/indicadores-ventas` | JWT + rol:administrador | controllers/reporte.controller.js#obtenerIndicadoresVentas | `reporte.model.js#obtenerIndicadoresVentas` | ventas |
| GET | `/api/reportes/cierre-caja` | JWT + rol:administrador | controllers/reporte.controller.js#obtenerCierreCaja | `reporte.model.js#obtenerCierreCaja` | comprobantes, usuarios, ventas |

### /api/reservas

| Método | Ruta | Middleware | Controlador | Modelos / servicios | Tablas |
|---|---|---|---|---|---|
| GET | `/api/reservas/mis-reservas` | JWT | controllers/reserva.controller.js#obtenerMisReservas | `reserva.model.js#obtenerPorUsuario` | libros, reservas |
| POST | `/api/reservas` | JWT | controllers/reserva.controller.js#crearReserva | `historial.model.js#crear`<br>`reserva.model.js#crear`<br>`reserva.model.js#fechaVencimientoDefecto`<br>`reserva.model.js#obtenerPorId`<br>`reserva.model.js#validarFechaVencimiento` | historial_operaciones, inventario, libros, reservas, usuarios |
| DELETE | `/api/reservas/:id` | JWT | controllers/reserva.controller.js#cancelarReserva | `historial.model.js#crear`<br>`reserva.model.js#actualizarEstado`<br>`reserva.model.js#obtenerPorId`<br>`venta.model.js#crear` | detalle_venta, historial_operaciones, inventario, libros, reservas, usuarios, ventas |
| GET | `/api/reservas` | JWT + rol:administrador | controllers/reserva.controller.js#obtenerReservas | `reserva.model.js#obtenerTodos` | libros, reservas, usuarios |
| GET | `/api/reservas/:id` | JWT | controllers/reserva.controller.js#obtenerReserva | `reserva.model.js#obtenerPorId` | libros, reservas, usuarios |
| PUT | `/api/reservas/:id/estado` | JWT + rol:administrador | controllers/reserva.controller.js#actualizarEstado | `historial.model.js#crear`<br>`reserva.model.js#actualizarEstado`<br>`reserva.model.js#obtenerPorId`<br>`venta.model.js#crear` | detalle_venta, historial_operaciones, inventario, libros, reservas, usuarios, ventas |

### /api/ubicaciones

| Método | Ruta | Middleware | Controlador | Modelos / servicios | Tablas |
|---|---|---|---|---|---|
| GET | `/api/ubicaciones/provincias` | JWT | controllers/ubicacion.controller.js#listarProvincias | `ubicacion.model.js#obtenerProvincias` | provincias_lima |
| GET | `/api/ubicaciones/provincias/:id_provincia/distritos` | JWT | controllers/ubicacion.controller.js#listarDistritos | `ubicacion.model.js#obtenerDistritosPorProvincia` | distritos_lima |
| PUT | `/api/ubicaciones/distritos/:id` | JWT + rol:administrador | controllers/ubicacion.controller.js#actualizarTarifaDistrito | `historial.model.js#crear`<br>`ubicacion.model.js#actualizarTarifaDistrito`<br>`ubicacion.model.js#esDistritoDeLima`<br>`ubicacion.model.js#existeDistrito` | distritos_lima, historial_operaciones, provincias_lima |

### /api/usuarios

| Método | Ruta | Middleware | Controlador | Modelos / servicios | Tablas |
|---|---|---|---|---|---|
| GET | `/api/usuarios` | JWT + rol:administrador | controllers/usuario.controller.js#listarUsuarios | `usuario.model.js#listarConCompras`<br>`usuario.model.js#listarTodos` | usuarios, ventas |
| GET | `/api/usuarios/perfil` | JWT | controllers/usuario.controller.js#obtenerPerfil | `usuario.model.js#buscarPorId` | usuarios |
| PUT | `/api/usuarios/perfil` | JWT | controllers/usuario.controller.js#actualizarPerfil | `usuario.model.js#actualizarPerfil`<br>`usuario.model.js#buscarPorId`<br>`usuario.model.js#existeEmail` | usuarios |
| PUT | `/api/usuarios/foto` | JWT + uploadPerfil(foto) | controllers/usuario.controller.js#subirFotoPerfil | `usuario.model.js#actualizarFotoPerfil`<br>`usuario.model.js#buscarPorId` | usuarios |
| PUT | `/api/usuarios/password` | JWT | controllers/usuario.controller.js#cambiarPassword | `usuario.model.js#actualizarPassword`<br>`usuario.model.js#buscarPorIdConPassword` | usuarios |
| DELETE | `/api/usuarios/cuenta` | JWT | controllers/usuario.controller.js#eliminarMiCuenta | `historial.model.js#crear`<br>`usuario.model.js#buscarPorIdConPassword`<br>`usuario.model.js#eliminarCuenta` | favoritos, historial_operaciones, inventario, reservas, usuarios, ventas |
| PATCH | `/api/usuarios/:id` | JWT + rol:administrador | controllers/usuario.controller.js#adminUpdateUsuario | `usuario.model.js#actualizarEstadoRol`<br>`usuario.model.js#buscarPorId` | usuarios |

### /api/ventas

| Método | Ruta | Middleware | Controlador | Modelos / servicios | Tablas |
|---|---|---|---|---|---|
| GET | `/api/ventas/mis-ventas` | JWT | controllers/venta.controller.js#obtenerMisVentas | `venta.model.js#obtenerPorUsuario` | agencias_courier, comprobantes, detalle_venta, distritos_lima, libros, provincias_lima, ventas |
| POST | `/api/ventas` | JWT + rol:administrador | controllers/venta.controller.js#crearVenta | `historial.model.js#crear`<br>`ubicacion.model.js#esDistritoDeLima`<br>`ubicacion.model.js#existeDistrito`<br>`venta.model.js#crear` | detalle_venta, distritos_lima, historial_operaciones, inventario, libros, provincias_lima, ventas |
| GET | `/api/ventas` | JWT + rol:administrador | controllers/venta.controller.js#obtenerVentas | `venta.model.js#obtenerTodos` | agencias_courier, comprobantes, distritos_lima, provincias_lima, usuarios, ventas |
| GET | `/api/ventas/:id` | JWT | controllers/venta.controller.js#obtenerVenta | `venta.model.js#obtenerPorId` | agencias_courier, comprobantes, detalle_venta, distritos_lima, libros, provincias_lima, usuarios, ventas |
| GET | `/api/ventas/:id/pago` | JWT | controllers/venta.controller.js#obtenerPagoVenta | `venta.model.js#obtenerDatosPago` | ventas |
| PUT | `/api/ventas/:id/estado` | JWT + rol:administrador | controllers/venta.controller.js#actualizarEstadoVenta | `historial.model.js#crear`<br>`venta.model.js#actualizarEstado`<br>`venta.model.js#obtenerPorId` | agencias_courier, comprobantes, detalle_venta, distritos_lima, historial_operaciones, inventario, libros, provincias_lima, usuarios, ventas |
| POST | `/api/ventas/:id/reembolso` | JWT + rol:administrador | controllers/venta.controller.js#reembolsarVenta | `historial.model.js#crear`<br>`venta.model.js#reembolsar` | comprobantes, detalle_venta, historial_operaciones, inventario, ventas |
| POST | `/api/ventas/:id/comprobante` | JWT + rol:administrador | controllers/comprobante.controller.js#generarComprobante | `comprobante.model.js#generarComprobante` | comprobantes, ventas |

## Modelos y tablas

| Modelo | Tablas que consulta o modifica |
|---|---|
| `models/agencia.model.js` | agencias_courier |
| `models/autor.model.js` | autores |
| `models/categoria.model.js` | categorias |
| `models/cliente.model.js` | usuarios, ventas |
| `models/comprobante.model.js` | comprobantes, detalle_venta, libros, usuarios, ventas |
| `models/empresa.model.js` | empresa |
| `models/favorito.model.js` | autores, categorias, favoritos, inventario, libros |
| `models/historial.model.js` | historial_operaciones, usuarios |
| `models/inventario.model.js` | inventario, libros, movimientos_inventario, usuarios |
| `models/libro.model.js` | autores, categorias, inventario, libros |
| `models/pago.model.js` | ventas |
| `models/reclamacion.model.js` | reclamaciones |
| `models/reporte.model.js` | autores, categorias, comprobantes, detalle_venta, inventario, libros, reservas, usuarios, ventas |
| `models/reserva.model.js` | inventario, libros, reservas, usuarios |
| `models/ubicacion.model.js` | distritos_lima, provincias_lima |
| `models/usuario.model.js` | favoritos, inventario, reservas, usuarios, ventas |
| `models/venta.model.js` | agencias_courier, comprobantes, detalle_venta, distritos_lima, inventario, libros, provincias_lima, usuarios, ventas |

Tablas presentes en el código (17): `agencias_courier`, `autores`, `categorias`, `comprobantes`, `detalle_venta`, `distritos_lima`, `empresa`, `favoritos`, `historial_operaciones`, `inventario`, `libros`, `movimientos_inventario`, `provincias_lima`, `reclamaciones`, `reservas`, `usuarios`, `ventas`. El esquema está en `backend/database/schema.sql` + 22 migraciones en `backend/database/migrations`.

## Integraciones externas

| Servicio | Paquete | Dónde | Variables de entorno (sin valores) |
|---|---|---|---|
| PostgreSQL | `pg` | config/database.js | DATABASE_URL o DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT |
| Cloudinary | (API HTTP) | utils/cloudinary.js, upload*.middleware.js | CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET |
| SMTP (correo) | `nodemailer`, `html-pdf-node` | utils/mailer.js | SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM, SMTP_REJECT_UNAUTHORIZED |
| PayU (pagos) | (API HTTP) | services/payu.service.js, config/payu.js | PAYU_ACCOUNT_ID, PAYU_MERCHANT_ID, PAYU_API_LOGIN, PAYU_API_KEY, PAYU_PUBLIC_KEY, PAYU_TEST, PAYU_NOTIFICATION_URL |
| TOTP 2FA | `otplib`, `qrcode` | controllers/auth2fa.controller.js | TWO_FACTOR_ENCRYPTION_KEY |
| JWT | `jsonwebtoken` | auth.middleware.js, auth*.controller.js | JWT_SECRET |

## Observaciones

- ⚠️ `GET /api/debug-egress` es **público** (sin JWT) y abre conexiones TCP a los puertos SMTP. Posiblemente no utilizado.
- La pasarela de pagos (`/api/pagos`) es **PayU**.
- `GET /api/test-db` responde "Conexión con MySQL exitosa"; funciona (el adaptador devuelve `[rows]`), solo el texto está desactualizado.
- Endpoints sin cliente: ver la sección correspondiente en `05-API-MAP.md`.
- Scripts auxiliares (no forman parte del servidor): `scripts/migrarImagenesCloudinary.js`, `scripts/resetearPrecios.js`, `run_migration_021.js`, `_test_smtp.js` (sin seguimiento en git).
- Pruebas: `test/*.test.js` (node --test) y `test-integration/http.smoke.test.js`.
