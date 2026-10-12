import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:libreria_app/models/libro.dart';
import 'package:libreria_app/services/api_service.dart';
import 'package:libreria_app/services/carrito_service.dart';
import 'package:libreria_app/services/checkout_store.dart';
import 'package:libreria_app/services/storage_service.dart';

import 'soporte_api_local.dart';

const libro = Libro(
  idLibro: 1,
  titulo: 'Local',
  precio: 30,
  stock: 10,
  estado: true,
);
const guardado = Libro(
  idLibro: 2,
  titulo: 'Guardado',
  precio: 20,
  stock: 10,
  estado: true,
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final carrito = CarritoService.instance, storage = StorageService.instance;
  setUp(() async {
    await prepararAlmacenamientoLocal();
    await iniciarSesionLocal(2);
  });

  test('401 y nuevo login de A conservan artículos, guardados, unidades, marcas y diario incierto', () async {
    carrito.agregar(libro);
    final compradas = carrito.instantaneaUnidades;
    carrito.agregar(libro);
    await carrito.conciliarVenta(77, compradas);
    carrito.agregar(guardado);
    carrito.guardarParaDespues(2);
    await carrito.persistir();
    final restantes = carrito.instantaneaUnidades;
    final intento = IntentoCheckout(
      propietario: 2,
      fingerprint: 'local',
      cuerpo: {
        'items': [
          {'id_libro': 1, 'cantidad': 1},
        ],
        'idempotencia_clave': 'incierto-A',
      },
      unidades: restantes,
      totalMostradoCentimos: 3000,
    );
    await CheckoutStore.instance.guardar(intento);
    final api = apiLocal(
      (o) async => o.path == '/auth/login'
          ? respuestaLocal(accesoLocal(2))
          : respuestaLocal({'mensaje': 'El token ha expirado'}, 401),
    );
    await expectLater(api.obtenerPerfil(), throwsA(isA<ApiException>()));
    expect(carrito.items, isEmpty);
    expect(carrito.guardados, isEmpty);
    await api.login(email: 'A@example.invalid', password: 'local');
    expect(carrito.instantaneaUnidades, restantes);
    expect(carrito.guardados.single.libro.idLibro, 2);
    await carrito.conciliarVenta(77, restantes);
    expect(
      carrito.totalUnidades,
      1,
      reason: 'la marca anterior debe impedir una segunda resta',
    );
    expect((await CheckoutStore.instance.activo(2))?.clave, 'incierto-A');
  });

  test('logout no pierde la última escritura y A/B recuperan solo sus propios carritos', () async {
    carrito.agregar(libro);
    carrito.agregar(guardado);
    carrito.guardarParaDespues(2);
    final unidadesA = carrito.instantaneaUnidades;
    carrito.vaciarSesion();
    await storage.limpiarSesion();
    await iniciarSesionLocal(3);
    expect(carrito.items, isEmpty);
    expect(carrito.guardados, isEmpty);
    carrito.agregar(guardado);
    await carrito.persistir();
    final unidadesB = carrito.instantaneaUnidades;
    await iniciarSesionLocal(2);
    expect(carrito.instantaneaUnidades, unidadesA);
    expect(carrito.guardados.single.libro.idLibro, 2);
    await iniciarSesionLocal(3);
    expect(carrito.instantaneaUnidades, unidadesB);
    expect(carrito.guardados, isEmpty);
  });

  test(
    'cambio de titular oculta inmediatamente A aun antes de cargar B',
    () async {
      carrito.agregar(libro);
      carrito.agregar(guardado);
      carrito.guardarParaDespues(2);
      await storage.guardarToken('token-local-3');
      expect(carrito.items, isEmpty);
      expect(carrito.guardados, isEmpty);
      expect(carrito.instantaneaUnidades, isEmpty);
    },
  );

  test(
    'migración legacy preserva identidades y solo adopta el dueño coincidente',
    () async {
      carrito.agregar(libro);
      carrito.agregar(guardado);
      carrito.guardarParaDespues(2);
      await carrito.persistir();
      final unidades = carrito.instantaneaUnidades;
      final prefs = await SharedPreferences.getInstance();
      final legacy = prefs.getString('carrito_v2_2')!;
      await prefs.setString('carrito_v1', legacy);
      await prefs.remove('carrito_v2_2');
      await iniciarSesionLocal(3);
      expect(carrito.items, isEmpty);
      expect(prefs.getString('carrito_v1'), legacy);
      await iniciarSesionLocal(2);
      expect(carrito.instantaneaUnidades, unidades);
      expect(carrito.guardados.single.libro.idLibro, 2);
      expect(prefs.getString('carrito_v1'), isNull);
      expect(jsonDecode(prefs.getString('carrito_v2_2')!)['usuario'], 2);
    },
  );

  test(
    'legacy sin propietario no se adopta ni elimina al autenticar',
    () async {
      final prefs = await SharedPreferences.getInstance();
      final legacy = jsonEncode({
        'usuario': null,
        'items': [],
        'guardados': [],
      });
      await prefs.setString('carrito_v1', legacy);
      await carrito.cargar();
      expect(carrito.items, isEmpty);
      expect(prefs.getString('carrito_v1'), legacy);
    },
  );

  test(
    'una conciliación tardía de A no modifica el carrito ni las marcas de B',
    () async {
      carrito.agregar(libro);
      final unidadesA = carrito.instantaneaUnidades;
      await iniciarSesionLocal(3);
      carrito.agregar(guardado);
      final unidadesB = carrito.instantaneaUnidades;
      await expectLater(
        carrito.conciliarVenta(77, unidadesA, propietario: 2),
        throwsStateError,
      );
      expect(carrito.instantaneaUnidades, unidadesB);
      await carrito.conciliarVenta(77, unidadesB, propietario: 3);
      expect(
        carrito.items,
        isEmpty,
        reason: 'el rechazo de A no dejó una marca en B',
      );
      await iniciarSesionLocal(2);
      expect(carrito.instantaneaUnidades, unidadesA);
    },
  );
}
