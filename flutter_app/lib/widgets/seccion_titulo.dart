import 'package:flutter/material.dart';

import '../utils/app_colors.dart';

/// Encabezado de sección: antetítulo dorado opcional, título serif y una
/// acción a la derecha ("Ver todos").
class SeccionTitulo extends StatelessWidget {
  final String titulo;
  final String? antetitulo;
  final String? accion;
  final VoidCallback? onAccion;

  const SeccionTitulo({
    super.key,
    required this.titulo,
    this.antetitulo,
    this.accion,
    this.onAccion,
  });

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (antetitulo != null) ...[
                Text(
                  antetitulo!.toUpperCase(),
                  style: textTheme.labelSmall?.copyWith(
                    color: AppColors.gold,
                    letterSpacing: 1.4,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
              ],
              Text(titulo, style: textTheme.headlineSmall),
            ],
          ),
        ),
        if (accion != null)
          TextButton(
            onPressed: onAccion,
            style: TextButton.styleFrom(
              visualDensity: VisualDensity.compact,
              padding: const EdgeInsets.symmetric(horizontal: 8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(accion!),
                const SizedBox(width: 2),
                const Icon(Icons.chevron_right_rounded, size: 18),
              ],
            ),
          ),
      ],
    );
  }
}
