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
  // Fondos y superficies (los elige el usuario en "Fondo y tarjetas")
  // Valores iniciales = fondo "Marfil".
  // ---------------------------------------------------------------------------

  static Color _background = const Color(0xFFF6F1E9);
  static Color _surface = const Color(0xFFFFFFFF);
  static Color _surfaceElevated = const Color(0xFFEFE7DA);
  static Color _paper = const Color(0xFFFBF7F0);

  /// Fondo general de las pantallas.
  static Color get background => _background;

  /// Superficie de tarjetas.
  static Color get surface => _surface;

  /// Superficie hundida (campos, pistas, placeholders).
  static Color get surfaceElevated => _surfaceElevated;

  /// Papel: fondo de portadas y zonas de lectura.
  static Color get paper => _paper;

  /// Pinta el fondo de las pantallas y el de las tarjetas. Las superficies
  /// intermedias se derivan mezclando ambos colores.
  static void aplicarFondo(Color fondo, Color tarjeta) {
    _background = fondo;
    _surface = tarjeta;
    _surfaceElevated = Color.lerp(fondo, const Color(0xFF8A7A66), 0.08)!;
    _paper = Color.lerp(fondo, tarjeta, 0.55)!;
    _pintarTexto();
  }

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

  /// Precios y porcentajes de promoción, con contraste sobre papel o portada.
  static const Color oferta = Color(0xFFC2410C);
  static const Color ofertaSobreOscuro = Color(0xFFFDBA74);

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
  // Texto (sigue al tema: con "Grafito" las letras son grafito, con "Noche"
  // casi negras; con "Librería" el marrón tinta de siempre). Los colores de
  // estado —ofertas en naranja, error/cancelar, éxito, aviso— NO cambian.
  // ---------------------------------------------------------------------------

  static const Color _textoMarcaPrimario = Color(0xFF1C1814);
  static const Color _textoMarcaSecundario = Color(0xFF675E54);
  static const Color _textoMarcaTerciario = Color(0xFF9A8F82);

  static Color _textPrimary = _textoMarcaPrimario;
  static Color _textSecondary = _textoMarcaSecundario;
  static Color _textTertiary = _textoMarcaTerciario;

  static Color get textPrimary => _textPrimary;

  static Color get textSecondary => _textSecondary;

  static Color get textTertiary => _textTertiary;

  /// Último tema aplicado (para recalcular el texto si cambia el fondo).
  static PerfilTema? _temaTexto;

  /// Recalcula los tonos de texto a partir del tema y del fondo actual,
  /// garantizando contraste de lectura (≥ 10:1, 6:1 y 3.6:1).
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

  /// Oscurece [color] (mezclándolo con negro) hasta lograr el contraste
  /// pedido contra [fondo]; conserva el matiz del tema.
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
    _temaTexto = tema;
    _pintarTexto();
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
