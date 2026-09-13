/// Utilidades para convertir de forma segura valores que llegan del backend.
///
/// MySQL puede devolver números como `int`, `double` o incluso `String`
/// (p. ej. `"12"` o `"45.90"`). Estas funciones normalizan sin lanzar crash.
class JsonUtils {
  JsonUtils._();

  /// Convierte un valor a `int` de forma segura, o `null`.
  static int? asInt(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(_cleanNumberString(value));
  }

  /// Convierte un valor a `double` de forma segura, o `null`.
  static double? asDouble(dynamic value) {
    if (value == null) return null;
    if (value is double) return value;
    if (value is num) return value.toDouble();
    return double.tryParse(_cleanNumberString(value));
  }

  /// Convierte un valor a `String` (o `null` si está vacío).
  static String? asString(dynamic value) {
    if (value == null) return null;
    final s = value.toString().trim();
    return s.isEmpty ? null : s;
  }

  /// Convierte un valor a `bool` de forma segura.
  ///
  /// El backend puede devolver 0/1 (int), `true`/`false` (bool) o cadenas
  /// `"0"`/`"1"`. Retorna `null` si el valor no es interpretable.
  static bool? asBool(dynamic value) {
    if (value == null) return null;
    if (value is bool) return value;
    if (value is num) return value != 0;
    final s = value.toString().trim().toLowerCase();
    if (s == '1' || s == 'true') return true;
    if (s == '0' || s == 'false') return false;
    return null;
  }

  /// Limpia cadenas que representan números (p. ej. quita comas/espacios).
  static String _cleanNumberString(dynamic value) {
    return value.toString().trim().replaceAll(',', '.').trim();
  }
}
