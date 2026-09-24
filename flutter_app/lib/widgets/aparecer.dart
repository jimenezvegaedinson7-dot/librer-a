import 'package:flutter/material.dart';

import '../utils/app_tokens.dart';

/// Entrada con fundido y desplazamiento corto.
///
/// [indice] escalona la aparición en listas (70 ms por elemento, con tope)
/// para que el contenido llegue en cascada, de forma ordenada.
class Aparecer extends StatelessWidget {
  final Widget child;
  final int indice;
  final double desplazamiento;
  final Duration duracion;

  const Aparecer({
    super.key,
    required this.child,
    this.indice = 0,
    this.desplazamiento = 24,
    this.duracion = const Duration(milliseconds: 480),
  });

  @override
  Widget build(BuildContext context) {
    if (reducirMovimiento(context)) return child;

    final retraso = (indice.clamp(0, 8)) * 70;
    final total = duracion.inMilliseconds + retraso;

    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: total),
      curve: Interval(retraso / total, 1, curve: Curva.salida),
      child: child,
      builder: (context, valor, hijo) {
        return Opacity(
          opacity: valor,
          child: Transform.translate(
            offset: Offset(0, (1 - valor) * desplazamiento),
            child: Transform.scale(scale: 0.965 + 0.035 * valor, child: hijo),
          ),
        );
      },
    );
  }
}
