# Librería Secure iOS — Fase 5

Base nativa en Swift/SwiftUI para una aplicación **complementaria** de seguridad, confirmación y seguimiento. La aplicación Flutter continúa siendo la aplicación principal.

## Requisitos para compilar posteriormente

- macOS con Xcode 15 o posterior.
- iOS 17 o posterior (se usa `NavigationStack` y `ContentUnavailableView`).
- Crear un target iOS App llamado `LibreriaSecureApp` y añadir `App/`, `Core/`, `Models/`, `Services/`, `ViewModels/`, `Views/`, `Components/` y `Utilities/` al target.
- Crear un target XCTest y añadir los archivos de `Tests/`.
- Copiar las claves necesarias de `Configuration/Info.plist.example` al `Info.plist` generado por Xcode. No usar el archivo de ejemplo como un segundo Info.plist del target.

No se generó manualmente un `.xcodeproj` porque no puede validarse de forma fiable desde Windows. Tampoco se añadieron dependencias externas.

## Configuración de API

La URL se resuelve en este orden:

1. Variable de entorno de esquema `LIBRERIA_API_BASE_URL`.
2. Clave `LibreriaAPIBaseURL` del `Info.plist`.
3. Fallback de producción: `https://libreria-api-v9h0.onrender.com`.

No hay credenciales, tokens ni secretos en el repositorio. El JWT definitivo se almacena exclusivamente en Keychain con accesibilidad `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`. El `two_factor_token` temporal permanece solo en memoria durante el flujo de login.

La única información guardada en `UserDefaults` es la preferencia booleana no sensible `security.biometricLockEnabled`. Nunca se escriben allí JWT, contraseñas, OTP/TOTP ni tokens temporales.

## Alcance implementado

- Arranque con estados excluyentes `loading`, `unauthenticated`, `locked`, `recoverableFailure` y `authenticated`.
- Login de correo/contraseña y verificación de login 2FA.
- Restricción de acceso al rol `cliente` tanto en login como en restauración.
- Cliente HTTP único con `URLSession`, `async/await`, JSON, Bearer token, timeouts y errores HTTP/API.
- Coordinación global de HTTP 401: elimina el JWT y vuelve al login sin crear otra sesión HTTP.
- Servicios de solo consulta para perfil, compras, reservas, estados de pago e historial.
- Modelos `Codable` con números, booleanos y fechas flexibles.
- Normalización documentada de `detalle` y `detalles` a `Purchase.details`.
- Keychain para el JWT definitivo.
- Bloqueo local real mediante Face ID o Touch ID y `LocalAuthentication`.
- Activación de la preferencia biométrica únicamente después de una evaluación exitosa.
- Bloqueo al abandonar foreground sin prompts automáticos repetidos.
- Recuperación ante conectividad/5xx con reintento y cierre de sesión, conservando el JWT.
- Inicio real con resumen y listas recientes obtenidas exclusivamente del backend del usuario autenticado.
- Módulo de consulta de compras propias con listado y un único detalle reutilizado desde Inicio y Mis compras.
- Módulo de consulta de reservas propias con listado y un único detalle reutilizado desde Inicio y Mis reservas.
- Carga concurrente e independiente de compras, reservas y actividad; un fallo parcial no oculta las otras secciones.
- Pull to refresh explícito, reintento general y reintento por sección sin auto-reintentos.
- Navegación temporal desde **Ver todas** hacia los placeholders de Compras y Reservas.
- Pruebas XCTest preparadas para decodificación, seguridad y estados del `HomeViewModel`.

## Flujo biométrico y de sesión

1. Si no hay JWT, se muestra el login normal/2FA.
2. Si existe JWT y la preferencia biométrica está activa, se presenta una pantalla bloqueada sin lanzar automáticamente el prompt.
3. El usuario pulsa **Desbloquear** y completa Face ID/Touch ID.
4. Solo después del desbloqueo se consulta `GET /api/usuarios/perfil` para validar el JWT y el rol `cliente`.
5. Al pasar a estado inactive/background, una sesión autenticada vuelve a quedar bloqueada.
6. Un HTTP 401 elimina el JWT y devuelve al login. Los errores de red, 429 y 5xx mantienen el JWT y presentan opciones de reintento o cierre de sesión.

Face ID/Touch ID es exclusivamente un bloqueo local. No sustituye contraseña, login, TOTP ni validación del backend.

## Inicio de Fase 3

El Inicio usa el mismo `APIClient`, la misma `URLSession` y el mismo `SessionExpirationCoordinator` de la sesión:

- `GET /api/historial/mi-historial`
- `GET /api/ventas/mis-ventas`
- `GET /api/reservas/mis-reservas`

Las tres consultas comienzan concurrentemente y cada resultado se procesa de forma aislada. Los estados globales son `idle`, `loading`, `loaded`, `empty`, `partialFailure` y `error`; además, cada sección dispone de loading, datos, vacío, error y reintento propio.

