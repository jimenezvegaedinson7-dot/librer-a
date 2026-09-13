import 'libro.dart';

/// Ítem del carrito de compras.
///
/// Asocia un [libro] con la [cantidad] que el cliente quiere comprar.
class CarritoItem {
  final Libro libro;
  int cantidad;

  CarritoItem({required this.libro, this.cantidad = 1});

  /// Subtotal del ítem (precio por cantidad).
  double get subtotal => (libro.precio ?? 0) * cantidad;

  /// Devuelve una copia con la cantidad indicada.
  CarritoItem copiar({int? cantidad}) {
    return CarritoItem(libro: libro, cantidad: cantidad ?? this.cantidad);
  }
}
