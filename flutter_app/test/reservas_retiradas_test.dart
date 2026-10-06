import 'package:flutter_test/flutter_test.dart';
import 'package:libreria_app/services/api_service.dart';

void main() {
  test(
    'crearReserva está retirada antes de emitir una petición HTTP',
    () async {
      await expectLater(
        ApiService.instance.crearReserva(idLibro: 1, cantidad: 1),
        throwsA(
          isA<ApiException>().having(
            (e) => e.message,
            'mensaje',
            contains('PayU'),
          ),
        ),
      );
    },
  );
}
