import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show visibleForTesting;

import '../models/libro.dart';
import '../models/orden_pago.dart';
import '../models/reserva.dart';
import '../models/ubicacion.dart';
import '../models/usuario.dart';
import '../models/venta.dart';
import '../models/zona_delivery.dart';
import '../utils/constants.dart';
import '../utils/idempotencia.dart';
import '../utils/json_utils.dart';
import 'navigation.dart';
import 'storage_service.dart';
import 'carrito_service.dart';
import 'checkout_store.dart';

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
  final int? statusCode;
  final bool requiereVerificacion;
  const ApiException(
    this.message, {
    this.statusCode,
    this.requiereVerificacion = false,
  });

  @override
  String toString() => message;
}

/// Cliente HTTP centralizado basado en Dio.
///
/// Configura la [baseUrl] desde [Constants] y agrega automáticamente el
/// header `Authorization: Bearer <token>` cuando existe una sesión activa.
/// Además normaliza los errores de Dio en mensajes claros.
class ApiService {
  ApiService._({Dio? dio}) {
    _dio =
        dio ??
        Dio(
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
          final generacion = StorageService.instance.generacion;
          final token = await StorageService.instance.obtenerToken();
          if (generacion != StorageService.instance.generacion ||
              StorageService.instance.cambiandoSesion) {
            handler.reject(
              DioException(
                requestOptions: options,
                type: DioExceptionType.cancel,
                error: 'La sesión cambió.',
              ),
            );
            return;
          }
          options.extra['generacionSesion'] = generacion;
          options.extra['tokenSesion'] = token;
          options.extra['propietarioSesion'] =
              StorageService.instance.idUsuarioActual;
          final publica =
              options.path.startsWith('/auth/') &&
              !const [
                '/auth/2fa/setup',
                '/auth/2fa/confirm',
                '/auth/2fa/disable',
              ].contains(options.path);
          if (!publica && token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onResponse: (response, handler) {
          if (response.requestOptions.extra['generacionSesion'] !=
              StorageService.instance.generacion) {
            handler.reject(
              DioException(
                requestOptions: response.requestOptions,
                type: DioExceptionType.cancel,
                error: 'La sesión cambió.',
              ),
            );
            return;
          }
          handler.next(response);
        },
        onError: (error, handler) async {
          // Si el token es inválido o expiró, limpia la sesión local una sola
          // vez y dirige al usuario al Login. No hay reintento automático
          // aquí (evita ciclos: tras limpiar el token, los siguientes 401 ya no
          // encuentran sesión y no vuelven a navegar).
          if (error.response?.statusCode == 401) {
            final options = error.requestOptions;
            final data = error.response?.data;
            final mensaje = data is Map
                ? (data['mensaje'] ?? data['message'] ?? '').toString()
                : '';
            final credencialIncorrecta =
                (options.path == Constants.cambiarPasswordPath ||
                    options.path == Constants.twoFactorDisablePath) &&
                mensaje.toLowerCase().contains('contraseña') &&
                mensaje.toLowerCase().contains('incorrecta');
            final token = await StorageService.instance.obtenerToken();
            if (!credencialIncorrecta &&
                options.headers.containsKey('Authorization') &&
                options.extra['generacionSesion'] ==
                    StorageService.instance.generacion &&
                options.extra['tokenSesion'] == token &&
                token != null &&
                token.isNotEmpty) {
              await StorageService.instance.limpiarSesion();
              CarritoService.instance.vaciarSesion();
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

  /// Transporte inyectado: las pruebas no acceden a la API real.
  ApiService.paraPruebas(Dio dio) : this._(dio: dio);
  @visibleForTesting
  void usarAdaptadorPruebas(HttpClientAdapter adapter) =>
      _dio.httpClientAdapter = adapter;

  late final Dio _dio;

  /// Clave de idempotencia del intento de checkout en curso.
  ///
  /// Se genera UNA vez al iniciar el checkout y se reutiliza entre reintentos
  /// (un reintento tras timeout no debe duplicar la orden: el backend responde
  /// `ya_existia`). Solo se libera cuando el pago termina o cambia el contenido
  /// del checkout (ver `limpiarIdempotencia`).
  Future<OrdenPago>? _creando;

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
    // El diario solo se cierra con un estado definitivo de la API. Un logout,
    // 401, cambio de precio o timeout no autoriza a borrar un intento incierto.
  }

  /// Limpia el estado de checkout en memoria: idempotencia y URLs guardadas.
  ///
  /// Debe invocarse al cerrar sesión o al recibir un 401 para que una cuenta
  /// distinta (o una sesión nueva) nunca reutilice la clave/URL de otra.
  void limpiarEstadoCheckout() {
    limpiarIdempotencia();
    _checkoutUrls.clear();
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
          final texto = msg.toString();
          return ApiException(
            texto,
            statusCode: status,
            requiereVerificacion:
                status == 403 &&
                (data['codigo'] == 'EMAIL_NOT_VERIFIED' ||
                    data['requiere_verificacion_email'] == true ||
                    texto.toLowerCase().contains('verificar tu correo')),
          );
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
          return const ApiException(
            'Error del servidor. Inténtalo más tarde.',
          );
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
  Future<Map<String, dynamic>> setupTwoFactor({
    required String password,
  }) async {
    try {
      final response = await _dio.post<dynamic>(
        Constants.twoFactorSetupPath,
        data: {'password': password},
      );
      final data = response.data;
      if (data is Map && data['data'] is Map) {
        return Map<String, dynamic>.from(data['data'] as Map);
      }
      throw const ApiException(
        'El servidor no devolvió la configuración 2FA.',
      );
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Confirma (activa) el doble factor contra `POST /auth/2fa/confirm`.
  ///
  /// Requiere el [codigo] OTP de 6 dígitos generado con el secreto del setup.
  Future<void> confirmarTwoFactor({
    required String codigo,
    required String setupToken,
  }) async {
    try {
      await _dio.post<dynamic>(
        Constants.twoFactorConfirmPath,
        data: {'codigo': codigo, 'setup_token': setupToken},
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
    final generacion = StorageService.instance.generacion;
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
      await StorageService.instance.guardarUsuario(
        usuario,
        generacionEsperada: generacion,
      );
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
    final generacion = StorageService.instance.generacion;
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
      await StorageService.instance.guardarUsuario(
        usuario,
        generacionEsperada: generacion,
      );
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
      await StorageService.instance.limpiarSesion();
      CarritoService.instance.vaciarSesion();
      limpiarEstadoCheckout();
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Elimina la cuenta del cliente (`DELETE /usuarios/cuenta`).
  ///
  /// Una contraseña incorrecta llega como 400 (no 401): no cierra la sesión
  /// por sí sola y se muestra el mensaje del backend.
  Future<void> eliminarCuenta({required String password}) async {
    try {
      await _dio.delete<dynamic>(
        Constants.eliminarCuentaPath,
        data: {'password': password, 'confirmacion': 'ELIMINAR'},
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

  /// Compatibilidad con clientes antiguos: la creación de reservas está retirada.
  Future<int> crearReserva({
    required int idLibro,
    required int cantidad,
    String? fechaVencimiento,
  }) async {
    throw const ApiException(
      'No se crean nuevas reservas. Compra con PayU desde el carrito.',
    );
  }

  /// Obtiene las compras (ventas) del cliente contra `GET /ventas/mis-ventas`.
  Future<List<Venta>> obtenerMisVentas() async {
    final generacion = StorageService.instance.generacion;
    try {
      final intento = await intentoPendiente();
      if (intento != null && intento.idVenta == null) {
        await recuperarIntentoPendiente();
      }
      if (generacion != StorageService.instance.generacion) {
        throw const ApiException('La sesión cambió.');
      }
      final response = await _dio.get<dynamic>(
        '${Constants.ventasPath}/mis-ventas',
      );
      final raw = response.data;
      final list = _extractList(raw);
      final ventas = list
          .map((e) => Venta.fromJson(Map<String, dynamic>.from(e)))
          .toList();
      for (final venta in ventas) {
        if (generacion != StorageService.instance.generacion) {
          throw const ApiException('La sesión cambió.');
        }
        await _conciliarEstadoVenta(venta);
      }
      return ventas;
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
      final response = await _dio.get<dynamic>(
        '${Constants.favoritosPath}/$idLibro',
      );
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
  /// [tipoEntrega] puede ser `domicilio` (zona activa de Pallasca y dirección)
  /// o `tienda` (recojo gratuito en Pallasca). El servidor determina la tarifa.
  ///
  /// La `idempotencia_clave` se genera UNA vez por intento de checkout y se
  /// reutiliza en los reintentos (tras un timeout, el backend responde
  /// `ya_existia` en lugar de duplicar la orden). Solo se libera cuando el
  /// pago termina o cuando cambia el contenido/entrega del checkout.
  Future<OrdenPago> crearOrdenPago({
    required List<Map<String, dynamic>> detalles,
    String? tipoEntrega,
    String? direccion,
    int? idZonaDelivery,
    String? referencia,
    String? clienteTipoDocumento,
    String? clienteDocumento,
    int? totalMostradoCentimos,
  }) {
    if (_creando != null) return _creando!;
    final operacion = _prepararOrden(
      detalles: detalles,
      tipoEntrega: tipoEntrega,
      direccion: direccion,
      idZonaDelivery: idZonaDelivery,
      referencia: referencia,
      clienteTipoDocumento: clienteTipoDocumento,
      clienteDocumento: clienteDocumento,
      totalMostradoCentimos: totalMostradoCentimos,
    );
    _creando = operacion;
    return operacion.whenComplete(() {
      if (identical(_creando, operacion)) _creando = null;
    });
  }

  Future<int> _propietario() async {
    if (StorageService.instance.cambiandoSesion) {
      throw const ApiException(
        'La sesión se está actualizando. Reintenta con tu cuenta actual.',
      );
    }
    final generacion = StorageService.instance.generacion;
    final usuario = await StorageService.instance.obtenerUsuario();
    if (generacion != StorageService.instance.generacion ||
        usuario?.idUsuario == null ||
        !usuario!.esCliente) {
      throw const ApiException('Inicia sesión con tu cuenta de cliente.');
    }
    return usuario.idUsuario!;
  }

  Future<IntentoCheckout?> intentoPendiente() async {
    try {
      return await CheckoutStore.instance.activo(await _propietario());
    } on ApiException {
      rethrow;
    } catch (_) {
      throw const ApiException(
        'No se pudo leer el intento anterior. Reintenta antes de crear otra compra.',
      );
    }
  }

  /// Esta recuperación no consulta stock, promociones ni zonas: repite el
  /// cuerpo original con la clave persistida y deja que la API lo resuelva.
  Future<OrdenPago?> recuperarIntentoPendiente() async {
    if (_creando != null) return _creando!;
    final intento = await intentoPendiente();
    if (intento == null) return null;
    final operacion = _enviarIntento(intento);
    _creando = operacion;
    try {
      return await operacion;
    } finally {
      if (identical(_creando, operacion)) _creando = null;
    }
  }

  Future<OrdenPago> _prepararOrden({
    required List<Map<String, dynamic>> detalles,
    String? tipoEntrega,
    String? direccion,
    int? idZonaDelivery,
    String? referencia,
    String? clienteTipoDocumento,
    String? clienteDocumento,
    int? totalMostradoCentimos,
  }) async {
    final owner = await _propietario();
    final generacion = StorageService.instance.generacion;
    final previo = await intentoPendiente();
    if (previo != null) return _enviarIntento(previo);
    final cuerpo = <String, dynamic>{
      'items': detalles.map((e) => Map<String, dynamic>.from(e)).toList(),
      'tipo_entrega': ?tipoEntrega,
      'direccion': ?direccion?.trim(),
      'id_zona_delivery': ?idZonaDelivery,
      'referencia': ?referencia?.trim(),
      'cliente_tipo_documento': ?clienteTipoDocumento,
      'cliente_documento': ?clienteDocumento?.trim(),
    };
    final fingerprint = cuerpo.toString();
    cuerpo['idempotencia_clave'] = generarClaveIdempotencia();
    final carrito = CarritoService.instance;
    final intento = IntentoCheckout(
      propietario: owner,
      fingerprint: fingerprint,
      cuerpo: cuerpo,
      unidades: carrito.instantaneaUnidades,
      totalMostradoCentimos:
          totalMostradoCentimos ?? (carrito.total * 100).round(),
    );
    try {
      await carrito.persistir();
      await CheckoutStore.instance.guardar(intento);
    } catch (_) {
      throw const ApiException(
        'No se pudo guardar el intento. No enviamos la compra; vuelve a intentar.',
      );
    }
    if (generacion != StorageService.instance.generacion) {
      throw const ApiException(
        'La sesión cambió. Recupera la compra con su cuenta original.',
      );
    }
    return _enviarIntento(intento);
  }

  Future<OrdenPago> _enviarIntento(IntentoCheckout intento) async {
    final generacion = StorageService.instance.generacion;
    if (await _propietario() != intento.propietario) {
      throw const ApiException('Esta compra pertenece a otra cuenta.');
    }
    if (generacion != StorageService.instance.generacion) {
      throw const ApiException('La sesión cambió. Vuelve a intentar.');
    }
    try {
      final response = await _dio.post<dynamic>(
        '${Constants.pagosPath}/crear-orden',
        data: intento.cuerpo,
      );
      final data = response.data;
      if (data is! Map) {
        throw const ApiException(
          'No se pudo interpretar la orden. Recupera el mismo intento.',
        );
      }
      final map = Map<String, dynamic>.from(data);
      if (map['data'] == null && map['venta'] is Map) {
        map['data'] = map['venta'];
      }
      var orden = OrdenPago.fromJson(map);
      if (orden.idVenta == null || orden.orderId == null) {
        throw const ApiException(
          'La respuesta está incompleta. Recupera el mismo intento.',
        );
      }
      final estado = EstadoOrden(
        status: orden.status,
        estadoVenta: orden.estadoVenta,
        requiereRevision: orden.requiereRevision,
      );
      if (!estado.pagada &&
          !estado.cancelada &&
          (orden.checkoutUrl ?? '').isEmpty &&
          intento.checkoutUrl != null) {
        orden = orden.copyWith(checkoutUrl: intento.checkoutUrl);
      }
      // Conciliar primero. Si se interrumpe, el intento sigue abierto y la
      // repetición conserva las identidades y la marca de venta del carrito.
      if (estado.pagada) {
        await CarritoService.instance.conciliarVenta(
          orden.idVenta!,
          intento.unidades,
        );
      }
      await CheckoutStore.instance.guardar(
        intento.actualizar(
          idVenta: orden.idVenta,
          referencia: orden.orderId,
          checkoutUrl: orden.checkoutUrl,
          estado: estado.requiereRevision
              ? 'REVISION'
              : estado.estadoVenta == 'reembolsada'
              ? 'REFUNDED'
              : estado.cancelada
              ? 'DECLINED'
              : orden.status ?? 'PENDING',
          total: orden.total,
        ),
      );
      if (generacion != StorageService.instance.generacion) {
        throw const ApiException(
          'La sesión cambió. La compra queda guardada en su cuenta.',
        );
      }
      if (!estado.pagada && !estado.cancelada && orden.checkoutUrl != null) {
        _checkoutUrls[orden.idVenta!] = orden.checkoutUrl!;
      } else {
        _checkoutUrls.remove(orden.idVenta);
      }
      return orden;
    } on DioException catch (e) {
      // Errores definitivos de validación, nunca 401/403, transporte o 5xx.
      if (const [400, 404, 409, 422].contains(e.response?.statusCode)) {
        await CheckoutStore.instance.guardar(
          intento.actualizar(estado: 'REJECTED_REQUEST'),
        );
      }
      throw _toApiException(e);
    }
  }

  Future<void> _conciliarEstadoVenta(Venta venta) async {
    final status = venta.requiereRevision
        ? 'REVISION'
        : venta.pagada || venta.entregada
        ? 'APPROVED'
        : venta.estado == 'cancelada'
        ? 'DECLINED'
        : venta.estado == 'reembolsada'
        ? 'REFUNDED'
        : null;
    if (status == null) return;
    final owner = await _propietario();
    final generacion = StorageService.instance.generacion;
    for (final intento in await CheckoutStore.instance.leer(owner)) {
      if (generacion != StorageService.instance.generacion) return;
      if (intento.idVenta == venta.idVenta ||
          (intento.referencia != null && intento.referencia == venta.orderId)) {
        if (status == 'APPROVED' && venta.idVenta != null) {
          await CarritoService.instance.conciliarVenta(
            venta.idVenta!,
            intento.unidades,
          );
        }
        await CheckoutStore.instance.guardar(
          intento.actualizar(estado: status),
        );
        _checkoutUrls.remove(venta.idVenta);
      }
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
        final estado = EstadoOrden.fromJson(Map<String, dynamic>.from(data));
        if (estado.pagada || estado.cancelada) {
          final owner = await _propietario();
          final generacion = StorageService.instance.generacion;
          for (final intento in await CheckoutStore.instance.leer(owner)) {
            if (generacion != StorageService.instance.generacion) break;
            if (intento.referencia == orderId ||
                intento.referencia == estado.externalReference) {
              if (estado.pagada && intento.idVenta != null) {
                await CarritoService.instance.conciliarVenta(
                  intento.idVenta!,
                  intento.unidades,
                );
              }
              await CheckoutStore.instance.guardar(
                intento.actualizar(
                  estado: estado.requiereRevision
                      ? 'REVISION'
                      : estado.estadoVenta == 'reembolsada'
                      ? 'REFUNDED'
                      : estado.cancelada
                      ? 'DECLINED'
                      : estado.status,
                ),
              );
              _checkoutUrls.remove(intento.idVenta);
            }
          }
        }
        return estado;
      }
      throw const ApiException(
        'El servidor no devolvió el estado de la orden.',
      );
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Solo zonas activas: no se ofrecen ubicaciones Lima ni tarifas legacy.
  Future<List<ZonaDelivery>> obtenerZonasDelivery() async {
    try {
      final response = await _dio.get<dynamic>(Constants.zonasDeliveryPath);
      final data = response.data;
      if (data is Map && data['data'] is List) {
        return (data['data'] as List)
            .whereType<Map>()
            .map((e) => ZonaDelivery.fromJson(Map<String, dynamic>.from(e)))
            .where(
              (z) =>
                  z.activa && z.idZona > 0 && z.tarifa.isFinite && z.tarifa > 0,
            )
            .toList();
      }
      throw const ApiException('No se pudieron cargar las zonas de delivery.');
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  /// Ubicaciones originales conservadas para compatibilidad con el historial.
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
    String? codigo,
    String? resetToken,
    required String password,
  }) async {
    try {
      await _dio.post<dynamic>(
        Constants.reestablecerContrasenaPath,
        data: {
          'email': email,
          'codigo': codigo,
          'reset_token': resetToken,
          'password': password,
        },
      );
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  Future<String> verificarReseteo({
    required String email,
    required String codigo,
  }) async {
    try {
      final respuesta = await _dio.post<dynamic>(
        Constants.verificarReseteoPath,
        data: {'email': email, 'codigo': codigo},
      );
      final token = respuesta.data is Map
          ? respuesta.data['reset_token']
          : null;
      if (token is! String || token.isEmpty) {
        throw const ApiException(
          'No se pudo verificar el código. Inténtalo de nuevo.',
        );
      }
      return token;
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
      throw const ApiException(
        'El servidor no devolvió el detalle del libro.',
      );
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
