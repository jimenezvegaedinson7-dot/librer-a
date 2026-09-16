import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;

/// Configuración centralizada de la aplicación.
///
/// Toda la configuración de red, rutas, almacenamiento y marca debe pasar por
/// aquí para poder cambiar de entorno (Android emulador, Windows/Web, Mac/iOS)
/// sin tocar las pantallas.
class Constants {
  Constants._();

  static const String appName = 'Librería';

  // ---------------------------------------------------------------------------
  // Servidor y API
  // ---------------------------------------------------------------------------

  /// Puerto en el que corre el backend Node.js + Express.
  static const int _serverPort = 3000;

  /// Prefijo de la API.
  static const String _apiVersionPath = '/api';

  /// Dirección del host para emulador Android (apunta al localhost del host).
  static const String _androidHost = '10.0.2.2';

  /// Dirección del host para celular físico (misma red local que la PC).
  static const String _celularHost = '192.168.1.31';

  /// Dirección del host para desarrollo local (Windows, Web, Mac).
  static const String _localHost = 'localhost';

  /// Dominio del backend en producción (Render).
  static const String _produccionHost = 'libreria-api-v9h0.onrender.com';

  /// SELECTOR DE ENTORNO:
  ///
  /// - `true`  → PRODUCCIÓN (usa el backend desplegado en Render).
  /// - `false` → DESARROLLO (usa el backend local).
  static const bool _usarApiProduccion = true;

  /// SELECTOR DE DISPOSITIVO (solo Android en DESARROLLO):
  ///
  /// - `false` → EMULADOR (usa 10.0.2.2).
  /// - `true`  → CELULAR físico (usa 192.168.1.31).
  static const bool _usarCelularFisico = false;

  /// Host de la API.
  ///
  /// - PRODUCCIÓN: [_produccionHost].
  /// - DESARROLLO: Android usa [_androidHost] (EMULADOR) o [_celularHost]
  ///   (CELULAR) según [_usarCelularFisico]; Windows/Web/Mac usan localhost.
  static String get host {
    if (!_usarApiProduccion) {
      if (!kIsWeb && Platform.isAndroid) {
        return _usarCelularFisico ? _celularHost : _androidHost;
      }
      return _localHost;
    }
    return _produccionHost;
  }

  /// Dirección base del servidor (sin `/api`), usada para servir archivos
  /// estáticos como imágenes.
  static String get serverBaseUrl {
    if (_usarApiProduccion) {
      return 'https://$_produccionHost';
    }
    return 'http://$host:$_serverPort';
  }

  /// Dirección base de la API (con `/api`).
  static String get apiBaseUrl => '$serverBaseUrl$_apiVersionPath';

  // ---------------------------------------------------------------------------
  // Rutas del backend
  // ---------------------------------------------------------------------------
  // Todas las rutas conocidas se centralizan aquí. Ninguna pantalla debe
  // escribir URLs directamente.

  static const String loginPath = '/auth/login';
  static const String registroPath = '/auth/registro';
  static const String verificarEmailPath = '/auth/verificar-email';
  static const String reenviarCodigoPath = '/auth/reenviar-codigo';
  static const String librosPath = '/libros';
  static const String perfilPath = '/usuarios/perfil';

  // ---------------------------------------------------------------------------
  // Rutas 2FA
  // ---------------------------------------------------------------------------
  static const String twoFactorSetupPath = '/auth/2fa/setup';
  static const String twoFactorConfirmPath = '/auth/2fa/confirm';
  static const String twoFactorVerifyLoginPath = '/auth/2fa/verify-login';
  static const String twoFactorDisablePath = '/auth/2fa/disable';

  // ---------------------------------------------------------------------------
  // Rutas de usuario (perfil, foto, contraseña)
  // ---------------------------------------------------------------------------
  static const String actualizarPerfilPath = '/usuarios/perfil';
  static const String fotoPerfilPath = '/usuarios/foto';
  static const String cambiarPasswordPath = '/usuarios/password';

  // ---------------------------------------------------------------------------
  // Rutas de reservas (solo cliente)
  // ---------------------------------------------------------------------------
  static const String reservasPath = '/reservas';

  // ---------------------------------------------------------------------------
  // Rutas de ventas / compras (solo cliente)
  // ---------------------------------------------------------------------------
  static const String ventasPath = '/ventas';

  // ---------------------------------------------------------------------------
  // Rutas de pagos (Mercado Pago - Orders API)
  // ---------------------------------------------------------------------------
  static const String pagosPath = '/pagos';

  // ---------------------------------------------------------------------------
  // Rutas de ubicaciones (Lima) y agencias courier
  // ---------------------------------------------------------------------------
  static const String ubicacionesPath = '/ubicaciones';
  static const String agenciasPath = '/agencias';

  /// Prefijo de las rutas 2FA bajo /auth.
  static const String twoFactorBasePath = '/auth/2fa';

  /// Prefijo con el que el backend sirve las portadas de los libros.
  static const String portadasPath = '/uploads/portadas/';

  /// Prefijo con el que el backend sirve las fotos de perfil.
  static const String perfilesPath = '/uploads/perfiles/';

  /// Construye la URL absoluta de un archivo servido por el backend.
  ///
  /// [path] puede venir como una ruta relativa completa (`/uploads/...`), un
  /// nombre de archivo (`archivo.jpg`), una URL absoluta (`http(s)://...`) o
  /// vacío/null. Si [path] es absoluto HTTP, se usa tal cual; si es una ruta
  /// que ya empieza por `/`, se antepone [serverBaseUrl]; de lo contrario se
  /// antepone [serverBaseUrl] + [defaultPrefix].
  static String buildFileUrl(String? path, {String defaultPrefix = '/'}) {
    if (path == null || path.trim().isEmpty) {
      return '';
    }
    final value = path.trim();
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }
    if (value.startsWith('/')) {
      return '$serverBaseUrl$value';
    }
    return '$serverBaseUrl$defaultPrefix$value';
  }

  /// Construye la URL absoluta de una portada de libro.
  static String buildPortadaUrl(String? portada) {
    return buildFileUrl(portada, defaultPrefix: portadasPath);
  }

  /// Construye la URL absoluta de una foto de perfil.
  static String buildPerfilUrl(String? foto) {
    return buildFileUrl(foto, defaultPrefix: perfilesPath);
  }

  // ---------------------------------------------------------------------------
  // Almacenamiento
  // ---------------------------------------------------------------------------
  // El token JWT (sensible) vive en flutter_secure_storage; en
  // shared_preferences solo se guardan datos NO sensibles (usuario, carrito,
  // foto, preferencias). `prefTokenKey` se conserva como clave LEGACY para
  // migrar tokens de instalaciones anteriores.

  /// Clave del token JWT en flutter_secure_storage.
  static const String secureTokenKey = 'auth_token';

  /// Clave LEGACY del token JWT en shared_preferences (migración).
  static const String prefTokenKey = 'auth_token';

  /// Clave del usuario (JSON, NO sensible) en shared_preferences.
  static const String prefUserKey = 'auth_user';

  // ---------------------------------------------------------------------------
  // Marca / logo
  // ---------------------------------------------------------------------------

  /// Ruta del logo dentro de los assets.
  static const String logoAsset = 'assets/images/logo_libreria.png';
}
