import 'package:flutter/material.dart';

import '../utils/app_colors.dart';
import 'aparecer.dart';

/// Error a pantalla completa con opción de reintentar.
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
    final textTheme = Theme.of(context).textTheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Aparecer(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: const BoxDecoration(
                  color: AppColors.errorContainer,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.cloud_off_rounded,
                  size: 34,
                  color: AppColors.error,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Algo no salió bien',
                style: textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 6),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 300),
                child: Text(
                  message,
                  textAlign: TextAlign.center,
                  style: textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
              if (onRetry != null) ...[
                const SizedBox(height: 22),
                OutlinedButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh_rounded, size: 18),
                  label: Text(buttonLabel),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
