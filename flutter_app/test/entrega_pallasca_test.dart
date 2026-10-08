import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:libreria_app/models/libro.dart';
import 'package:libreria_app/models/venta.dart';
import 'package:libreria_app/screens/entrega_y_pago_screen.dart';
import 'package:libreria_app/services/carrito_service.dart';
import 'package:libreria_app/utils/app_theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  test(
    'el historial Lima conserva ubicación/costo y nunca se etiqueta Pallasca',
    () {
      final venta = Venta.fromJson({
        'id_venta': 1,
        'tipo_entrega': 'domicilio',
        'distrito': 'Distrito original',
        'provincia': 'Lima',
        'direccion': 'Dirección original',
        'referencia': 'Referencia original',
        'costo_envio': '12.50',
        'total': '212.50',
      });
      expect(venta.esPallasca, false);
      expect(venta.entregaLabel, 'A domicilio');
      expect(venta.ubicacionEntrega, 'Distrito original, Lima');
      expect(venta.costoEnvio, 12.5);
      expect(venta.total, 212.5);
      expect(venta.referencia, 'Referencia original');
      expect(
        Venta.fromJson({'tipo_entrega': 'tienda'}).entregaLabel,
        'Recoger en tienda',
      );
    },
  );
  test('compra local lee la instantánea de zona, no nombres históricos', () {
    final delivery = Venta.fromJson({
      'cobertura_entrega': 'pallasca',
      'tipo_entrega': 'domicilio',
      'zona_delivery_nombre': 'Zona al comprar',
      'costo_envio': '7.50',
      'total': '207.50',
    });
    expect(delivery.entregaLabel, 'Delivery dentro de Pallasca');
    expect(delivery.ubicacionEntrega, 'Zona al comprar');
    expect(delivery.costoEnvio, 7.5);
    final recojo = Venta.fromJson({
      'cobertura_entrega': 'pallasca',
      'tipo_entrega': 'tienda',
      'costo_envio': 0,
    });
    expect(recojo.entregaLabel, 'Recojo en Pallasca');
    expect(recojo.ubicacionEntrega, '');
    expect(recojo.costoEnvio, 0);
  });
  for (final ancho in [320.0, 390.0]) {
    testWidgets(
      'checkout ofrece recojo gratuito sin dirección ni zona a $ancho px',
      (tester) async {
        SharedPreferences.setMockInitialValues({});
        final carrito = CarritoService.instance;
        carrito.vaciarSesion();
        carrito.agregar(
          const Libro(
            idLibro: 1,
            titulo: 'Libro de prueba',
            precio: 100,
            stock: 5,
            estado: true,
          ),
        );
        addTearDown(carrito.vaciarSesion);
        tester.view.physicalSize = Size(ancho, 1000);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light(),
            home: const EntregaYPagoScreen(),
          ),
        );
        await tester.pump(const Duration(seconds: 1));
        expect(find.text('Recojo en tienda'), findsOneWidget);
        expect(find.text('Delivery'), findsOneWidget);
        expect(find.text('Gratis'), findsWidgets);
        expect(find.text('Distrito'), findsNothing);
        expect(find.widgetWithText(TextField, 'Dirección'), findsNothing);
        expect(find.byType(DropdownButtonFormField<int>), findsNothing);
        expect(tester.takeException(), isNull);
      },
    );
  }
}
