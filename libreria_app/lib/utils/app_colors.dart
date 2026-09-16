import 'package:flutter/material.dart';

/// Paleta de colores centralizada de la aplicación.
///
/// Identidad visual editorial: marfil, verde biblioteca y dorado sobrio.
class AppColors {
  AppColors._();

  // ---------------------------------------------------------------------------
  // Fondos y superficies
  // ---------------------------------------------------------------------------

  static const Color background = Color(0xFFF4F0E7);

  static const Color surface = Color(0xFFFFFCF6);

  static const Color surfaceElevated = Color(0xFFEAE4D8);

  // ---------------------------------------------------------------------------
  // Color principal y secundario
  // ---------------------------------------------------------------------------

  static const Color primary = Color(0xFF173F35);

  static const Color primaryDark = Color(0xFF0D2B24);

  static const Color primaryContainer = Color(0xFFE1E9E2);

  static const Color secondary = Color(0xFFB58A3A);

  static const Color secondaryContainer = Color(0xFFF0E3C5);

  static const Color tertiary = Color(0xFF77433E);

  static const Color gold = Color(0xFFB58A3A);

  static const Color paper = Color(0xFFF8F3E9);

  // ---------------------------------------------------------------------------
  // Estados semánticos
  // ---------------------------------------------------------------------------

  /// Color de éxito.
  static const Color success = Color(0xFF356B50);

  /// Color de advertencia.
  static const Color warning = Color(0xFFB46D25);

  /// Color de error.
  static const Color error = Color(0xFFA43E36);

  /// Contenedor del color de error.
  static const Color errorContainer = Color(0xFFF5E2DE);

  /// Texto sobre el contenedor de error.
  static const Color onErrorContainer = Color(0xFF762720);

  // ---------------------------------------------------------------------------
  // Texto
  // ---------------------------------------------------------------------------

  static const Color textPrimary = Color(0xFF202925);

  static const Color textSecondary = Color(0xFF68716C);

  static const Color textTertiary = Color(0xFF969D98);

  // ---------------------------------------------------------------------------
  // Bordes y divisiones
  // ---------------------------------------------------------------------------

  static const Color divider = Color(0xFFD8D0C2);

  // ---------------------------------------------------------------------------
  // Otros accesorios visuales
  // ---------------------------------------------------------------------------

  static const Color price = Color(0xFF8B6425);
}

/// Construye un [ColorScheme] coherente con [AppColors] para Material 3.
ColorScheme appColorSchemeLight() {
  return const ColorScheme.light(
    primary: AppColors.primary,
    onPrimary: Colors.white,
    secondary: AppColors.secondary,
    onSecondary: AppColors.primaryDark,
    tertiary: AppColors.tertiary,
    onTertiary: Colors.white,
    primaryContainer: AppColors.primaryContainer,
    onPrimaryContainer: AppColors.primaryDark,
    secondaryContainer: AppColors.secondaryContainer,
    onSecondaryContainer: Color(0xFF4D3814),
    error: AppColors.error,
    onError: Colors.white,
    errorContainer: AppColors.errorContainer,
    onErrorContainer: AppColors.onErrorContainer,
    surface: AppColors.surface,
    onSurface: AppColors.textPrimary,
    surfaceContainerHighest: AppColors.surfaceElevated,
    onSurfaceVariant: AppColors.textSecondary,
    outline: AppColors.divider,
    outlineVariant: AppColors.divider,
  );
}
