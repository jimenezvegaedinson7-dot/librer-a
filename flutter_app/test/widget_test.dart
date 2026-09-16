import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:libreria_app/main.dart';

void main() {
  testWidgets('App builds and shows splash screen', (
    WidgetTester tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});

    await tester.pumpWidget(const LibreriaApp());
    expect(find.text('Librería'), findsOneWidget);

    // Dejar que el timer del splash se complete para evitar timers pendientes.
    await tester.pump(const Duration(milliseconds: 600));
    await tester.pump();
  });
}
