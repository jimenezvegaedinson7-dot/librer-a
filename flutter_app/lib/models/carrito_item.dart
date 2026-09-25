import 'libro.dart';

/// Ítem del carrito de compras.
///
/// Asocia un [libro] con la [cantidad] que el cliente quiere comprar.
class CarritoItem {
  final Libro libro;
  int cantidad;

  CarritoItem({required this.libro, this.cantidad = 1});

  /// Precio unitario en céntimos (evita errores de redondeo con decimales).
  int get precioCentimos => ((libro.precio ?? 0) * 100).round();

  /// Subtotal del ítem en céntimos (precio unitario × cantidad).
  int get subtotalCentimos => precioCentimos * cantidad;

  /// Subtotal del ítem (precio por cantidad), exacto a 2 decimales.
  double get subtotal => subtotalCentimos / 100;

  /// Devuelve una copia con la cantidad indicada.
  CarritoItem copiar({int? cantidad}) {
    return CarritoItem(libro: libro, cantidad: cantidad ?? this.cantidad);
  }
}
