import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:libreria_app/screens/mis_compras_screen.dart';
import 'package:libreria_app/services/api_service.dart';
import 'package:libreria_app/utils/app_theme.dart';

import 'soporte_api_local.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
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
