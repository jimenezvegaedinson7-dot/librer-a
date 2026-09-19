import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'screens/splash_screen.dart';
import 'services/navigation.dart';
import 'services/tema_controller.dart';
import 'utils/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  GoogleFonts.config.allowRuntimeFetching = true;
  // Restaura el tema de colores elegido por el usuario.
  TemaController.instance.cargar();
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
