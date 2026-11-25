
class Formats {
  Formats._();

  static String precio(double? precio) {
    return (precio ?? 0).toStringAsFixed(2);
  }

  static String stockLabel(int? stock) {
    if (stock == null || stock <= 0) return 'Agotado';
    if (stock == 1) return '1 disponible';
    return '$stock disponibles';
  }

  static String fecha(String? iso) {
    if (iso == null || iso.trim().isEmpty) return '—';
    var date = iso.trim();

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
