# Mapa de la aplicación iOS SwiftUI

> Generado desde el código real el 2026-11-18 con `docs/architecture/tools/actualizar-mapa.mjs`.
> No contiene secretos: solo nombres de variables de entorno.

## Arranque y navegación

`App/LibreriaSecureApp.swift` → `AppState` → `RootView` → `MainView`.

Pestañas: Inicio, Catálogo, Carrito, Mis compras, Perfil. Perfil dirige a la misma pestaña Mis compras.

## Servicios y seguridad

- Un único `APIClient` con URLSession, JSON y Bearer. La URL se resuelve mediante `LIBRERIA_API_BASE_URL`, `LibreriaAPIBaseURL` y el servidor de producción.
- JWT definitivo en Keychain; bloqueo local mediante LocalAuthentication. El rol admitido es cliente.
- `PurchaseProtocols.swift` agrupa las interfaces de compras/pagos. `PurchaseFormatters.swift` y `SectionFeedbackView.swift` son utilidades compartidas del recorrido activo.
- Se retiraron el Inicio de actividad antiguo, sus tarjetas, Reservas y los DTO/selectores legacy de provincias y distritos. Catálogo, favoritos, carrito, checkout, pagos, perfil y fotografía conservan sus consumidores.
- Las fuentes de marca Flutter se concentran en `assets/images/logo_web.png`; los tres PNG duplicados y la dependencia no utilizada cupertino_icons fueron retirados de Flutter.

## Endpoints declarados en Swift

La autorización indicada corresponde a la declaración del cliente; la API verifica sus propios permisos.

| Método | Ruta | Declaración | Autorización del cliente |
|---|---|---|---|
| POST | `/api/auth/login` | `ios_swift_app/Core/Networking/APIEndpoint.swift:47` | Pública |
| POST | `/api/auth/2fa/verify-login` | `ios_swift_app/Core/Networking/APIEndpoint.swift:56` | Pública |
| GET | `/api/usuarios/perfil` | `ios_swift_app/Core/Networking/APIEndpoint.swift:66` | JWT |
| GET | `/api/ventas/mis-ventas` | `ios_swift_app/Core/Networking/APIEndpoint.swift:72` | JWT |
| GET | `/api/ventas/:id` | `ios_swift_app/Core/Networking/APIEndpoint.swift:78` | JWT |
| GET | `/api/ventas/:id/pago` | `ios_swift_app/Core/Networking/APIEndpoint.swift:84` | JWT |
| GET | `/api/pagos/:orderID` | `ios_swift_app/Core/Networking/APIEndpoint.swift:90` | JWT |
| GET | `/api/libros` | `ios_swift_app/Core/Networking/StoreEndpoints.swift:4` | JWT |
| GET | `/api/favoritos` | `ios_swift_app/Core/Networking/StoreEndpoints.swift:5` | JWT |
| GET | `/api/libros/:id` | `ios_swift_app/Core/Networking/StoreEndpoints.swift:10` | JWT |
| GET | `/api/favoritos/:bookID` | `ios_swift_app/Core/Networking/StoreEndpoints.swift:16` | JWT |
| POST | `/api/favoritos/:bookID` | `ios_swift_app/Core/Networking/StoreEndpoints.swift:22` | JWT |
| DELETE | `/api/favoritos/:bookID` | `ios_swift_app/Core/Networking/StoreEndpoints.swift:26` | JWT |
| POST | `/api/auth/verificar-email` | `ios_swift_app/Core/Networking/StoreEndpoints.swift:30` | Pública |
| POST | `/api/auth/reenviar-codigo` | `ios_swift_app/Core/Networking/StoreEndpoints.swift:35` | Pública |
| POST | `/api/auth/solicitar-reseteo` | `ios_swift_app/Core/Networking/StoreEndpoints.swift:40` | Pública |
| POST | `/api/auth/reestablecer-contrasena` | `ios_swift_app/Core/Networking/StoreEndpoints.swift:45` | Pública |
| PUT | `/api/usuarios/password` | `ios_swift_app/Core/Networking/StoreEndpoints.swift:50` | JWT |
| POST | `/api/auth/2fa/confirm` | `ios_swift_app/Core/Networking/StoreEndpoints.swift:55` | JWT |
| POST | `/api/auth/2fa/disable` | `ios_swift_app/Core/Networking/StoreEndpoints.swift:60` | JWT |
| DELETE | `/api/usuarios/cuenta` | `ios_swift_app/Core/Networking/StoreEndpoints.swift:64` | JWT |
| POST | `/api/reclamaciones` | `ios_swift_app/Core/Networking/StoreEndpoints.swift:71` | Pública |
| POST | `/api/auth/verificar-reseteo` | `ios_swift_app/Core/Networking/StoreEndpoints.swift:78` | Pública |
| GET | `/api/zonas-delivery` | `ios_swift_app/Core/Networking/StoreEndpoints.swift:85` | JWT |
| POST | `/api/pagos/crear-orden` | `ios_swift_app/Core/Networking/StoreEndpoints.swift:91` | JWT |
| GET | `/api/pagos/:orderID` | `ios_swift_app/Core/Networking/StoreEndpoints.swift:97` | JWT |
| POST | `/api/auth/registro` | `ios_swift_app/Core/Networking/StoreEndpoints.swift:103` | Pública |
| PUT | `/api/usuarios/perfil` | `ios_swift_app/Core/Networking/StoreEndpoints.swift:110` | JWT |
| POST | `/api/auth/2fa/setup` | `ios_swift_app/Core/Networking/StoreEndpoints.swift:116` | JWT |
| PUT | `/api/usuarios/foto` | `ios_swift_app/Services/StoreServices.swift:155` | JWT |

## Alcance del análisis

Referencias estáticas aproximadas por símbolos y extensiones Swift; no equivale a imports por archivo ni a una compilación de Xcode.

Archivos de aplicación: 73. Archivos de pruebas: 7. Candidatos sin alcance desde @main: 0.

La compilación y los XCTest de iOS requieren un Mac con Xcode. El seguimiento y la durabilidad del intento de checkout conservan su implementación actual; esta limpieza no certifica paridad funcional completa con Flutter.
