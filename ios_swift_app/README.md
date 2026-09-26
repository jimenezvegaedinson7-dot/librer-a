# Librería del Saber — iOS (SwiftUI)

App nativa en Swift/SwiftUI para clientes, con las mismas funciones que la app Flutter (`flutter_app/`): catálogo, detalle, favoritos, carrito, checkout con PayU, reservas, compras, cuenta, temas de color, registro, recuperación de contraseña y 2FA. No usa Flutter ni dependencias externas.

## Paridad con Flutter

| Flutter | iOS |
|---|---|
| Inicio (banner, categorías, carruseles) | `Views/Store/StoreHomeView.swift` |
| Catálogo (búsqueda, categorías, orden, estado) | `Views/Store/CatalogView.swift` |
| Detalle del libro, favorito, reservar, añadir | `Views/Store/BookDetailView.swift` |
| Carrito (cantidades con tope de stock, guardar para después, resumen en céntimos) | `Views/Store/CartView.swift`, `Services/CartStore.swift` |
| Entrega y pago (Lima a domicilio o recojo en tienda, DNI/RUC/CE, PayU) | `Views/Store/CheckoutView.swift` |
| Favoritos | `Views/Store/FavoritesView.swift` |
| Mis reservas (cancelar) y Mis compras (continuar pago y verificar) | `Views/Store/MyReservationsView.swift`, `Views/Purchases/` |
| Perfil, 35 temas y degradado propio (`custom_AABBCC_DDEEFF`), seguridad, legal | `Views/Account/AccountView.swift`, `Views/Account/CustomThemeSheet.swift` |
| Foto de perfil: elegir avatar, subir imagen o tomar foto (máx. 5 MB) | `Views/Account/ProfilePhotoActions.swift` |
| Editar perfil, cambiar contraseña, 2FA, Términos, Privacidad | `Views/Account/AccountForms.swift` |
| Login, registro, verificar correo y recuperar contraseña (reenvío con espera de 60 s) | `Views/Authentication/LoginView.swift` |
| Splash, logo, estantería animada, balda de carga y pulsación | `App/RootView.swift`, `Design/Bookshelf.swift` |

Diferencias deliberadas:

- **Sin actualizador de APK**: en iOS las actualizaciones se distribuyen por App Store o TestFlight. `GET /api/app/version` no se usa.
- **PayU**: la URL de pago se abre en Safari. Al volver, el usuario pulsa **Verificar pago**, que consulta `GET /api/pagos/:orderId`.
- **Face ID / Touch ID**: bloqueo local opcional heredado de la base anterior.

El carrito (`carrito_v1`, ligado al id del usuario) y el tema (`perfil_tema`) se guardan en `UserDefaults`. Ninguno de los dos contiene datos sensibles.

## Abrir y compilar en Xcode

Requisitos: un Mac con **Xcode 16 o posterior** (el proyecto usa carpetas sincronizadas) y un iPhone con **iOS 17 o posterior**.

1. Copia la carpeta `ios_swift_app` al Mac (o clona el repositorio).
2. Abre `LibreriaSecureApp.xcodeproj` con doble clic.
3. En el panel izquierdo selecciona el proyecto **LibreriaSecureApp** → target **LibreriaSecureApp** → pestaña **Signing & Capabilities**.
4. Deja marcado **Automatically manage signing** y en **Team** elige tu Apple ID (si no aparece: **Add Account…**). Una cuenta gratuita sirve; la app firmada así caduca a los 7 días.
5. Si Xcode dice que el **Bundle Identifier** no está disponible, cámbialo por uno propio, por ejemplo `com.tunombre.libreriadelsaber`.
6. Arriba elige el destino (**iPhone 15** del simulador o tu iPhone conectado) y pulsa **▶ Run** (`Cmd+R`).
7. Para las pruebas: **Product → Test** (`Cmd+U`).
8. En un iPhone real con cuenta gratuita: **Ajustes → General → VPN y gestión de dispositivos → tu Apple ID → Confiar**, y activar **Ajustes → Privacidad y seguridad → Modo de desarrollador**.

