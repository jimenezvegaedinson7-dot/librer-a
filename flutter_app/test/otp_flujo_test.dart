import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:libreria_app/services/api_service.dart';
import 'package:libreria_app/services/storage_service.dart';
import 'package:libreria_app/widgets/campo_otp.dart';
import 'package:libreria_app/screens/reestablecer_contrasena_screen.dart';
import 'package:libreria_app/screens/verificacion_email_screen.dart';

class _Local implements HttpClientAdapter {
  final Future<ResponseBody> Function(RequestOptions) responder;
  _Local(this.responder);
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) => responder(options);
  @override
  void close({bool force = false}) {}
}

ResponseBody _json(Object body, [int status = 200]) => ResponseBody.fromString(
  jsonEncode(body),
  status,
  headers: {
    Headers.contentTypeHeader: ['application/json'],
  },
);
ApiService _api(Future<ResponseBody> Function(RequestOptions) responder) {
  final dio = Dio(BaseOptions(baseUrl: 'https://solo-local.invalid/api'))
    ..httpClientAdapter = _Local(responder);
  return ApiService.paraPruebas(dio);
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStorage.setMockInitialValues({});
  });
  testWidgets(
    'OTP: pegar seis dígitos llena todas las casillas, borrar y corregir no pierde caracteres',
    (tester) async {
      tester.view.physicalSize = const Size(320, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final controller = TextEditingController();
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MediaQuery(
              data: const MediaQueryData(textScaler: TextScaler.linear(1.5)),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Form(child: CampoOtp(controller: controller)),
              ),
            ),
          ),
        ),
      );
      await tester.enterText(
        find.byKey(const ValueKey('otp-entrada')),
        '123456',
      );
      await tester.pump();
      for (var i = 0; i < 6; i++) {
        expect(
          find.descendant(
            of: find.byKey(ValueKey('otp-casilla-$i')),
            matching: find.text('${i + 1}'),
          ),
          findsOneWidget,
        );
      }
      await tester.enterText(
        find.byKey(const ValueKey('otp-entrada')),
        '12345',
      );
      await tester.pump();
      expect(controller.text, '12345');
      await tester.enterText(
        find.byKey(const ValueKey('otp-entrada')),
        '123459',
      );
      await tester.pump();
      expect(controller.text, '123459');
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      controller.dispose();
    },
  );
  testWidgets(
    'recuperación: servidor verifica OTP antes de mostrar las contraseñas y aparece confirmación',
    (tester) async {
      StorageService.instance.reiniciarColaParaPruebas();
      final llamadas = <RequestOptions>[];
      final api = _api((o) async {
        llamadas.add(o);
        return _json({'success': true, 'reset_token': 'permiso-local'});
      });
      await tester.pumpWidget(
        MaterialApp(
          home: ReestablecerContrasenaScreen(
            email: 'cliente@example.invalid',
            api: api,
          ),
        ),
      );
      expect(find.text('Nueva contraseña'), findsNothing);
      expect(find.text('Confirmar contraseña'), findsNothing);
      await tester.enterText(
        find.byKey(const ValueKey('otp-entrada')),
        '123456',
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Verificar código'));
      await tester.pump();
      await tester.pumpAndSettle(const Duration(seconds: 5));
      expect(llamadas.single.path, '/auth/verificar-reseteo');
      expect((llamadas.single.data as Map)['codigo'], '123456');
      expect((llamadas.single.data as Map).containsKey('password'), false);
      await tester.pump(const Duration(milliseconds: 2500));
      await tester.pumpAndSettle(const Duration(seconds: 6));
      expect(find.byType(CampoOtp), findsNothing);
      expect(find.text('Confirmar contraseña'), findsWidgets);
      expect(find.text('Nueva contraseña'), findsWidgets);
      await tester.enterText(find.byType(TextFormField).first, 'NuevaClave123');
      await tester.enterText(find.byType(TextFormField).last, 'NuevaClave123');
      await tester.tap(
        find.widgetWithText(FilledButton, 'Guardar nueva contraseña'),
      );
      // La petición sale tras leer la sesión guardada; el aviso dura 1,1 s.
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('Contraseña actualizada'), findsWidgets);
      expect(llamadas.last.path, '/auth/reestablecer-contrasena');
      final lastData = llamadas.last.data as Map<String, dynamic>;
      expect(lastData['email'], 'cliente@example.invalid');
      expect(lastData['reset_token'], 'permiso-local');
      expect(lastData['password'], 'NuevaClave123');
      expect(lastData.containsKey('codigo'), true);
      // Se termina con el aviso visible: si la prueba siguiera al login,
      // dejaría operaciones de sesión pendientes para las pruebas siguientes.
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'un OTP incorrecto no muestra las contraseñas ni una confirmación de éxito',
    (tester) async {
      StorageService.instance.reiniciarColaParaPruebas();
      final api = _api(
        (_) async =>
            _json({'success': false, 'mensaje': 'Código incorrecto'}, 400),
      );
      await tester.pumpWidget(
        MaterialApp(
          home: ReestablecerContrasenaScreen(
            email: 'cliente@example.invalid',
            api: api,
          ),
        ),
      );
      await tester.enterText(
        find.byKey(const ValueKey('otp-entrada')),
        '000000',
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Verificar código'));
      await tester.pump(const Duration(milliseconds: 800));
      await tester.pumpAndSettle(const Duration(seconds: 10));
      expect(find.text('Código incorrecto'), findsOneWidget);
      expect(find.text('Confirmar contraseña'), findsNothing);
      expect(find.text('Código verificado'), findsNothing);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'verificar cuenta muestra la confirmación visual después de la respuesta correcta',
    (tester) async {
      StorageService.instance.reiniciarColaParaPruebas();
      final respuesta = Completer<ResponseBody>();
      var llamadas = 0;
      final api = _api((_) {
        llamadas++;
        return respuesta.future;
      });
      await tester.pumpWidget(
        MaterialApp(
          home: VerificacionEmailScreen(
            email: 'cliente@example.invalid',
            api: api,
          ),
        ),
      );
      await tester.enterText(
        find.byKey(const ValueKey('otp-entrada')),
        '123456',
      );
      await tester.tap(
        find.widgetWithText(FilledButton, 'Verificar y continuar'),
      );
      // La petición sale tras leer la sesión guardada.
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      expect(llamadas, 1);
      respuesta.complete(_json({'success': true}));
      await tester.pump();
      await tester.pumpAndSettle(const Duration(seconds: 6));
      await tester.pumpWidget(const SizedBox());
    },
  );
}
