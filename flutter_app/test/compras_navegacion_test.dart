import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:libreria_app/screens/mis_compras_screen.dart';
import 'package:libreria_app/services/api_service.dart';
import 'package:libreria_app/utils/app_theme.dart';

import 'soporte_api_local.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  for (final tipo in ['tienda', 'domicilio']) {
    testWidgets(
      'Detalle abierto $tipo se sincroniza al reanudar y consultar sin adelantar entrega',
      (tester) async {
        await prepararAlmacenamientoLocal();
        await iniciarSesionLocal(7);
        var estado = 'pendiente';
        var consultas = 0;
        var fallar = false;
        Future<void> esperarConsulta(int cantidad) async {
          // Reanudar no espera la cadena asíncrona de sesión/checkout/Dio.
          // pumpAndSettle solo espera frames, no solicitudes pendientes.
          for (var i = 0; i < 50 && consultas < cantidad; i++) {
            await tester.pump(const Duration(milliseconds: 20));
          }
          await tester.pumpAndSettle();
          expect(consultas, cantidad);
        }

        ApiService.instance.usarAdaptadorPruebas(
          TransporteAislado((options) async {
            expectSync(options.path, '/ventas/mis-ventas');
            expectSync(options.method, 'GET');
            consultas++;
            if (fallar) {
              return respuestaLocal({
                'success': false,
                'mensaje': 'Temporalmente no disponible',
              }, 503);
            }
            return respuestaLocal({
              'success': true,
              'data': [
                {
                  'id_venta': 41,
                  'estado': 'pagada',
                  'payu_payment_status': 'APPROVED',
                  'estado_entrega': estado,
                  'tipo_entrega': tipo,
                  'total': 25,
                },
              ],
            });
          }),
        );
        final key = GlobalKey<MisComprasScreenState>();
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light(),
            home: MisComprasScreen(key: key),
          ),
        );
        await tester.pumpAndSettle();
        await tester.tap(find.text('Compra #41'));
        await tester.pumpAndSettle();
        final detalle = find.byType(BottomSheet);
        Finder dentro(String texto) =>
            find.descendant(of: detalle, matching: find.text(texto));
        expect(dentro('Pago'), findsOneWidget);
        expect(dentro('Pagada'), findsOneWidget);
        expect(dentro('Por preparar'), findsNWidgets(2));
        expect(
          find.descendant(
            of: detalle,
            matching: find.byIcon(Icons.check_rounded),
          ),
          findsNothing,
        );
        estado = tipo == 'tienda' ? 'listo_recojo' : 'en_camino';
        tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
        tester.binding.handleAppLifecycleStateChanged(
          AppLifecycleState.resumed,
        );
        await esperarConsulta(2);
        expect(
          dentro(tipo == 'tienda' ? 'Listo para recoger' : 'En camino'),
          findsNWidgets(2),
        );
        expect(
          dentro(tipo == 'tienda' ? 'En camino' : 'Listo para recoger'),
          findsNothing,
        );
        expect(
          find.descendant(
            of: detalle,
            matching: find.byIcon(Icons.check_rounded),
          ),
          findsOneWidget,
        );
        // Un error conserva el último dato real; no marca Entregado.
        fallar = true;
        final recarga = key.currentState!.recargar();
        await tester.pumpAndSettle();
        await recarga;
        expect(
          find.descendant(
            of: detalle,
            matching: find.byIcon(Icons.check_rounded),
          ),
          findsOneWidget,
        );
        fallar = false;
        estado = 'entregado';
        await tester.pump(const Duration(seconds: 61));
        await esperarConsulta(4);
        expect(dentro('Entregado'), findsNWidgets(2));
        expect(dentro('Pagada'), findsOneWidget);
        expect(
          find.descendant(
            of: detalle,
            matching: find.byIcon(Icons.check_rounded),
          ),
          findsNWidgets(3),
        );
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
      },
    );
  }
  testWidgets(
    'Compras incrustada consulta solo al activarse y conserva navegación sin historial',
    (tester) async {
      await prepararAlmacenamientoLocal();
      await iniciarSesionLocal(7);
      final consultas = <String>[];
      ApiService.instance.usarAdaptadorPruebas(
        TransporteAislado((options) async {
          consultas.add(options.path);
          return respuestaLocal({'success': true, 'data': []});
        }),
      );
      final key = GlobalKey<MisComprasScreenState>();
      Widget pantalla(bool activa) => MaterialApp(
        theme: AppTheme.light(),
        home: MisComprasScreen(key: key, embedded: true, activa: activa),
      );
      await tester.pumpWidget(pantalla(false));
      await tester.pump();
      expect(consultas, isEmpty);
      await tester.pumpWidget(pantalla(true));
      await tester.pumpAndSettle();
      expect(consultas, ['/ventas/mis-ventas']);
      expect(find.text('Pedidos · Mis compras'), findsOneWidget);
      expect(find.text('Reservas'), findsNothing);
      expect(find.byType(AppBar), findsNothing);
      final recarga = key.currentState!.recargar();
      await tester.pumpAndSettle();
      await recarga;
      expect(consultas.length, 2);
      await tester.pumpWidget(pantalla(false));
      await tester.pump(const Duration(seconds: 61));
      expect(consultas.length, 2);
      expect(consultas.any((path) => path.contains('reservas')), isFalse);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