Las listas se ordenan por su fecha real descendente. Los elementos sin fecha quedan al final conservando su orden de respuesta. Las tarjetas usan los conteos completos, mientras que cada lista visual muestra como máximo tres elementos recientes. No se generan estadísticas, actividades ni estados ficticios.

Un 401 sigue siendo gestionado exclusivamente por el coordinador global de Fase 2. Un 429, un fallo de conectividad o un 5xx se muestran como recuperables y no provocan cierre de sesión desde `HomeViewModel`.

Los formatters compartidos generan moneda PEN y fechas legibles sin crear `NumberFormatter` o `DateFormatter` por fila. El acceso a estos formatters está sincronizado.

## Compras de Fase 4

El módulo usa exclusivamente estos endpoints existentes:

- `GET /api/ventas/mis-ventas`
- `GET /api/ventas/:id`
- `GET /api/ventas/:id/pago`
- `GET /api/pagos/:orderId` solo cuando `/ventas/:id/pago` entrega un `order_id` o `payu_order_id` no vacío.

Los IDs navegables proceden únicamente de las respuestas de compras propias. No existe entrada manual de IDs. El listado conserva datos anteriores si un refresh falla y ordena por `fecha_venta` descendente, dejando fechas ausentes al final de forma estable.

El detalle muestra resumen, productos, consulta de pago, entrega y estado de comprobante. No solicita comprobantes, libros, portadas, tracking ni URLs privadas. El subtotal solo se muestra cuando existen productos y se calcula sumando los `subtotal` reales del detalle.

### Presentación de estados confirmados en backend

- Venta: `pendiente`, `pagada`, `entregada`, `cancelada`.
- Entrega: `tienda`, `domicilio`, `agencia`.
- Pago aprobado: `APPROVED`.
- Pago pendiente: `PENDING`, `PENDING_TRANSACTION_REVIEW`, `PENDING_TRANSACTION_CONFIRMATION`.
- Otros estados conocidos: `DECLINED`, `ERROR`, `EXPIRED`, `VOIDED`, `REFUNDED`, `CHARGED_BACK`, `UNKNOWN`.

La prioridad del estado de pago es: `PaymentStatus.payment_status`, `PaymentStatus.status`, `PaymentStatus.order_status`, `SalePayment.estado_pago`, `SalePayment.payu_payment_status` y finalmente `Purchase.payu_payment_status`. `estado_venta` nunca se usa para inferir que un pago fue aprobado. Los valores desconocidos conservan su texto original y presentación neutral.

Un fallo al consultar pago no oculta el detalle de compra ya cargado. Un 404 legítimo en datos de pago se presenta como información no disponible; los demás errores tienen reintento independiente de consulta. No se crea, reintenta ni modifica ningún pago.

## Reservas de Fase 5

El módulo usa únicamente:

- `GET /api/reservas/mis-reservas`
- `GET /api/reservas/:id`

Ambos endpoints usan el Bearer y el coordinador global ya configurados en el único `APIClient`. Los IDs navegables proceden exclusivamente de reservas propias obtenidas en Inicio o Mis reservas. No existe entrada manual de IDs ni llamadas administrativas o de escritura.

Los estados reales confirmados en backend son `pendiente`, `confirmada`, `completada` y `cancelada`. La presentación es case-insensitive; un valor desconocido conserva su texto original y se muestra neutralmente.

El listado ordena por `fecha_reserva` descendente y conserva de forma estable las fechas ausentes al final. Un refresh fallido mantiene los datos previos y ofrece reintento sin modificar la sesión.

El detalle muestra únicamente Estado, Libro y Fechas según el contrato real. La fecha de vencimiento se presenta sin hora. El aviso local **La fecha de vencimiento ya pasó** compara el inicio del día de vencimiento con el inicio del día actual usando `Calendar`; no cambia ni reinterpreta el estado de la reserva.

No se consulta el catálogo o el libro por separado y no existen acciones para crear, cancelar o modificar reservas.

## Endpoints preparados

- `POST /api/auth/login`
- `POST /api/auth/2fa/verify-login`
- `GET /api/usuarios/perfil`
- `GET /api/ventas/mis-ventas`
- `GET /api/ventas/:id`
- `GET /api/ventas/:id/pago`
- `GET /api/reservas/mis-reservas`
- `GET /api/reservas/:id`
- `GET /api/pagos/:orderId`
- `GET /api/historial/mi-historial`

## Fuera de alcance de Fase 5

No se implementan creación de venta, carrito, checkout, creación/reintento/reembolso de pago, comprobantes descargables, tracking, APNs, catálogo, administración, creación/cancelación de reservas, publicación, certificados ni provisioning.

## Validación pendiente en macOS

Desde Windows no están disponibles Xcode, los SDK de iOS, Keychain/LocalAuthentication de iOS, simuladores ni la ejecución de XCTest. Deben validarse posteriormente en macOS/Xcode la compilación, navegación compartida al detalle de reserva, pull to refresh, fechas y calendario local, Dynamic Type, VoiceOver y todas las pruebas XCTest.
