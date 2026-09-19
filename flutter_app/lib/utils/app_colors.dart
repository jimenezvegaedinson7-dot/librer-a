import 'package:flutter/material.dart';

import 'perfil_temas.dart';

/// Paleta de colores centralizada de la aplicación.
///
/// Los colores estructurales (fondos, superficies, texto, bordes y estados
/// semánticos) son fijos. Los colores de acento (primarios, dorado/acento,
/// contenedores y precios) son dinámicos y se pintan con el tema de colores
/// que el usuario elige en su perfil ([AppColors.aplicarAcento]), afectando a
/// botones, tarjetas, iconos, chips y badges de toda la app.
class AppColors {
  AppColors._();

  // ---------------------------------------------------------------------------
  // Fondos y superficies (fijos)
  // ---------------------------------------------------------------------------

  static const Color background = Color(0xFFF4F5F7);

  static const Color surface = Color(0xFFFFFFFF);

  static const Color surfaceElevated = Color(0xFFECEEF2);

  static const Color paper = Color(0xFFF8F9FA);

  // ---------------------------------------------------------------------------
  // Estados semánticos (fijos)
  // ---------------------------------------------------------------------------

  /// Color de éxito.
  static const Color success = Color(0xFF2E7D32);

  /// Color de advertencia.
  static const Color warning = Color(0xFFB45309);

  /// Color de error.
  static const Color error = Color(0xFFB3261E);

  /// Contenedor del color de error.
  static const Color errorContainer = Color(0xFFF9DEDC);

  /// Texto sobre el contenedor de error.
  static const Color onErrorContainer = Color(0xFF741B12);

  // ---------------------------------------------------------------------------
  // Texto (fijos)
  // ---------------------------------------------------------------------------

  static const Color textPrimary = Color(0xFF17181C);

  static const Color textSecondary = Color(0xFF5B5E66);

  static const Color textTertiary = Color(0xFF93969E);

  // ---------------------------------------------------------------------------
  // Bordes y divisiones (fijos)
  // ---------------------------------------------------------------------------

  static const Color divider = Color(0xFFDEE1E6);

  // ---------------------------------------------------------------------------
  // Acento dinámico (se pinta con el tema del perfil)
  // ---------------------------------------------------------------------------

  static Color _primary = const Color(0xFF202227);
  static Color _primaryDark = const Color(0xFF17181C);
  static Color _primaryContainer = const Color(0xFFE9EAEE);
  static Color _secondary = const Color(0xFFD3A331);
  static Color _secondaryContainer = const Color(0xFFF3E8C9);
  static Color _tertiary = const Color(0xFF5B5E66);
  static Color _gold = const Color(0xFFD3A331);
  static Color _price = const Color(0xFF96630E);

  static Color get primary => _primary;
  static Color get primaryDark => _primaryDark;
  static Color get primaryContainer => _primaryContainer;
  static Color get secondary => _secondary;
  static Color get secondaryContainer => _secondaryContainer;
  static Color get tertiary => _tertiary;
  static Color get gold => _gold;
  static Color get price => _price;

  /// Pinta todos los acentos de la app con los colores derivados del tema.
  static void aplicarAcento(PerfilTema tema) {
    _primary = tema.colorPrincipal;
    _primaryDark = tema.colorOscuro;
    _primaryContainer = tema.contenedorPrincipal;
    _secondary = tema.colorAcento;
    _secondaryContainer = tema.contenedorAcento;
    _tertiary = tema.colorOscuro;
    _gold = tema.colorAcento;
    _price = tema.colorAcentoOscuro;
  }
}

/// Construye un [ColorScheme] coherente con [AppColors] para Material 3.
///
/// Se construye en tiempo real para reflejar los acentos dinámicos del tema
/// elegido por el usuario.
ColorScheme appColorSchemeLight() {
  return ColorScheme.light(
    primary: AppColors.primary,
    onPrimary: Colors.white,
    secondary: AppColors.secondary,
    onSecondary: const Color(0xFF17181C),
    tertiary: AppColors.tertiary,
    onTertiary: Colors.white,
    primaryContainer: AppColors.primaryContainer,
    onPrimaryContainer: AppColors.primaryDark,
    secondaryContainer: AppColors.secondaryContainer,
    onSecondaryContainer: const Color(0xFF4D3814),
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
