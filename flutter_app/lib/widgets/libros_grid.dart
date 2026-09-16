import 'package:flutter/material.dart';

/// Utilidad para construir grids responsivos de libros.
///
/// Define automáticamente:
/// - El número de columnas.
/// - La separación entre tarjetas.
/// - La altura disponible de cada tarjeta.
///
/// Está pensado para evitar problemas de overflow y mantener
/// una presentación consistente en teléfonos, tablets y pantallas grandes.
class LibrosGrid {
  LibrosGrid._();

  /// Devuelve el número de columnas según el ancho disponible.
  static int columnCount(double width) {
    if (width >= 1000) return 5;
    if (width >= 750) return 4;
    if (width >= 520) return 3;

    return 2;
  }

  /// Devuelve la proporción ancho/alto de cada tarjeta.
  ///
  /// Un valor menor genera tarjetas más altas.
  /// Esto permite mostrar correctamente:
  /// - portada
  /// - título
  /// - autor
  /// - categoría
  /// - precio
  /// - stock
  static double aspectRatio(double width) {
    final int columns = columnCount(width);

    // Se descuenta aproximadamente el padding lateral y los espacios
    // entre columnas para obtener un ancho más realista por tarjeta.
    final double horizontalPadding = 40;
    final double spacing = (columns - 1) * 16;

    final double availableWidth = width - horizontalPadding - spacing;
    final double cellWidth = availableWidth / columns;

    if (cellWidth < 150) {
      return 0.52;
    }

    if (cellWidth < 180) {
      return 0.55;
    }

    if (cellWidth < 220) {
      return 0.60;
    }

    return 0.65;
  }

  /// Crea el delegate utilizado por SliverGrid.
  static SliverGridDelegateWithFixedCrossAxisCount delegate(double width) {
    return SliverGridDelegateWithFixedCrossAxisCount(
      crossAxisCount: columnCount(width),
      mainAxisSpacing: 20,
      crossAxisSpacing: 16,
      childAspectRatio: aspectRatio(width),
    );
  }
}
