import 'package:flutter/material.dart';

import '../utils/app_colors.dart';

/// Vista de error reutilizable con mensaje claro y botón Reintentar.
class ErrorView extends StatelessWidget {
  final String message;
  final String buttonLabel;
  final VoidCallback? onRetry;

  const ErrorView({
    super.key,
    required this.message,
    this.buttonLabel = 'Reintentar',
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppColors.errorContainer,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: AppColors.error.withValues(alpha: 0.25),
                ),
              ),
              child: const Icon(
                Icons.cloud_off_rounded,
                size: 38,
                color: AppColors.error,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium
                  ?.copyWith(color: AppColors.textPrimary, height: 1.4),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 24),
              FilledButton.tonal(onPressed: onRetry, child: Text(buttonLabel)),
            ],
          ],
        ),
      ),
    );
  }
}
