import 'package:flutter_test/flutter_test.dart';
import 'package:libreria_app/models/libro.dart';
import 'package:libreria_app/models/carrito_item.dart';
import 'package:libreria_app/services/carrito_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  test('compatibilidad con API anterior sin descuentos', () {
    final libro = Libro.fromJson({'precio': '79.90', 'estado': 1});
    expect(libro.precioCompra, 79.9);
    expect(libro.enOferta, false);
    expect(libro.mostrarNuevo, false);
  });
  test('precio final del servidor usado por carrito y conservado en caché', () {
    final libro = Libro.fromJson({
      'precio': '100.00',
      'precio_final': '67.90',
      'descuento_vigente': '1',
      'descuento_porcentaje_efectivo': 32,
    });
    final cache = Libro.fromJson(libro.toJson());
    expect(cache.precio, 100);
    expect(cache.precioCompra, 67.9);
    expect(CarritoItem(libro: cache, cantidad: 3).subtotal, 203.7);
  });
  test('promoción válida hasta medianoche de Lima, no de UTC', () {
    final libro = Libro.fromJson({
      'precio': 100,
      'precio_final': 80,
      'descuento_vigente': 1,
      'descuento_hasta': '2026-10-01',
    });
    expect(libro.precioCompraEn(DateTime.parse('2026-10-02T04:59:59Z')), 80);
    expect(libro.precioCompraEn(DateTime.parse('2026-10-02T05:00:00Z')), 100);
  });
  test('descuento vencido, igual o inválido nunca rebaja falsamente', () {
    for (final finalOferta in [100.0, 150.0, -1.0, double.nan]) {
      expect(
        Libro(
          precio: 100,
          precioFinal: finalOferta,
          descuentoVigente: true,
        ).enOferta,
        false,
      );
    }
    expect(const Libro(precio: 100, precioFinal: 80).precioCompra, 100);
    expect(
      const Libro(
        precio: 100,
        precioFinal: 0,
        descuentoVigente: true,
      ).precioCompra,
      0,
    );
  });
  test('Nuevo dura 30 días, no se inventa para libros viejos o futuros', () {
    final ahora = DateTime.utc(2026, 10, 1);
    Libro nuevo(DateTime? fecha) => Libro(creadoEn: fecha, esNuevo: true);
    expect(nuevo(ahora).nuevoEn(ahora), true);
    expect(
      nuevo(ahora.subtract(const Duration(days: 29))).nuevoEn(ahora),
      true,
    );
    expect(
      nuevo(ahora.subtract(const Duration(days: 30))).nuevoEn(ahora),
      false,
    );
    expect(nuevo(ahora.add(const Duration(days: 1))).nuevoEn(ahora), false);
    expect(nuevo(null).nuevoEn(ahora), false);
  });
  test('carrito recarga promoción y stock manteniendo las cantidades', () {
    SharedPreferences.setMockInitialValues({});
    final carrito = CarritoService.instance;
    carrito.vaciarSesion();
    carrito.agregar(
      const Libro(idLibro: 1, precio: 100, stock: 5, estado: true),
      cantidad: 2,
    );
    expect(
      carrito.actualizarCatalogo([
        const Libro(
          idLibro: 1,
          precio: 100,
          precioFinal: 75,
          descuentoVigente: true,
          stock: 3,
          estado: true,
        ),
      ]),
      true,
    );
    expect(carrito.total, 150);
    expect(carrito.totalUnidades, 2);
    expect(carrito.items.single.libro.stock, 3);
    carrito.actualizarCatalogo([
      const Libro(idLibro: 1, precio: 100, stock: 1, estado: true),
    ]);
    expect(carrito.total, 200);
    expect(carrito.totalUnidades, 2);
    carrito.vaciarSesion();
  });
}
