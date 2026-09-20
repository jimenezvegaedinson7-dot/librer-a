import 'package:flutter_test/flutter_test.dart';
import 'package:libreria_app/utils/idempotencia.dart';

void main() {
  test('genera claves válidas para checkout (max 64 chars, sin negativos)', () {
    for (var intento = 0; intento < 100; intento++) {
      final clave = generarClaveIdempotencia();

      expect(clave, matches(RegExp(r'^\d+-\d+$')));
      expect(clave.length, lessThanOrEqualTo(64));
    }
  });
}
