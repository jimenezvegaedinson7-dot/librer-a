import 'package:flutter/material.dart';

import '../utils/app_colors.dart';

/// Tonos semánticos de los chips de estado.
enum TonoEstado { exito, aviso, peligro, info, neutro, marca }

/// Etiqueta compacta de estado (disponibilidad, reservas, compras).
///
/// Fondo suave del tono + punto de color + texto, para que el estado se lea
/// por color y por palabra (nunca solo por color).
class EstadoChip extends StatelessWidget {
  final String texto;
  final TonoEstado tono;
  final bool conPunto;
  final IconData? icono;

  const EstadoChip({
    super.key,
    required this.texto,
    this.tono = TonoEstado.neutro,
    this.conPunto = true,
    this.icono,
  });

  static (Color fondo, Color tinta) colores(TonoEstado tono) {
    return switch (tono) {
      TonoEstado.exito => (AppColors.successContainer, AppColors.success),
      TonoEstado.aviso => (AppColors.warningContainer, AppColors.warning),
      TonoEstado.peligro => (AppColors.errorContainer, AppColors.error),
      TonoEstado.info => (AppColors.infoContainer, AppColors.info),
      TonoEstado.marca => (AppColors.primaryContainer, AppColors.primary),
      TonoEstado.neutro => (AppColors.surfaceElevated, AppColors.textSecondary),
    };
  }

  @override
  Widget build(BuildContext context) {
    final (fondo, tinta) = colores(tono);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: fondo,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icono != null) ...[
            Icon(icono, size: 12, color: tinta),
            const SizedBox(width: 4),
          ] else if (conPunto) ...[
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(color: tinta, shape: BoxShape.circle),
            ),
            const SizedBox(width: 5),
          ],
          Flexible(
            child: Text(
              texto,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: tinta,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.1,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
