import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../services/storage_service.dart';
import '../utils/app_colors.dart';
import '../utils/app_theme.dart';
import '../widgets/app_logo.dart';
import '../widgets/estanteria.dart';
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
    return Scaffold(
      body: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppColors.primary,
              Color.alphaBlend(
                Colors.black.withValues(alpha: 0.35),
                AppColors.primary,
              ),
            ],
          ),
        ),
        child: Stack(
          children: [
            const Positioned.fill(
              child: EstanteriaAnimada(
                tinta: Colors.white,
                acento: AppColors.doradoClaro,
                opacidad: 0.1,
                altoBalda: 84,
                semilla: 11,
                duracion: Duration(milliseconds: 1100),
              ),
            ),
            // Velo radial: el centro queda limpio para el logo.
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    radius: 0.75,
                    colors: [
                      AppColors.primaryDark.withValues(alpha: 0.9),
                      AppColors.primaryDark.withValues(alpha: 0.0),
                    ],
                  ),
                ),
              ),
            ),
            SafeArea(
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
                      Container(
                        width: 156,
                        height: 156,
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppColors.doradoClaro.withValues(
                              alpha: 0.55,
                            ),
                          ),
                        ),
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white.withValues(alpha: 0.08),
                          ),
                          child: const Center(
                            child: AppLogo(width: 104, height: 104),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        'Librería',
                        style: AppTheme.serif(
                          fontSize: 30,
                          color: Colors.white,
                          letterSpacing: -0.4,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Container(
                        width: 36,
                        height: 2,
                        decoration: BoxDecoration(
                          color: AppColors.doradoClaro,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      const SizedBox(height: 40),
                      const SizedBox(
                        width: 26,
                        height: 26,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.4,
                          strokeCap: StrokeCap.round,
                          color: AppColors.doradoClaro,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
