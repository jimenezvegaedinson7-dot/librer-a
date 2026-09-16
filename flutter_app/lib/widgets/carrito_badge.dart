import 'package:flutter/material.dart';

import '../services/carrito_service.dart';

/// Badge Material 3 que muestra la cantidad total de ejemplares en el carrito.
///
/// Envuelve el icono del carrito (header o barra inferior) y consulta a
/// [CarritoService.totalUnidades] en tiempo real mediante [ListenableBuilder].
///
/// - Si el total es 0, el badge se oculta.
/// - Si el total supera 99, se muestra "99+" sin perder su forma.
/// - Usa los colores del tema (`colorScheme.error` / `onError`).
class CarritoBadge extends StatelessWidget {
  /// Icono base sobre el que se coloca el badge.
  final Widget child;

  const CarritoBadge({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: CarritoService.instance,
      builder: (context, _) {
        final total = CarritoService.instance.totalUnidades;
        return Badge(
          isLabelVisible: total > 0,
          label: Text(total > 99 ? '99+' : '$total'),
          child: child,
        );
      },
    );
  }
}
