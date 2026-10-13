import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:libreria_app/models/libro.dart';
import 'package:libreria_app/models/venta.dart';
import 'package:libreria_app/screens/entrega_y_pago_screen.dart';
import 'package:libreria_app/services/carrito_service.dart';
import 'package:libreria_app/utils/app_theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'soporte_api_local.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async {
    if (!const bool.fromEnvironment('CAPTURA_DELIVERY')) return;
    final manifest =
        jsonDecode(await rootBundle.loadString('FontManifest.json')) as List;
    for (final familia in manifest) {
      final loader = FontLoader(familia['family'] as String);
      for (final fuente in familia['fonts'] as List) {
        loader.addFont(rootBundle.load(fuente['asset'] as String));
      }
      await loader.load();
    }
  });
  for (final ancho in [320.0, 390.0]) {
    testWidgets(
      'delivery fijo S/5 sin selector de zona y recojo con dirección a $ancho px',
      (tester) async {
        await prepararAlmacenamientoLocal();
        await iniciarSesionLocal(7);
        final api = apiLocal(
          (o) async => respuestaLocal({
            'data': [
              {
                'id_zona': 1,
                'nombre': 'Ciudad de Pallasca',
                'tarifa': 5,
                'estado': 1,
              },
            ],
          }),
        );
        CarritoService.instance.agregar(
          const Libro(
            idLibro: 1,
            titulo: 'Libro local',
            precio: 100,
            stock: 5,
            estado: true,
          ),
        );
        tester.view.physicalSize = Size(ancho, 1200);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light(),
            home: EntregaYPagoScreen(api: api),
          ),
        );
        await tester.pumpAndSettle();
        expect(
          find.text('Plaza de Armas, Jr. Marañón 161, Pallasca 02835'),
          findsOneWidget,
        );
        await tester.tap(find.text('Delivery'));
        await tester.pumpAndSettle();
        expect(find.byType(DropdownButtonFormField<int>), findsNothing);
        expect(
          find.textContaining('S/5 fijo en toda la ciudad'),
          findsOneWidget,
        );
        expect(find.textContaining('S/ 105.00'), findsWidgets);
        expect(
          find.textContaining('no incluye anexos ni otros distritos'),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
        if (const bool.fromEnvironment('CAPTURA_DELIVERY')) {
          await expectLater(
            find.byType(Scaffold),
            matchesGoldenFile('../build/capturas/delivery-fijo-$ancho.png'),
          );
        }
        await tester.pumpWidget(const SizedBox());
      },
    );
  }
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
