import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:libreria_app/models/libro.dart';
import 'package:libreria_app/screens/detalle_libro_screen.dart';
import 'package:libreria_app/utils/app_theme.dart';
import 'package:libreria_app/utils/app_colors.dart';
import 'package:libreria_app/widgets/app_bottom_navigation.dart';
import 'package:libreria_app/widgets/portadas_libro.dart';
import 'package:libreria_app/widgets/precio_texto.dart';

void main() {
  testWidgets('total de la ficha se pinta completo en un celular estrecho', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: const DetalleLibroScreen(
          libro: Libro(
            titulo: 'Prueba del total',
            precio: 89.90,
            stock: 5,
            estado: true,
          ),
        ),
      ),
    );
    await tester.pump();
    final scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
    final barra = find.byWidget(scaffold.bottomNavigationBar!);
    final precio = find.descendant(
      of: barra,
      matching: find.byType(PrecioTexto),
    );
    final texto = find.descendant(of: precio, matching: find.byType(RichText));
    expect(tester.widget<PrecioTexto>(precio).monto, 89.90);
    expect(
      tester.renderObject<RenderParagraph>(texto).didExceedMaxLines,
      isFalse,
      reason: 'El importe completo debe ser visible, no S/ 8…',
    );
    expect(tester.takeException(), isNull);
  });
  for (final ancho in [280.0, 320.0, 360.0, 390.0, 412.0, 600.0, 768.0]) {
    for (final escala in [1.0, 2.0]) {
      for (final monto in [89.90, 99999999.99]) {
        testWidgets(
          'total completo a ${ancho}px, texto x$escala e importe $monto',
          (tester) async {
            tester.view.physicalSize = Size(ancho, 740);
            tester.view.devicePixelRatio = 1;
            addTearDown(tester.view.resetPhysicalSize);
            addTearDown(tester.view.resetDevicePixelRatio);
            await tester.pumpWidget(
              MaterialApp(
                theme: AppTheme.light(),
                builder: (context, child) => MediaQuery(
                  data: MediaQuery.of(context)
                      .copyWith(textScaler: TextScaler.linear(escala)),
                  child: child!,
                ),
                home: DetalleLibroScreen(
                  libro: Libro(
                    titulo: 'Precio adaptativo',
                    precio: monto,
                    stock: 5,
                    estado: true,
                  ),
                ),
              ),
            );
            await tester.pump();
            final scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
            final barra = find.byWidget(scaffold.bottomNavigationBar!);
            final precio = find.descendant(
              of: barra,
              matching: find.byType(PrecioTexto),
            );
            final texto = find.descendant(
              of: precio,
              matching: find.byType(RichText),
            );
            final parrafo = tester.renderObject<RenderParagraph>(texto);
            expect(parrafo.didExceedMaxLines, isFalse);
            final pintado = MatrixUtils.transformRect(
              parrafo.getTransformTo(null),
              Offset.zero & parrafo.size,
            );
            final limite = tester.getRect(barra);
            expect(pintado.left, greaterThanOrEqualTo(limite.left));
            expect(pintado.right, lessThanOrEqualTo(limite.right + 0.1));
            final reservar = find.descendant(
              of: barra,
              matching: find.byType(OutlinedButton),
            );
            final anadir = find.descendant(
              of: barra,
              matching: find.byType(FilledButton),
            );
            expect(reservar, findsNothing);
            expect(anadir, findsOneWidget);
            expect(tester.getSize(anadir).height, greaterThanOrEqualTo(48));
            expect(
              tester.getRect(precio).overlaps(tester.getRect(anadir)),
              isFalse,
            );
            expect(tester.takeException(), isNull);
          },
        );
      }
    }
  }
  testWidgets(
    'cambiar cantidad mantiene la animación y el total visible completo',
    (tester) async {
      tester.view.physicalSize = const Size(320, 740);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          home: const DetalleLibroScreen(
            libro: Libro(
              titulo: 'Cantidad',
              precio: 89.90,
              stock: 5,
              estado: true,
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.ensureVisible(find.byTooltip('Añadir uno'));
      await tester.tap(find.byTooltip('Añadir uno'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));
      final scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
      final barra = find.byWidget(scaffold.bottomNavigationBar!);
      final precio = find.descendant(
        of: barra,
        matching: find.byType(PrecioTexto),
      );
      expect(tester.widget<PrecioTexto>(precio).monto, 179.80);
      expect(
        tester
            .renderObject<RenderParagraph>(
              find.descendant(of: precio, matching: find.byType(RichText)),
            )
            .didExceedMaxLines,
        isFalse,
      );
      expect(
        find.descendant(of: barra, matching: find.byType(FadeTransition)),
        findsWidgets,
      );
      expect(
        find.descendant(of: barra, matching: find.byType(ScaleTransition)),
        findsWidgets,
      );
      expect(tester.takeException(), isNull);
    },
  );
  for (final ancho in [320.0, 390.0]) {
    testWidgets('precio rebajado y Nuevo conservan la ficha a $ancho px', (
      tester,
    ) async {
      tester.view.physicalSize = Size(ancho, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final libro = Libro(
        titulo: 'Libro recién agregado',
        precio: 100,
        precioFinal: 75,
        descuentoVigente: true,
        stock: 4,
        estado: true,
        esNuevo: true,
        creadoEn: DateTime.now().subtract(const Duration(days: 1)),
      );
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          home: DetalleLibroScreen(libro: libro),
        ),
      );
      await tester.pump();
      expect(find.text('Nuevo'), findsOneWidget);
      expect(find.textContaining('100.00'), findsOneWidget);
      expect(find.textContaining('75.00'), findsWidgets);
      final preciosOferta = tester.widgetList<RichText>(
        find.byWidgetPredicate(
          (widget) =>
              widget is RichText && widget.text.toPlainText() == 'S/ 75.00',
        ),
      );
      expect(preciosOferta, isNotEmpty);
      for (final precio in preciosOferta) {
        final importe = precio.text.getSpanForPosition(
          const TextPosition(offset: 4),
        );
        expect(importe?.style?.color, AppColors.oferta);
        expect(importe?.style?.decoration, TextDecoration.underline);
      }
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          home: Scaffold(
            body: Center(
              child: SizedBox(
                height: 430,
                child: LibroSuelto(libro: libro, ancho: 140),
              ),
            ),
          ),
        ),
      );
      await tester.pump();
      expect(find.text('Nuevo'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }
  testWidgets('la ficha se maqueta en ancho móvil sin excepciones', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: const DetalleLibroScreen(
          libro: Libro(
            titulo: 'Cien años de soledad',
            isbn: '978-0307474728',
            descripcion:
                'La saga de la familia Buendía en el mítico pueblo de '
                'Macondo. Una obra fundacional del realismo mágico.',
            precio: 89.9,
            autor: 'Gabriel García Márquez',
            categoria: 'Novela',
            estado: true,
            stock: 5,
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Ficha del libro'), findsOneWidget);
    expect(find.text('Cien años de soledad'), findsOneWidget);
    expect(find.byIcon(Icons.arrow_back_rounded), findsOneWidget);
    expect(find.text('Reservar'), findsNothing);
    expect(find.text('Añadir'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('la navegación inferior cabe en 360 px sin overflow', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(
          bottomNavigationBar: AppBottomNavigation(
            currentTab: AppTab.inicio,
            onTabSelected: (_) {},
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Inicio'), findsOneWidget);
    expect(find.text('Catálogo'), findsOneWidget);
    expect(find.text('Historial'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
