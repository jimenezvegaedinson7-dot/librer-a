import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../models/agencia.dart';
import '../models/libro.dart';
import '../models/orden_pago.dart';
import '../models/reserva.dart';
import '../models/ubicacion.dart';
import '../models/usuario.dart';
import '../models/venta.dart';
import '../utils/constants.dart';
import '../utils/idempotencia.dart';
import '../utils/json_utils.dart';
import 'navigation.dart';
import 'storage_service.dart';

/// Resultado del login con soporte para doble factor de autenticación.
///
/// - Si [requiere2fa] es `false`, el login terminó y la sesión quedó guardada.
/// - Si [requiere2fa] es `true`, hay que pedir el código OTP al usuario y
///   llamar a [ApiService.verificarLogin2FA] con [twoFactorToken]. El token
///   temporal NUNCA se guarda en almacenamiento persistente: solo vive en
///   memoria durante el flujo.
class LoginResult {
  final bool requiere2fa;
  final String? twoFactorToken;

  const LoginResult({required this.requiere2fa, this.twoFactorToken});

  bool get loginCompletado => !requiere2fa;
}

/// Resultado del registro con verificación de email.
///
/// - [requiereVerificacion] indica si la cuenta quedó pendiente de verificar
///   el correo (código enviado por email). Si es `false`, la cuenta ya quedó
///   lista (solo ocurre si el backend no usara verificación).
/// - [email] es el correo registrado (para precargar el login y para usar en
///   la verificación).
class RegistroResult {
  final String email;
  final bool requiereVerificacion;

  const RegistroResult({
    required this.email,
    required this.requiereVerificacion,
  });
}

/// Excepción de dominio con un mensaje amigable para el usuario.
class ApiException implements Exception {
  final String message;
  const ApiException(this.message);

  @override
  String toString() => message;
}

