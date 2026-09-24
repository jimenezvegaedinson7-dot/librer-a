import 'package:flutter/material.dart';

import 'perfil_temas.dart';

/// Paleta de colores centralizada de la aplicación.
///
/// Identidad de la librería: burdeos, marrón tinta, dorado, marfil y
/// pergamino. Los colores estructurales (fondos, superficies, texto, bordes y
/// estados semánticos) son fijos. Los colores de acento (primarios,
/// dorado/acento, contenedores y precios) son dinámicos y se pintan con el
/// tema de colores que el usuario elige en su perfil
/// ([AppColors.aplicarAcento]), afectando a botones, tarjetas, iconos, chips
/// y badges de toda la app.
class AppColors {
  AppColors._();

  // ---------------------------------------------------------------------------
  // Marca (fijos): referencia de la identidad editorial
  // ---------------------------------------------------------------------------

  /// Burdeos de marca (cuero del logo).
  static const Color burdeos = Color(0xFF7A2530);

  /// Burdeos profundo (sombras de marca, degradados).
  static const Color burdeosProfundo = Color(0xFF4E1620);

  /// Dorado antiguo de los ornamentos.
  static const Color dorado = Color(0xFFB98D3E);

  /// Dorado claro para detalles sobre fondos oscuros.
  static const Color doradoClaro = Color(0xFFE6CB8F);

  /// Marrón tinta: titulares y superficies oscuras.
  static const Color tinta = Color(0xFF2C2621);

  /// Pergamino: bandas y superficies secundarias.
  static const Color pergamino = Color(0xFFF1E8D8);

  // ---------------------------------------------------------------------------
  // Fondos y superficies (fijos)
  // ---------------------------------------------------------------------------

  /// Fondo general: marfil cálido.
  static const Color background = Color(0xFFF6F1E9);

  /// Superficie de tarjetas: blanco cálido.
  static const Color surface = Color(0xFFFFFFFF);

  /// Superficie hundida (campos, pistas, placeholders).
  static const Color surfaceElevated = Color(0xFFEFE7DA);

  /// Papel: fondo de portadas y zonas de lectura.
  static const Color paper = Color(0xFFFBF7F0);

  // ---------------------------------------------------------------------------
  // Estados semánticos (fijos)
  // ---------------------------------------------------------------------------

  /// Color de éxito.
  static const Color success = Color(0xFF1F7A45);

  /// Contenedor suave de éxito.
  static const Color successContainer = Color(0xFFE6F2EA);

  /// Color de advertencia.
  static const Color warning = Color(0xFFB45309);

  /// Contenedor suave de advertencia.
  static const Color warningContainer = Color(0xFFFBF0DC);

  /// Color informativo (estados neutros de proceso).
  static const Color info = Color(0xFF2F6FB3);

  /// Contenedor suave informativo.
  static const Color infoContainer = Color(0xFFE7EFF8);

  /// Color de error.
  static const Color error = Color(0xFFB42318);

  /// Contenedor del color de error.
  static const Color errorContainer = Color(0xFFFBE9E7);

  /// Texto sobre el contenedor de error.
  static const Color onErrorContainer = Color(0xFF7A1D16);

  // ---------------------------------------------------------------------------
  // Texto (fijos)
  // ---------------------------------------------------------------------------

  static const Color textPrimary = Color(0xFF1C1814);

  static const Color textSecondary = Color(0xFF675E54);

  static const Color textTertiary = Color(0xFF9A8F82);

  // ---------------------------------------------------------------------------
  // Bordes y divisiones (fijos)
  // ---------------------------------------------------------------------------

  static const Color divider = Color(0xFFE7DFD3);

  /// Borde más marcado (hover, foco suave).
  static const Color dividerStrong = Color(0xFFD6CAB8);

  // ---------------------------------------------------------------------------
  // Acento dinámico (se pinta con el tema del perfil)
  // Valores iniciales = tema "Librería" (burdeos + dorado).
  // ---------------------------------------------------------------------------

  static Color _primary = burdeos;
  static Color _primaryDark = const Color(0xFF5C1A23);
  static Color _primaryContainer = const Color(0xFFF6E7E5);
  static Color _secondary = dorado;
  static Color _secondaryContainer = const Color(0xFFF4EAD4);
  static Color _tertiary = const Color(0xFF5C544B);
  static Color _gold = dorado;
  static Color _price = burdeos;

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
    _price = tema.colorPrecio;
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
    onSecondary: AppColors.textPrimary,
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
    surfaceContainerLowest: AppColors.surface,
    surfaceContainerLow: AppColors.paper,
    surfaceContainer: AppColors.background,
    surfaceContainerHigh: AppColors.surfaceElevated,
    surfaceContainerHighest: AppColors.surfaceElevated,
    onSurfaceVariant: AppColors.textSecondary,
    outline: AppColors.dividerStrong,
    outlineVariant: AppColors.divider,
    shadow: AppColors.tinta,
  );
}
