import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../services/carrito_service.dart';
import '../utils/app_colors.dart';
import '../utils/app_tokens.dart';

class CarritoBadge extends StatelessWidget {

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
