import 'package:flutter/material.dart';

import '../utils/app_colors.dart';

/// Encabezado de página: antetítulo dorado opcional, título serif y subtítulo.
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

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (eyebrow != null) ...[
                Text(
                  eyebrow!.toUpperCase(),
                  style: textTheme.labelSmall?.copyWith(
                    color: AppColors.gold,
                    letterSpacing: 1.4,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
              ],
              Text(
                title,
                style: textTheme.headlineLarge?.copyWith(color: titleColor),
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
    );
  }
}
