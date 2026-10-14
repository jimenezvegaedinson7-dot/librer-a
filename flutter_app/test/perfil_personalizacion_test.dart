import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:libreria_app/screens/perfil_screen.dart';
import 'package:libreria_app/screens/fondos_screen.dart';
import 'package:libreria_app/services/api_service.dart';
import 'package:libreria_app/services/storage_service.dart';
import 'package:libreria_app/services/tema_controller.dart';
import 'package:libreria_app/models/usuario.dart';
import 'package:libreria_app/utils/app_colors.dart';
import 'package:libreria_app/utils/app_theme.dart';
import 'package:libreria_app/utils/perfil_fondos.dart';
import 'package:libreria_app/utils/perfil_temas.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'soporte_api_local.dart';
import 'perfil_presentacion_test.dart' show captura, cargarFuentesLocales;

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(cargarFuentesLocales);
  Future<void> preparar() async {
    await prepararAlmacenamientoLocal();
    await iniciarSesionLocal(7);
    await StorageService.instance.guardarUsuario(
      const Usuario(
        idUsuario: 7,
        nombre: 'Ana',
        apellido: 'Torres',
        email: 'ana@example.test',
        rol: 'cliente',
      ),
    );
    await TemaController.instance.cargar();
    ApiService.instance.usarAdaptadorPruebas(
      TransporteAislado(
        (o) async => respuestaLocal({
          'data': {
            'id_usuario': 7,
            'nombre': 'Ana',
            'apellido': 'Torres',
            'email': 'ana@example.test',
            'rol': 'cliente',
            'two_factor_enabled': 1,
          },
        }),
      ),
    );
  }

  Widget pantalla() => AnimatedBuilder(
    animation: TemaController.instance,
    builder: (_, _) => MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      home: const PerfilScreen(),
    ),
  );

  testWidgets(
    'colores inmediatos y fondo con vista previa: cancelar no guarda y aplicar persiste',
    (tester) async {
      await preparar();
      tester.view.physicalSize = const Size(390, 1200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(pantalla());
      await tester.pumpAndSettle();
      await tester.tap(find.bySemanticsLabel(RegExp('^Tema Noche')));
      await tester.pumpAndSettle();
      expect(TemaController.instance.id, 'noche');
      expect(
        (await SharedPreferences.getInstance()).getString('perfil_tema'),
        'noche',
      );
      await tester.ensureVisible(find.text('Fondo y tarjetas'));
      await tester.tap(find.text('Fondo y tarjetas'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byKey(const ValueKey('fondo-cielo')));
      await tester.tap(find.byKey(const ValueKey('fondo-cielo')));
      await tester.pumpAndSettle();
      expect(
        TemaController.instance.fondo.id,
        'marfil',
        reason: 'La selección es local hasta aplicar',
      );
      await tester.drag(find.byType(ListView), const Offset(0, 1600));
      await tester.pumpAndSettle();
      final previa = tester.widget<AnimatedContainer>(
        find.byKey(const ValueKey('vista-previa-fondo')),
      );
      expect(
        (previa.decoration as BoxDecoration).color,
        fondoPorId('cielo').fondo,
      );
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(TemaController.instance.fondo.id, 'marfil');
      await tester.tap(find.text('Fondo y tarjetas'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byKey(const ValueKey('fondo-cielo')));
      await tester.tap(find.byKey(const ValueKey('fondo-cielo')));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Aplicar «Cielo»'));
      await tester.pumpAndSettle();
      expect(TemaController.instance.fondo.id, 'cielo');
      expect(AppColors.background, fondoPorId('cielo').fondo);
      expect(
        (await SharedPreferences.getInstance()).getString('perfil_fondo'),
        'cielo',
      );
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      await TemaController.instance.aplicar('libreria');
      await TemaController.instance.aplicarFondo('marfil');
    },
  );
  for (final (ancho, escala) in [(320.0, 2.0), (768.0, 1.5)]) {
    testWidgets(
      'perfil, colores y fondos sin desbordes a $ancho y texto $escala',
      (tester) async {
        await preparar();
        tester.view.physicalSize = Size(ancho, 1200);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final key = GlobalKey();
        await tester.pumpWidget(
          RepaintBoundary(
            key: key,
            child: AnimatedBuilder(
              animation: TemaController.instance,
              builder: (_, _) => MaterialApp(
                debugShowCheckedModeBanner: false,
                theme: AppTheme.light(),
                builder: (context, child) => MediaQuery(
                  data: MediaQuery.of(context)
                      .copyWith(textScaler: TextScaler.linear(escala)),
                  child: child!,
                ),
                home: const PerfilScreen(),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        await captura(tester, key, 'perfil-${ancho.toInt()}-texto-ampliado');
        await tester.scrollUntilVisible(
          find.text('Ver todos los colores'),
          250,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.tap(find.text('Ver todos los colores'));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        await captura(tester, key, 'colores-${ancho.toInt()}');
        await tester.pageBack();
        await tester.pumpAndSettle();
        await tester.ensureVisible(find.text('Fondo y tarjetas'));
        await tester.tap(find.text('Fondo y tarjetas'));
        await tester.pumpAndSettle();
        expect(find.byType(FondosScreen), findsOneWidget);
        expect(tester.takeException(), isNull);
        await captura(tester, key, 'fondos-${ancho.toInt()}');
        await tester.pumpWidget(const SizedBox());
      },
    );
  }
  test(
    'restauración sin preferencias elimina un tema anterior de memoria',
    () async {
      await preparar();
      await TemaController.instance.aplicar('noche');
      await TemaController.instance.aplicarFondo('cielo');
      SharedPreferences.setMockInitialValues({});
      await TemaController.instance.cargar();
      expect(TemaController.instance.id, 'libreria');
      expect(TemaController.instance.fondo.id, 'marfil');
    },
  );

  test('los botones conservan contraste legible en todos los temas y combinaciones extremas', () {
    for (final tema in [
      ...perfilTemas,
      perfilTemaPorId(
        perfilTemaIdPersonalizado(Colors.white, fin: Colors.black),
      ),
      perfilTemaPorId(
        perfilTemaIdPersonalizado(
          const Color(0xFF808080),
          fin: const Color(0xFFFFC107),
        ),
      ),
    ]) {
      AppColors.aplicarAcento(tema);
      final a = AppColors.onPrimary.computeLuminance();
      final b = AppColors.primary.computeLuminance();
      final contraste = ((a > b ? a : b) + 0.05) / ((a > b ? b : a) + 0.05);
      expect(contraste, greaterThanOrEqualTo(4.5), reason: tema.nombre);
      expect(AppTheme.light().colorScheme.onPrimary, AppColors.onPrimary);
    }
    AppColors.aplicarAcento(perfilTemaPorId('libreria'));
  });

  testWidgets(
    'editar conserva los cambios aunque llegue tarde la lectura inicial',
    (tester) async {
      await preparar();
      tester.view.physicalSize = const Size(390, 1200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final atrasada = Completer<ResponseBody>();
      var lecturas = 0;
      var guardados = 0;
      var datos = <String, dynamic>{
        'id_usuario': 7,
        'nombre': 'Ana',
        'apellido': 'Torres',
        'email': 'ana@example.test',
        'rol': 'cliente',
        'two_factor_enabled': 1,
      };
      ApiService.instance.usarAdaptadorPruebas(
        TransporteAislado((o) async {
          expectSync(o.path, '/usuarios/perfil');
          if (o.method == 'GET') {
            if (++lecturas == 1) return atrasada.future;
          } else {
            expectSync(o.method, 'PUT');
            guardados++;
            datos = {...datos, ...o.data as Map<String, dynamic>};
          }
          return respuestaLocal({'data': datos});
        }),
      );
      await tester.pumpWidget(pantalla());
      for (var i = 0; i < 20; i++) {
        await tester.pump(const Duration(milliseconds: 50));
      }
      expect(find.text('Ana Torres'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text('Editar perfil'),
        250,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.text('Editar perfil'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextFormField).at(0), 'Lucía');
      await tester.enterText(find.byType(TextFormField).at(1), 'Vega');
      await tester.scrollUntilVisible(
        find.text('Guardar cambios'),
        250,
        scrollable: find.byType(Scrollable).last,
      );
      await tester.tap(find.text('Guardar cambios'));
      await tester.pumpAndSettle();
      expect(guardados, 1);
      expect(lecturas, 2);
      atrasada.complete(
        respuestaLocal({
          'data': {
            ...datos,
            'nombre': 'Ana',
            'apellido': 'Torres',
            'two_factor_enabled': 0,
          },
        }),
      );
      await tester.pumpAndSettle();
      await tester.drag(find.byType(ListView), const Offset(0, 1800));
      await tester.pumpAndSettle();
      expect(find.text('Lucía Vega'), findsOneWidget);
      expect((await StorageService.instance.obtenerUsuario())?.nombre, 'Lucía');
      expect(
        (await StorageService.instance.obtenerUsuario())?.twoFactorEnabled,
        isTrue,
      );
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'combinar colores permite cancelar, aplicar y restaurar el degradado propio',
    (tester) async {
      await preparar();
      tester.view.physicalSize = const Size(390, 1200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final key = GlobalKey();
      await tester.pumpWidget(RepaintBoundary(key: key, child: pantalla()));
      await tester.pumpAndSettle();
      final combinar = find.bySemanticsLabel('Combinar tus colores');
      final horizontal = find.byWidgetPredicate(
        (w) => w is Scrollable && w.axisDirection == AxisDirection.right,
      );
      await tester.scrollUntilVisible(combinar, 300, scrollable: horizontal);
      await tester.tap(combinar);
      await tester.pumpAndSettle();
      expect(find.text('Combina tus colores'), findsOneWidget);
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(TemaController.instance.id, 'libreria');
      await tester.tap(combinar);
      await tester.pumpAndSettle();
      final inicio = find.descendant(
        of: find.byKey(const ValueKey('paleta-inicio')),
        matching: find.bySemanticsLabel('Color 17181C'),
      );
      final fin = find.descendant(
        of: find.byKey(const ValueKey('paleta-fin')),
        matching: find.bySemanticsLabel('Color FFFFFF'),
      );
      await tester.ensureVisible(inicio);
      await tester.tap(inicio);
      await tester.pumpAndSettle();
      await tester.ensureVisible(fin);
      await tester.tap(fin);
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.widgetWithText(FilledButton, 'Aplicar'));
      await tester.tap(find.widgetWithText(FilledButton, 'Aplicar'));
      await tester.pumpAndSettle();
      final id = perfilTemaIdPersonalizado(
        const Color(0xFF17181C),
        fin: Colors.white,
      );
      expect(TemaController.instance.id, id);
      await TemaController.instance.cargar();
      await tester.pumpAndSettle();
      expect(TemaController.instance.tema.inicio, const Color(0xFF17181C));
      expect(TemaController.instance.tema.fin, Colors.white);
      await tester.drag(find.byType(ListView), const Offset(0, 1600));
      await tester.pumpAndSettle();
      await captura(tester, key, 'perfil-degradado-personalizado');
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'desactivar doble factor actualiza la tarjeta y el usuario guardado',
    (tester) async {
      await preparar();
      tester.view.physicalSize = const Size(390, 1200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      var activo = true;
      var solicitudes = 0;
      ApiService.instance.usarAdaptadorPruebas(
        TransporteAislado((o) async {
          if (o.method == 'POST') {
            expectSync(o.path, '/auth/2fa/disable');
            expectSync(o.data, {
              'password': 'password-local',
              'codigo': '123456',
            });
            activo = false;
            solicitudes++;
            return respuestaLocal({'success': true});
          }
          expectSync(o.path, '/usuarios/perfil');
          return respuestaLocal({
            'data': {
              'id_usuario': 7,
              'nombre': 'Ana',
              'apellido': 'Torres',
              'email': 'ana@example.test',
              'rol': 'cliente',
              'two_factor_enabled': activo ? 1 : 0,
            },
          });
        }),
      );
      await tester.pumpWidget(pantalla());
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Desactivar doble factor'),
        250,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.text('Desactivar doble factor'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byType(TextFormField).at(0),
        'password-local',
      );
      await tester.enterText(find.byType(TextFormField).at(1), '123456');
      await tester.ensureVisible(
        find.widgetWithText(FilledButton, 'Desactivar doble factor'),
      );
      await tester.tap(
        find.widgetWithText(FilledButton, 'Desactivar doble factor'),
      );
      await tester.pumpAndSettle();
      expect(solicitudes, 1);
      expect(find.text('Activar doble factor'), findsOneWidget);
      expect(
        (await StorageService.instance.obtenerUsuario())?.twoFactorEnabled,
        isFalse,
      );
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'elegir avatar conserva la subida PNG multipart y actualiza la foto',
    (tester) async {
      await preparar();
      tester.view.physicalSize = const Size(390, 1000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      var subidas = 0;
      ApiService.instance.usarAdaptadorPruebas(
        TransporteAislado((o) async {
          if (o.method == 'PUT') {
            expectSync(o.path, '/usuarios/foto');
            final archivo = (o.data as FormData).files.single;
            expectSync(archivo.key, 'foto');
            expectSync(archivo.value.filename, endsWith('.png'));
            expectSync(archivo.value.contentType.toString(), 'image/png');
            expectSync(archivo.value.length, greaterThan(100));
            subidas++;
          } else {
            expectSync(o.path, '/usuarios/perfil');
          }
          return respuestaLocal({
            'data': {
              'id_usuario': 7,
              'nombre': 'Ana',
              'apellido': 'Torres',
              'email': 'ana@example.test',
              'rol': 'cliente',
              'two_factor_enabled': 1,
              if (subidas > 0)
                'foto_perfil': '/uploads/perfiles/avatar-local.png',
            },
          });
        }),
      );
      await tester.pumpWidget(pantalla());
      await tester.pumpAndSettle();
      await tester.tap(find.byIcon(Icons.photo_camera_rounded));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Elegir avatar'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('🦁'));
      await tester.runAsync(() async {
        for (var i = 0; i < 50 && subidas == 0; i++) {
          await Future<void>.delayed(const Duration(milliseconds: 20));
        }
      });
      await tester.pumpAndSettle();
      expect(subidas, 1);
      expect(find.text('Foto de perfil actualizada.'), findsOneWidget);
      expect(
        (await StorageService.instance.obtenerUsuario())?.fotoPerfil,
        '/uploads/perfiles/avatar-local.png',
      );
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
