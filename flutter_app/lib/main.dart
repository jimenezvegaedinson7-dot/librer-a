import 'package:flutter/gestures.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'screens/login_screen.dart';
import 'screens/splash_screen.dart';
import 'services/carrito_service.dart';
import 'services/navigation.dart';
import 'services/tema_controller.dart';
import 'utils/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  LicenseRegistry.addLicense(() async* {
    for (final familia in ['Inter', 'SourceSerif4']) {
      yield LicenseEntryWithLineBreaks([
        familia,
      ], await rootBundle.loadString('assets/fonts/OFL-$familia.txt'));
    }
  });
  // Restaura el tema de colores elegido por el usuario.
  TemaController.instance.cargar();
  // Restaura el carrito guardado antes de mostrar la app, para que nada lo
  // pise mientras carga.
  await CarritoService.instance.cargar();
  // Pantalla a la que vuelve la app cuando la sesión expira (401).
  constructorLogin = (_) => const LoginScreen();
  runApp(const LibreriaApp());
}

class LibreriaApp extends StatelessWidget {
  const LibreriaApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Reconstruye la app completa con el tema del usuario en tiempo real.
    return AnimatedBuilder(
      animation: TemaController.instance,
      builder: (context, _) => MaterialApp(
        title: 'Librería',
        debugShowCheckedModeBanner: false,
        scrollBehavior: const _AppScrollBehavior(),
        theme: AppTheme.light(),
        navigatorKey: navigatorKey,
        home: const SplashScreen(),
      ),
    );
  }
}

/// Permite arrastrar los carruseles y listas con el ratón (además del dedo,
/// el lápiz y la rueda del ratón).
class _AppScrollBehavior extends MaterialScrollBehavior {
  const _AppScrollBehavior();

  @override
  Set<PointerDeviceKind> get dragDevices => const {
    PointerDeviceKind.touch,
    PointerDeviceKind.mouse,
    PointerDeviceKind.stylus,
    PointerDeviceKind.invertedStylus,
    PointerDeviceKind.trackpad,
  };
}
