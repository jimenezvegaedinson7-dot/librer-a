import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/usuario.dart';
import '../utils/constants.dart';

class IntentoAutenticacion {
  IntentoAutenticacion._();
  bool _vigente = true;
  bool get vigente => _vigente;
}

class StorageService {
  StorageService._();

  static final StorageService instance = StorageService._();

  static FlutterSecureStorage _secure = const FlutterSecureStorage();
  @visibleForTesting
  void usarAlmacenamientoPruebas(FlutterSecureStorage? secure) =>
      _secure = secure ?? const FlutterSecureStorage();
  static const String _sesionInvalidaKey = 'auth_session_invalid';
  bool _sesionInvalida = false;
  Future<void> _colaCredencial = Future.value();
  Future<T> _serializarCredencial<T>(Future<T> Function() accion) {
    final operacion = _colaCredencial.then((_) => accion());
    _colaCredencial = operacion.then<void>((_) {}, onError: (Object _) {});
    return operacion;
  }

  @visibleForTesting
  void reiniciarColaParaPruebas() => _colaCredencial = Future.value();
  int _generacion = 0;
  int? _idUsuarioActual;
  bool _cambiandoSesion = false;
  bool get cambiandoSesion => _cambiandoSesion;
  int get generacion => _generacion;
  int? get idUsuarioActual => _idUsuarioActual;

  IntentoAutenticacion? _autenticacion;

  IntentoAutenticacion iniciarAutenticacion() {
    _autenticacion?._vigente = false;
    return _autenticacion = IntentoAutenticacion._();
  }

  void invalidarAutenticacion(IntentoAutenticacion intento) {
    intento._vigente = false;
    if (identical(_autenticacion, intento)) _autenticacion = null;
  }

  Future<bool> guardarSesionAutenticada(
    String token,
    Usuario? usuario,
    IntentoAutenticacion intento,
  ) => _serializarCredencial(() async {
    if (!intento.vigente) return false;
    try {
      await _guardarToken(token, confirmar: false);
      final prefs = await SharedPreferences.getInstance();
      if (intento.vigente && usuario != null) {
        if (!await prefs.setString(
          Constants.prefUserKey,
          jsonEncode(usuario.toJson()),
        )) {
          throw StateError('No se pudo guardar el usuario de la sesión.');
        }
      }
      if (!intento.vigente) {
        await _eliminarToken();
        await prefs.remove(Constants.prefUserKey);
        return false;
      }
      if (!await prefs.setBool(_sesionInvalidaKey, false)) {
        throw StateError('No se pudo confirmar la sesión guardada.');
      }
      if (!intento.vigente) {
        await _eliminarToken();
        await prefs.remove(Constants.prefUserKey);
        return false;
      }
      _sesionInvalida = false;
      _idUsuarioActual = usuario?.idUsuario;
      return true;
    } catch (_) {
      await _eliminarToken();
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(Constants.prefUserKey);
      rethrow;
    } finally {
      _cambiandoSesion = false;
    }
  });

  Future<void> guardarToken(String token) =>
      _serializarCredencial(() => _guardarToken(token));

  Future<void> _guardarToken(String token, {bool confirmar = true}) async {
    _cambiandoSesion = true;
    _generacion++;
    _idUsuarioActual = null;
    _sesionInvalida = true;
    final prefs = await SharedPreferences.getInstance();
    if (!await prefs.setBool(_sesionInvalidaKey, true)) {
      throw StateError('No se pudo proteger el cambio de sesión.');
    }
    await prefs.remove(Constants.prefUserKey);
    await prefs.remove(Constants.prefTokenKey);
    try {
      await _secure.write(key: Constants.secureTokenKey, value: token);
      if (confirmar) {
        if (!await prefs.setBool(_sesionInvalidaKey, false)) {
          throw StateError('No se pudo confirmar la sesión guardada.');
        }
        _sesionInvalida = false;
      }
    } catch (_) {

      try {
        await _secure.delete(key: Constants.secureTokenKey);
      } catch (_) {

      }
      throw StateError(
        'No se pudo guardar la sesión de forma segura. Intenta nuevamente.',
      );
    }
  }

  Future<String?> obtenerToken() => _serializarCredencial(_obtenerToken);

