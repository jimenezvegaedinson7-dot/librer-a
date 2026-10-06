import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:libreria_app/screens/perfil_screen.dart';
import 'package:libreria_app/models/libro.dart';
import 'package:libreria_app/utils/app_theme.dart';
import 'package:libreria_app/widgets/portadas_libro.dart';

Future<void> captura(WidgetTester tester, GlobalKey key, String nombre) async {
  const carpeta = String.fromEnvironment('CAPTURAS_UI');
  if (carpeta.isEmpty) return;
  await tester.runAsync(() async {
    final boundary =
        key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
    final imagen = await boundary.toImage(pixelRatio: 2);
    final png = await imagen.toByteData(format: ui.ImageByteFormat.png);
    await File('$carpeta/$nombre.png').writeAsBytes(png!.buffer.asUint8List());
    imagen.dispose();
  });
}

void main() {
  setUpAll(() async {
    const carpeta = String.fromEnvironment('CAPTURAS_UI');
    if (carpeta.isEmpty) return;
    for (final nombre in [
      'Inter_regular',
      'Inter_500',
      'Inter_600',
      'Inter_700',
      'SourceSerif4_600',
      'MaterialIcons',
    ]) {
      final archivo = File('$carpeta/$nombre.ttf');
      if (!await archivo.exists()) continue;
      final loader = FontLoader(nombre);
      loader.addFont(
        Future.value(ByteData.sublistView(await archivo.readAsBytes())),
      );
      await loader.load();
    }
  });
  for (final ancho in [390.0, 768.0]) {
    testWidgets(
      'perfil: foto centrada y nombre debajo, datos y selector de foto conservados a $ancho',
      (tester) async {
        tester.view.physicalSize = Size(ancho, 900);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        SharedPreferences.setMockInitialValues({
          'auth_user': jsonEncode({
            'id_usuario': 1,
            'nombre': 'Ana',
            'apellido': 'Torres',
            'email': 'ana@example.test',
            'telefono': '999111222',
            'rol': 'cliente',
            'estado': 1,
          }),
        });
        final key = GlobalKey();
        await tester.pumpWidget(
          RepaintBoundary(
            key: key,
            child: MaterialApp(
              theme: AppTheme.light(),
              home: const PerfilScreen(),
            ),
          ),
        );
        // La pantalla conserva su refresco remoto; la prueba verifica el
        // usuario local sin esperar una animación de carga de duración abierta.
        await tester.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 200)),
        );
        await tester.pump(const Duration(seconds: 1));
        final identidad = find.byKey(const ValueKey('identidad-perfil'));
        final foto = find.descendant(
          of: identidad,
          matching: find.byType(CircleAvatar),
        );
        final nombre = find.byKey(const ValueKey('nombre-perfil'));
        expect(tester.getCenter(foto).dx, closeTo(ancho / 2, 1));
        expect(tester.getCenter(nombre).dx, closeTo(ancho / 2, 1));
        expect(
          tester.getRect(nombre).top,
          greaterThan(tester.getRect(foto).bottom),
        );
        expect(find.text('Ana Torres'), findsOneWidget);
        expect(
          find.descendant(
            of: identidad,
            matching: find.text('ana@example.test'),
          ),
          findsNothing,
        );
        expect(find.text('Toca la foto para actualizarla'), findsNothing);
        expect(find.text('Tus datos'), findsOneWidget);
        expect(find.text('ana@example.test'), findsOneWidget);
        expect(find.text('Mis compras'), findsOneWidget);
        expect(find.text('Reservas anteriores'), findsOneWidget);
        expect(find.text('Mis favoritos'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await captura(tester, key, 'perfil-${ancho.toInt()}');
        await tester.tap(find.byIcon(Icons.photo_camera_rounded));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 500));
        expect(find.text('Elegir avatar'), findsOneWidget);
        expect(find.text('Subir imagen'), findsOneWidget);
        expect(find.text('Tomar foto'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox.shrink());
      },
    );
  }
  testWidgets(
    'oferta visible en portada suelta sin desbordar y sin cambiar importe',
    (tester) async {
      tester.view.physicalSize = const Size(390, 600);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final key = GlobalKey();
      await tester.pumpWidget(
        RepaintBoundary(
          key: key,
          child: MaterialApp(
            theme: AppTheme.light(),
            home: const Scaffold(
              body: Center(
                child: SizedBox(
                  height: 430,
                  child: LibroSuelto(
                    libro: Libro(
                      titulo: 'Libro en promoción',
                      autor: 'Autor de prueba',
                      precio: 100,
                      precioFinal: 75,
                      descuentoVigente: true,
                      stock: 4,
                      estado: true,
                    ),
                    ancho: 140,
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('−25%'), findsOneWidget);
      expect(find.text('S/ 100.00'), findsOneWidget);
      expect(find.textContaining('75.00'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await captura(tester, key, 'oferta-390');
    },
  );
}
