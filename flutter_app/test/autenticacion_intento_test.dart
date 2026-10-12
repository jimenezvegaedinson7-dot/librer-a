import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:libreria_app/screens/security/two_factor_verify_screen.dart';
import 'package:libreria_app/services/api_service.dart';
import 'package:libreria_app/services/storage_service.dart';

import 'soporte_api_local.dart';

class _EscrituraDemorada extends FlutterSecureStorage {
  final escribiendo = Completer<void>(), liberar = Completer<void>();
  @override
  Future<void> write({
    required String key,
    required String? value,
    AppleOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    AppleOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    if (value == 'token-local-2') {
      escribiendo.complete();
      await liberar.future;
    }
    await super.write(key: key, value: value);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final storage = StorageService.instance;

  test('OTP abandonado llega antes de B: no instala A ni invalida la respuesta de B', () async {
    await prepararAlmacenamientoLocal();
    final respuestaA = Completer<ResponseBody>();
    final respuestaB = Completer<ResponseBody>();
    final enviadaA = Completer<void>(), enviadaB = Completer<void>();
    final api = apiLocal((o) {
      if (o.path.endsWith('verify-login')) {
        enviadaA.complete();
        return respuestaA.future;
      }
      enviadaB.complete();
      return respuestaB.future;
    });
    final intentoA = storage.iniciarAutenticacion();
    final a = api.verificarLogin2FA(
      twoFactorToken: 'desafio-A',
      codigo: '123456',
      intento: intentoA,
    );
    final rechazoA = expectLater(a, throwsA(isA<ApiException>()));
    await enviadaA.future;
    storage.invalidarAutenticacion(intentoA);
    final generacion = storage.generacion;
    final b = api.login(email: 'B@example.invalid', password: 'local');
    await enviadaB.future;
    respuestaA.complete(respuestaLocal(accesoLocal(2)));
    await rechazoA;
    expect(await storage.obtenerToken(), isNull);
    expect(storage.generacion, generacion);
    respuestaB.complete(respuestaLocal(accesoLocal(3)));
    expect((await b).loginCompletado, true);
    expect(await storage.obtenerToken(), 'token-local-3');
    expect((await storage.obtenerUsuario())?.idUsuario, 3);
  });

  test(
    'iniciar otro login invalida el anterior aunque el llamador no lo cancele',
    () async {
      await prepararAlmacenamientoLocal();
      final enviada = Completer<void>(), respuesta = Completer<ResponseBody>();
      final api = apiLocal((o) {
        if ((o.data as Map)['email'] == 'A@example.invalid') {
          enviada.complete();
          return respuesta.future;
        }
        return Future.value(respuestaLocal(accesoLocal(3)));
      });
      final a = api.login(email: 'A@example.invalid', password: 'local');
      final rechazo = expectLater(a, throwsA(isA<ApiException>()));
      await enviada.future;
      await api.login(email: 'B@example.invalid', password: 'local');
      respuesta.complete(respuestaLocal(accesoLocal(2)));
      await rechazo;
      expect(await storage.obtenerToken(), 'token-local-3');
      expect((await storage.obtenerUsuario())?.idUsuario, 3);
    },
  );

  test('abandonar durante secure.write limpia A y permite guardar B en la misma cola', () async {
    await prepararAlmacenamientoLocal();
    final secure = _EscrituraDemorada();
    storage.usarAlmacenamientoPruebas(secure);
    addTearDown(() => storage.usarAlmacenamientoPruebas(null));
    final api = apiLocal(
      (o) async =>
          respuestaLocal(accesoLocal(o.path.endsWith('verify-login') ? 2 : 3)),
    );
    final intento = storage.iniciarAutenticacion();
    final a = api.verificarLogin2FA(
      twoFactorToken: 'A',
      codigo: '123456',
      intento: intento,
    );
    final rechazo = expectLater(a, throwsA(isA<ApiException>()));
    await secure.escribiendo.future;
    storage.invalidarAutenticacion(intento);
    final b = api.login(email: 'B@example.invalid', password: 'local');
    secure.liberar.complete();
    await rechazo;
    await b;
    expect(await storage.obtenerToken(), 'token-local-3');
    expect((await storage.obtenerUsuario())?.idUsuario, 3);
  });

  testWidgets(
    'Atrás de Android invalida el OTP antes de la respuesta, incluso durante la transición',
    (tester) async {
      await prepararAlmacenamientoLocal();
      final enviada = Completer<void>(), respuesta = Completer<ResponseBody>();
      final api = apiLocal((o) {
        if (o.path.endsWith('verify-login')) {
          enviada.complete();
          return respuesta.future;
        }
        return Future.value(respuestaLocal(accesoLocal(3)));
      });
      final navigator = GlobalKey<NavigatorState>();
      await tester.pumpWidget(
        MaterialApp(
          navigatorKey: navigator,
          home: const Scaffold(body: Text('Login disponible')),
        ),
      );
      final intento = storage.iniciarAutenticacion();
      unawaited(
        navigator.currentState!.push<void>(
          MaterialPageRoute(
            builder: (_) => TwoFactorVerifyScreen(
              twoFactorToken: 'A',
              intento: intento,
              api: api,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('otp-entrada')),
        '123456',
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Verificar'));
      for (var i = 0; i < 20 && !enviada.isCompleted; i++) {
        await tester.pump(const Duration(milliseconds: 20));
      }
      expect(enviada.isCompleted, true);
      await tester.binding.handlePopRoute();
      expect(intento.vigente, false);
      respuesta.complete(respuestaLocal(accesoLocal(2)));
      await tester.pump();
      expect(await storage.obtenerToken(), isNull);
      final loginB = api.login(email: 'B@example.invalid', password: 'local');
      await tester.pumpAndSettle();
      await loginB;
      expect((await storage.obtenerUsuario())?.idUsuario, 3);
      expect(find.text('Acceso verificado'), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
