# Flujos de datos

> Generado desde el código real el 2026-10-03 con `docs/architecture/tools/actualizar-mapa.mjs`.
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
1. `VentaForm` → `POST /api/ventas` → inline (venta.routes.js) → tablas: —.
2. Cambio de estado: `VentaEstadoModal` → `PUT /api/ventas/:id/estado` → `historial.model.js#crear`, `venta.model.js#actualizarEstado`, `venta.model.js#obtenerPorId` → tablas: agencias_courier, comprobantes, detalle_venta, distritos_lima, historial_operaciones, inventario, libros, provincias_lima, usuarios, ventas (transiciones validadas en `utils/transiciones.js`; al entregar se envía correo).
3. Comprobante: `EmitirComprobanteModal` → `POST /api/ventas/:id/comprobante` → `comprobante.model.js#generarComprobante` → tablas: comprobantes, ventas; envío: `POST /api/comprobantes/:id/enviar-email` → `comprobante.model.js#obtenerComprobante`, `empresa.model.js#obtenerEmpresa` → tablas: comprobantes, empresa, usuarios, ventas.

## 4. Compra desde la app (Flutter, cliente) con PayU
1. Carrito local (`CarritoService`) → `EntregaYPagoScreen` obtiene zonas activas con `GET /api/zonas-delivery`. Solo ofrece recojo gratuito en Pallasca (`tienda`) o delivery local con tarifa por zona (`domicilio`). Sin zonas, el recojo sigue disponible.
2. `POST /api/pagos/crear-orden` → `payu.service.js#crearOrden`, `usuario.model.js#buscarPorId`, `venta.model.js#crear`, `zonaDelivery.model.js#obtenerPorId` → tablas: detalle_venta, inventario, libros, usuarios, ventas, zonas_delivery_pallasca con clave de **idempotencia**; delivery envía `id_zona_delivery`, dirección y referencia opcional. El servidor valida la zona activa y bloquea su tarifa dentro de la transacción. Guarda `cobertura_entrega=pallasca`, el nombre original de zona y `costo_envio`; total = libros + envío. No utiliza ubicaciones Lima para compras nuevas. Devuelve `checkout_url`.
3. La app abre `checkout_url` (`GET /api/pagos/checkout/:externalReference` → `payu.service.js#construirFormularioCheckout`, `venta.model.js#buscarPorReferenciaExterna` → tablas: ventas) que auto-envía el formulario a PayU.
4. PayU notifica: `POST /api/pagos/webhook` → `usuario.model.js#buscarPorId`, `venta.model.js#actualizarDatosPago`, `venta.model.js#actualizarEstado`, `venta.model.js#buscarPorReferenciaExterna` → tablas: detalle_venta, inventario, usuarios, ventas. Retorno del navegador: `GET /api/pagos/respuesta/:externalReference`.
5. La app consulta `GET /api/pagos/:orderId` → `payu.service.js#obtenerOrdenDiagnostico`, `usuario.model.js#buscarPorId`, `venta.model.js#actualizarDatosPago`, `venta.model.js#actualizarEstado`, `venta.model.js#buscarPorPayuOrderId`, `venta.model.js#buscarPorReferenciaExterna` → tablas: detalle_venta, inventario, usuarios, ventas y lista `GET /api/ventas/mis-ventas` → `venta.model.js#obtenerPorUsuario` → tablas: agencias_courier, comprobantes, detalle_venta, distritos_lima, libros, provincias_lima, ventas.
6. El job `jobs/limpieza.js` revisa ventas abandonadas cada 5 min; consulta PayU antes de liberar stock y conserva pagos inciertos/pendientes.
7. Administración: `TarifasEnvioPage` usa `GET /api/zonas-delivery/todos`, `POST /api/zonas-delivery`, `PUT /api/zonas-delivery/:id`. Se configura nombre, tarifa positiva y estado; no hay semillas ni eliminación. La migración `032_cobertura_pallasca.sql` agrega columnas NULL sin reescribir ventas. El panel y Flutter muestran Pallasca solo con la marca explícita; las ubicaciones, courier e importes legacy se conservan.

