# Mapa de la app Flutter (Android / clientes)

> Generado desde el código real el 2026-09-26 con `docs/architecture/tools/actualizar-mapa.mjs`.
> No contiene secretos: solo nombres de variables de entorno.

## Arranque y navegación

- `lib/main.dart` → `LibreriaApp` (`MaterialApp` con `navigatorKey` global y `TemaController`) → `SplashScreen`.
- `SplashScreen` comprueba la sesión (`StorageService`) y valida el token con `GET /api/usuarios/perfil`.
- Navegación imperativa con `Navigator` / `MaterialPageRoute`; `services/navigation.dart` expone `navigatorKey`, `constructorLogin` (lo registra `main.dart`) e `irALogin()` para navegar sin contexto (lo usa el interceptor 401).
- Barra inferior: `widgets/app_bottom_navigation.dart`.

## Configuración de API (`utils/constants.dart`)

- `apiBaseUrl = serverBaseUrl + '/api'`. Selector `_usarApiProduccion` (actualmente **true** → `https://libreria-api-v9h0.onrender.com`); en desarrollo usa `10.0.2.2:3000` (emulador), una IP LAN (celular) o `localhost`.
- Todas las rutas del backend están centralizadas como constantes `*Path`. Imágenes: `buildPortadaUrl` (`/uploads/portadas/`) y `buildPerfilUrl` (`/uploads/perfiles/`), o URL absoluta (Cloudinary).

## Servicios

| Archivo | Responsabilidad |
|---|---|
| `services/api_service.dart` | Cliente **Dio** singleton. Interceptor añade `Bearer`; ante **401** limpia la sesión y llama a `irALogin()`. Normaliza errores en `ApiException`. Gestiona la **clave de idempotencia** del checkout y recuerda `checkout_url` por venta. |
| `services/storage_service.dart` | Token JWT en **flutter_secure_storage**; usuario y preferencias en **shared_preferences** (migra el token legado). ⚠️ Su comentario dice que también guarda el carrito, pero no hay código que lo haga. |
| `services/carrito_service.dart` | Carrito y "guardar para después" **solo en memoria** (`ChangeNotifier`): se pierde al cerrar la app. **Sin endpoint propio**: los ítems se envían en `POST /api/pagos/crear-orden`. |
| `services/tema_controller.dart` | Tema de color del perfil (`ChangeNotifier`). |
| `services/navigation.dart` | `navigatorKey` + `irALogin()`. |

## Métodos de ApiService → endpoints

| Método | Endpoint(s) |
|---|---|
| `recuperarCheckoutVenta` | `GET /api/ventas/:idVenta/pago` |
| `login` | `POST /api/auth/login` |
| `verificarLogin2FA` | `POST /api/auth/2fa/verify-login` |
| `setupTwoFactor` | `POST /api/auth/2fa/setup` |
| `confirmarTwoFactor` | `POST /api/auth/2fa/confirm` |
| `desactivarTwoFactor` | `POST /api/auth/2fa/disable` |
| `actualizarPerfil` | `PUT /api/usuarios/perfil` |
| `subirFotoPerfil` | `PUT /api/usuarios/foto` |
| `cambiarPassword` | `PUT /api/usuarios/password` |
| `eliminarCuenta` | `DELETE /api/usuarios/cuenta` |
| `obtenerMisReservas` | `GET /api/reservas/mis-reservas` |
| `cancelarReserva` | `DELETE /api/reservas/:id` |
| `crearReserva` | `POST /api/reservas` |
| `obtenerMisVentas` | `GET /api/ventas/mis-ventas` |
| `obtenerFavoritos` | `GET /api/favoritos` |
| `esFavorito` | `GET /api/favoritos/:idLibro` |
| `agregarFavorito` | `POST /api/favoritos/:idLibro` |
| `quitarFavorito` | `DELETE /api/favoritos/:idLibro` |
| `crearOrdenPago` | `POST /api/pagos/crear-orden` |
| `obtenerOrdenPago` | `GET /api/pagos/:orderId` |
| `obtenerProvincias` | `GET /api/ubicaciones/provincias` |
| `obtenerDistritos` | `GET /api/ubicaciones/provincias/:idProvincia/distritos` |
| `registrar` | `POST /api/auth/registro` |
| `verificarEmail` | `POST /api/auth/verificar-email` |
| `reenviarCodigo` | `POST /api/auth/reenviar-codigo` |
| `solicitarReseteo` | `POST /api/auth/solicitar-reseteo` |
| `reestablecerContrasena` | `POST /api/auth/reestablecer-contrasena` |
| `obtenerLibros` | `GET /api/libros` |
| `obtenerDetalleLibro` | `GET /api/libros/:id` |
| `obtenerPerfil` | `GET /api/usuarios/perfil` |

