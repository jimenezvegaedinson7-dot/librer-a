import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:libreria_app/screens/perfil_screen.dart';
import 'package:libreria_app/screens/security/editar_perfil_screen.dart';
import 'package:libreria_app/services/api_service.dart';
import 'package:libreria_app/services/storage_service.dart';
import 'package:libreria_app/services/tema_controller.dart';
import 'package:libreria_app/utils/app_theme.dart';

import 'perfil_presentacion_test.dart' show cargarFuentesLocales;
import 'soporte_api_local.dart';

void main() {
  setUpAll(cargarFuentesLocales);

  for (final campo in CampoPerfil.values) {
    testWidgets(
      'editar ${campo.name} muestra y envía solo el dato seleccionado',
      (tester) async {
        await prepararAlmacenamientoLocal();
        await iniciarSesionLocal(7);
        await TemaController.instance.cargar();
        tester.view.physicalSize = const Size(390, 844);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        var datos = <String, dynamic>{
          'id_usuario': 7,
          'nombre': 'Ana',
          'apellido': 'Torres',
          'email': 'ana@example.test',
          'telefono': '999111222',
          'rol': 'cliente',
          'two_factor_enabled': 1,
        };
        Map<String, dynamic>? enviado;
        ApiService.instance.usarAdaptadorPruebas(
          TransporteAislado((o) async {
            expectSync(o.path, '/usuarios/perfil');
            if (o.method == 'PUT') {
              enviado = Map<String, dynamic>.from(o.data as Map);
              datos = {...datos, ...enviado!};
            }
            return respuestaLocal({'data': datos});
          }),
        );
        await tester.pumpWidget(
          MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: AppTheme.light(),
            home: const PerfilScreen(),
          ),
        );
        await tester.pumpAndSettle();
        await tester.ensureVisible(
          find.byKey(ValueKey('editar-${campo.name}')),
        );
        await tester.tap(find.byKey(ValueKey('editar-${campo.name}')));
        await tester.pumpAndSettle();
        expect(find.byType(EditarPerfilScreen), findsOneWidget);
        expect(find.byType(CircleAvatar), findsNothing);
        expect(
          find.byType(TextFormField),
          campo == CampoPerfil.nombre ? findsNWidgets(2) : findsOneWidget,
        );
        for (final otro in CampoPerfil.values.where((c) => c != campo)) {
          expect(find.byKey(ValueKey('campo-${otro.name}')), findsNothing);
        }
        expect(
          find.text('ana@example.test'),
          campo == CampoPerfil.correo ? findsOneWidget : findsNothing,
        );
        expect(
          find.text('999111222'),
          campo == CampoPerfil.telefono ? findsOneWidget : findsNothing,
        );
        final valor = find.byKey(ValueKey('campo-${campo.name}'));
        await tester.enterText(valor, switch (campo) {
          CampoPerfil.nombre => 'Lucía',
          CampoPerfil.correo => 'lucia@example.test',
          CampoPerfil.telefono => '988777666',
        });
        if (campo == CampoPerfil.nombre) {
          await tester.enterText(
            find.byKey(const ValueKey('campo-apellido')),
            'Vega',
          );
        }
        await tester.pumpAndSettle();
        await tester.ensureVisible(find.text('Guardar cambios'));
        await tester.tap(find.text('Guardar cambios'));
        await tester.pumpAndSettle();
        expect(enviado, switch (campo) {
          CampoPerfil.nombre => {'nombre': 'Lucía', 'apellido': 'Vega'},
          CampoPerfil.correo => {'email': 'lucia@example.test'},
          CampoPerfil.telefono => {'telefono': '988777666'},
        });
        expect(find.byType(EditarPerfilScreen), findsNothing);
        final guardado = await StorageService.instance.obtenerUsuario();
        expect(guardado?.nombre, campo == CampoPerfil.nombre ? 'Lucía' : 'Ana');
        expect(
          guardado?.email,
          campo == CampoPerfil.correo
              ? 'lucia@example.test'
              : 'ana@example.test',
        );
        expect(
          guardado?.telefono,
          campo == CampoPerfil.telefono ? '988777666' : '999111222',
        );
        expect(guardado?.twoFactorEnabled, isTrue);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
      },
    );
  }

  testWidgets(
    'correo inválido no se envía y un error permite corregir y reintentar',
    (tester) async {
      await prepararAlmacenamientoLocal();
      await iniciarSesionLocal(7);
      var peticiones = 0;
      var fallar = true;
      final datos = <String, dynamic>{
        'id_usuario': 7,
        'nombre': 'Ana',
        'apellido': 'Torres',
        'email': 'ana@example.test',
        'telefono': '999111222',
        'rol': 'cliente',
      };
      ApiService.instance.usarAdaptadorPruebas(
        TransporteAislado((o) async {
          if (o.method == 'PUT') {
            peticiones++;
            expectSync(o.data, {'email': 'nuevo@example.test'});
            if (fallar) {
              return respuestaLocal({
                'mensaje': 'El correo ingresado ya está registrado',
              }, 409);
            }
            datos['email'] = 'nuevo@example.test';
          }
          return respuestaLocal({'data': datos});
        }),
      );
      await tester.pumpWidget(
        MaterialApp(theme: AppTheme.light(), home: const PerfilScreen()),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byKey(const ValueKey('editar-correo')));
      await tester.tap(find.byKey(const ValueKey('editar-correo')));
      await tester.pumpAndSettle();
      final input = find.byKey(const ValueKey('campo-correo'));
      await tester.enterText(input, 'sin-arroba');
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Guardar cambios'));
      await tester.tap(find.text('Guardar cambios'));
      await tester.pumpAndSettle();
      expect(find.text('Ingresa un correo válido'), findsOneWidget);
      expect(peticiones, 0);
      await tester.enterText(input, 'nuevo@example.test');
      await tester.pumpAndSettle();
      await tester.tap(find.text('Guardar cambios'));
      await tester.pumpAndSettle();
      expect(
        find.text('El correo ingresado ya está registrado'),
        findsOneWidget,
      );
      expect(find.text('nuevo@example.test'), findsOneWidget);
      fallar = false;
      await tester.tap(find.text('Guardar cambios'));
      await tester.pumpAndSettle();
      expect(peticiones, 2);
      expect(find.byType(EditarPerfilScreen), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'teléfono puede vaciarse y cancelar una edición no guarda cambios',
    (tester) async {
      await prepararAlmacenamientoLocal();
      await iniciarSesionLocal(7);
      var escrituras = 0;
      final datos = <String, dynamic>{
        'id_usuario': 7,
        'nombre': 'Ana',
        'apellido': 'Torres',
        'email': 'ana@example.test',
        'telefono': '999111222',
        'rol': 'cliente',
      };
      ApiService.instance.usarAdaptadorPruebas(
        TransporteAislado((o) async {
          if (o.method == 'PUT') {
            escrituras++;
            expectSync(o.data, {'telefono': null});
            datos['telefono'] = null;
          }
          return respuestaLocal({'data': datos});
        }),
      );
      await tester.pumpWidget(
        MaterialApp(theme: AppTheme.light(), home: const PerfilScreen()),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byKey(const ValueKey('editar-nombre')));
      await tester.tap(find.byKey(const ValueKey('editar-nombre')));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('campo-nombre')),
        'Descartar',
      );
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(escrituras, 0);
      expect(find.text('Ana Torres'), findsOneWidget);
      await tester.ensureVisible(find.byKey(const ValueKey('editar-telefono')));
      await tester.tap(find.byKey(const ValueKey('editar-telefono')));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const ValueKey('campo-telefono')), '');
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Guardar cambios'));
      await tester.tap(find.text('Guardar cambios'));
      await tester.pumpAndSettle();
      expect(escrituras, 1);
      expect(
        (await StorageService.instance.obtenerUsuario())?.telefono,
        isNull,
      );
      expect(find.text('Ana Torres'), findsOneWidget);
      expect(find.text('ana@example.test'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
