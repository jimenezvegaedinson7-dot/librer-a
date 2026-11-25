

class JsonUtils {
  JsonUtils._();

  static int? asInt(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(_cleanNumberString(value));
  }

  static double? asDouble(dynamic value) {
    if (value == null) return null;
    if (value is double) return value;
    if (value is num) return value.toDouble();
    return double.tryParse(_cleanNumberString(value));
  }

  static String? asString(dynamic value) {
    if (value == null) return null;
    final s = value.toString().trim();
    return s.isEmpty ? null : s;
  }

  static bool? asBool(dynamic value) {
    if (value == null) return null;
    if (value is bool) return value;
    if (value is num) return value != 0;
    final s = value.toString().trim().toLowerCase();
    if (s == '1' || s == 'true') return true;
    if (s == '0' || s == 'false') return false;
    return null;
  }

  static String _cleanNumberString(dynamic value) {
    return value.toString().trim().replaceAll(',', '.').trim();
  }
}
