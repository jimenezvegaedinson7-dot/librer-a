import 'package:flutter_test/flutter_test.dart';
import 'package:libreria_app/models/version_app.dart';
import 'package:libreria_app/services/actualizacion_service.dart';

void main() {
  const base =
      'https://github.com/jimenezvegaedinson7-dot/librer-a/releases/download/';

  group('urlAutorizada', () {
    test('acepta APK de los Releases oficiales por HTTPS', () {
      expect(
        ActualizacionService.urlAutorizada('${base}v1.0.1/libreria-1.0.1.apk'),
        isTrue,
      );
    });

    for (final url in [
      'http://github.com/jimenezvegaedinson7-dot/librer-a/releases/download/v1/a.apk',
      'https://github.com/otro/repo/releases/download/v1/a.apk',
      'https://ejemplo.com/libreria.apk',
      'https://github.com.evil.com/jimenezvegaedinson7-dot/librer-a/releases/download/a.apk',
      'https://github.com:8443/jimenezvegaedinson7-dot/librer-a/releases/download/a.apk',
      '$base../../../otro/a.apk',
      'no es una url',
    ]) {
      test('rechaza $url', () {
        expect(ActualizacionService.urlAutorizada(url), isFalse);
      });
    }
  });

  group('VersionApp.fromJson', () {
    final valido = {
      'version': '1.0.1',
      'versionCode': 2,
      'apkUrl': '${base}v1.0.1/libreria-1.0.1.apk',
      'sha256': 'A' * 64,
      'obligatoria': false,
      'notas': ' Mejoras y correcciones ',
    };

    test('lee una respuesta válida', () {
      final v = VersionApp.fromJson(valido)!;
      expect(v.version, '1.0.1');
      expect(v.versionCode, 2);
      expect(v.sha256, 'a' * 64);
      expect(v.obligatoria, isFalse);
      expect(v.notas, 'Mejoras y correcciones');
    });

    test('obligatoria solo si es true', () {
      expect(
        VersionApp.fromJson({...valido, 'obligatoria': 'true'})!.obligatoria,
        isFalse,
      );
      expect(
        VersionApp.fromJson({...valido, 'obligatoria': true})!.obligatoria,
        isTrue,
      );
    });

    test('sin sha256 válido no hay actualización', () {
      expect(VersionApp.fromJson({...valido, 'sha256': ''}), isNull);
      expect(VersionApp.fromJson({...valido, 'sha256': 'abc'}), isNull);
    });

    test('sin versionCode no hay actualización', () {
      expect(VersionApp.fromJson({...valido}..remove('versionCode')), isNull);
    });
  });
}