/// Cliente HTTP centralizado basado en Dio.
///
/// Configura la [baseUrl] desde [Constants] y agrega automáticamente el
/// header `Authorization: Bearer <token>` cuando existe una sesión activa.
/// Además normaliza los errores de Dio en mensajes claros.
class ApiService {
  ApiService._() {
    _dio = Dio(
      BaseOptions(
        baseUrl: Constants.apiBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {'Content-Type': 'application/json'},
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await StorageService.instance.obtenerToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          // Si el token es inválido o expiró, limpia la sesión local una sola
          // vez y dirige al usuario al Login. No hay reintento automático
          // aquí (evita ciclos: tras limpiar el token, los siguientes 401 ya no
          // encuentran sesión y no vuelven a navegar).
          if (error.response?.statusCode == 401) {
            final token = await StorageService.instance.obtenerToken();
            if (token != null && token.isNotEmpty) {
              await StorageService.instance.limpiarSesion();
              limpiarEstadoCheckout();
              irALogin();
            }
          }
          handler.next(error);
        },
      ),
    );
  }

  static final ApiService instance = ApiService._();

  late final Dio _dio;

  /// Clave de idempotencia del intento de checkout en curso.
  ///
  /// Se genera UNA vez al iniciar el checkout y se reutiliza entre reintentos
  /// (un reintento tras timeout no debe duplicar la orden: el backend responde
  /// `ya_existia`). Solo se libera cuando el pago termina o cambia el contenido
  /// del checkout (ver `limpiarIdempotencia`).
  String? _idempotenciaClave;
  String? _idempotenciaFingerprint;
  int? _idVentaIdempotencia;

  /// Últimos `checkout_url` conocidos por venta (id_venta -> URL).
  ///
  /// Permite reabrir el checkout desde "Mis compras" cuando el usuario cierra
  /// el navegador sin pagar, incluso si la respuesta no incluye la URL.
  final Map<int, String> _checkoutUrls = {};

  /// Devuelve el último checkout URL registrado para una venta, o null.
  String? obtenerCheckoutUrl(int idVenta) => _checkoutUrls[idVenta];

  /// Recupera desde el backend la URL de pago de una venta pendiente.
  Future<String?> recuperarCheckoutVenta(int idVenta) async {
    try {
      final response = await _dio.get<dynamic>(
        '${Constants.ventasPath}/$idVenta/pago',
      );
      final raw = response.data;
      if (raw is! Map) return null;
      final data = raw['data'];
      if (data is! Map) return null;
      final url = JsonUtils.asString(data['checkout_url']);
      if (url != null && url.isNotEmpty) {
        _checkoutUrls[idVenta] = url;
      }
      return url;
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Libera la clave de idempotencia actual (nuevo intento de checkout).
  void limpiarIdempotencia({int? idVenta}) {
    if (idVenta != null && idVenta != _idVentaIdempotencia) {
      return;
    }
    _idempotenciaClave = null;
    _idempotenciaFingerprint = null;
    _idVentaIdempotencia = null;
  }

  /// Limpia el estado de checkout en memoria: idempotencia y URLs guardadas.
  ///
  /// Debe invocarse al cerrar sesión o al recibir un 401 para que una cuenta
  /// distinta (o una sesión nueva) nunca reutilice la clave/URL de otra.
  void limpiarEstadoCheckout() {
    limpiarIdempotencia();
    _checkoutUrls.clear();
  }

  /// Genera una clave de idempotencia única para el intento de checkout.
  String _generarIdempotencia() {
    return generarClaveIdempotencia();
  }

  /// Convierte un [DioException] en una [ApiException] con mensaje claro.
  ApiException _toApiException(DioException e) {
    final status = e.response?.statusCode;
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.sendTimeout) {
      return const ApiException(
        'El servidor tardó demasiado en responder. Inténtalo de nuevo.',
      );
    }
    if (e.type == DioExceptionType.connectionError) {
      return const ApiException(
        'No se pudo conectar con el servidor. Revisa tu conexión.',
      );
    }
    // Servidor caído o conexión rechazada (sin respuesta HTTP).
    if (e.type == DioExceptionType.unknown && e.response == null) {
      return const ApiException(
        'El servidor no está disponible. Inténtalo más tarde.',
      );
    }
    if (status != null) {
      final data = e.response?.data;
      if (data is Map) {
        // El backend usa "mensaje"; se acepta también "message" por robustez.
        final msg = data['mensaje'] ?? data['message'];
        if (msg != null && msg.toString().trim().isNotEmpty) {
          return ApiException(msg.toString());
        }
      }
      switch (status) {
        case 400:
          return const ApiException('Solicitud inválida.');
        case 401:
          return const ApiException(
            'Tu sesión expiró. Inicia sesión nuevamente.',
          );
        case 403:
          return const ApiException('No tienes permisos para esta acción.');
        case 404:
          return const ApiException('Recurso no encontrado.');
        case 500:
        case 502:
        case 503:
          return const ApiException('Error del servidor. Inténtalo más tarde.');
      }
    }
    return const ApiException(
      'Ocurrió un error inesperado. Inténtalo de nuevo.',
    );
  }

  /// Realiza el login contra `POST /auth/login`.
  ///
  /// Devuelve un [LoginResult]:
  /// - Si el cliente NO tiene 2FA, guarda el token y el usuario y devuelve
  ///   `requiere2fa = false`.
  /// - Si el cliente SÍ tiene 2FA, devuelve `requiere2fa = true` junto con el
  ///   `twoFactorToken` temporal (solo en memoria) para verificar el OTP.
  ///
  /// Si el rol fuera administrador, lanza [ApiException] indicando que esta
  /// app es exclusiva para clientes.
  Future<LoginResult> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        Constants.loginPath,
        data: {'email': email, 'password': password},
      );

      final data = response.data ?? {};

      // CASO B: el backend pide código de doble factor.
      if (data['requires_2fa'] == true) {
        final tokenTemporal = (data['two_factor_token'] ?? '').toString();
        if (tokenTemporal.isEmpty) {
          throw const ApiException(
            'El servidor no devolvió el token para verificar el código.',
          );
        }
        return LoginResult(requiere2fa: true, twoFactorToken: tokenTemporal);
      }

      // CASO A: login normal.
      final token = (data['token'] ?? data['accessToken'] ?? '').toString();
      if (token.isEmpty) {
        throw const ApiException('El servidor no devolvió un token válido.');
      }

      final usuarioData = data['data'];
      if (usuarioData is Map) {
        final usuario = Usuario.fromJson(
          Map<String, dynamic>.from(usuarioData),
        );
        if (usuario.esAdministrador) {
          throw const ApiException(
            'Esta aplicación es para clientes. El panel administrativo se encuentra en otra plataforma.',
          );
        }
        await StorageService.instance.guardarToken(token);
        await StorageService.instance.guardarUsuario(usuario);
        return const LoginResult(requiere2fa: false);
      }

      await StorageService.instance.guardarToken(token);
      return const LoginResult(requiere2fa: false);
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Verifica el código OTP del doble factor contra `POST /auth/2fa/verify-login`.
  ///
  /// Al validarse, guarda la sesión y devuelve `true`. El [twoFactorToken]
  /// temporal se usa solo en memoria para esta llamada y se descarta al terminar.
  Future<bool> verificarLogin2FA({
    required String twoFactorToken,
    required String codigo,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        Constants.twoFactorVerifyLoginPath,
        data: {'two_factor_token': twoFactorToken, 'codigo': codigo},
      );
      final data = response.data ?? {};
      final token = (data['token'] ?? data['accessToken'] ?? '').toString();
      if (token.isEmpty) {
        throw const ApiException('El servidor no devolvió un token válido.');
      }
      final usuarioData = data['data'];
      if (usuarioData is Map) {
        final usuario = Usuario.fromJson(
          Map<String, dynamic>.from(usuarioData),
        );
        if (usuario.esAdministrador) {
          throw const ApiException(
            'Esta aplicación es para clientes. El panel administrativo se encuentra en otra plataforma.',
          );
        }
        await StorageService.instance.guardarToken(token);
        await StorageService.instance.guardarUsuario(usuario);
      } else {
        await StorageService.instance.guardarToken(token);
      }
      return true;
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Inicia la configuración del doble factor contra `POST /auth/2fa/setup`.
  ///
  /// Devuelve el secreto, la URL OTPAuth y el QR (data URL base64). Requiere
  /// sesión activa.
  Future<Map<String, dynamic>> setupTwoFactor() async {
    try {
      final response = await _dio.post<dynamic>(Constants.twoFactorSetupPath);
      final data = response.data;
      if (data is Map && data['data'] is Map) {
        return Map<String, dynamic>.from(data['data'] as Map);
      }
      throw const ApiException('El servidor no devolvió la configuración 2FA.');
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Confirma (activa) el doble factor contra `POST /auth/2fa/confirm`.
  ///
  /// Requiere el [codigo] OTP de 6 dígitos generado con el secreto del setup.
  Future<void> confirmarTwoFactor({required String codigo}) async {
    try {
      await _dio.post<dynamic>(
        Constants.twoFactorConfirmPath,
        data: {'codigo': codigo},
      );
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Desactiva el doble factor contra `POST /auth/2fa/disable`.
  ///
  /// Requiere la contraseña actual y el código OTP generado por la app.
  Future<void> desactivarTwoFactor({
    required String password,
    required String codigo,
  }) async {
    try {
      await _dio.post<dynamic>(
        Constants.twoFactorDisablePath,
        data: {'password': password, 'codigo': codigo},
      );
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Actualiza los datos del perfil contra `PUT /usuarios/perfil`.
  ///
  /// Devuelve el usuario actualizado por el backend.
  Future<Usuario> actualizarPerfil({
    required String nombre,
    required String apellido,
    required String email,
    String? telefono,
  }) async {
    try {
      final response = await _dio.put<dynamic>(
        Constants.actualizarPerfilPath,
        data: {
          'nombre': nombre,
          'apellido': apellido,
          'email': email,
          'telefono': telefono,
        },
      );
      final data = response.data;
      Map<String, dynamic>? map;
      if (data is Map) {
        map = Map<String, dynamic>.from(data);
        if (map.containsKey('data') && map['data'] is Map) {
          map = Map<String, dynamic>.from(map['data'] as Map);
        }
      }
      if (map == null) {
        throw const ApiException(
          'El servidor no devolvió el perfil actualizado.',
        );
      }
      final usuario = Usuario.fromJson(map);
      await StorageService.instance.guardarUsuario(usuario);
      return usuario;
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Sube la foto de perfil contra `PUT /usuarios/foto` (multipart, campo `foto`).
  ///
  /// Devuelve el usuario actualizado. [fileName] puede terminar en
  /// `.jpg`/`.jpeg`/`.png`/`.webp`; el backend filtra el tipo según la
  /// extensión.
  Future<Usuario> subirFotoPerfil({
    required Uint8List bytes,
    required String fileName,
  }) async {
    try {
      final formData = FormData.fromMap({
        'foto': MultipartFile.fromBytes(
          bytes,
          filename: fileName,
          contentType: DioMediaType.parse(_contentTypeFor(fileName)),
        ),
      });
      final response = await _dio.put<dynamic>(
        Constants.fotoPerfilPath,
        data: formData,
      );
      final data = response.data;
      Map<String, dynamic>? map;
      if (data is Map) {
        map = Map<String, dynamic>.from(data);
        if (map.containsKey('data') && map['data'] is Map) {
          map = Map<String, dynamic>.from(map['data'] as Map);
        }
      }
      if (map == null) {
        throw const ApiException(
          'El servidor no devolvió el perfil actualizado.',
        );
      }
      final usuario = Usuario.fromJson(map);
      await StorageService.instance.guardarUsuario(usuario);
      return usuario;
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Cambia la contraseña contra `PUT /usuarios/password`.
  Future<void> cambiarPassword({
    required String passwordActual,
    required String passwordNueva,
    required String confirmarPassword,
  }) async {
    try {
      await _dio.put<dynamic>(
        Constants.cambiarPasswordPath,
        data: {
          'password_actual': passwordActual,
          'password_nueva': passwordNueva,
          'confirmar_password': confirmarPassword,
        },
      );
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Obtiene las reservas del cliente contra `GET /reservas/mis-reservas`.
  Future<List<Reserva>> obtenerMisReservas() async {
    try {
      final response = await _dio.get<dynamic>(
        '${Constants.reservasPath}/mis-reservas',
      );
      final raw = response.data;
      final list = _extractList(raw);
      return list
          .map((e) => Reserva.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Cancela una reserva propia contra `DELETE /reservas/:id`.
  ///
  /// El backend cambia el estado a `cancelada` y devuelve el stock. El token
  /// se agrega automáticamente por el interceptor. Lanza [ApiException] si la
  /// reserva no existe (404), no es del cliente (403) o ya está completada
  /// (400).
  Future<void> cancelarReserva(int id) async {
    try {
      await _dio.delete<dynamic>('${Constants.reservasPath}/$id');
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Crea una reserva contra `POST /reservas`.
  ///
  /// Devuelve el id de la reserva creada. [fechaVencimiento] es opcional.
  Future<int> crearReserva({
    required int idLibro,
    required int cantidad,
    String? fechaVencimiento,
  }) async {
    try {
      final response = await _dio.post<dynamic>(
        Constants.reservasPath,
        data: {
          'id_libro': idLibro,
          'cantidad': cantidad,
          if (fechaVencimiento != null && fechaVencimiento.isNotEmpty)
            'fecha_vencimiento': fechaVencimiento,
        },
      );
      final data = response.data;
      if (data is Map) {
        final id = JsonUtils.asInt(data['id_reserva']);
        if (id != null) return id;
      }
      throw const ApiException('El servidor no devolvió el id de la reserva.');
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Obtiene las compras (ventas) del cliente contra `GET /ventas/mis-ventas`.
  Future<List<Venta>> obtenerMisVentas() async {
    try {
      final response = await _dio.get<dynamic>(
        '${Constants.ventasPath}/mis-ventas',
      );
      final raw = response.data;
      final list = _extractList(raw);
      return list
          .map((e) => Venta.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Obtiene la lista de deseos del cliente contra `GET /favoritos`.
  Future<List<Libro>> obtenerFavoritos() async {
    try {
      final response = await _dio.get<dynamic>(Constants.favoritosPath);
      final raw = response.data;
      final list = _extractList(raw);
      return list
          .map((e) => Libro.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Consulta si un libro está en favoritos contra `GET /favoritos/:id`.
  Future<bool> esFavorito(int idLibro) async {
    try {
      final response =
          await _dio.get<dynamic>('${Constants.favoritosPath}/$idLibro');
      final data = response.data;
      if (data is Map && data['data'] is Map) {
        final inner = Map<String, dynamic>.from(data['data'] as Map);
        return inner['es_favorito'] == true;
      }
      return false;
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Agrega un libro a favoritos contra `POST /favoritos/:id`.
  Future<void> agregarFavorito(int idLibro) async {
    try {
      await _dio.post<dynamic>('${Constants.favoritosPath}/$idLibro');
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Quita un libro de favoritos contra `DELETE /favoritos/:id`.
  ///
  /// Es idempotente: quitar un libro que no era favorito no es un error.
  Future<void> quitarFavorito(int idLibro) async {
    try {
      await _dio.delete<dynamic>('${Constants.favoritosPath}/$idLibro');
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Crea una orden de pago contra `POST /pagos/crear-orden`.
  ///
  /// [detalles] es una lista de `{id_libro, cantidad}`. El backend calcula el
  /// total con los precios reales de la base de datos y crea la orden en
  /// PayU (WebCheckout). Devuelve un [OrdenPago] con el
  /// [OrdenPago.checkoutUrl] para redirigir al checkout.
  ///
  /// [tipoEntrega] puede ser `domicilio` (con [idDistrito] y [direccion]) o
  /// `agencia` (con [idAgencia]).
  ///
  /// La `idempotencia_clave` se genera UNA vez por intento de checkout y se
  /// reutiliza en los reintentos (tras un timeout, el backend responde
  /// `ya_existia` en lugar de duplicar la orden). Solo se libera cuando el
  /// pago termina o cuando cambia el contenido/entrega del checkout.
  Future<OrdenPago> crearOrdenPago({
    required List<Map<String, dynamic>> detalles,
    String? tipoEntrega,
    String? direccion,
    int? idDistrito,
    int? idAgencia,
    String? clienteTipoDocumento,
    String? clienteDocumento,
  }) async {
    try {
      final fingerprint = [
        detalles
            .map((item) => '${item['id_libro']}:${item['cantidad']}')
            .join(','),
        tipoEntrega ?? '',
        direccion?.trim() ?? '',
        idDistrito?.toString() ?? '',
        idAgencia?.toString() ?? '',
        clienteDocumento ?? '',
      ].join('|');

      if (_idempotenciaClave == null ||
          _idempotenciaFingerprint != fingerprint) {
        _idempotenciaClave = _generarIdempotencia();
        _idempotenciaFingerprint = fingerprint;
        _idVentaIdempotencia = null;
      }
      final idempotenciaClave = _idempotenciaClave!;

      final response = await _dio.post<dynamic>(
        '${Constants.pagosPath}/crear-orden',
        data: {
          'idempotencia_clave': idempotenciaClave,
          'items': detalles,
          if (tipoEntrega != null && tipoEntrega.isNotEmpty)
            'tipo_entrega': tipoEntrega,
          if (direccion != null && direccion.trim().isNotEmpty)
            'direccion': direccion.trim(),
          'id_distrito': ?idDistrito,
          'id_agencia': ?idAgencia,
          if (clienteTipoDocumento != null && clienteTipoDocumento.isNotEmpty)
            'cliente_tipo_documento': clienteTipoDocumento,
          if (clienteDocumento != null && clienteDocumento.trim().isNotEmpty)
            'cliente_documento': clienteDocumento.trim(),
        },
      );

      final data = response.data;
      if (data is Map) {
        // Caso "ya_existia": el backend devuelve `venta`/`preferencia`. Se
        // normaliza a `data` para reutilizar exactamente el mismo flujo.
        final map = Map<String, dynamic>.from(data);
        if (map['ya_existia'] == true &&
            map['data'] == null &&
            map['venta'] is Map) {
          map['data'] = map['venta'];
        }
        final orden = OrdenPago.fromJson(map);

        // Guarda el checkout URL por venta para poder reabrirlo después
        // (p. ej. desde "Mis compras" si el usuario cierra el navegador).
        final idVenta = orden.idVenta;
        _idVentaIdempotencia = idVenta;
        final url = orden.checkoutUrl;
        if (idVenta != null && url != null && url.isNotEmpty) {
          _checkoutUrls[idVenta] = url;
        }

        // Respuestas `ya_existia` pueden venir sin `checkout_url`.
        // Si ya conocíamos la URL de esta venta, la reutilizamos.
        if (idVenta != null && (url == null || url.isEmpty)) {
          final urlPrevia = _checkoutUrls[idVenta];
          if (urlPrevia != null && urlPrevia.isNotEmpty) {
            return orden.copyWith(checkoutUrl: urlPrevia);
          }
        }

        return orden;
      }
      throw const ApiException('El servidor no devolvió la orden de pago.');
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Consulta el estado de una orden contra `GET /pagos/:orderId`.
  ///
  /// Consulta el estado real de la orden directamente en PayU.
  Future<EstadoOrden> obtenerOrdenPago(String orderId) async {
    try {
      final response = await _dio.get<dynamic>(
        '${Constants.pagosPath}/$orderId',
      );
      final data = response.data;
      if (data is Map) {
        return EstadoOrden.fromJson(Map<String, dynamic>.from(data));
      }
      throw const ApiException(
        'El servidor no devolvió el estado de la orden.',
      );
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Obtiene las provincias de Lima contra `GET /ubicaciones/provincias`.
  Future<List<Provincia>> obtenerProvincias() async {
    try {
      final response = await _dio.get<dynamic>(
        '${Constants.ubicacionesPath}/provincias',
      );
      final data = response.data;
      if (data is Map && data['data'] is List) {
        return (data['data'] as List)
            .whereType<Map>()
            .map((e) => Provincia.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      }
      throw const ApiException('El servidor no devolvió las provincias.');
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Obtiene los distritos de una provincia contra
  /// `GET /ubicaciones/provincias/:id/distritos`.
  Future<List<Distrito>> obtenerDistritos(int idProvincia) async {
    try {
      final response = await _dio.get<dynamic>(
        '${Constants.ubicacionesPath}/provincias/$idProvincia/distritos',
      );
      final data = response.data;
      if (data is Map && data['data'] is List) {
        return (data['data'] as List)
            .whereType<Map>()
            .map((e) => Distrito.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      }
      throw const ApiException('El servidor no devolvió los distritos.');
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Obtiene las agencias courier activas contra `GET /agencias/activas`.
  Future<List<Agencia>> obtenerAgencias() async {
    try {
      final response = await _dio.get<dynamic>(
        '${Constants.agenciasPath}/activas',
      );
      final data = response.data;
      if (data is Map && data['data'] is List) {
        return (data['data'] as List)
            .whereType<Map>()
            .map((e) => Agencia.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      }
      throw const ApiException('El servidor no devolvió las agencias.');
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Determina el Content-Type a partir de la extensión del archivo.
  String _contentTypeFor(String fileName) {
    final lower = fileName.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    return 'application/octet-stream';
  }

  /// Registra un nuevo cliente contra `POST /auth/registro`.
  ///
  /// El backend crea el usuario con rol cliente y envía un código de
  /// verificación por email. Devuelve un [RegistroResult]; cuando
  /// [RegistroResult.requiereVerificacion] es `true`, la pantalla debe pedir el
  /// código a través de [verificarEmail] antes de poder iniciar sesión. No se
  /// guarda contraseña en ningún almacenamiento.
  Future<RegistroResult> registrar({
    required String nombre,
    required String apellido,
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio.post<dynamic>(
        Constants.registroPath,
        data: {
          'nombre': nombre,
          'apellido': apellido,
          'email': email,
          'password': password,
        },
      );
      final data = response.data;
      final requiere =
          data is Map && data['requiere_verificacion_email'] == true;
      return RegistroResult(email: email, requiereVerificacion: requiere);
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Verifica la cuenta contra `POST /auth/verificar-email`.
  ///
  /// Valida el [codigo] de 6 dígitos recibido por email para [email]. Al ser
  /// correcto, la cuenta queda activa y el usuario puede iniciar sesión.
  Future<void> verificarEmail({
    required String email,
    required String codigo,
  }) async {
    try {
      await _dio.post<dynamic>(
        Constants.verificarEmailPath,
        data: {'email': email, 'codigo': codigo},
      );
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Reenvía el código de verificación contra `POST /auth/reenviar-codigo`.
  ///
  /// El código llega únicamente por email; la API nunca lo devuelve.
  Future<void> reenviarCodigo({required String email}) async {
    try {
      await _dio.post<dynamic>(
        Constants.reenviarCodigoPath,
        data: {'email': email},
      );
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Solicita un código para restablecer la contraseña contra
  /// `POST /auth/solicitar-reseteo`.
  ///
  /// El backend siempre responde con el mismo mensaje genérico (no revela si
  /// el correo existe). El código llega por email y hay que validarlo después
  /// con [reestablecerContrasena]. No requiere sesión activa.
  Future<void> solicitarReseteo({required String email}) async {
    try {
      await _dio.post<dynamic>(
        Constants.solicitarReseteoPath,
        data: {'email': email},
      );
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Restablece la contraseña contra `POST /auth/reestablecer-contrasena`.
  ///
  /// Valida el [codigo] de 6 dígitos recibido por email y establece la nueva
  /// [password]. Al terminar se puede iniciar sesión con la nueva clave.
  /// No requiere sesión activa.
  Future<void> reestablecerContrasena({
    required String email,
    required String codigo,
    required String password,
  }) async {
    try {
      await _dio.post<dynamic>(
        Constants.reestablecerContrasenaPath,
        data: {'email': email, 'codigo': codigo, 'password': password},
      );
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Obtiene el catálogo de libros desde `GET /libros`.
  Future<List<Libro>> obtenerLibros() async {
    try {
      final response = await _dio.get<dynamic>(Constants.librosPath);
      final raw = response.data;
      final list = _extractList(raw);
      return list
          .map((e) => Libro.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Obtiene el detalle de un libro a través de `GET /libros/:id`.
  ///
  /// Permite que las pantallas recarguen información fresca desde el backend en
  /// lugar de depender únicamente del objeto pasado por la navegación.
  Future<Libro> obtenerDetalleLibro(int id) async {
    try {
      final response = await _dio.get<dynamic>('${Constants.librosPath}/$id');
      final raw = response.data;
      if (raw is Map) {
        if (raw.containsKey('data') && raw['data'] is Map) {
          return Libro.fromJson(Map<String, dynamic>.from(raw['data']));
        }
        return Libro.fromJson(Map<String, dynamic>.from(raw));
      }
      throw const ApiException('El servidor no devolvió el detalle del libro.');
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Obtiene el perfil del usuario a través de `GET /usuarios/perfil`.
  Future<Usuario> obtenerPerfil() async {
    try {
      final response = await _dio.get<dynamic>(Constants.perfilPath);
      final data = response.data;
      Map<String, dynamic>? map;
      if (data is Map) {
        map = Map<String, dynamic>.from(data);
      } else if (data is List && data.isNotEmpty) {
        map = Map<String, dynamic>.from(data.first);
      }
      if (map == null) {
        throw const ApiException(
          'El servidor no devolvió información del perfil.',
        );
      }
      if (map.containsKey('data') && map['data'] is Map) {
        map = Map<String, dynamic>.from(map['data']);
      }
      return Usuario.fromJson(map);
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Extrae una lista de libros sin importar si vienen como lista directa o
  /// envueltos en un objeto (p. ej. `{"data": [...]}` o `{"libros": [...]}`).
  List<dynamic> _extractList(dynamic raw) {
    if (raw is List) return raw;
    if (raw is Map) {
      for (final key in ['data', 'libros', 'results', 'ventas']) {
        if (raw[key] is List) return raw[key] as List;
      }
    }
    return const [];
  }
}
