import 'package:flutter_test/flutter_test.dart';
import 'package:libreria_app/models/venta.dart';
import 'package:libreria_app/screens/pago_en_app_screen.dart';
import 'package:libreria_app/utils/seguimiento_pedido.dart';

Venta _venta(String tipo, String estado, String entrega) => Venta.fromJson({
  'id_venta': 41,
  'tipo_entrega': tipo,
  'estado': estado,
  'estado_entrega': entrega,
});

void main() {
  test('recojo y delivery tienen pasos propios', () {
    final recojo = SeguimientoPedido.de(
      _venta('tienda', 'pagada', 'listo_recojo'),
    );
    expect(recojo.pasos.map((p) => p.etiqueta), [
      'Por preparar',
      'Listo para recoger',
      'Entregado',
    ]);
    expect(recojo.titulo, 'Listo para recoger');
    expect(recojo.mensaje, contains('#41'));
    expect(recojo.pasos.where((p) => p.actual).single.clave, 'listo_recojo');

    final delivery = SeguimientoPedido.de(
      _venta('domicilio', 'pagada', 'en_camino'),
    );
    expect(delivery.pasos.map((p) => p.etiqueta), [
      'Por preparar',
      'En camino',
      'Entregado',
    ]);
    expect(delivery.titulo, 'En camino');
    expect(delivery.pasos.where((p) => p.hecho).length, 1);
  });

  test('el final siempre es Entregado y no se deduce del estado comercial', () {
    expect(
      SeguimientoPedido.de(_venta('tienda', 'entregada', 'entregado')).titulo,
      'Entregado',
    );
    expect(
      SeguimientoPedido.de(_venta('domicilio', 'pagada', 'entregado')).titulo,
      'Entregado',
    );
    final sinEstado = Venta.fromJson({
      'estado': 'entregada',
      'tipo_entrega': 'tienda',
    });
    expect(SeguimientoPedido.de(sinEstado).pasos, isEmpty);
    expect(sinEstado.entregada, false);
    expect(sinEstado.pagada, true);
    expect(sinEstado.estadoLabel, 'Pagada');
  });

  test('preparando antiguo pertenece al tramo inicial sin inventar salida ni preparación terminada', () {
    for (final tipo in ['tienda', 'domicilio']) {
      final seg = SeguimientoPedido.de(_venta(tipo, 'pagada', 'preparando'));
      expect(seg.titulo, 'Por preparar');
      expect(seg.pasos.length, 3);
      expect(seg.pasos.where((p) => p.actual).single.clave, 'pendiente');
      expect(seg.pasos.any((p) => p.hecho), false);
    }
  });

  test('tipos y estados incompatibles no muestran un avance inventado', () {
    for (final venta in [
      _venta('tienda', 'pagada', 'en_camino'),
      _venta('domicilio', 'pagada', 'listo_recojo'),
      _venta('agencia', 'pagada', 'entregado'),
    ]) {
      expect(SeguimientoPedido.de(venta).pasos, isEmpty);
      expect(
        SeguimientoPedido.de(venta).titulo,
        'Estado de entrega no disponible',
      );
    }
  });

  test(
    'reembolso conserva la entrega histórica; revisión no confirma pago',
    () {
      final reembolso = Venta.fromJson({
        'estado': 'reembolsada',
        'estado_entrega': 'entregado',
        'tipo_entrega': 'tienda',
        'estado_reembolso': 'confirmado',
      });
      expect(reembolso.pagada, false);
      expect(reembolso.entregada, true);
      expect(
        SeguimientoPedido.de(reembolso).pasos.where((p) => p.hecho).length,
        3,
      );
      final revision = Venta.fromJson({
        'estado': 'pagada',
        'estado_entrega': 'pendiente',
        'tipo_entrega': 'domicilio',
        'payu_payment_status': 'REFUNDED',
      });
      expect(revision.requiereRevision, true);
      expect(revision.pagada, false);
      expect(SeguimientoPedido.de(revision).titulo, 'Entrega detenida');
      expect(SeguimientoPedido.de(revision).pasos.any((p) => p.hecho), false);
    },
  );

  test(
    'sin pago confirmado no hay pasos hechos; cancelado no muestra pasos',
    () {
      final espera = SeguimientoPedido.de(
        _venta('tienda', 'pendiente', 'pendiente'),
      );
      expect(espera.titulo, 'Esperando pago');
      expect(espera.pasos.any((p) => p.hecho), false);

      final cancelado = SeguimientoPedido.de(
        _venta('domicilio', 'cancelada', 'cancelado'),
      );
      expect(cancelado.tono, TonoSeguimiento.cancelado);
      expect(cancelado.pasos, isEmpty);
    },
  );

  test('la ventana de pago reconoce la página de retorno de PayU', () {
    expect(
      PagoEnAppScreen.esRetorno(
        Uri.parse('https://api.example/api/pagos/respuesta/REF-1?x=1'),
      ),
      true,
    );
    expect(
      PagoEnAppScreen.esRetorno(
        Uri.parse('https://checkout.payulatam.com/ppp-web-gateway-payu/'),
      ),
      false,
    );
  });

  test('la pasarela de PayU se reconoce para recargarla una vez', () {
    expect(
      PagoEnAppScreen.esPasarela(
        Uri.parse(
          'https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu/',
        ),
      ),
      true,
    );
    expect(
      PagoEnAppScreen.esPasarela(Uri.parse('https://checkout.payulatam.com/x')),
      true,
    );
    expect(
      PagoEnAppScreen.esPasarela(
        Uri.parse('https://payulatam.com.falso.example/x'),
      ),
      false,
    );
    expect(
      PagoEnAppScreen.esPasarela(
        Uri.parse(
          'https://libreria-api-x8kq.onrender.com/api/pagos/checkout/R1',
        ),
      ),
      false,
    );
  });
}