Qué contiene el proyecto:

| Elemento | Detalle |
|---|---|
| Target `LibreriaSecureApp` | App iPhone, iOS 17, Swift 5, orientación vertical, nombre visible "Librería del Saber" |
| Target `LibreriaSecureAppTests` | XCTest con `Tests/` (usa la app como host) |
| Carpetas sincronizadas | `App`, `Components`, `Content`, `Core`, `Design`, `Models`, `Resources`, `Services`, `Utilities`, `ViewModels`, `Views`; cualquier `.swift` nuevo en ellas entra solo al target |
| `Resources/Assets.xcassets` | Icono de la app (1024×1024, sin transparencia), logo `Logo` (el mismo de Flutter) y color de acento burdeos |
| `Configuration/Info.plist` | `LibreriaAPIBaseURL` y los textos de permiso de cámara y Face ID; Xcode genera el resto del Info.plist |
| Esquema compartido | `LibreriaSecureApp` con Run, Test y Archive |

Bundle ID por defecto: `com.edinsonjimenez.libreriadelsaber`. No hay certificados, perfiles ni equipo de firma en el repositorio: cada persona elige su **Team** en Xcode.

## Configuración de API

La URL se resuelve en este orden:

1. Variable de entorno de esquema `LIBRERIA_API_BASE_URL`.
2. Clave `LibreriaAPIBaseURL` del `Info.plist`.
3. Fallback de producción: `https://libreria-api-v9h0.onrender.com`.

No hay credenciales, tokens ni secretos en el repositorio. El JWT definitivo se almacena exclusivamente en Keychain con accesibilidad `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`. El `two_factor_token` temporal permanece solo en memoria durante el flujo de login.

`UserDefaults` guarda solo datos no sensibles: `security.biometricLockEnabled`, `perfil_tema` y `carrito_v1`. Nunca se escriben allí JWT, contraseñas, OTP/TOTP ni tokens temporales.

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
- `POST /api/auth/registro`, `POST /api/auth/verificar-email`, `POST /api/auth/reenviar-codigo`
- `POST /api/auth/solicitar-reseteo`, `POST /api/auth/reestablecer-contrasena`
- `POST /api/auth/2fa/setup`, `POST /api/auth/2fa/confirm`, `POST /api/auth/2fa/disable`
- `PUT /api/usuarios/perfil`, `PUT /api/usuarios/foto` (multipart, campo `foto`), `PUT /api/usuarios/password`
- `GET /api/libros`, `GET /api/libros/:id`
- `GET /api/favoritos`, `GET|POST|DELETE /api/favoritos/:idLibro`
- `POST /api/reservas`, `DELETE /api/reservas/:id`
- `GET /api/ubicaciones/provincias`, `GET /api/ubicaciones/provincias/:id/distritos`
- `POST /api/pagos/crear-orden` (con clave de idempotencia)
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

## Fuera de alcance

Comprobantes descargables, tracking, notificaciones push (APNs), actualizador de APK, administración, publicación en App Store, certificados y provisioning.

## Validación pendiente en macOS

Desde Windows no están disponibles Xcode, los SDK de iOS, Keychain/LocalAuthentication de iOS, simuladores ni la ejecución de XCTest. Deben validarse posteriormente en macOS/Xcode la compilación, navegación compartida al detalle de reserva, pull to refresh, fechas y calendario local, Dynamic Type, VoiceOver y todas las pruebas XCTest (incluida `CartStoreTests`). También debe probarse el flujo completo de PayU en sandbox, la subida de foto de perfil y el QR de 2FA.

`Views/Reservations/ReservationsView.swift` es de la fase anterior: ya no se muestra en las pestañas, pero se conserva junto con su ViewModel y sus pruebas. La antigua `HomeView` se eliminó (estaba incompleta y la sustituye `Views/Store/StoreHomeView.swift`).
