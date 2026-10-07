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
    final recojo = SeguimientoPedido.de(_venta('tienda', 'pagada', 'listo_recojo'));
    expect(recojo.pasos.map((p) => p.etiqueta), ['Recibido', 'Preparando', 'Listo', 'Recogido']);
    expect(recojo.titulo, 'Listo para recoger');
    expect(recojo.mensaje, contains('#41'));
    expect(recojo.pasos.where((p) => p.actual).single.clave, 'listo_recojo');

    final delivery = SeguimientoPedido.de(_venta('domicilio', 'pagada', 'en_camino'));
    expect(delivery.pasos.map((p) => p.etiqueta), ['Recibido', 'Preparando', 'En camino', 'Entregado']);
    expect(delivery.titulo, 'Tu pedido va en camino');
    expect(delivery.pasos.where((p) => p.hecho).length, 3);
  });

  test('el final se nombra según el tipo de entrega', () {
    expect(SeguimientoPedido.de(_venta('tienda', 'entregada', 'entregado')).titulo, 'Pedido recogido');
    expect(SeguimientoPedido.de(_venta('domicilio', 'entregada', 'entregado')).titulo, 'Pedido entregado');
  });

  test('sin pago confirmado no hay pasos hechos; cancelado no muestra pasos', () {
    final espera = SeguimientoPedido.de(_venta('tienda', 'pendiente', 'pendiente'));
    expect(espera.titulo, 'Esperando pago');
    expect(espera.pasos.any((p) => p.hecho), false);

    final cancelado = SeguimientoPedido.de(_venta('domicilio', 'cancelada', 'cancelado'));
    expect(cancelado.tono, TonoSeguimiento.cancelado);
    expect(cancelado.pasos, isEmpty);
  });

  test('la ventana de pago reconoce la página de retorno de PayU', () {
    expect(PagoEnAppScreen.esRetorno(Uri.parse('https://api.example/api/pagos/respuesta/REF-1?x=1')), true);
    expect(PagoEnAppScreen.esRetorno(Uri.parse('https://checkout.payulatam.com/ppp-web-gateway-payu/')), false);
  });
}
