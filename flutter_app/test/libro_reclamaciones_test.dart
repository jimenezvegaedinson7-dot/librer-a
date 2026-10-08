import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:libreria_app/models/usuario.dart';
import 'package:libreria_app/models/venta.dart';
import 'package:libreria_app/screens/libro_reclamaciones_screen.dart';
import 'package:libreria_app/services/api_service.dart';
import 'package:libreria_app/services/storage_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _Local implements HttpClientAdapter {
  final List<RequestOptions> llamadas = [];
  @override
  Future<ResponseBody> fetch(RequestOptions o, Stream<Uint8List>? r, Future<void>? c) async {
    llamadas.add(o);
    final Object cuerpo = o.path.contains('mis-ventas')
        ? {
            'success': true,
            'data': [
              {
                'id_venta': 41, 'estado': 'pagada', 'total': 45.5, 'tipo_entrega': 'domicilio',
                'direccion': 'Jr. Lima 123', 'cliente_documento': '12345678', 'cliente_tipo_documento': 'DNI',
                'detalle': [{'id_libro': 1, 'titulo': 'Rayuela', 'cantidad': 1}],
              },
              {'id_venta': 7, 'estado': 'pendiente', 'total': 10},
            ],
          }
        : {'success': true, 'mensaje': 'Registramos tu hoja N.° 2026-0001.', 'data': {'numero': '2026-0001', 'fecha_limite': '2026-10-28'}};
    return ResponseBody.fromString(jsonEncode(cuerpo), 200, headers: {
      Headers.contentTypeHeader: ['application/json'],
    });
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  testWidgets('autocompleta con la cuenta y las compras, y envía la hoja', (tester) async {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStorage.setMockInitialValues({});
    StorageService.instance.reiniciarColaParaPruebas();
    final dir = Directory.systemTemp.createTempSync('reclamos');
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      const MethodChannel('plugins.flutter.io/path_provider'),
      (_) async => dir.path,
    );
    tester.view.physicalSize = const Size(390, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final adaptador = _Local();
    final api = ApiService.paraPruebas(
      Dio(BaseOptions(baseUrl: 'https://solo-local.invalid/api'))..httpClientAdapter = adaptador,
    );
    await tester.runAsync(() => StorageService.instance.guardarUsuario(
          const Usuario(nombre: 'Ana', apellido: 'Quispe Ruiz', email: 'ana@example.invalid', telefono: '987654321'),
        ));
    StorageService.instance.reiniciarColaParaPruebas();

    final compras = [
      Venta.fromJson({
        'id_venta': 41, 'estado': 'pagada', 'total': 45.5, 'tipo_entrega': 'domicilio',
        'direccion': 'Jr. Lima 123', 'cliente_documento': '12345678', 'cliente_tipo_documento': 'DNI',
        'detalle': [{'id_libro': 1, 'titulo': 'Rayuela', 'cantidad': 1}],
      }),
      Venta.fromJson({'id_venta': 7, 'estado': 'pendiente', 'total': 10}),
    ];
    await tester.pumpWidget(MaterialApp(
      home: LibroReclamacionesScreen(api: api, cargarCompras: () async => compras),
    ));
    for (var i = 0; i < 30; i++) {
      await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 50)));
      await tester.pump(const Duration(milliseconds: 50));
    }

    String campo(String etiqueta) =>
        tester.widget<TextField>(find.widgetWithText(TextField, etiqueta)).controller!.text;
    expect(campo('Nombre completo'), 'Ana Quispe Ruiz');
    expect(campo('Correo electrónico'), 'ana@example.invalid');
    expect(campo('Teléfono'), '987654321');
    expect(campo('Número'), '12345678');
    expect(campo('Domicilio'), 'Jr. Lima 123');

    // Elegir la compra completa el bien y el monto.
    await tester.tap(find.text('Ninguna / otra'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('N.° 41 · S/ 45.50').last);
    await tester.pumpAndSettle();
    expect(campo('Descripción'), 'Rayuela');
    expect(campo('Monto (S/)'), '45.50');

    await tester.enterText(find.widgetWithText(TextField, 'Detalle'), 'El libro llegó con páginas dañadas.');
    await tester.enterText(find.widgetWithText(TextField, 'Pedido (¿qué solicitas?)'), 'Cambio del libro');
    await tester.tap(find.textContaining('Declaro que los datos'));
    await tester.pump();
    await tester.tap(find.text('Registrar hoja'));
    for (var i = 0; i < 6; i++) {
      await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 50)));
      await tester.pump(const Duration(milliseconds: 50));
    }

    final envio = adaptador.llamadas.last;
    expect(envio.path, '/reclamaciones');
    final datos = envio.data as Map;
    expect(datos['consumidor_nombre'], 'Ana Quispe Ruiz');
    expect(datos['consumidor_documento'], '12345678');
    expect(datos['id_venta'], 41);
    expect(datos['monto_reclamado'], '45.50');
    expect(find.text('Hoja N.° 2026-0001'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });
}
