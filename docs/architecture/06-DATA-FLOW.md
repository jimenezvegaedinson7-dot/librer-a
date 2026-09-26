# Flujos de datos

> Generado desde el código real el 2026-09-26 con `docs/architecture/tools/actualizar-mapa.mjs`.
> No contiene secretos: solo nombres de variables de entorno.

## Arquitectura general

```
                PostgreSQL (16 tablas)
                       ↑
          Backend Node/Express (Render)
         /api/*  ·  JWT  ·  PayU  ·  SMTP  ·  Cloudinary
               ↗                        ↖
   React Admin (Vercel)            Flutter Android (clientes)
   rol administrador               rol cliente
```

## 1. Login (React y Flutter)
1. Cliente → `POST /api/auth/login` → `usuario.model.js#buscarPorEmail` → tablas: usuarios.
2. Sin 2FA: respuesta `{ token (24 h), data }`. React guarda en `localStorage` (AuthContext); Flutter en **flutter_secure_storage**.
3. Con 2FA: respuesta `{ requires_2fa, two_factor_token (5 min) }` → `POST /api/auth/2fa/verify-login` → `usuario.model.js#buscarPorIdConPassword`, `usuario.model.js#obtenerSecreto2FA` → tablas: usuarios.
4. React exige `rol === 'administrador'`; Flutter rechaza administradores.
5. Cualquier 401 posterior: React limpia sesión y va a `/`; Flutter limpia sesión y `irALogin()`.

## 2. Recuperar contraseña
`POST /api/auth/solicitar-reseteo` → `usuario.model.js#buscarPorEmail`, `usuario.model.js#guardarCodigoVerificacion` → tablas: usuarios (envía código por correo con `utils/mailer`) → `POST /api/auth/reestablecer-contrasena` → `usuario.model.js#actualizarPassword`, `usuario.model.js#buscarPorEmail`, `usuario.model.js#limpiarCodigoVerificacion` → tablas: usuarios.

## 3. Venta desde el panel (React, administrador)
1. `VentaForm` → `POST /api/ventas` → `historial.model.js#crear`, `ubicacion.model.js#esDistritoDeLima`, `ubicacion.model.js#existeDistrito`, `venta.model.js#crear` → tablas: detalle_venta, distritos_lima, historial_operaciones, inventario, libros, provincias_lima, ventas.
2. Cambio de estado: `VentaEstadoModal` → `PUT /api/ventas/:id/estado` → `historial.model.js#crear`, `venta.model.js#actualizarEstado`, `venta.model.js#obtenerPorId` → tablas: agencias_courier, comprobantes, detalle_venta, distritos_lima, historial_operaciones, inventario, libros, provincias_lima, usuarios, ventas (transiciones validadas en `utils/transiciones.js`; al entregar se envía correo).
3. Comprobante: `EmitirComprobanteModal` → `POST /api/ventas/:id/comprobante` → `comprobante.model.js#generarComprobante` → tablas: comprobantes, ventas; envío: `POST /api/comprobantes/:id/enviar-email` → `comprobante.model.js#obtenerComprobante`, `empresa.model.js#obtenerEmpresa` → tablas: comprobantes, empresa, usuarios, ventas.

## 4. Compra desde la app (Flutter, cliente) con PayU
1. Carrito local (`CarritoService`) → `EntregaYPagoScreen` obtiene provincias/distritos y agencias activas.
2. `POST /api/pagos/crear-orden` → `payu.service.js#crearOrden`, `ubicacion.model.js#esDistritoDeLima`, `ubicacion.model.js#existeDistrito`, `usuario.model.js#buscarPorId`, `venta.model.js#crear` → tablas: detalle_venta, distritos_lima, inventario, libros, provincias_lima, usuarios, ventas con clave de **idempotencia**; devuelve `checkout_url`.
3. La app abre `checkout_url` (`GET /api/pagos/checkout/:externalReference` → `payu.service.js#construirFormularioCheckout`, `venta.model.js#buscarPorReferenciaExterna` → tablas: ventas) que auto-envía el formulario a PayU.
4. PayU notifica: `POST /api/pagos/webhook` → `usuario.model.js#buscarPorId`, `venta.model.js#actualizarDatosPago`, `venta.model.js#actualizarEstado`, `venta.model.js#buscarPorReferenciaExterna` → tablas: detalle_venta, inventario, usuarios, ventas. Retorno del navegador: `GET /api/pagos/respuesta/:externalReference`.
5. La app consulta `GET /api/pagos/:orderId` → `payu.service.js#obtenerOrdenDiagnostico`, `usuario.model.js#buscarPorId`, `venta.model.js#actualizarDatosPago`, `venta.model.js#actualizarEstado`, `venta.model.js#buscarPorPayuOrderId`, `venta.model.js#buscarPorReferenciaExterna` → tablas: detalle_venta, inventario, usuarios, ventas y lista `GET /api/ventas/mis-ventas` → `venta.model.js#obtenerPorUsuario` → tablas: agencias_courier, comprobantes, detalle_venta, distritos_lima, libros, provincias_lima, ventas.
6. El job `jobs/limpieza.js` cancela ventas abandonadas cada 5 min.

## 5. Reservas
- Cliente (Flutter) crea: `POST /api/reservas` → `historial.model.js#crear`, `reserva.model.js#crear`, `reserva.model.js#fechaVencimientoDefecto`, `reserva.model.js#obtenerPorId`, `reserva.model.js#validarFechaVencimiento` → tablas: historial_operaciones, inventario, libros, reservas, usuarios; cancela: `DELETE /api/reservas/:id` → `historial.model.js#crear`, `reserva.model.js#actualizarEstado`, `reserva.model.js#obtenerPorId`, `venta.model.js#crear` → tablas: detalle_venta, historial_operaciones, inventario, libros, reservas, usuarios, ventas.
- Administrador (React) cambia estado: `PUT /api/reservas/:id/estado` → `historial.model.js#crear`, `reserva.model.js#actualizarEstado`, `reserva.model.js#obtenerPorId`, `venta.model.js#crear` → tablas: detalle_venta, historial_operaciones, inventario, libros, reservas, usuarios, ventas.
- El job cancela reservas vencidas cada 5 min (`reservaModel.cancelarVencidas`).

## 6. Catálogo e inventario
- Lectura pública compartida: `GET /api/libros` → `libro.model.js#obtenerTodos` → tablas: autores, categorias, inventario, libros.
- Alta de libro (React): `POST /api/libros` → `historial.model.js#crear`, `inventario.model.js#crear`, `inventario.model.js#obtenerPorLibro`, `libro.model.js#crear`, `libro.model.js#eliminar` → tablas: historial_operaciones, inventario, libros (multer + Cloudinary/disco).
- Inventario (React): `PUT /api/inventario/libro/:id` → `historial.model.js#crear`, `inventario.model.js#actualizar`, `inventario.model.js#obtenerPorLibro` → tablas: historial_operaciones, inventario, libros; kardex: `GET /api/inventario/movimientos` → `inventario.model.js#listarMovimientos` → tablas: libros, movimientos_inventario, usuarios.

## 7. Resumen / reportes (React)
`DashboardPage` → 8 endpoints `/api/reportes/*` + `GET /api/libros` → `reporte.model` (consultas agregadas sobre ventas, detalle_venta, reservas, inventario, libros…).

## 8. Auditoría
Las operaciones de escritura registran en `historial_operaciones` (`historial.model#crear`). El panel lo lee con `GET /api/historial` (página Historial y notificaciones del Topbar cada 30 s).
