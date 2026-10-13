import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:libreria_app/models/libro.dart';
import 'package:libreria_app/screens/entrega_y_pago_screen.dart';
import 'package:libreria_app/services/api_service.dart';
import 'package:libreria_app/services/carrito_service.dart';
import 'package:libreria_app/services/checkout_store.dart';
import 'package:libreria_app/utils/app_theme.dart';

import 'soporte_api_local.dart';

Map<String, dynamic> catalogoLocal([int precio = 30]) => {
  'data': [
    {
      'id_libro': 1,
      'titulo': 'Local',
      'precio': precio,
      'stock': 10,
      'estado': true,
    },
  ],
};

Future<void> abrirCheckout(WidgetTester tester, ApiService api) async {
  await prepararAlmacenamientoLocal();
  await iniciarSesionLocal(2);
  CarritoService.instance.agregar(
    const Libro(
      idLibro: 1,
      titulo: 'Local',
      precio: 30,
      stock: 10,
      estado: true,
    ),
  );
  tester.view.physicalSize = const Size(390, 1200);
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
}

Finder get documento => find.byWidgetPredicate(
  (w) => w is TextField && w.decoration?.labelText == 'Número de documento',
);
Finder get pagar => find.widgetWithText(FilledButton, 'Ir al pago seguro');

Future<void> esperarCatalogo(
  WidgetTester tester,
  Completer<void> enviada,
) async {
  for (var i = 0; i < 20 && !enviada.isCompleted; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
  expect(enviada.isCompleted, true);
}

void main() {
  testWidgets(
    'durante catálogo no se edita documento/entrega y una edición tardía inválida no envía POST',
    (tester) async {
      final catalogo = Completer<ResponseBody>();
      final enviada = Completer<void>();
      var ordenes = 0;
      final api = apiLocal((o) {
        if (o.path == '/zonas-delivery') {
          return Future.value(respuestaLocal({'data': []}));
        }
        if (o.path == '/libros') {
          enviada.complete();
          return catalogo.future;
        }
        ordenes++;
        return Future.value(respuestaLocal({}, 400));
      });
      await abrirCheckout(tester, api);
      await tester.enterText(documento, '12345678');
      final controller = tester.widget<TextField>(documento).controller!;
      await tester.ensureVisible(pagar);
      await tester.tap(pagar);
      await esperarCatalogo(tester, enviada);
      expect(tester.widget<TextField>(documento).enabled, false);
      expect(
        tester
            .widget<SegmentedButton<String>>(
              find.byType(SegmentedButton<String>),
            )
            .onSelectionChanged,
        isNull,
      );
      final entrega = find
          .ancestor(of: find.text('Delivery'), matching: find.byType(InkWell))
          .first;
      expect(tester.widget<InkWell>(entrega).onTap, isNull);
      // Una actualización tardía de un controlador (p. ej. autofill ya emitido)
      // tampoco debe eludir la revalidación al terminar la petición.
      controller.clear();
      catalogo.complete(respuestaLocal(catalogoLocal()));
      await tester.pumpAndSettle();
      expect(ordenes, 0);
      expect(find.text('Ingresa tu número de documento.'), findsOneWidget);
      expect(await CheckoutStore.instance.activo(2), isNull);
      expect(tester.widget<TextField>(documento).enabled, true);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'datos válidos después del catálogo mantienen documento, entrega y total del intento',
    (tester) async {
      final catalogo = Completer<ResponseBody>();
      final enviada = Completer<void>();
      Map<String, dynamic>? cuerpo;
      final api = apiLocal((o) {
        if (o.path == '/zonas-delivery') {
          return Future.value(respuestaLocal({'data': []}));
        }
        if (o.path == '/libros') {
          enviada.complete();
          return catalogo.future;
        }
        cuerpo = Map<String, dynamic>.from(o.data as Map);
        return Future.value(
          respuestaLocal({
            'data': {
              'id_venta': 77,
              'order_id': 'ref77',
              'status': 'APPROVED',
              'estado_venta': 'pagada',
              'total': 30,
            },
          }, 201),
        );
      });
      await abrirCheckout(tester, api);
      await tester.enterText(documento, '12345678');
      await tester.ensureVisible(pagar);
      await tester.tap(pagar);
      await esperarCatalogo(tester, enviada);
      catalogo.complete(respuestaLocal(catalogoLocal()));
      await tester.pumpAndSettle();
      expect(cuerpo?['cliente_documento'], '12345678');
      expect(cuerpo?['cliente_tipo_documento'], 'DNI');
      expect(cuerpo?['tipo_entrega'], 'tienda');
      expect(cuerpo?.containsKey('direccion'), false);
      expect(
        (await CheckoutStore.instance.leer(2)).single.totalMostradoCentimos,
        3000,
      );
      expect(find.text('¡Pago confirmado!'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'un cambio de precio exige confirmar el nuevo total con delivery fijo S/5',
    (tester) async {
      var ordenes = 0;
      Map<String, dynamic>? cuerpo;
      final api = apiLocal((o) async {
        if (o.path == '/zonas-delivery') {
          return respuestaLocal({
            'data': [
              {
                'id_zona': 1,
                'nombre': 'Ciudad de Pallasca',
                'tarifa': 5,
                'estado': 1,
              },
            ],
          });
        }
        if (o.path == '/libros') return respuestaLocal(catalogoLocal(32));
        ordenes++;
        cuerpo = Map<String, dynamic>.from(o.data as Map);
        return respuestaLocal({
          'data': {
            'id_venta': 77,
            'order_id': 'ref77',
            'status': 'APPROVED',
            'estado_venta': 'pagada',
            'total': 37,
          },
        }, 201);
      });
      await abrirCheckout(tester, api);
      await tester.tap(find.text('Delivery'));
      await tester.pumpAndSettle();
      final direccion = find.byWidgetPredicate(
        (w) =>
            w is TextField &&
            w.decoration?.labelText == 'Tu dirección en Pallasca',
      );
      await tester.enterText(direccion, 'Calle local 123');
      await tester.ensureVisible(find.byType(CheckboxListTile));
      await tester.tap(find.byType(CheckboxListTile));
      await tester.ensureVisible(documento);
      await tester.enterText(documento, '12345678');
      await tester.ensureVisible(pagar);
      await tester.tap(pagar);
      await tester.pumpAndSettle();
      expect(ordenes, 0);
      expect(await CheckoutStore.instance.activo(2), isNull);
      expect(
        find.text(
          'Actualizamos los precios o el envío. Revisa el total y vuelve a confirmar la compra.',
        ),
        findsOneWidget,
      );
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
      await tester.tap(pagar);
      await tester.pumpAndSettle();
      expect(ordenes, 1);
      expect(cuerpo?['direccion'], 'Calle local 123');
      expect(cuerpo?['tipo_entrega'], 'domicilio');
      expect(cuerpo?['id_zona_delivery'], 1);
      expect(cuerpo?['cliente_documento'], '12345678');
      expect(
        (await CheckoutStore.instance.leer(2)).single.totalMostradoCentimos,
        3700,
      );
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
