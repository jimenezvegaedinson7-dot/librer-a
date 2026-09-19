/// Utilidades de formato de la aplicación.
class Formats {
  Formats._();

  /// Formatea un precio de forma formal: siempre con dos decimales.
  ///
  /// - `45`    -> `45.00`
  /// - `45.9`  -> `45.90`
  /// - `null`  -> `0.00`
  static String precio(double? precio) {
    return (precio ?? 0).toStringAsFixed(2);
  }

  /// Texto legible de stock para mostrar en tarjetas/detalle.
  static String stockLabel(int? stock) {
    if (stock == null || stock <= 0) return 'Agotado';
    if (stock == 1) return '1 disponible';
    return '$stock disponibles';
  }

  /// Formatea una fecha ISO (`2026-09-03T00:00:00.000Z`) como `dd/mm/aaaa`.
  /// Si la fecha es nula o vacía devuelve `—`.
  static String fecha(String? iso) {
    if (iso == null || iso.trim().isEmpty) return '—';
    var date = iso.trim();
    // Quita la parte de hora si existe para quedar solo con la fecha.
    final spaceIdx = date.indexOf('T');
    if (spaceIdx >= 0) {
      date = date.substring(0, spaceIdx);
    } else {
      final sIdx = date.indexOf(' ');
      if (sIdx >= 0) {
        date = date.substring(0, sIdx);
      }
    }
    final parts = date.split('-');
    if (parts.length == 3) {
      final anio = parts[0];
      final mes = parts[1];
      final dia = parts[2];
      if (anio.length == 4 && mes.length == 2 && dia.length == 2) {
        return '$dia/$mes/$anio';
      }
    }
    return iso;
  }
}
