import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:libreria_app/screens/login_screen.dart';
import 'package:libreria_app/utils/app_theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<void> _abrirLogin(WidgetTester tester) async {
  tester.view.physicalSize = const Size(390, 1000);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(theme: AppTheme.light(), home: const LoginScreen()),
  );
  await tester.runAsync(
    () => Future<void>.delayed(const Duration(milliseconds: 100)),
  );
  await tester.pump(const Duration(milliseconds: 300));
}

void main() {
  testWidgets('sin registro pendiente no se ofrece verificar el correo', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    await _abrirLogin(tester);
    expect(find.text('Verificar mi correo o reenviar código'), findsNothing);
    // Tampoco está el adorno del librito bajo el subtítulo.
    expect(find.byIcon(Icons.auto_stories_outlined), findsNothing);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('con un registro sin verificar sí se ofrece', (tester) async {
    SharedPreferences.setMockInitialValues({
      'verificacion_pendiente_email': 'nueva@example.invalid',
    });
    await _abrirLogin(tester);
    expect(find.text('Verificar mi correo o reenviar código'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });
}
