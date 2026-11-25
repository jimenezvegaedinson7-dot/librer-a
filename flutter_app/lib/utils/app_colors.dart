import 'package:flutter/material.dart';

import 'perfil_temas.dart';

class AppColors {
  AppColors._();

  static const Color burdeos = Color(0xFF7A2530);

  static const Color burdeosProfundo = Color(0xFF4E1620);

  static const Color dorado = Color(0xFFB98D3E);

  static const Color doradoClaro = Color(0xFFE6CB8F);

  static const Color tinta = Color(0xFF2C2621);

  static const Color pergamino = Color(0xFFF1E8D8);

  static Color _background = const Color(0xFFF6F1E9);
  static Color _surface = const Color(0xFFFFFFFF);
  static Color _surfaceElevated = const Color(0xFFEFE7DA);
  static Color _paper = const Color(0xFFFBF7F0);

  static Color get background => _background;

  static Color get surface => _surface;

  static Color get surfaceElevated => _surfaceElevated;

  static Color get paper => _paper;

  static void aplicarFondo(Color fondo, Color tarjeta) {
    _background = fondo;
    _surface = tarjeta;
    _surfaceElevated = Color.lerp(fondo, const Color(0xFF8A7A66), 0.08)!;
    _paper = Color.lerp(fondo, Colors.white, 0.55)!;
    _pintarTexto();
  }

  static const Color success = Color(0xFF1F7A45);

  static const Color successContainer = Color(0xFFE6F2EA);

  static const Color warning = Color(0xFFB45309);

  static const Color warningContainer = Color(0xFFFBF0DC);

  static const Color oferta = Color(0xFFC2410C);
  static const Color ofertaSobreOscuro = Color(0xFFFDBA74);

  static const Color info = Color(0xFF2F6FB3);

  static const Color infoContainer = Color(0xFFE7EFF8);

  static const Color error = Color(0xFFB42318);

  static const Color errorContainer = Color(0xFFFBE9E7);

  static const Color onErrorContainer = Color(0xFF7A1D16);

  static const Color _textoMarcaPrimario = Color(0xFF1C1814);
  static const Color _textoMarcaSecundario = Color(0xFF675E54);
  static const Color _textoMarcaTerciario = Color(0xFF9A8F82);

  static Color _textPrimary = _textoMarcaPrimario;
  static Color _textSecondary = _textoMarcaSecundario;
  static Color _textTertiary = _textoMarcaTerciario;

  static Color get textPrimary => _textPrimary;

  static Color get textSecondary => _textSecondary;

  static Color get textTertiary => _textTertiary;

  static PerfilTema? _temaTexto;

  static void _pintarTexto() {
    final tema = _temaTexto;
    if (tema == null || tema.acento != null) {
      _textPrimary = _textoMarcaPrimario;
      _textSecondary = _textoMarcaSecundario;
      _textTertiary = _textoMarcaTerciario;
      return;
    }
    final base = tema.colorPrincipal;
    final fondo = _background;
    _textPrimary = _conContraste(base, fondo, 10);
    _textSecondary = _conContraste(Color.lerp(base, fondo, 0.30)!, fondo, 6);
    _textTertiary = _conContraste(Color.lerp(base, fondo, 0.50)!, fondo, 3.6);
  }

  static Color _conContraste(Color color, Color fondo, double minimo) {
    var actual = color;
    for (var i = 0; i < 20 && _contraste(actual, fondo) < minimo; i++) {
      actual = Color.lerp(actual, Colors.black, 0.12)!;
    }
    return actual;
  }

  static double _contraste(Color a, Color b) {
    final la = a.computeLuminance(), lb = b.computeLuminance();
    final claro = la > lb ? la : lb, oscuro = la > lb ? lb : la;
    return (claro + 0.05) / (oscuro + 0.05);
  }

  static const Color divider = Color(0xFFE7DFD3);

  static const Color dividerStrong = Color(0xFFD6CAB8);

  static Color _primary = burdeos;
  static Color _primaryDark = const Color(0xFF5C1A23);
  static Color _primaryContainer = const Color(0xFFF6E7E5);
  static Color _secondary = dorado;
  static Color _secondaryContainer = const Color(0xFFF4EAD4);
  static Color _tertiary = const Color(0xFF5C544B);
  static Color _gold = dorado;
  static Color _price = burdeos;

  static Color get primary => _primary;

  static Color get onPrimary =>
      _contraste(Colors.white, _primary) >= 4.5 ? Colors.white : Colors.black;
  static Color get primaryDark => _primaryDark;
  static Color get primaryContainer => _primaryContainer;
  static Color get secondary => _secondary;
  static Color get secondaryContainer => _secondaryContainer;
  static Color get tertiary => _tertiary;
  static Color get gold => _gold;
  static Color get price => _price;

  static void aplicarAcento(PerfilTema tema) {
    _primary = tema.colorPrincipal;
    _primaryDark = tema.colorOscuro;
    _primaryContainer = tema.contenedorPrincipal;
    _secondary = tema.colorAcento;
    _secondaryContainer = tema.contenedorAcento;
    _tertiary = tema.colorOscuro;
    _gold = tema.colorAcento;
    _price = tema.colorPrecio;
    _temaTexto = tema;
    _pintarTexto();
  }
}

ColorScheme appColorSchemeLight() {
  return ColorScheme.light(
    primary: AppColors.primary,
    onPrimary: AppColors.onPrimary,
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
