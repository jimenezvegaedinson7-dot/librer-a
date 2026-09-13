import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../services/storage_service.dart';
import '../widgets/app_logo.dart';
import 'home_screen.dart';
import 'login_screen.dart';

/// Pantalla de inicio: verifica la sesión guardada y decide si ir a Home o
/// Login. Evita pantallas en blanco mostrando el logo e indicador desde el
/// primer frame.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    // Pequeña pausa para que el splash se vea de forma natural sin saltos.
    await Future<void>.delayed(const Duration(milliseconds: 400));

    final token = await StorageService.instance.obtenerToken();
    if (token == null || token.isEmpty) {
      _goToLogin();
      return;
    }

    try {
      final perfil = await ApiService.instance.obtenerPerfil();
      if (perfil.esAdministrador) {
        await StorageService.instance.limpiarSesion();
        _goToLogin();
        return;
      }
      await StorageService.instance.guardarUsuario(perfil);
      _goToHome();
    } catch (_) {
      // Si falla (p. ej. token expirado), limpiar y enviar al login.
      await StorageService.instance.limpiarSesion();
      _goToLogin();
    }
  }

  void _goToLogin() {
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  void _goToHome() {
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(builder: (_) => const HomeScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.primary,
      body: SafeArea(
        child: Center(
          child: TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: 1),
            duration: const Duration(milliseconds: 750),
            curve: Curves.easeOutCubic,
            builder: (context, value, child) {
              return Opacity(
                opacity: value,
                child: Transform.scale(
                  scale: 0.92 + 0.08 * value,
                  child: child,
                ),
              );
            },
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const AppLogo(width: 112, height: 112),
                const SizedBox(height: 20),
                Text(
                  'Librería',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 28,
                  ),
                ),
                const SizedBox(height: 40),
                const SizedBox(
                  width: 28,
                  height: 28,
                  child: CircularProgressIndicator(
                    strokeWidth: 3,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
