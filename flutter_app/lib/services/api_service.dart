import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show visibleForTesting;

import '../models/libro.dart';
import '../models/orden_pago.dart';
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

class LoginResult {
  final bool requiere2fa;
  final String? twoFactorToken;
  final IntentoAutenticacion? intento;

  const LoginResult({
    required this.requiere2fa,
    this.twoFactorToken,
    this.intento,
  });

  bool get loginCompletado => !requiere2fa;
}

class RegistroResult {
  final String email;
  final bool requiereVerificacion;

  const RegistroResult({
    required this.email,
    required this.requiereVerificacion,
  });
}

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
          final intento =
              options.extra['intentoAutenticacion'] as IntentoAutenticacion?;
          if ((intento != null
                  ? !intento.vigente
                  : generacion != StorageService.instance.generacion) ||
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
          final intento =
              response.requestOptions.extra['intentoAutenticacion']
                  as IntentoAutenticacion?;
          if (intento != null
              ? !intento.vigente
              : response.requestOptions.extra['generacionSesion'] !=
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

  ApiService.paraPruebas(Dio dio) : this._(dio: dio);
  @visibleForTesting
  void usarAdaptadorPruebas(HttpClientAdapter adapter) =>
      _dio.httpClientAdapter = adapter;

  late final Dio _dio;

  Future<OrdenPago>? _creando;

  final Map<int, String> _checkoutUrls = {};

  String? obtenerCheckoutUrl(int idVenta) => _checkoutUrls[idVenta];

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

  void limpiarEstadoCheckout() {
    _creando = null;
    _checkoutUrls.clear();
  }

  ApiException _toApiException(DioException e) {
    final status = e.response?.statusCode;
    if (e.type == DioExceptionType.cancel) {
      return const ApiException(
        'El acceso o la sesión cambió. Vuelve a intentar.',
      );
    }
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

    if (e.type == DioExceptionType.unknown && e.response == null) {
      return const ApiException(
        'El servidor no está disponible. Inténtalo más tarde.',
      );
    }
    if (status != null) {
      final data = e.response?.data;
      if (data is Map) {

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
          return const ApiException('Error del servidor. Inténtalo más tarde.');
      }
    }
    return const ApiException(
      'Ocurrió un error inesperado. Inténtalo de nuevo.',
    );
  }

  Future<LoginResult> login({
    required String email,
    required String password,
    IntentoAutenticacion? intento,
  }) async {
    final flujo = intento ?? StorageService.instance.iniciarAutenticacion();
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        Constants.loginPath,
        data: {'email': email, 'password': password},
        options: Options(extra: {'intentoAutenticacion': flujo}),
      );

      final data = response.data ?? {};

      if (data['requires_2fa'] == true) {
        final tokenTemporal = (data['two_factor_token'] ?? '').toString();
        if (tokenTemporal.isEmpty) {
          throw const ApiException(
            'El servidor no devolvió el token para verificar el código.',
          );
        }
        return LoginResult(
          requiere2fa: true,
          twoFactorToken: tokenTemporal,
          intento: flujo,
        );
      }

      final token = (data['token'] ?? data['accessToken'] ?? '').toString();
      if (token.isEmpty) {
        throw const ApiException('El servidor no devolvió un token válido.');
      }

      await _guardarAcceso(token, data['data'], flujo);
      return LoginResult(requiere2fa: false, intento: flujo);
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  Future<bool> verificarLogin2FA({
    required String twoFactorToken,
    required String codigo,
    IntentoAutenticacion? intento,
  }) async {
    final flujo = intento ?? StorageService.instance.iniciarAutenticacion();
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        Constants.twoFactorVerifyLoginPath,
        data: {'two_factor_token': twoFactorToken, 'codigo': codigo},
        options: Options(extra: {'intentoAutenticacion': flujo}),
      );
      final data = response.data ?? {};
      final token = (data['token'] ?? data['accessToken'] ?? '').toString();
      if (token.isEmpty) {
        throw const ApiException('El servidor no devolvió un token válido.');
      }
      await _guardarAcceso(token, data['data'], flujo);
      return true;
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  Future<void> _guardarAcceso(
    String token,
    dynamic datosUsuario,
    IntentoAutenticacion intento,
  ) async {
    final usuario = datosUsuario is Map
        ? Usuario.fromJson(Map<String, dynamic>.from(datosUsuario))
        : null;
    if (usuario?.esAdministrador == true) {
      throw const ApiException(
        'Esta aplicación es para clientes. El panel administrativo se encuentra en otra plataforma.',
      );
    }
    if (!await StorageService.instance.guardarSesionAutenticada(
      token,
      usuario,
      intento,
    )) {
      throw const ApiException('Este intento de acceso fue cancelado.');
    }
    final generacion = StorageService.instance.generacion;
    limpiarEstadoCheckout();
    CarritoService.instance.vaciarSesion();
    await CarritoService.instance.cargar();
    if (!intento.vigente || generacion != StorageService.instance.generacion) {
      throw const ApiException('Este intento de acceso fue cancelado.');
    }
  }

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
      throw const ApiException('El servidor no devolvió la configuración 2FA.');
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

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

  Future<Usuario> actualizarPerfil({
    String? nombre,
    String? apellido,
    String? email,
    String? telefono,
    bool actualizarTelefono = false,
  }) async {
    final generacion = StorageService.instance.generacion;
    try {
      final response = await _dio.put<dynamic>(
        Constants.actualizarPerfilPath,
        data: {
          'nombre': ?nombre,
          'apellido': ?apellido,
          'email': ?email,
          if (telefono != null || actualizarTelefono) 'telefono': telefono,
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

  Future<void> agregarFavorito(int idLibro) async {
    try {
      await _dio.post<dynamic>('${Constants.favoritosPath}/$idLibro');
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  Future<void> quitarFavorito(int idLibro) async {
    try {
      await _dio.delete<dynamic>('${Constants.favoritosPath}/$idLibro');
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

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

      if (estado.pagada) {
        await CarritoService.instance.conciliarVenta(
          orden.idVenta!,
          intento.unidades,
          propietario: intento.propietario,
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
        : venta.pagada
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
            propietario: intento.propietario,
          );
        }
        await CheckoutStore.instance.guardar(
          intento.actualizar(estado: status),
        );
        _checkoutUrls.remove(venta.idVenta);
      }
    }
  }

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
                  propietario: intento.propietario,
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

  String _contentTypeFor(String fileName) {
    final lower = fileName.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    return 'application/octet-stream';
  }

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

  Future<({String numero, String mensaje, String? fechaLimite})>
  registrarReclamacion(Map<String, dynamic> hoja) async {
    try {
      final respuesta = await _dio.post<dynamic>('/reclamaciones', data: hoja);
      final raw = respuesta.data;
      final data = raw is Map && raw['data'] is Map
          ? raw['data'] as Map
          : const {};
      return (
        numero: '${data['numero'] ?? ''}',
        mensaje: raw is Map
            ? (raw['mensaje']?.toString() ?? 'Registramos tu hoja.')
            : 'Registramos tu hoja.',
        fechaLimite: data['fecha_limite']?.toString(),
      );
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

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
