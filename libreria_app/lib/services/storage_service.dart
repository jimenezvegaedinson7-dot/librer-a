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

  /// Guarda el token JWT en secure storage (y limpia la clave LEGACY).
  Future<void> guardarToken(String token) async {
    try {
      await _secure.write(key: Constants.secureTokenKey, value: token);
      // Si el secure storage funcionó, ya no hace falta la copia LEGACY.
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(Constants.prefTokenKey);
    } catch (_) {
      // Plataforma sin soporte de secure storage: se mantiene el respaldo en
      // shared_preferences para no romper la sesión (obtenerToken lo migra
      // cuando el entorno vuelva a permitirlo).
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(Constants.prefTokenKey, token);
    }
  }

  /// Obtiene el token JWT o null si no existe.
  ///
  /// Lee primero del secure storage. Si no está, busca un token LEGACY en
  /// shared_preferences y lo migra (copia al secure + borra de prefs) para no
  /// desloguear a usuarios con sesiones anteriores.
  Future<String?> obtenerToken() async {
    try {
      final token = await _secure.read(key: Constants.secureTokenKey);
      if (token != null && token.isNotEmpty) return token;
    } catch (_) {
      // Se continúa con el flujo LEGACY si el secure storage falla.
    }

    final prefs = await SharedPreferences.getInstance();
    final legado = prefs.getString(Constants.prefTokenKey);
    if (legado == null || legado.isEmpty) return null;

    try {
      await _secure.write(key: Constants.secureTokenKey, value: legado);
      await prefs.remove(Constants.prefTokenKey);
    } catch (_) {
      // Sin soporte de secure storage: se devuelve el token LEGACY igualmente
      // para conservar la sesión.
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
  Future<void> eliminarToken() async {
    try {
      await _secure.delete(key: Constants.secureTokenKey);
    } catch (_) {
      // Se sigue con la limpieza de prefs aunque el secure storage falle.
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(Constants.prefTokenKey);
  }

  /// Guarda la información básica del usuario (NO sensible).
  Future<void> guardarUsuario(Usuario usuario) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(Constants.prefUserKey, jsonEncode(usuario.toJson()));
  }

  /// Obtiene el usuario guardado o null.
  Future<Usuario?> obtenerUsuario() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(Constants.prefUserKey);
    if (raw == null || raw.isEmpty) return null;
    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      return Usuario.fromJson(map);
    } catch (_) {
      return null;
    }
  }

  /// Limpia toda la sesión (token y usuario).
  Future<void> limpiarSesion() async {
    await eliminarToken();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(Constants.prefUserKey);
  }
}
