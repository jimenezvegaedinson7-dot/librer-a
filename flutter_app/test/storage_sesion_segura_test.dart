import 'dart:async';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:libreria_app/models/usuario.dart';
import 'package:libreria_app/services/storage_service.dart';
import 'package:libreria_app/utils/constants.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test('una escritura segura fallida bloquea el JWT residual y el usuario nuevo', () async {
    SharedPreferences.setMockInitialValues({Constants.prefUserKey: '{"id_usuario":101}'});
    const channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, (call) async {
      if (call.method == 'write' || call.method == 'delete') throw PlatformException(code: 'fixture-io-failure');
      if (call.method == 'read') return 'fixture-old-session';
      return null;
    });
    await expectLater(StorageService.instance.guardarToken('fixture-new-session'), throwsStateError);
    await StorageService.instance.guardarUsuario(const Usuario(idUsuario: 202, rol: 'cliente'));
    expect(await StorageService.instance.obtenerToken(), isNull);
    expect(await StorageService.instance.tieneSesion(), isFalse);
    expect(StorageService.instance.idUsuarioActual, isNull);
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getString(Constants.prefTokenKey), isNull);
    expect(prefs.getBool('auth_session_invalid'), isTrue);
    // Una escritura posterior válida recupera la sesión sin volver al token A.
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, (call) async {
      if (call.method == 'read') return 'fixture-new-session';
      return null;
    });
    await StorageService.instance.guardarToken('fixture-new-session');
    await StorageService.instance.guardarUsuario(const Usuario(idUsuario: 202, rol: 'cliente'));
    expect(await StorageService.instance.obtenerToken(), 'fixture-new-session');
    expect(StorageService.instance.idUsuarioActual, 202);
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, null);
  });
  test('una migración antigua no puede sobrescribir un login posterior', () async {
    SharedPreferences.setMockInitialValues({Constants.prefTokenKey: 'fixture-legacy-A'});
    const channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
    final iniciado = Completer<void>();
    final liberar = Completer<void>();
    String? almacenado;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, (call) async {
      if (call.method == 'read') return almacenado;
      if (call.method == 'write') {
        final valor = (call.arguments as Map)['value'] as String;
        if (valor == 'fixture-legacy-A') { iniciado.complete(); await liberar.future; }
        almacenado = valor;
      }
      return null;
    });
    final migracion = StorageService.instance.obtenerToken();
    await iniciado.future;
    final login = StorageService.instance.guardarToken('fixture-B');
    liberar.complete();
    await migracion; await login;
    await StorageService.instance.guardarUsuario(const Usuario(idUsuario: 202, rol: 'cliente'));
    expect(await StorageService.instance.obtenerToken(), 'fixture-B');
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, null);
  });
  test('dos credenciales incompatibles heredadas exigen volver a iniciar sesión', () async {
    SharedPreferences.setMockInitialValues({Constants.prefTokenKey: 'fixture-B'});
    const channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, (call) async {
      if (call.method == 'read') return 'fixture-A';
      return null;
    });
    expect(await StorageService.instance.obtenerToken(), isNull);
    expect(StorageService.instance.idUsuarioActual, isNull);
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getBool('auth_session_invalid'), isTrue);
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, null);
  });
}
