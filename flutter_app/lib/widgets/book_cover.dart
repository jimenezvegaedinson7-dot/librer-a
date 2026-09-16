import 'package:flutter/material.dart';

import '../utils/app_colors.dart';

/// Portada reutilizable para libros.
///
/// Conserva la proporción original de la imagen y evita recortes
/// excesivos. Si la imagen no existe o falla, muestra un placeholder.
class BookCover extends StatelessWidget {
  final String url;
  final double borderRadius;
  final BoxFit fit;

  const BookCover({
    super.key,
    required this.url,
    this.borderRadius = 8,
    this.fit = BoxFit.contain,
  });

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(borderRadius);

    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.paper,
        borderRadius: radius,
        border: Border.all(color: AppColors.divider),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 12,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: radius,
        child: Container(
          width: double.infinity,
          height: double.infinity,
          color: AppColors.paper,
          padding: const EdgeInsets.all(4),
          alignment: Alignment.center,
          child: url.trim().isEmpty
              ? const _CoverPlaceholder(loading: false)
              : Image.network(
                  url,
                  width: double.infinity,
                  height: double.infinity,
                  fit: fit,
                  alignment: Alignment.center,
                  errorBuilder: (_, _, _) {
                    return const _CoverPlaceholder(loading: false);
                  },
                  loadingBuilder: (context, child, progress) {
                    if (progress == null) {
                      return child;
                    }

                    return const _CoverPlaceholder(loading: true);
                  },
                ),
        ),
      ),
    );
  }
}

class _CoverPlaceholder extends StatelessWidget {
  final bool loading;

  const _CoverPlaceholder({required this.loading});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: const BoxDecoration(color: AppColors.surfaceElevated),
      alignment: Alignment.center,
      child: loading
          ? const SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.primary,
              ),
            )
          : const Icon(
              Icons.auto_stories_rounded,
              size: 40,
              color: AppColors.primary,
            ),
    );
  }
}