## Pantalla → ApiService → endpoint

| Pantalla / widget | Métodos | Endpoints |
|---|---|---|
| `screens/detalle_libro_screen.dart` | `agregarFavorito`, `crearReserva`, `esFavorito`, `obtenerDetalleLibro`, `quitarFavorito` | `POST /api/favoritos/:idLibro`<br>`POST /api/reservas`<br>`GET /api/favoritos/:idLibro`<br>`GET /api/libros/:id`<br>`DELETE /api/favoritos/:idLibro` |
| `screens/entrega_y_pago_screen.dart` | `crearOrdenPago`, `obtenerDistritos`, `obtenerOrdenPago`, `obtenerProvincias` | `POST /api/pagos/crear-orden`<br>`GET /api/ubicaciones/provincias/:idProvincia/distritos`<br>`GET /api/pagos/:orderId`<br>`GET /api/ubicaciones/provincias` |
| `screens/favoritos_screen.dart` | `obtenerFavoritos`, `quitarFavorito` | `GET /api/favoritos`<br>`DELETE /api/favoritos/:idLibro` |
| `screens/home_screen.dart` | `obtenerLibros` | `GET /api/libros` |
| `screens/libros_screen.dart` | `obtenerLibros` | `GET /api/libros` |
| `screens/login_screen.dart` | `login` | `POST /api/auth/login` |
| `screens/mis_compras_screen.dart` | `obtenerMisVentas`, `obtenerOrdenPago`, `recuperarCheckoutVenta` | `GET /api/ventas/mis-ventas`<br>`GET /api/pagos/:orderId`<br>`GET /api/ventas/:idVenta/pago` |
| `screens/perfil_screen.dart` | `obtenerPerfil`, `subirFotoPerfil` | `GET /api/usuarios/perfil`<br>`PUT /api/usuarios/foto` |
| `screens/recuperar_contrasena_screen.dart` | `solicitarReseteo` | `POST /api/auth/solicitar-reseteo` |
| `screens/reestablecer_contrasena_screen.dart` | `reestablecerContrasena`, `solicitarReseteo` | `POST /api/auth/reestablecer-contrasena`<br>`POST /api/auth/solicitar-reseteo` |
| `screens/registro_screen.dart` | `registrar` | `POST /api/auth/registro` |
| `screens/reservas_screen.dart` | `cancelarReserva`, `obtenerMisReservas` | `DELETE /api/reservas/:id`<br>`GET /api/reservas/mis-reservas` |
| `screens/security/cambiar_password_screen.dart` | `cambiarPassword` | `PUT /api/usuarios/password` |
| `screens/security/editar_perfil_screen.dart` | `actualizarPerfil` | `PUT /api/usuarios/perfil` |
| `screens/security/eliminar_cuenta_screen.dart` | `eliminarCuenta` | `DELETE /api/usuarios/cuenta` |
| `screens/security/two_factor_disable_screen.dart` | `desactivarTwoFactor` | `POST /api/auth/2fa/disable` |
| `screens/security/two_factor_setup_screen.dart` | `confirmarTwoFactor`, `setupTwoFactor` | `POST /api/auth/2fa/confirm`<br>`POST /api/auth/2fa/setup` |
| `screens/security/two_factor_verify_screen.dart` | `verificarLogin2FA` | `POST /api/auth/2fa/verify-login` |
| `screens/splash_screen.dart` | `obtenerPerfil` | `GET /api/usuarios/perfil` |
| `screens/verificacion_email_screen.dart` | `reenviarCodigo`, `verificarEmail` | `POST /api/auth/reenviar-codigo`<br>`POST /api/auth/verificar-email` |

Pantallas sin llamadas directas a la API: `screens/carrito_screen.dart`, `screens/legal/politica_privacidad_screen.dart`, `screens/legal/terminos_condiciones_screen.dart` (carrito local, documentos legales, etc.).

