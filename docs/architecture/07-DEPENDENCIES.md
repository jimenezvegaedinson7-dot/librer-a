# Dependencias

> Generado desde el código real el 2026-10-06 con `docs/architecture/tools/actualizar-mapa.mjs`.
> No contiene secretos: solo nombres de variables de entorno.

## Paquetes npm

### Backend

| Paquete | Versión |
|---|---|
| `bcryptjs` | ^3.0.3 |
| `cors` | ^2.8.6 |
| `dotenv` | ^17.4.2 |
| `express` | ^5.2.1 |
| `express-rate-limit` | ^8.7.0 |
| `helmet` | ^8.3.0 |
| `jsonwebtoken` | ^9.0.3 |
| `multer` | ^2.4.0 |
| `nodemailer` | ^10.0.15 |
| `otplib` | ^13.5.0 |
| `pg` | ^8.23.0 |
| `playwright` | ^1.63.0 |
| `qrcode` | ^1.5.4 |

Dev: .

Todas las dependencias se importan en algún archivo.

### Frontend

| Paquete | Versión |
|---|---|
| `@gsap/react` | ^2.1.2 |
| `@tailwindcss/vite` | ^4.3.3 |
| `axios` | ^1.20.0 |
| `gsap` | ^3.15.0 |
| `lucide-react` | ^1.47.0 |
| `motion` | ^13.4.0 |
| `react` | ^19.2.8 |
| `react-dom` | ^19.2.8 |
| `react-icons` | ^5.7.0 |
| `react-router-dom` | ^7.18.3 |
| `tailwindcss` | ^4.3.3 |

Dev: @playwright/test, @types/react, @types/react-dom, @vitejs/plugin-react, oxlint, vite.

## Paquetes Flutter (`flutter pub deps --style=compact`)

- **Directos**: cupertino_icons, dio, flutter, flutter_secure_storage, google_fonts, image_picker, shared_preferences, url_launcher.
- **Dev**: flutter_launcher_icons, flutter_lints, flutter_test.
- El resto (archive, http, crypto, *_platform_interface, plugins por plataforma…) son **transitivos**.
- Paquetes importados en `lib/`: `crypto`, `dio`, `flutter`, `flutter_secure_storage`, `google_fonts`, `image_picker`, `package_info_plus`, `path_provider`, `shared_preferences`, `url_launcher`.

## Dependencias internas (imports del propio código)

| Proyecto | Archivos | Imports internos | Ciclos |
|---|---|---|---|
| Backend (`require`) | 170 | 385 | 0 (confirmado con **madge**: ninguno) |
| Frontend (`import`) | 208 | 835 | 0 (confirmado con **madge**: ninguno) |
| Flutter (`import` relativos) | 73 | 321 | 4 caminos cíclicos |

### Ciclos en Flutter

Corregido el ciclo entre capas: `services/navigation.dart` ya no importa `LoginScreen`; `main.dart` registra `constructorLogin` y el interceptor 401 lo usa. Ningún servicio, modelo o utilidad importa pantallas.

Los 4 caminos restantes son de **navegación entre pantallas** (p. ej. Login → Inicio → Perfil → cerrar sesión → Login). Son habituales con `Navigator` imperativo y no acoplan capas; se eliminarían con rutas con nombre si hiciera falta.

Ejemplos de caminos:

- screens/login_screen.dart → screens/home_screen.dart → screens/perfil_screen.dart → screens/login_screen.dart
- screens/login_screen.dart → screens/recuperar_contrasena_screen.dart → screens/reestablecer_contrasena_screen.dart → screens/login_screen.dart
- screens/login_screen.dart → screens/registro_screen.dart → screens/verificacion_email_screen.dart → screens/login_screen.dart
- screens/login_screen.dart → screens/security/two_factor_verify_screen.dart → screens/login_screen.dart

## Posiblemente no utilizado

- Flutter: ninguno.
- React: funciones de servicio no importadas: `agenciasService#obtenerAgencia`, `ubicacionesService#listarProvincias`/`listarDistritos` (se usan solo internamente por `listarDistritosParaEnvio`).
- Backend: endpoints `GET /api/historial/mi-historial`, `POST /api/historial`, `PUT /api/inventario/libro/:id/stock` sin consumidor React/Flutter; `GET /api/debug-egress` es diagnóstico manual protegido.
- Estilos: las reglas de la antigua página Reportes sin consumidores se retiraron. `tabla-reporte`, `reporte-barra`, `reporte-puesto` y `reporte-contador` se conservan porque los usan Dashboard y Ventas.
