import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:libreria_app/screens/home_screen.dart';
import 'package:libreria_app/screens/perfil_screen.dart';
import 'package:libreria_app/screens/personalizacion_screen.dart';
import 'package:libreria_app/services/api_service.dart';
import 'package:libreria_app/services/tema_controller.dart';
import 'package:libreria_app/utils/app_theme.dart';
import 'package:libreria_app/widgets/app_bottom_navigation.dart';

import 'soporte_api_local.dart';
import 'perfil_presentacion_test.dart' show cargarFuentesLocales;

void main() {
  setUpAll(cargarFuentesLocales);
  testWidgets(
    'Mi perfil abre directamente desde Inicio sin menú ni consulta extra al catálogo',
    (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await prepararAlmacenamientoLocal();
      await iniciarSesionLocal(7);
      await TemaController.instance.cargar();
      var perfiles = 0;
      var catalogos = 0;
      ApiService.instance.usarAdaptadorPruebas(
        TransporteAislado((o) async {
          if (o.path == '/usuarios/perfil') {
            perfiles++;
            return respuestaLocal({
              'data': {
                'id_usuario': 7,
                'nombre': 'Ana',
                'apellido': 'Torres',
                'email': 'ana@example.test',
                'telefono': '999111222',
                'rol': 'cliente',
              },
            });
          }
          if (o.path == '/libros') catalogos++;
          return respuestaLocal({'data': []});
        }),
      );
      await tester.pumpWidget(
        MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: AppTheme.light(),
          home: const HomeScreen(),
        ),
      );
      await tester.pumpAndSettle();
      expect(perfiles, 0);
      final catalogosIniciales = catalogos;
      final acceso = find.descendant(
        of: find.byType(AppBottomNavigation),
        matching: find.text('Mi perfil'),
      );
      await tester.tap(acceso);
      await tester.pumpAndSettle();
      expect(find.byType(PerfilScreen), findsOneWidget);
      expect(find.text('Ana Torres'), findsOneWidget);
      expect(find.text('Menú'), findsNothing);
      expect(find.byType(Drawer), findsNothing);
      expect(find.byKey(const ValueKey('abrir-configuracion')), findsNothing);
      expect(perfiles, 1);
      expect(catalogos, catalogosIniciales);
      await tester.scrollUntilVisible(
        find.text('Personalización'),
        250,
        scrollable: find.descendant(
          of: find.byType(PerfilScreen),
          matching: find.byType(Scrollable),
        ),
      );
      await tester.tap(find.text('Personalización'));
      await tester.pumpAndSettle();
      expect(find.byType(PersonalizacionScreen), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.tap(
        find.descendant(
          of: find.byType(AppBottomNavigation),
          matching: find.text('Inicio'),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(acceso);
      await tester.pumpAndSettle();
      expect(perfiles, 2);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'perfil conserva visor de foto, favoritos, compras, ayuda y cierre de sesión',
    (tester) async {
      await prepararAlmacenamientoLocal();
      await iniciarSesionLocal(7);
      await TemaController.instance.cargar();
      ApiService.instance.usarAdaptadorPruebas(
        TransporteAislado(
          (o) async => respuestaLocal({
            'data': {
              'id_usuario': 7,
              'nombre': 'Ana',
              'apellido': 'Torres',
              'email': 'ana@example.test',
              'foto_perfil': '/uploads/perfiles/prueba.png',
              'rol': 'cliente',
            },
          }),
        ),
      );
      await tester.pumpWidget(
        MaterialApp(theme: AppTheme.light(), home: const PerfilScreen()),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Cambiar foto de perfil'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Ver imagen'));
      await tester.pumpAndSettle();
      expect(find.byType(InteractiveViewer), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      for (final accion in [
        'Mis compras',
        'Mis favoritos',
        'Mi carrito',
        'Libro de Reclamaciones',
        'Eliminar mi cuenta',
        'Cerrar sesión',
      ]) {
        await tester.scrollUntilVisible(
          find.text(accion),
          accion == 'Cerrar sesión' ? -150 : 200,
        );
        await tester.pumpAndSettle();
        expect(find.text(accion), findsOneWidget);
      }
      await tester.tap(find.text('Cerrar sesión'));
      await tester.pumpAndSettle();
      expect(find.byType(AlertDialog), findsOneWidget);
      await tester.tap(find.text('Cancelar'));
      await tester.pumpAndSettle();
      expect(find.byType(PerfilScreen), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
