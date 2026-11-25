import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;

class Constants {
  Constants._();

  static const String appName = 'MATIDANA';
  static const String ciudadDelivery = 'Ciudad de Pallasca';
  static const String direccionRecojo =
      'Plaza de Armas, Jr. Marañón 161, Pallasca 02835';

  static const int _serverPort = 3000;

  static const String _apiVersionPath = '/api';

  static const String _androidHost = '10.0.2.2';

  static const String _celularHost = '192.168.1.31';

  static const String _localHost = 'localhost';

  static const String _produccionHost = 'libreria-api-v9h0.onrender.com';

  static const bool _usarApiProduccion = !bool.fromEnvironment('API_LOCAL');

  static const bool _usarCelularFisico = bool.fromEnvironment('API_CELULAR');

  static String get host {
    if (_usarApiProduccion) {
      return _produccionHost;
    }
    if (!kIsWeb && Platform.isAndroid) {
      return _usarCelularFisico ? _celularHost : _androidHost;
    }
    return _localHost;
  }

  static String get serverBaseUrl => _usarApiProduccion
      ? 'https://$_produccionHost'
      : 'http://$host:$_serverPort';

  static String get apiBaseUrl => '$serverBaseUrl$_apiVersionPath';

  static const String loginPath = '/auth/login';
  static const String registroPath = '/auth/registro';
  static const String verificarEmailPath = '/auth/verificar-email';
  static const String reenviarCodigoPath = '/auth/reenviar-codigo';
  static const String solicitarReseteoPath = '/auth/solicitar-reseteo';
  static const String verificarReseteoPath = '/auth/verificar-reseteo';
  static const String reestablecerContrasenaPath =
      '/auth/reestablecer-contrasena';
  static const String librosPath = '/libros';
  static const String perfilPath = '/usuarios/perfil';

  static const String twoFactorSetupPath = '/auth/2fa/setup';
  static const String twoFactorConfirmPath = '/auth/2fa/confirm';
  static const String twoFactorVerifyLoginPath = '/auth/2fa/verify-login';
  static const String twoFactorDisablePath = '/auth/2fa/disable';

  static const String actualizarPerfilPath = '/usuarios/perfil';
  static const String fotoPerfilPath = '/usuarios/foto';
  static const String cambiarPasswordPath = '/usuarios/password';
  static const String eliminarCuentaPath = '/usuarios/cuenta';

  static const String libroReclamacionesUrl =
      'https://libreria.my/libro-de-reclamaciones';

  static const String favoritosPath = '/favoritos';

  static const String ventasPath = '/ventas';

  static const String pagosPath = '/pagos';

  static const String zonasDeliveryPath = '/zonas-delivery';

  static const String twoFactorBasePath = '/auth/2fa';

  static const String portadasPath = '/uploads/portadas/';

  static const String perfilesPath = '/uploads/perfiles/';

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

  static String buildPortadaUrl(String? portada) {
    return buildFileUrl(portada, defaultPrefix: portadasPath);
  }

  static String buildPerfilUrl(String? foto) {
    return buildFileUrl(foto, defaultPrefix: perfilesPath);
  }

  static const String secureTokenKey = 'auth_token';

  static const String prefTokenKey = 'auth_token';

  static const String prefUserKey = 'auth_user';

  static const String prefTemaPerfilKey = 'perfil_tema';

  static const String prefFondoKey = 'perfil_fondo';

  static const String prefTarjetaKey = 'perfil_tarjeta';

  static const String logoAsset = 'assets/images/logo_web.png';
}
