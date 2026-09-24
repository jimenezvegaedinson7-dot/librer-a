import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Tokens de diseño: una sola fuente para espaciado, radios, movimiento y
/// sombras. Las pantallas los usan en lugar de números sueltos.

/// Escala de espaciado (múltiplos de 4).
class Espacio {
  Espacio._();

  static const double xxs = 4;
  static const double xs = 8;
  static const double sm = 12;
  static const double md = 16;
  static const double lg = 20;
  static const double xl = 24;
  static const double xxl = 32;
  static const double xxxl = 40;

  /// Margen lateral de las pantallas.
  static const double pantalla = 20;
}

/// Radios de esquina.
class Radios {
  Radios._();

  static const double xs = 6;
  static const double sm = 10;
  static const double md = 14;
  static const double lg = 18;
  static const double xl = 24;
  static const double pill = 999;

  static BorderRadius get tarjeta => BorderRadius.circular(md);
  static BorderRadius get control => BorderRadius.circular(sm);
  static BorderRadius get hoja =>
      const BorderRadius.vertical(top: Radius.circular(xl));
}

/// Duraciones de las animaciones (180–400 ms: discretas y elegantes).
class Duracion {
  Duracion._();

  static const Duration rapida = Duration(milliseconds: 180);
  static const Duration base = Duration(milliseconds: 260);
  static const Duration lenta = Duration(milliseconds: 380);
}

/// Curvas de movimiento.
class Curva {
  Curva._();

  /// Salida suave (equivalente a ease-out-quart).
  static const Curve salida = Cubic(0.25, 1, 0.5, 1);

  /// Entrada y salida suave.
  static const Curve suave = Curves.easeInOutCubic;
}

/// Sombras cálidas (tinta marrón, nunca negro puro).
class Sombra {
  Sombra._();

  static List<BoxShadow> get tarjeta => [
    BoxShadow(
      color: AppColors.tinta.withValues(alpha: 0.05),
      blurRadius: 2,
      offset: const Offset(0, 1),
    ),
    BoxShadow(
      color: AppColors.tinta.withValues(alpha: 0.06),
      blurRadius: 16,
      offset: const Offset(0, 6),
    ),
  ];

  static List<BoxShadow> get elevada => [
    BoxShadow(
      color: AppColors.tinta.withValues(alpha: 0.08),
      blurRadius: 4,
      offset: const Offset(0, 2),
    ),
    BoxShadow(
      color: AppColors.tinta.withValues(alpha: 0.14),
      blurRadius: 28,
      offset: const Offset(0, 14),
    ),
  ];

  /// Sombra de la barra inferior y barras de acción fijas.
  static List<BoxShadow> get barra => [
    BoxShadow(
      color: AppColors.tinta.withValues(alpha: 0.08),
      blurRadius: 20,
      offset: const Offset(0, -6),
    ),
  ];
}

/// Indica si el sistema pide reducir animaciones.
bool reducirMovimiento(BuildContext context) =>
    MediaQuery.maybeDisableAnimationsOf(context) ?? false;
