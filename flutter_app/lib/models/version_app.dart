import '../utils/json_utils.dart';

/// Versión publicada de la app (respuesta de `GET /api/app/version`).
class VersionApp {
  final String version;
  final int versionCode;
  final String apkUrl;
  final String sha256;
  final bool obligatoria;
  final String notas;

  const VersionApp({
    required this.version,
    required this.versionCode,
    required this.apkUrl,
    required this.sha256,
    required this.obligatoria,
    required this.notas,
  });

  /// Devuelve `null` si faltan datos imprescindibles.
  static VersionApp? fromJson(Map<String, dynamic> json) {
    final version = JsonUtils.asString(json['version']);
    final versionCode = JsonUtils.asInt(json['versionCode']);
    final apkUrl = JsonUtils.asString(json['apkUrl']);
    final sha256 = JsonUtils.asString(json['sha256'])?.toLowerCase();
    if (version == null ||
        versionCode == null ||
        apkUrl == null ||
        sha256 == null ||
        !RegExp(r'^[a-f0-9]{64}$').hasMatch(sha256)) {
      return null;
    }
    return VersionApp(
      version: version,
      versionCode: versionCode,
      apkUrl: apkUrl,
      sha256: sha256,
      obligatoria: json['obligatoria'] == true,
      notas: JsonUtils.asString(json['notas'])?.trim() ?? '',
    );
  }
}
