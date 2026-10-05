import 'package:flutter/material.dart';

import '../utils/app_colors.dart';

/// Encabezado de página: antetítulo dorado opcional y título serif en una
/// sola línea ("Paso 2 de 3 · Entrega y pago"), con subtítulo debajo.
class AppPageHeader extends StatelessWidget {
  final String title;
  final Color? titleColor;
  final Widget? trailing;
  final String? subtitle;
  final String? eyebrow;

  const AppPageHeader({
    super.key,
    required this.title,
    this.titleColor,
    this.trailing,
    this.subtitle,
    this.eyebrow,
  });

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    // Un poco más abajo, separado del borde superior de la pantalla.
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text.rich(
                  TextSpan(
                    children: [
                      if (eyebrow != null)
                        TextSpan(
                          text: '${eyebrow!} · ',
                          style: TextStyle(
                            color: AppColors.gold,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      TextSpan(text: title),
                    ],
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: textTheme.headlineMedium?.copyWith(
                    color: titleColor,
                    height: 1.2,
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    subtitle!,
                    style: textTheme.bodyMedium?.copyWith(
                      color:
                          titleColor?.withValues(alpha: 0.8) ??
                          AppColors.textSecondary,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (trailing != null) ...[const SizedBox(width: 12), trailing!],
        ],
      ),
    );
  }
}
