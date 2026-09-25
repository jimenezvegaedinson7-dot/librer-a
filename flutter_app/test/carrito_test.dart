import 'package:flutter_test/flutter_test.dart';
import 'package:libreria_app/models/libro.dart';
import 'package:libreria_app/services/carrito_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

Libro libro(int id, double precio, int stock) => Libro(
  idLibro: id,
  titulo: 'Libro $id',
  precio: precio,
  stock: stock,
  estado: true,
);

void main() {
  final carrito = CarritoService.instance;

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    carrito.vaciarSesion();
  });

  group('agregar', () {
    test('suma unidades del mismo libro en una sola fila', () {
      final a = libro(1, 44, 13);
      expect(carrito.agregar(a), 1);
      expect(carrito.agregar(a), 1);
      expect(carrito.agregar(a, cantidad: 3), 3);
      expect(carrito.items.length, 1);
      expect(carrito.cantidadDe(1), 5);
      expect(carrito.totalUnidades, 5);
    });

    test('nunca supera el stock disponible', () {
      final a = libro(1, 44, 3);
      expect(carrito.agregar(a, cantidad: 2), 2);
      expect(carrito.agregar(a, cantidad: 2), 1); // solo quedaba 1
      expect(carrito.agregar(a), 0); // ya están las 3
      expect(carrito.cantidadDe(1), 3);
    });

    test('sin stock no agrega nada', () {
      expect(carrito.agregar(libro(1, 44, 0)), 0);
      expect(carrito.vacio, isTrue);
    });
  });

  group('botones + y −', () {
    test('+ suma de uno en uno hasta el stock', () {
      carrito.agregar(libro(1, 10, 3));
      expect(carrito.incrementar(1), isTrue);
      expect(carrito.incrementar(1), isTrue);
      expect(carrito.incrementar(1), isFalse); // tope: 3
      expect(carrito.cantidadDe(1), 3);
    });

    test('− resta de uno en uno y quita el libro al llegar a 0', () {
      carrito.agregar(libro(1, 10, 5), cantidad: 2);
      carrito.decrementar(1);
      expect(carrito.cantidadDe(1), 1);
      carrito.decrementar(1);
      expect(carrito.vacio, isTrue);
    });
  });

  group('totales exactos al céntimo', () {
    test('subtotal de cada libro = cantidad × precio', () {
      carrito.agregar(libro(1, 19.9, 10), cantidad: 3);
      expect(carrito.items.single.subtotal, 59.7);
    });

    test('total = suma de los subtotales, sin errores de redondeo', () {
      carrito.agregar(libro(1, 0.1, 10), cantidad: 3); // 0.30
      carrito.agregar(libro(2, 44, 13), cantidad: 2); // 88.00
      carrito.agregar(libro(3, 36.55, 5)); // 36.55
      expect(carrito.total, 124.85);
      expect(carrito.totalUnidades, 6);
    });

    test('el total se actualiza con cada + y −', () {
      carrito.agregar(libro(1, 44, 13));
      carrito.agregar(libro(2, 36, 17));
      expect(carrito.total, 80);
      carrito.incrementar(1);
      expect(carrito.total, 124);
      carrito.incrementar(2);
      expect(carrito.total, 160);
      carrito.decrementar(1);
      expect(carrito.total, 116);
    });
  });

  test('pasar de Guardados al carrito respeta el stock', () {
    final a = libro(1, 10, 3);
    carrito.agregar(a, cantidad: 2);
    carrito.guardarParaDespues(1);
    carrito.agregar(a, cantidad: 2);
    carrito.moverAlCarrito(1); // 2 + 2 > 3
    expect(carrito.cantidadDe(1), 3);
  });
}
