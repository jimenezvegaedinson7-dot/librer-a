# Flutter - MATIDANA

Aplicación móvil para clientes de MATIDANA. Incluye registro y verificación de
correo, login/2FA, catálogo, favoritos, carrito por propietario, compra PayU,
seguimiento, perfil y personalización. La navegación de compras utiliza las
ventas de la cuenta; Reservas es un módulo retirado del backend.

## Ejecucion

```sh
flutter pub get
flutter run
```

## Organización

- `lib/models/`: datos de catálogo, cuenta, venta y orden.
- `lib/screens/`: pantallas del cliente y sus flujos de seguridad.
- `lib/services/`: Dio, almacenamiento, carrito, checkout, tema y actualización.
- `lib/widgets/` y `lib/utils/`: presentación reutilizable y utilidades.
- `assets/images/logo_web.png`: logo canónico usado por `Constants.logoAsset`.
- `assets/icons/`: imágenes fuente del generador de iconos Android.

`tool/generar_marca.py` usa el logo canónico de la app para generar los iconos
y el recurso de arranque. `dart run flutter_launcher_icons` consume las imágenes
declaradas en `pubspec.yaml`. Los duplicados sin consumidores fueron retirados.

## Comprobación

```sh
flutter analyze
flutter test
```

La API se configura en `lib/utils/constants.dart`. El token se guarda en
`flutter_secure_storage`; el carrito y los intentos de checkout permanecen
separados por cliente. Los detalles del actualizador están en
`ACTUALIZACIONES_APK.md` y el mapa en `../docs/architecture/04-FLUTTER-MAP.md`.