  Future<String?> _obtenerToken() async {
    final prefs = await SharedPreferences.getInstance();
    if (_sesionInvalida || prefs.getBool(_sesionInvalidaKey) == true) {
      return null;
    }
    final legado = prefs.getString(Constants.prefTokenKey);
    try {
      final token = await _secure.read(key: Constants.secureTokenKey);
      if (token != null && token.isNotEmpty) {

        if (legado != null && legado.isNotEmpty && legado != token) {
          _generacion++;
          _idUsuarioActual = null;
          await _eliminarToken();
          await prefs.remove(Constants.prefUserKey);
          return null;
        }
        return token;
      }
    } catch (_) {

    }

    if (_sesionInvalida || prefs.getBool(_sesionInvalidaKey) == true) {
      return null;
    }
    if (legado == null || legado.isEmpty) return null;

    try {
      await _secure.write(key: Constants.secureTokenKey, value: legado);
      await prefs.remove(Constants.prefTokenKey);
    } catch (_) {
      return null;
    }
    return legado;
  }

  Future<bool> tieneSesion() async {
    final token = await obtenerToken();
    if (token == null || token.isEmpty) return false;
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(Constants.prefUserKey) != null;
  }

  Future<bool> comprobarSesion() => tieneSesion();

  Future<void> eliminarToken() => _serializarCredencial(_eliminarToken);

  Future<void> _eliminarToken() async {
    _sesionInvalida = true;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_sesionInvalidaKey, true);
    try {
      await _secure.delete(key: Constants.secureTokenKey);
    } catch (_) {

    }
    await prefs.remove(Constants.prefTokenKey);
  }

  Future<void> guardarUsuario(
    Usuario usuario, {
    int? generacionEsperada,
  }) async {
    final generacion = generacionEsperada ?? _generacion;
    final prefs = await SharedPreferences.getInstance();
    if (generacion != _generacion ||
        _sesionInvalida ||
        prefs.getBool(_sesionInvalidaKey) == true) {
      return;
    }
    if (!await prefs.setString(
      Constants.prefUserKey,
      jsonEncode(usuario.toJson()),
    )) {
      await limpiarSesion();
      throw StateError('No se pudo guardar el usuario de la sesión.');
    }
    if (generacion == _generacion) {
      _idUsuarioActual = usuario.idUsuario;
      _cambiandoSesion = false;
    }
  }

  Future<Usuario?> obtenerUsuario() async {
    final generacion = _generacion;
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(Constants.prefUserKey);
    if (raw == null || raw.isEmpty) return null;
    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      final usuario = Usuario.fromJson(map);
      if (generacion == _generacion) _idUsuarioActual = usuario.idUsuario;
      return usuario;
    } catch (_) {
      return null;
    }
  }

  Future<void> limpiarSesion() async {
    if (_autenticacion case final intento?) invalidarAutenticacion(intento);
    _cambiandoSesion = true;
    _generacion++;
    _idUsuarioActual = null;
    await _serializarCredencial(() async {
      try {
        await _eliminarToken();
        final prefs = await SharedPreferences.getInstance();
        await prefs.remove(Constants.prefUserKey);
      } finally {
        _cambiandoSesion = false;
      }
    });
  }

  Future<void> guardarTemaPerfil(String temaId) async {
    final prefs = await SharedPreferences.getInstance();
    if (!await prefs.setString(Constants.prefTemaPerfilKey, temaId)) {
      throw StateError('No se pudo guardar el color de botones.');
    }
  }

  Future<void> guardarFondo(String fondoId) async {
    final prefs = await SharedPreferences.getInstance();
    if (!await prefs.setString(Constants.prefFondoKey, fondoId)) {
      throw StateError('No se pudo guardar el fondo.');
    }
  }

  Future<void> guardarTarjeta(String tarjetaId) async {
    final prefs = await SharedPreferences.getInstance();
    if (!await prefs.setString(Constants.prefTarjetaKey, tarjetaId)) {
      throw StateError('No se pudo guardar el color de tarjetas.');
    }
  }

  static const String _verificacionPendienteKey =
      'verificacion_pendiente_email';

  Future<void> guardarVerificacionPendiente(String email) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_verificacionPendienteKey, email.trim());
  }

  Future<String?> obtenerVerificacionPendiente() async {
    final prefs = await SharedPreferences.getInstance();
    final email = prefs.getString(_verificacionPendienteKey);
    return (email ?? '').isEmpty ? null : email;
  }

  Future<void> limpiarVerificacionPendiente() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_verificacionPendienteKey);
  }

  Future<String?> obtenerFondo() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(Constants.prefFondoKey);
  }

  Future<String?> obtenerTarjeta() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(Constants.prefTarjetaKey);
  }

  Future<String?> obtenerTemaPerfil() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(Constants.prefTemaPerfilKey);
  }
}
