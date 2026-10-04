import 'libro.dart';
import '../utils/idempotencia.dart';

/// Ítem del carrito de compras.
///
/// Asocia un [libro] con la [cantidad] que el cliente quiere comprar.
class CarritoItem {
  final Libro libro;
  final int cantidad;
  final List<String> unidades;

  CarritoItem({required this.libro, this.cantidad = 1, List<String>? unidades})
      : unidades = List.unmodifiable([
          for (var i = 0; i < cantidad; i++)
            unidades != null && i < unidades.length
                ? unidades[i] : generarClaveIdempotencia(),
        ]);

  /// Precio unitario en céntimos (evita errores de redondeo con decimales).
  int get precioCentimos => (libro.precioCompra * 100).round();

  /// Subtotal del ítem en céntimos (precio unitario × cantidad).
  int get subtotalCentimos => precioCentimos * cantidad;

  /// Subtotal del ítem (precio por cantidad), exacto a 2 decimales.
  double get subtotal => subtotalCentimos / 100;

  /// Devuelve una copia con la cantidad indicada.
  CarritoItem copiar({int? cantidad, Libro? libro, List<String>? unidades}) {
    return CarritoItem(libro: libro ?? this.libro,
        cantidad: cantidad ?? this.cantidad, unidades: unidades ?? this.unidades);
  }
}
