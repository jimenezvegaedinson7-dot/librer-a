# MATIDANA — iOS (SwiftUI)

Aplicación nativa para clientes. Utiliza SwiftUI, Foundation/URLSession,
Security/Keychain, LocalAuthentication y WebKit. Comparte la API Node.js/Express
con Flutter y React; no utiliza Flutter para dibujar su interfaz.

## Navegación vigente

`App/LibreriaSecureApp.swift` → `AppState` → `RootView` → `MainView`.

Las pestañas son **Inicio, Catálogo, Carrito, Mis compras y Perfil**. Perfil
accede a la misma pestaña Mis compras. El módulo de Reservas y el prototipo
anterior de Inicio, actividad y resúmenes fueron retirados del cliente porque
ya no corresponden al recorrido actual.

## Organización

| Carpeta | Responsabilidad |
|---|---|
| `App/` | Entrada, sesión global, ciclo de vida y navegación. |
| `Core/Networking/` | Entorno, transporte HTTP, endpoints y errores. |
| `Core/Security/` | Keychain, biometría y decisiones de seguridad. |
| `Services/` | Cuenta, catálogo, favoritos, carrito, checkout y compras. |
| `ViewModels/` | Estados de lista y detalle de compras. |
| `Views/` | Autenticación, tienda, compras, cuenta y bloqueo. |
| `Models/`, `Components/`, `Utilities/` | Datos, controles y utilidades reutilizables. |
| `Design/`, `Resources/`, `Content/` | Tema, marca, recursos y textos legales. |
| `Tests/` | Casos de carrito, contratos, seguridad y compras. |

`Services/PurchaseProtocols.swift` define las interfaces de consulta de compras
y pagos. `Utilities/PurchaseFormatters.swift` centraliza sus importes y fechas.
`Components/SectionFeedbackView.swift` presenta recuperación de errores. La
edición y subida de fotografías siguen en `Views/Account/ProfilePhotoActions.swift`.

## Conexión con la API

La dirección base se resuelve en este orden:

1. Variable del esquema `LIBRERIA_API_BASE_URL`.
2. Clave `LibreriaAPIBaseURL` de `Configuration/Info.plist`.
3. Producción: `https://libreria-api-v9h0.onrender.com`.

Los endpoints añaden los componentes `api/...`; la base no debe duplicar ese
prefijo. El iPhone no se conecta directamente a PostgreSQL.

Funciones conservadas:

- Registro, correo verificado, login y desafío 2FA.
- Catálogo y detalle con disponibilidad y precio del backend.
- Favoritos por cuenta y carrito local por propietario.
- Delivery configurado de Pallasca o recojo y creación de orden PayU.
- WebCheckout dentro de `WKWebView`, con consulta de estado al regresar.
- Compras propias y detalle reutilizado desde la navegación actual.
- Perfil, fotografía, contraseña, 2FA, reclamaciones y documentos legales.
- Temas locales y bloqueo biométrico opcional.

Los métodos de Reservas, actividad del Inicio antiguo y selectores legacy de
provincias/distritos dejaron de formar parte del cliente.

## Sesión y datos locales

El JWT definitivo se conserva en Keychain con accesibilidad
`kSecAttrAccessibleWhenUnlockedThisDeviceOnly`. El desafío temporal de 2FA queda
en memoria. `UserDefaults` conserva preferencias y el carrito ligado al titular,
no contraseñas ni credenciales definitivas.

Face ID/Touch ID desbloquea localmente la app; la identidad y los permisos se
validan con el servidor. El retorno de PayU tampoco confirma por sí mismo un
cobro: la aplicación consulta a la API.

## Abrir y comprobar en Xcode

Requisitos declarados: **Xcode 16 o posterior**, **iOS 17 o posterior**, Swift 5.

1. Abre `LibreriaSecureApp.xcodeproj` en un Mac.
2. Configura tu equipo y Bundle Identifier en **Signing & Capabilities**.
3. Revisa la URL y permisos de cámara/Face ID en `Configuration/Info.plist`.
4. Selecciona un simulador o iPhone y ejecuta **Run**.
5. Ejecuta **Product → Test** para los casos XCTest vigentes.

Las carpetas sincronizadas del proyecto incorporan los archivos actuales. Las
pruebas de código retirado se eliminaron; se mantienen las de cuenta, carrito,
modelos y compras activas. La comprobación sintáctica en Windows no sustituye
la compilación ni los XCTest con los frameworks de Apple.

El seguimiento logístico y la durabilidad del intento de checkout conservan su
implementación actual; sus diferencias con Flutter requieren una revisión
funcional específica. Esta limpieza no los presenta como una paridad completa.

La distribución iOS se realiza mediante las herramientas de Apple, no mediante
el actualizador APK de Android. La instrumentación GA4 y el consumidor actual
de recomendaciones de compras pertenecen a la tienda React.
