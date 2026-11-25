import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:libreria_app/screens/perfil_screen.dart';
import 'package:libreria_app/screens/personalizacion_screen.dart';
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
import 'perfil_presentacion_test.dart' show cargarFuentesLocales;

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
    'personalización independiente: botones, tarjetas y fondo se guardan por separado',
    (tester) async {
      await preparar();
      tester.view.physicalSize = const Size(390, 1200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(pantalla());
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Personalización'));
      await tester.tap(find.text('Personalización'));
      await tester.pumpAndSettle();
      expect(find.byType(PersonalizacionScreen), findsOneWidget);
      expect(tester.takeException(), isNull);

      // Apartado A: botones e iconos + tarjetas.
      await tester.tap(find.text('Colores de botones y tarjetas'));
      await tester.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('vista-previa-colores')),
        findsOneWidget,
      );
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('tema-noche')),
        300,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('tema-noche')));
      await tester.pumpAndSettle();
      expect(
        TemaController.instance.id,
        'libreria',
        reason: 'La selección es local hasta guardar',
      );
      expect(
        (await SharedPreferences.getInstance()).getString('perfil_tema'),
        isNull,
      );
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('tarjeta-arena')),
        300,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('tarjeta-arena')));
      await tester.pumpAndSettle();
      expect(
        TemaController.instance.tarjeta.id,
        'blanca',
        reason: 'La tarjeta también es local hasta guardar',
      );
      await tester.tap(find.byKey(const ValueKey('guardar-botones-tarjetas')));
      await tester.pumpAndSettle();
      expect(TemaController.instance.id, 'noche');
      expect(TemaController.instance.tarjeta.id, 'arena');
      expect(
        TemaController.instance.fondo.id,
        'marfil',
        reason: 'Cambiar botones y tarjetas no altera el fondo',
      );
      expect(AppColors.background, fondoPorId('marfil').fondo);
      expect(AppColors.surface, tarjetaPorId('arena').color);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('perfil_tema'), 'noche');
      expect(prefs.getString('perfil_tarjeta'), 'arena');
      expect(prefs.getString('perfil_fondo'), isNull);

      // Apartado B: solo fondo.
      expect(find.byType(PersonalizacionScreen), findsOneWidget);
      await tester.tap(find.text('Colores de fondo'));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('fondo-cielo')),
        300,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('fondo-cielo')));
      await tester.pumpAndSettle();
      expect(
        TemaController.instance.fondo.id,
        'marfil',
        reason: 'La selección de fondo es local hasta guardar',
      );
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('vista-previa-fondo')),
        -300,
      );
      await tester.pumpAndSettle();
      final previa = tester.widget<AnimatedContainer>(
        find.byKey(const ValueKey('vista-previa-fondo')),
      );
      expect(
        (previa.decoration as BoxDecoration).color,
        fondoPorId('cielo').fondo,
      );
      await tester.tap(find.byKey(const ValueKey('guardar-fondo')));
      await tester.pumpAndSettle();
      expect(TemaController.instance.fondo.id, 'cielo');
      expect(
        TemaController.instance.id,
        'noche',
        reason: 'Cambiar el fondo no altera los botones',
      );
      expect(
        TemaController.instance.tarjeta.id,
        'arena',
        reason: 'Cambiar el fondo no altera las tarjetas',
      );
      expect(AppColors.background, fondoPorId('cielo').fondo);
      expect(prefs.getString('perfil_fondo'), 'cielo');
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      await TemaController.instance.aplicarBotones('libreria');
      await TemaController.instance.aplicarTarjeta('blanca');
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
        await tester.pumpWidget(
          AnimatedBuilder(
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
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        await tester.scrollUntilVisible(
          find.text('Personalización'),
          250,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.pumpAndSettle();
        await Scrollable.ensureVisible(
          tester.element(find.text('Personalización')),
          alignment: 0.25,
        );
        await tester.pumpAndSettle();
        await tester.tap(find.text('Personalización'));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.byType(PersonalizacionScreen), findsOneWidget);
        expect(tester.takeException(), isNull);
        await tester.tap(find.text('Colores de botones y tarjetas'));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        await tester.pageBack();
        await tester.pumpAndSettle();
        await tester.ensureVisible(find.text('Colores de fondo'));
        await tester.tap(find.text('Colores de fondo'));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
      },
    );
  }
  test(
    'restauración sin preferencias elimina un tema anterior de memoria',
    () async {
      await preparar();
      await TemaController.instance.aplicar('noche');
      await TemaController.instance.aplicarTarjeta('arena');
      await TemaController.instance.aplicarFondo('cielo');
      SharedPreferences.setMockInitialValues({});
      await TemaController.instance.cargar();
      expect(TemaController.instance.id, 'libreria');
      expect(TemaController.instance.fondo.id, 'marfil');
      expect(TemaController.instance.tarjeta.id, 'blanca');
    },
  );

  test('migrar la apariencia anterior conserva tarjetas al cambiar de fondo y cerrar sesión', () async {
    await preparar();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('perfil_fondo', 'cielo');
    await prefs.remove('perfil_tarjeta');
    await TemaController.instance.cargar();
    expect(AppColors.surface, fondoPorId('cielo').tarjeta);
    await TemaController.instance.aplicarFondo('rosa');
    expect(AppColors.surface, fondoPorId('cielo').tarjeta);
    await TemaController.instance.aplicarBotones('noche');
    await StorageService.instance.limpiarSesion();
    await TemaController.instance.cargar();
    expect(TemaController.instance.id, 'noche');
    expect(TemaController.instance.fondo.id, 'rosa');
    expect(AppColors.surface, fondoPorId('cielo').tarjeta);
    await TemaController.instance.aplicarTarjeta('arena');
    await TemaController.instance.cargar();
    expect(AppColors.surface, tarjetaPorId('arena').color);
    expect(TemaController.instance.fondo.id, 'rosa');
  });

  testWidgets(
    'restaurar cada apartado mantiene intacto el otro y exige guardar',
    (tester) async {
      await preparar();
      await TemaController.instance.aplicarBotones('noche');
      await TemaController.instance.aplicarTarjeta('arena');
      await TemaController.instance.aplicarFondo('cielo');
      await tester.pumpWidget(
        AnimatedBuilder(
          animation: TemaController.instance,
          builder: (_, _) => MaterialApp(
            theme: AppTheme.light(),
            home: const PersonalizacionScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Colores de botones y tarjetas'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('restaurar-botones')));
      await tester.pumpAndSettle();
      expect(TemaController.instance.id, 'noche');
      await tester.tap(find.byKey(const ValueKey('guardar-botones-tarjetas')));
      await tester.pumpAndSettle();
      expect(TemaController.instance.id, perfilTemaDefaultId);
      expect(TemaController.instance.tarjeta.id, tarjetaDefaultId);
      expect(TemaController.instance.fondo.id, 'cielo');
      await tester.tap(find.text('Colores de fondo'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('probar-fondo')));
      await tester.pumpAndSettle();
      expect(find.text('Ocultar detalles'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('restaurar-fondo')));
      await tester.pumpAndSettle();
      expect(TemaController.instance.fondo.id, 'cielo');
      await tester.tap(find.byKey(const ValueKey('guardar-fondo')));
      await tester.pumpAndSettle();
      await TemaController.instance.cargar();
      expect(TemaController.instance.fondo.id, fondoDefaultId);
      expect(TemaController.instance.id, perfilTemaDefaultId);
      expect(TemaController.instance.tarjeta.id, tarjetaDefaultId);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
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
        find.byTooltip('Editar nombre'),
        250,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.byTooltip('Editar nombre'));
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
      await tester.pumpWidget(pantalla());
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Personalización'));
      await tester.tap(find.text('Personalización'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Colores de botones y tarjetas'));
      await tester.pumpAndSettle();
      final combinar = find.text('Combinar dos colores');
      await tester.scrollUntilVisible(combinar, 300);
      await tester.pumpAndSettle();
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
      await tester.ensureVisible(
        find.widgetWithText(FilledButton, 'Usar combinación'),
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Usar combinación'));
      await tester.pumpAndSettle();
      final id = perfilTemaIdPersonalizado(
        const Color(0xFF17181C),
        fin: Colors.white,
      );
      expect(TemaController.instance.id, 'libreria');
      await tester.tap(find.byKey(const ValueKey('guardar-botones-tarjetas')));
      await tester.pumpAndSettle();
      expect(TemaController.instance.id, id);
      await TemaController.instance.cargar();
      await tester.pumpAndSettle();
      expect(TemaController.instance.tema.inicio, const Color(0xFF17181C));
      expect(TemaController.instance.tema.fin, Colors.white);
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.drag(find.byType(ListView), const Offset(0, 1600));
      await tester.pumpAndSettle();
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
      await tester.tap(find.byTooltip('Cambiar foto de perfil'));
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
