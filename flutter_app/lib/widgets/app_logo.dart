import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;

import '../utils/app_colors.dart';
import '../utils/constants.dart';

/// Logo reutilizable de la librería.
///
/// Usa `assets/images/logo_libreria.png`. Si la imagen todavía no existe en el
/// proyecto, muestra automáticamente un placeholder elegante (libro sobre un
/// contenedor circular) para que la app nunca se rompa.
class AppLogo extends StatefulWidget {
  final double? width;
  final double? height;
  final BoxFit fit;

  /// Si es `true`, muestra el placeholder aunque exista la imagen (útil para
  /// previsualizar el diseño o en pantallas oscuras).
  final bool forcePlaceholder;

  const AppLogo({
    super.key,
    this.width,
    this.height,
    this.fit = BoxFit.contain,
    this.forcePlaceholder = false,
  });

  @override
  State<AppLogo> createState() => _AppLogoState();
}

class _AppLogoState extends State<AppLogo> {
  bool? _assetExists;

  @override
  void initState() {
    super.initState();
    if (!widget.forcePlaceholder) {
      _checkAsset();
    }
  }

  Future<void> _checkAsset() async {
    try {
      await rootBundle.load(Constants.logoAsset);
      if (mounted) setState(() => _assetExists = true);
    } catch (_) {
      // El asset no existe todavía; se usará el placeholder.
      if (mounted) setState(() => _assetExists = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.forcePlaceholder) {
      return _Placeholder(width: widget.width, height: widget.height);
    }
    if (_assetExists == null) {
      return _Placeholder(width: widget.width, height: widget.height);
    }
    if (!_assetExists!) {
      return _Placeholder(width: widget.width, height: widget.height);
    }

    return Image.asset(
      Constants.logoAsset,
      width: widget.width,
      height: widget.height,
      fit: widget.fit,
      errorBuilder: (_, _, _) =>
          _Placeholder(width: widget.width, height: widget.height),
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
        Icons.menu_book_rounded,
        size: size * 0.55,
        color: AppColors.primary,
      ),
    );
  }
}