## Funcionalidades clave

| Funcionalidad | Pantallas | Endpoints |
|---|---|---|
| Catálogo | home, libros, detalle_libro | `GET /api/libros`, `GET /api/libros/:id` (búsqueda filtrada en local) |
| Favoritos | favoritos, detalle_libro | `/api/favoritos` (GET, GET/POST/DELETE `/:idLibro`) |
| Carrito | carrito (local) | — |
| Compra + PayU | entrega_y_pago, mis_compras | `GET /api/ubicaciones/provincias(/:id/distritos)`, `GET /api/agencias/activas`, `POST /api/pagos/crear-orden` → abre `checkout_url` con **url_launcher** → `GET /api/pagos/:orderId`; `GET /api/ventas/mis-ventas`, `GET /api/ventas/:id/pago` |
| Reservas | detalle_libro (crear), reservas | `POST /api/reservas`, `GET /api/reservas/mis-reservas`, `DELETE /api/reservas/:id` |
| Perfil | perfil, editar_perfil, cambiar_password | `/api/usuarios/perfil` (GET/PUT), `PUT /api/usuarios/foto` (**image_picker**), `PUT /api/usuarios/password` |
| 2FA | two_factor_setup/verify/disable | `/api/auth/2fa/*` |
| Registro y cuenta | registro, verificacion_email, recuperar/reestablecer_contrasena | `/api/auth/{registro, verificar-email, reenviar-codigo, solicitar-reseteo, reestablecer-contrasena}` |

Nota: la app es **solo para clientes**; `login` rechaza el rol administrador.

## Archivos

**models/** — `carrito_item.dart`, `libro.dart`, `orden_pago.dart`, `reserva.dart`, `ubicacion.dart`, `usuario.dart`, `venta.dart`, `version_app.dart`

**screens/** — `carrito_screen.dart`, `detalle_libro_screen.dart`, `entrega_y_pago_screen.dart`, `favoritos_screen.dart`, `home_screen.dart`, `legal/politica_privacidad_screen.dart`, `legal/terminos_condiciones_screen.dart`, `libros_screen.dart`, `login_screen.dart`, `mis_compras_screen.dart`, `perfil_screen.dart`, `recuperar_contrasena_screen.dart`, `reestablecer_contrasena_screen.dart`, `registro_screen.dart`, `reservas_screen.dart`, `security/cambiar_password_screen.dart`, `security/editar_perfil_screen.dart`, `security/eliminar_cuenta_screen.dart`, `security/two_factor_disable_screen.dart`, `security/two_factor_setup_screen.dart`, `security/two_factor_verify_screen.dart`, `splash_screen.dart`, `verificacion_email_screen.dart`

**widgets/** — `aparecer.dart`, `app_bottom_navigation.dart`, `app_logo.dart`, `app_page_header.dart`, `book_cover.dart`, `carrito_badge.dart`, `comprobador_actualizacion.dart`, `dialogo_actualizacion.dart`, `empty_view.dart`, `error_banner.dart`, `error_view.dart`, `estado_chip.dart`, `estanteria.dart`, `formulario_cuenta.dart`, `legal_documento.dart`, `libros_grid.dart`, `loading_view.dart`, `portadas_libro.dart`, `precio_texto.dart`, `presionable.dart`, `seccion_titulo.dart`

**services/** — `actualizacion_service.dart`, `api_service.dart`, `carrito_service.dart`, `navigation.dart`, `storage_service.dart`, `tema_controller.dart`

**utils/** — `app_colors.dart`, `app_theme.dart`, `app_tokens.dart`, `avatar_generator.dart`, `constants.dart`, `formats.dart`, `idempotencia.dart`, `json_utils.dart`, `perfil_temas.dart`

## Paquetes (pubspec.yaml)

```yaml
dependencies:
  flutter:
    sdk: flutter

  # The following adds the Cupertino Icons font to your application.
  # Use with the CupertinoIcons class for iOS style icons.
  cupertino_icons: ^1.0.9
  dio: ^5.11.0
  shared_preferences: ^2.5.5
  image_picker: ^1.1.2
  url_launcher: ^6.3.2
  flutter_secure_storage: ^11.1.0
  google_fonts: ^8.2.1
  package_info_plus: ^10.2.1
  path_provider: ^2.1.6
  crypto: ^3.0.7
```
