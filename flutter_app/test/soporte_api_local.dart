import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:libreria_app/models/usuario.dart';
import 'package:libreria_app/services/api_service.dart';
import 'package:libreria_app/services/carrito_service.dart';
import 'package:libreria_app/services/checkout_store.dart';
import 'package:libreria_app/services/storage_service.dart';

class TransporteAislado implements HttpClientAdapter {
  final Future<ResponseBody> Function(RequestOptions) responder;
  TransporteAislado(this.responder);
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) => responder(options);
  @override
  void close({bool force = false}) {}
}

ResponseBody respuestaLocal(Object body, [int status = 200]) =>
    ResponseBody.fromString(
      jsonEncode(body),
      status,
      headers: {
        Headers.contentTypeHeader: ['application/json'],
      },
    );

ApiService apiLocal(Future<ResponseBody> Function(RequestOptions) responder) =>
    ApiService.paraPruebas(
      Dio(BaseOptions(baseUrl: 'https://solo-local.invalid/api'))
        ..httpClientAdapter = TransporteAislado(responder),
    );

Map<String, dynamic> accesoLocal(int owner) => {
  'token': 'token-local-$owner',
  'data': {'id_usuario': owner, 'rol': 'cliente', 'estado': 1},
};

Future<void> prepararAlmacenamientoLocal() async {
  SharedPreferences.setMockInitialValues({});
  FlutterSecureStorage.setMockInitialValues({});
  StorageService.instance.reiniciarColaParaPruebas();
  CarritoService.instance.reiniciarColaParaPruebas();
  CheckoutStore.instance.reiniciarColaParaPruebas();
  CarritoService.instance.vaciarSesion();
  await StorageService.instance.limpiarSesion();
}

Future<void> iniciarSesionLocal(int owner) async {
  final storage = StorageService.instance;
  await storage.guardarToken('token-local-$owner');
  await storage.guardarUsuario(Usuario(idUsuario: owner, rol: 'cliente'));
  await CarritoService.instance.cargar();
}
