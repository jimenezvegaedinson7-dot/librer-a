import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../services/carrito_service.dart';
import '../utils/app_colors.dart';
import '../utils/app_tokens.dart';

/// Badge Material 3 que muestra la cantidad total de ejemplares en el carrito.
///
/// Envuelve el icono del carrito (header o barra inferior) y consulta a
/// [CarritoService.totalUnidades] en tiempo real mediante [ListenableBuilder].
///
/// - Si el total es 0, el badge se oculta.
/// - Si el total supera 99, se muestra "99+" sin perder su forma.
/// - Cada vez que cambia el total, el icono da un pequeño salto.
class CarritoBadge extends StatelessWidget {
  /// Icono base sobre el que se coloca el badge.
  final Widget child;

  const CarritoBadge({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final quieto = reducirMovimiento(context);
    return ListenableBuilder(
      listenable: CarritoService.instance,
      builder: (context, _) {
        final total = CarritoService.instance.totalUnidades;
        final badge = Badge(
          isLabelVisible: total > 0,
          backgroundColor: AppColors.primary,
          textColor: AppColors.surface,
          label: Text(total > 99 ? '99+' : '$total'),
          child: child,
        );
        if (quieto || total == 0) return badge;

        return TweenAnimationBuilder<double>(
          key: ValueKey(total),
          tween: Tween(begin: 0, end: 1),
          duration: const Duration(milliseconds: 420),
          curve: Curves.easeOut,
          builder: (context, t, hijo) => Transform.scale(
            scale: 1 + 0.28 * math.sin(math.pi * t),
            child: Transform.rotate(
              angle: 0.12 * math.sin(math.pi * 2 * t),
              child: hijo,
            ),
          ),
          child: badge,
        );
      },
    );
  }
}
