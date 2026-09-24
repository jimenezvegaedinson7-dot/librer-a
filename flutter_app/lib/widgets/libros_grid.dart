/// Utilidad para grids responsivos de libros.
class LibrosGrid {
  LibrosGrid._();

  /// Devuelve el número de columnas según el ancho disponible.
  static int columnCount(double width) {
    if (width >= 1000) return 5;
    if (width >= 750) return 4;
    if (width >= 520) return 3;

    return 2;
  }
}
