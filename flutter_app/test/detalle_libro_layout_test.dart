import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:libreria_app/models/libro.dart';
import 'package:libreria_app/screens/detalle_libro_screen.dart';
import 'package:libreria_app/utils/app_theme.dart';
import 'package:libreria_app/widgets/app_bottom_navigation.dart';

void main() {
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
    expect(find.text('Reservar'), findsOneWidget);
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
    expect(find.text('Reservas'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