### Compra desde la web (React, cliente)
- `PublicLayout` incorpora `TiendaProvider`; rutas `/cuenta`, `/carrito`, `/checkout`, `/mis-compras`, `/libro/:id`. Catálogo, portada y ofertas permiten agregar libros al carrito.
- `public-site/tienda/clienteApi.js` usa fetch y sesión `libreria-web-cliente-v1`, independiente de token/usuario del panel. Revalida perfil y rol cliente. Registro y correo verificado, login/2FA y recuperación reutilizan los endpoints existentes.
- Carrito por invitado/usuario con solo IDs y cantidades en localStorage; precios y stock desde el catálogo. Se fusiona el carrito invitado al iniciar sesión. Totales en céntimos.
- `GET /api/pagos/capacidades` confirma compatibilidad del backend antes de crear compras web. Checkout envía `canal_compra=web` a `POST /api/pagos/crear-orden`; `origen=app` sigue identificando el ecommerce para compatibilidad. Migración `033_canal_compra_web.sql`: columna nullable, sin UPDATE de ventas antiguas.
- Antes de crear se refrescan precios, stock y zonas; cambios requieren revisar y confirmar otra vez. El intento y su clave de idempotencia se persisten antes del POST, permitiendo recuperar timeouts sin duplicar ventas ni stock. El backend guarda el total definitivo; el cliente lo muestra antes de abrir el WebCheckout.
- El retorno PayU solo informa y enlaza a `/mis-compras` cuando el canal es web. Nunca confirma pagos por parámetros del navegador. Consulta de pago valida propietario e importe antes de sincronizar; webhook firmado confirma pago. El carrito retira solo las cantidades realmente pagadas, verificadas por la API.
- Panel: pedidos con filtro Web/App y canal en tabla/detalle; ventas, pagos y CSV identifican Web (PayU). Compras web pendientes de pago no pueden avanzar en logística; el modelo verifica también esta regla con el bloqueo de fila.
- Ficha pública `/libro/:id`: amplía `LibroPage` reutilizando `PrecioOferta`, `ComprarLibro`, `Stock` y `TarjetaLibro`. Cantidad opcional en el mismo `TiendaContext.agregar`; Comprar ahora conduce al checkout existente. Datos técnicos disponibles: título, autor, categoría, ISBN, precio, estado y stock; descripción y biografía se conservan sin resumir.
- Descubrimiento: `GET /api/libros/:id/relacionados` consulta el autor y la categoría con los índices existentes y LIMIT 8 por grupo; entrega hasta 4 relacionados, 4 títulos adicionales del autor y 4 de categoría, sin duplicados. Solo libros activos, disponibilidad real y el mismo precio SQL del catálogo. La entrada directa a una ficha no carga el catálogo completo. Autor interactivo filtra `/catalogo?autor=:id`.
- Favoritos de la ficha usan GET/POST/DELETE `/api/favoritos/:idLibro` con la sesión cliente y ownership JWT existentes; no hay persistencia nueva. Sin sesión, Cuenta permite retorno interno al libro. Compartir usa Web Share API o copiar enlace/WhatsApp/Facebook. SEO amplía los metadatos existentes y genera Book/Product con datos reales. No modifica pagos, inventario ni migraciones.

## 5. Reservas
- Cliente (Flutter) crea: `POST /api/reservas` → `historial.model.js#crear`, `reserva.model.js#crear`, `reserva.model.js#fechaVencimientoDefecto`, `reserva.model.js#obtenerPorId`, `reserva.model.js#validarFechaVencimiento` → tablas: historial_operaciones, inventario, libros, reservas, usuarios; cancela: `DELETE /api/reservas/:id` → `historial.model.js#crear`, `reserva.model.js#actualizarEstado`, `reserva.model.js#obtenerPorId`, `venta.model.js#crear` → tablas: detalle_venta, historial_operaciones, inventario, libros, reservas, usuarios, ventas.
- Administrador (React) cambia estado: `PUT /api/reservas/:id/estado` → `historial.model.js#crear`, `reserva.model.js#actualizarEstado`, `reserva.model.js#obtenerPorId`, `venta.model.js#crear` → tablas: detalle_venta, historial_operaciones, inventario, libros, reservas, usuarios, ventas.
- El job cancela reservas vencidas cada 5 min (`reservaModel.cancelarVencidas`).

## 6. Catálogo e inventario
- Lectura pública compartida: `GET /api/libros` → `libro.model.js#obtenerTodos` → tablas: autores, categorias, detalle_venta, inventario, libros, ventas.
- Alta de libro (React): `POST /api/libros` → `autor.model.js#obtenerPorId`, `categoria.model.js#obtenerPorId`, `historial.model.js#crear`, `inventario.model.js#crear`, `inventario.model.js#obtenerPorLibro`, `libro.model.js#crear`, `libro.model.js#eliminar` → tablas: autores, categorias, historial_operaciones, inventario, libros (multer + Cloudinary/disco).
- Inventario (React): `PUT /api/inventario/libro/:id` → `historial.model.js#crear`, `inventario.model.js#actualizar`, `inventario.model.js#obtenerPorLibro` → tablas: historial_operaciones, inventario, libros; kardex: `GET /api/inventario/movimientos` → `inventario.model.js#listarMovimientos` → tablas: libros, movimientos_inventario, usuarios.

## 7. Resumen / reportes (React)
`DashboardPage` → 8 endpoints `/api/reportes/*` + `GET /api/libros` → `reporte.model` (consultas agregadas sobre ventas, detalle_venta, reservas, inventario, libros…).

## 8. Auditoría
Las operaciones de escritura registran en `historial_operaciones` (`historial.model#crear`). El panel lo lee con `GET /api/historial` (página Historial y notificaciones del Topbar cada 30 s).
