import 'package:flutter/material.dart';

import '../utils/app_colors.dart';

/// Portada de libro con sombra cálida y marcador de posición editorial.
class BookCover extends StatelessWidget {
  final String url;
  final double borderRadius;
  final BoxFit fit;

  /// Sin sombra cuando la portada llena su contenedor (tarjetas a sangre).
  final bool sombra;

  const BookCover({
    super.key,
    required this.url,
    this.borderRadius = 4,
    this.fit = BoxFit.contain,
    this.sombra = true,
  });

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(borderRadius);

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: radius,
        boxShadow: sombra
            ? [
                BoxShadow(
                  color: AppColors.tinta.withValues(alpha: 0.10),
                  blurRadius: 14,
                  offset: const Offset(0, 6),
                ),
              ]
            : null,
      ),
      child: ClipRRect(
        borderRadius: radius,
        child: SizedBox.expand(
          child: url.trim().isEmpty
              ? const _CoverPlaceholder(loading: false)
              : Image.network(
                  url,
                  width: double.infinity,
                  height: double.infinity,
                  fit: fit,
                  alignment: Alignment.center,
                  webHtmlElementStrategy: WebHtmlElementStrategy.fallback,
                  errorBuilder: (_, _, _) =>
                      const _CoverPlaceholder(loading: false),
                  frameBuilder: (context, child, frame, sincrono) {
                    if (sincrono) return child;
                    return AnimatedOpacity(
                      opacity: frame == null ? 0 : 1,
                      duration: const Duration(milliseconds: 260),
                      curve: Curves.easeOut,
                      child: child,
                    );
                  },
                  loadingBuilder: (context, child, progress) {
                    if (progress == null) return child;
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
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.pergamino, AppColors.surfaceElevated],
        ),
      ),
      child: Center(
        child: loading
            ? SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppColors.gold,
                ),
              )
            : Icon(
                Icons.auto_stories_outlined,
                size: 34,
                color: AppColors.gold.withValues(alpha: 0.8),
              ),
      ),
    );
  }
}
