import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:libreria_app/models/libro.dart';
import 'package:libreria_app/models/usuario.dart';
import 'package:libreria_app/models/venta.dart';
import 'package:libreria_app/models/orden_pago.dart';
import 'package:libreria_app/services/api_service.dart';
import 'package:libreria_app/services/carrito_service.dart';
import 'package:libreria_app/services/checkout_store.dart';
import 'package:libreria_app/services/storage_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

class TransporteLocal implements HttpClientAdapter {
  final Future<ResponseBody> Function(RequestOptions) respuesta;
  TransporteLocal(this.respuesta);
  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<Uint8List>? requestStream,
      Future<void>? cancelFuture) => respuesta(options);
  @override
  void close({bool force = false}) {}
}

ResponseBody jsonLocal(Object data, [int status = 200]) => ResponseBody.fromString(
    jsonEncode(data), status, headers: {Headers.contentTypeHeader: ['application/json']});

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final storage = StorageService.instance;
  final carrito = CarritoService.instance;
  Future<void> iniciar(int id, String token) async {
    await storage.guardarToken(token);
    await storage.guardarUsuario(Usuario.fromJson({
      'id_usuario': id, 'nombre': 'Test', 'apellido': 'Local',
      'rol': 'cliente', 'estado': 1, 'email': 'test@example.test',
    }));
  }
  Dio cliente(Future<ResponseBody> Function(RequestOptions) responder) {
    final dio = Dio(BaseOptions(baseUrl: 'https://solo-local.invalid/api'));
    dio.httpClientAdapter = TransporteLocal(responder);
    return dio;
  }
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStorage.setMockInitialValues({});
    await storage.limpiarSesion();
    await iniciar(2, 'token-local-A');
    carrito.vaciarSesion();
    carrito.agregar(const Libro(idLibro: 1, titulo: 'Test', precio: 30,
        stock: 10, estado: true));
    await carrito.persistir();
  });

  test('respuesta perdida y nuevo proceso recuperan el mismo POST y clave', () async {
    final cuerpos = <Map<String, dynamic>>[];
    var perder = true;
    Future<ResponseBody> responder(RequestOptions o) async {
      cuerpos.add(Map<String, dynamic>.from(o.data as Map));
      if (perder) {
        perder = false;
        throw DioException(requestOptions: o, type: DioExceptionType.receiveTimeout);
      }
      return jsonLocal({'success': true, 'data': {
        'id_venta': 77, 'order_id': 'ref77', 'status': 'PENDING', 'total': 30,
        'checkout_url': 'https://solo-local.invalid/api/pagos/checkout/ref77',
      }});
    }
    final apiA = ApiService.paraPruebas(cliente(responder));
    await expectLater(apiA.crearOrdenPago(detalles: [{'id_libro': 1, 'cantidad': 1}],
        tipoEntrega: 'tienda'), throwsA(isA<ApiException>()));
    final guardado = await CheckoutStore.instance.activo(2);
    expect(guardado, isNotNull);
    // Otro ApiService representa memoria vacía después de matar el proceso.
    final apiB = ApiService.paraPruebas(cliente(responder));
    final orden = await apiB.recuperarIntentoPendiente();
    expect(orden?.idVenta, 77);
    expect(cuerpos.length, 2);
    expect(cuerpos[1], cuerpos[0]);
    expect(cuerpos[1]['idempotencia_clave'], guardado!.clave);
  });

  test('401 de contraseña incorrecta conserva sesión y carrito', () async {
    final dio = cliente((o) async => jsonLocal({'mensaje': 'Contraseña incorrecta'}, 401));
    ApiService.paraPruebas(dio);
    await expectLater(dio.put('/usuarios/password'), throwsA(isA<DioException>()));
    expect(await storage.obtenerToken(), 'token-local-A');
    expect(carrito.totalUnidades, 1);
  });

  test('401 tardío de A no elimina la sesión nueva B', () async {
    final iniciado = Completer<void>(), responder = Completer<ResponseBody>();
    final api = ApiService.paraPruebas(cliente((o) {
      iniciado.complete(); return responder.future;
    }));
    final pendiente = api.obtenerPerfil();
    final comprobacion = expectLater(pendiente, throwsA(isA<ApiException>()));
    await iniciado.future;
    await iniciar(3, 'token-local-B');
    responder.complete(jsonLocal({'mensaje': 'El token ha expirado'}, 401));
    await comprobacion;
    expect(await storage.obtenerToken(), 'token-local-B');
    expect((await storage.obtenerUsuario())?.idUsuario, 3);
  });

  test('503 de perfil conserva el token para reintentar', () async {
    final api = ApiService.paraPruebas(cliente((o) async => jsonLocal({'mensaje': 'Temporal'}, 503)));
    await expectLater(api.obtenerPerfil(), throwsA(isA<ApiException>()));
    expect(await storage.obtenerToken(), 'token-local-A');
  });

  test('conciliar una venta resta una vez y conserva ejemplares agregados después', () async {
    final compradas = carrito.instantaneaUnidades;
    carrito.agregar(const Libro(idLibro: 1, titulo: 'Test', precio: 30,
        stock: 10, estado: true));
    await carrito.conciliarVenta(77, compradas);
    expect(carrito.totalUnidades, 1);
    await carrito.conciliarVenta(77, compradas);
    expect(carrito.totalUnidades, 1);
    await carrito.persistir();
    await carrito.cargar();
    await carrito.conciliarVenta(77, compradas);
    expect(carrito.totalUnidades, 1);
  });

  test('guardados sin stock no se pierden al intentar mover al carrito', () {
    carrito.guardarParaDespues(1);
    carrito.actualizarCatalogo([const Libro(idLibro: 1, titulo: 'Test', precio: 30,
        stock: 0, estado: true)]);
    expect(carrito.moverAlCarrito(1), 0);
    expect(carrito.items, isEmpty);
    expect(carrito.guardados.length, 1);
  });

  test('mis compras usa referencia externa y estado logístico independiente', () {
    final venta = Venta.fromJson({'id_venta': 77, 'external_reference': 'ref77',
      'payu_order_id': null, 'estado': 'pagada', 'estado_entrega': 'listo_recojo'});
    expect(venta.orderId, 'ref77');
    expect(venta.estadoEntrega, 'listo_recojo');
    expect(venta.estado, 'pagada');
  });
  test('CAPTURED confirma; un aprobado sobre pedido cancelado no confirma la compra', () {
    expect(const EstadoOrden(status: 'CAPTURED', estadoVenta: 'pagada').pagada, true);
    final revision = EstadoOrden.fromJson({'data': {'status': 'APPROVED', 'estado_venta': 'cancelada', 'requiere_revision': true}});
    expect(revision.pagada, false); expect(revision.cancelada, true);
    expect(revision.requiereRevision, true);
  });
  test('un token nuevo sin titular actualizado no envía checkout con datos de la cuenta anterior', () async {
    await storage.guardarToken('token-local-B');
    var enviados = 0;
    final api = ApiService.paraPruebas(cliente((o) async { enviados++; return jsonLocal({}); }));
    await expectLater(api.crearOrdenPago(detalles: [{'id_libro': 1, 'cantidad': 1}]), throwsA(isA<ApiException>()));
    expect(enviados, 0);
    await storage.guardarUsuario(Usuario.fromJson({'id_usuario': 3, 'rol': 'cliente', 'estado': 1}));
  });
}
