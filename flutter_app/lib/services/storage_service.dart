import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/usuario.dart';
import '../utils/constants.dart';

/// Servicio de almacenamiento local.
///
/// Centraliza el guardado/lectura del token JWT y de la información básica del
/// usuario. Nunca se almacenan contraseñas.
///
/// - El token JWT (sensible) se guarda en [FlutterSecureStorage].
/// - El usuario y el resto de datos NO sensibles (carrito, foto, preferencias)
///   siguen en [SharedPreferences].
///
/// Incluye migración automática: si se detecta un token heredado en
/// shared_preferences (clave LEGACY [Constants.prefTokenKey]) se mueve al
/// secure storage y se borra de prefs, evitando desloguear al usuario actual.
class StorageService {
  StorageService._();

  static final StorageService instance = StorageService._();

  static const FlutterSecureStorage _secure = FlutterSecureStorage();
  static const String _sesionInvalidaKey = 'auth_session_invalid';
  bool _sesionInvalida = false;
  Future<void> _colaCredencial = Future.value();
  Future<T> _serializarCredencial<T>(Future<T> Function() accion) {
    final operacion = _colaCredencial.then((_) => accion());
    _colaCredencial = operacion.then<void>((_) {}, onError: (Object _) {});
    return operacion;
  }
  int _generacion = 0;
  int? _idUsuarioActual;
  bool _cambiandoSesion = false;
  bool get cambiandoSesion => _cambiandoSesion;
  int get generacion => _generacion;
  int? get idUsuarioActual => _idUsuarioActual;

  /// Guarda el token JWT en secure storage (y limpia la clave LEGACY).
  Future<void> guardarToken(String token) => _serializarCredencial(() => _guardarToken(token));

  Future<void> _guardarToken(String token) async {
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
      if (!await prefs.setBool(_sesionInvalidaKey, false)) {
        throw StateError('No se pudo confirmar la sesión guardada.');
      }
      _sesionInvalida = false;
    } catch (_) {
      // Fallar cerrado: nunca mezclar un usuario nuevo con un JWT anterior,
      // ni guardar una credencial nueva en preferencias sin cifrar.
      try {
        await _secure.delete(key: Constants.secureTokenKey);
      } catch (_) { /* El marcador persistente bloquea una credencial residual. */ }
      throw StateError('No se pudo guardar la sesión de forma segura. Intenta nuevamente.');
    }
  }

  /// Obtiene el token JWT o null si no existe.
  ///
  /// Lee primero del secure storage. Si no está, busca un token LEGACY en
  /// shared_preferences y lo migra (copia al secure + borra de prefs) para no
  /// desloguear a usuarios con sesiones anteriores.
  Future<String?> obtenerToken() => _serializarCredencial(_obtenerToken);

  Future<String?> _obtenerToken() async {
    final prefs = await SharedPreferences.getInstance();
    if (_sesionInvalida || prefs.getBool(_sesionInvalidaKey) == true) return null;
    final legado = prefs.getString(Constants.prefTokenKey);
    try {
      final token = await _secure.read(key: Constants.secureTokenKey);
      if (token != null && token.isNotEmpty) {
        // Las versiones anteriores pudieron conservar dos cuentas distintas.
        // No se adivina cuál es la válida: exigir un login nuevo.
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
      // Se continúa con el flujo LEGACY si el secure storage falla.
    }

    if (_sesionInvalida || prefs.getBool(_sesionInvalidaKey) == true) return null;
    if (legado == null || legado.isEmpty) return null;

    try {
      await _secure.write(key: Constants.secureTokenKey, value: legado);
      await prefs.remove(Constants.prefTokenKey);
    } catch (_) {
      return null;
    }
    return legado;
  }

  /// Indica si existe una sesión guardada (hay token y usuario).
  Future<bool> tieneSesion() async {
    final token = await obtenerToken();
    if (token == null || token.isEmpty) return false;
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(Constants.prefUserKey) != null;
  }

  /// Comprueba si existe una sesión guardada.
  ///
  /// Alias descriptivo de [tieneSesion] para el flujo de arranque.
  Future<bool> comprobarSesion() => tieneSesion();

  /// Elimina el token JWT (secure storage + clave LEGACY de prefs).
  Future<void> eliminarToken() => _serializarCredencial(_eliminarToken);

  Future<void> _eliminarToken() async {
    _sesionInvalida = true;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_sesionInvalidaKey, true);
    try {
      await _secure.delete(key: Constants.secureTokenKey);
    } catch (_) {
      // Se sigue con la limpieza de prefs aunque el secure storage falle.
    }
    await prefs.remove(Constants.prefTokenKey);
  }

  /// Guarda la información básica del usuario (NO sensible).
  Future<void> guardarUsuario(
    Usuario usuario, {
    int? generacionEsperada,
  }) async {
    final generacion = generacionEsperada ?? _generacion;
    final prefs = await SharedPreferences.getInstance();
    if (generacion != _generacion || _sesionInvalida || prefs.getBool(_sesionInvalidaKey) == true) return;
    if (!await prefs.setString(Constants.prefUserKey, jsonEncode(usuario.toJson()))) {
      await limpiarSesion();
      throw StateError('No se pudo guardar el usuario de la sesión.');
    }
    if (generacion == _generacion) {
      _idUsuarioActual = usuario.idUsuario;
      _cambiandoSesion = false;
    }
  }

  /// Obtiene el usuario guardado o null.
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

  /// Limpia toda la sesión (token y usuario).
  Future<void> limpiarSesion() async {
    _cambiandoSesion = true;
    _generacion++;
    _idUsuarioActual = null;
    await eliminarToken();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(Constants.prefUserKey);
    _cambiandoSesion = false;
  }

  /// Guarda el id del tema de colores del perfil (preferencia, NO sensible).
  Future<void> guardarTemaPerfil(String temaId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(Constants.prefTemaPerfilKey, temaId);
  }

  /// Guarda el id del fondo de pantallas y tarjetas (preferencia, NO sensible).
  Future<void> guardarFondo(String fondoId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(Constants.prefFondoKey, fondoId);
  }

  /// Obtiene el id del fondo elegido o null si no se configuró.
  Future<String?> obtenerFondo() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(Constants.prefFondoKey);
  }

  /// Obtiene el id del tema de colores del perfil o null si no se configuró.
  Future<String?> obtenerTemaPerfil() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(Constants.prefTemaPerfilKey);
  }
}
