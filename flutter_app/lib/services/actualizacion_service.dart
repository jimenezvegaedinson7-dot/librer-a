import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';

import '../models/version_app.dart';
import '../utils/constants.dart';

/// Error del actualizador con un mensaje apto para mostrar al usuario.
class ActualizacionException implements Exception {
  final String mensaje;

  /// `true` si falta el permiso "Instalar apps desconocidas" para esta app.
  final bool faltaPermiso;

  const ActualizacionException(this.mensaje, {this.faltaPermiso = false});

  @override
  String toString() => mensaje;
}

/// Actualizaciones de la app Android mediante APK, sin Google Play.
///
/// 1. Consulta `GET /api/app/version` y compara su `versionCode` con el
///    instalado.
/// 2. Solo acepta APK de los Releases del repositorio oficial por HTTPS.
/// 3. Descarga con progreso y comprueba el SHA-256 publicado.
/// 4. El código nativo verifica paquete, firma y versión, y abre el
///    instalador oficial de Android (el usuario siempre confirma).
class ActualizacionService {
  ActualizacionService._();

  static final ActualizacionService instance = ActualizacionService._();

  static const MethodChannel _canal = MethodChannel(
    'com.jimenezvega.libreria/actualizador',
  );

  /// Único origen autorizado para descargar el APK.
  static const String origenAutorizado =
      'https://github.com/jimenezvegaedinson7-dot/librer-a/releases/download/';

  /// Hosts a los que GitHub redirige la descarga del Release.
  static const Set<String> _hostsDescarga = {
    'github.com',
    'objects.githubusercontent.com',
    'release-assets.githubusercontent.com',
  };

  /// SOLO PARA PRUEBAS: origen adicional aceptado si se compila con
  /// `--dart-define=ACTUALIZADOR_ORIGEN_PRUEBA=...`. Vacío en producción.
  static const String _origenPrueba = String.fromEnvironment(
    'ACTUALIZADOR_ORIGEN_PRUEBA',
  );

  final Dio _dio = Dio(
    BaseOptions(
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(minutes: 5),
    ),
  );

  /// El actualizador solo funciona en la app Android.
  bool get disponible => !kIsWeb && Platform.isAndroid;

  /// `true` si [url] pertenece al origen autorizado (o al de pruebas).
  static bool urlAutorizada(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null) return false;
    if (_origenPrueba.isNotEmpty && url.startsWith(_origenPrueba)) return true;
    // Uri.parse normaliza los ".." de la ruta: se revisa la ruta ya
    // normalizada y, además, se rechaza cualquier ".." en el texto original.
    return uri.scheme == 'https' &&
        uri.host == 'github.com' &&
        !uri.hasPort &&
        url.startsWith(origenAutorizado) &&
        !url.contains('..') &&
        uri.path.startsWith(
          '/jimenezvegaedinson7-dot/librer-a/releases/download/',
        );
  }

  /// Devuelve la versión publicada si es más reciente que la instalada.
  /// Si no hay novedad, falla la red o la respuesta no es válida, `null`.
  Future<VersionApp?> buscarActualizacion() async {
    if (!disponible) return null;
    try {
      final respuesta = await _dio.get<dynamic>(
        '${Constants.apiBaseUrl}/app/version',
      );
      final data = respuesta.data;
      if (data is! Map) return null;
      final publicada = VersionApp.fromJson(Map<String, dynamic>.from(data));
      if (publicada == null || !urlAutorizada(publicada.apkUrl)) return null;

      final instalada = await PackageInfo.fromPlatform();
      final codigoInstalado = int.tryParse(instalada.buildNumber) ?? 0;
      return publicada.versionCode > codigoInstalado ? publicada : null;
    } catch (_) {
      // Sin conexión o backend no disponible: se reintentará en el
      // próximo inicio de la app.
      return null;
    }
  }

  /// Descarga el APK, verifica origen y SHA-256, y abre el instalador.
  ///
  /// [onProgreso] recibe valores de 0 a 1 (o `null` si el tamaño es
  /// desconocido).
  Future<void> descargarEInstalar(
    VersionApp version, {
    required void Function(double? progreso) onProgreso,
    void Function()? onVerificando,
  }) async {
    if (!urlAutorizada(version.apkUrl)) {
      throw const ActualizacionException(
        'La descarga no proviene del origen autorizado.',
      );
    }

    if (!await _puedeInstalar()) {
      throw const ActualizacionException(
        'Para actualizar, permite que Librería instale aplicaciones.',
        faltaPermiso: true,
      );
    }

    final carpeta = Directory(
      '${(await getApplicationCacheDirectory()).path}/actualizaciones',
    );
    if (await carpeta.exists()) await carpeta.delete(recursive: true);
    await carpeta.create(recursive: true);
    final archivo = File('${carpeta.path}/libreria-${version.versionCode}.apk');

    try {
      final respuesta = await _dio.download(
        version.apkUrl,
        archivo.path,
        onReceiveProgress: (recibido, total) =>
            onProgreso(total > 0 ? recibido / total : null),
        options: Options(followRedirects: true, maxRedirects: 5),
      );
      final destino = respuesta.realUri;
      final esPrueba =
          _origenPrueba.isNotEmpty &&
          destino.toString().startsWith(_origenPrueba);
      if (!esPrueba &&
          (destino.scheme != 'https' ||
              !_hostsDescarga.contains(destino.host))) {
        throw const ActualizacionException(
          'La descarga fue redirigida a un origen no autorizado.',
        );
      }
    } on DioException {
      throw const ActualizacionException(
        'No se pudo descargar la actualización. Revisa tu conexión.',
      );
    }

    onVerificando?.call();
    final huella = (await sha256.bind(archivo.openRead()).first).toString();
    if (huella != version.sha256) {
      await archivo.delete();
      throw const ActualizacionException(
        'El archivo descargado no coincide con la versión publicada.',
      );
    }

    try {
      await _canal.invokeMethod<bool>('instalarApk', {'ruta': archivo.path});
    } on PlatformException catch (e) {
      throw ActualizacionException(switch (e.code) {
        'FIRMA' => 'El archivo no está firmado por Librería.',
        'PAQUETE' => 'El archivo no corresponde a esta aplicación.',
        'VERSION' => 'El archivo no es una versión más reciente.',
        _ => 'No se pudo abrir el instalador de Android.',
      });
    }
  }

  Future<bool> _puedeInstalar() async =>
      await _canal.invokeMethod<bool>('puedeInstalar') ?? false;

  /// Abre los ajustes para permitir "Instalar apps desconocidas".
  Future<void> abrirPermisoInstalacion() =>
      _canal.invokeMethod<void>('abrirPermisoInstalacion');
}
