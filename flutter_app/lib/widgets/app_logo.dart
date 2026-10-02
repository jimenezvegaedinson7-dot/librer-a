import 'package:flutter/material.dart';

import '../utils/app_colors.dart';
import '../utils/constants.dart';

/// Logo reutilizable de la librería.
///
/// Usa el mismo logo oficial de la web desde [Constants.logoAsset]. Si falta en el
/// proyecto, muestra automáticamente un placeholder elegante (libro sobre un
/// contenedor circular) para que la app nunca se rompa.
class AppLogo extends StatelessWidget {
  final double? width;
  final double? height;
  final BoxFit fit;
  final Color? color;

  /// Si es `true`, muestra el placeholder aunque exista la imagen (útil para
  /// previsualizar el diseño o en pantallas oscuras).
  final bool forcePlaceholder;

  const AppLogo({
    super.key,
    this.width,
    this.height,
    this.fit = BoxFit.contain,
    this.color,
    this.forcePlaceholder = false,
  });

  @override
  Widget build(BuildContext context) {
    if (forcePlaceholder) {
      return _Placeholder(width: width, height: height);
    }

    return Image.asset(
      Constants.logoAsset,
      width: width,
      height: height,
      fit: fit,
      color: color,
      colorBlendMode: BlendMode.srcIn,
      errorBuilder: (_, _, _) => _Placeholder(width: width, height: height),
    );
  }
}

/// Placeholder elegante que se muestra mientras no exista la imagen del logo.
class _Placeholder extends StatelessWidget {
  final double? width;
  final double? height;

  const _Placeholder({this.width, this.height});

  @override
  Widget build(BuildContext context) {
    final size = width ?? height ?? 96;
    return Container(
      width: width,
      height: height,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppColors.primaryContainer,
        borderRadius: BorderRadius.circular(size * 0.16),
        border: Border.all(color: AppColors.gold.withValues(alpha: 0.5)),
      ),
      child: Icon(
        Icons.library_books_rounded,
        size: size * 0.55,
        color: AppColors.primary,
      ),
    );
  }
}
