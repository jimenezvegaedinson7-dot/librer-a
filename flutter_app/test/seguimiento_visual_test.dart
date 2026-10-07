import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:libreria_app/models/venta.dart';
import 'package:libreria_app/screens/mis_compras_screen.dart';

Future<void> _pintar(
  WidgetTester tester,
  Map<String, dynamic> json,
  double ancho,
) async {
  tester.view.physicalSize = Size(ancho, 400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: Padding(
          padding: const EdgeInsets.all(16),
          child: seguimientoPedidoParaPruebas(Venta.fromJson(json)),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  for (final ancho in [320.0, 412.0]) {
    testWidgets('los cuatro pasos quedan alineados a $ancho px', (
      tester,
    ) async {
      await _pintar(tester, {
        'id_venta': 41,
        'tipo_entrega': 'tienda',
        'estado': 'pagada',
        'estado_entrega': 'listo_recojo',
      }, ancho);
      expect(tester.takeException(), isNull);
      // Todos los círculos (hechos y pendientes) tienen el mismo centro vertical.
      final circulos = find.byWidgetPredicate(
        (w) => w is SizedBox && w.width == 30 && w.height == 30,
      );
      expect(circulos, findsNWidgets(4));
      final centros = circulos
          .evaluate()
          .map((e) => tester.getCenter(find.byWidget(e.widget)).dy)
          .toSet();
      expect(centros.length, 1);
      // Las etiquetas empiezan a la misma altura.
      final tops = [
        'Recibido',
        'Preparando',
        'Listo',
        'Recogido',
      ].map((t) => tester.getTopLeft(find.text(t)).dy).toSet();
      expect(tops.length, 1);
      // Tres pasos completados muestran su check.
      expect(find.byIcon(Icons.check_rounded), findsNWidgets(3));
    });
  }

  testWidgets('delivery en camino y pedido pendiente de pago', (tester) async {
    await _pintar(tester, {
      'id_venta': 7,
      'tipo_entrega': 'domicilio',
      'estado': 'pagada',
      'estado_entrega': 'en_camino',
    }, 360);
    expect(find.text('En camino'), findsOneWidget);
    expect(find.byIcon(Icons.check_rounded), findsNWidgets(3));

    await _pintar(tester, {
      'id_venta': 8,
      'tipo_entrega': 'domicilio',
      'estado': 'pendiente',
      'estado_entrega': 'pendiente',
    }, 360);
    expect(find.text('Esperando pago'), findsOneWidget);
    expect(find.byIcon(Icons.check_rounded), findsNothing);
  });

  testWidgets('captura visual del seguimiento', (tester) async {
    await _pintar(tester, {
      'id_venta': 41,
      'tipo_entrega': 'tienda',
      'estado': 'pagada',
      'estado_entrega': 'listo_recojo',
    }, 360);
    await expectLater(
      find.byType(Scaffold),
      matchesGoldenFile('../build/capturas/seguimiento.png'),
    );
  }, skip: const bool.fromEnvironment('SIN_CAPTURA', defaultValue: true));
}
