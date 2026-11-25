import 'libro.dart';
import '../utils/idempotencia.dart';

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

  int get precioCentimos => (libro.precioCompra * 100).round();

  int get subtotalCentimos => precioCentimos * cantidad;

  double get subtotal => subtotalCentimos / 100;

  CarritoItem copiar({int? cantidad, Libro? libro, List<String>? unidades}) {
    return CarritoItem(libro: libro ?? this.libro,
        cantidad: cantidad ?? this.cantidad, unidades: unidades ?? this.unidades);
  }
}
