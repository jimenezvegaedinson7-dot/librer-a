import 'package:flutter/foundation.dart';

import '../models/carrito_item.dart';
import '../models/libro.dart';

/// Estado global del carrito de compras.
///
/// Usa [ChangeNotifier] para que la interfaz se actualice automáticamente
/// cuando se agregan, quitan o modifican ítems, y para exponer un contador
/// visible en la interfaz.
class CarritoService extends ChangeNotifier {
  CarritoService._();

  static final CarritoService instance = CarritoService._();

  final List<CarritoItem> _items = [];

  /// Ítems guardados para más tarde (fuera del carrito activo).
  final List<CarritoItem> _guardados = [];

  /// Devuelve la lista de ítems del carrito (copia inmutable).
  List<CarritoItem> get items => List.unmodifiable(_items);

  /// Devuelve los ítems guardados para más tarde (copia inmutable).
  List<CarritoItem> get guardados => List.unmodifiable(_guardados);

  /// Número total de unidades agregadas.
  int get totalUnidades => _items.fold(0, (acc, item) => acc + item.cantidad);

  /// Total de la compra (suma de subtotales).
  double get total => _items.fold(0.0, (acc, item) => acc + item.subtotal);

  /// `true` si el carrito está vacío.
  bool get vacio => _items.isEmpty;

  /// Índice de un ítem por id de libro, o -1.
  int _indexDeLibro(int idLibro) {
    return _items.indexWhere((item) => item.libro.idLibro == idLibro);
  }

  /// Agrega un libro al carrito. Si ya existe, incrementa la cantidad.
  void agregar(Libro libro, {int cantidad = 1}) {
    final id = libro.idLibro;
    if (id == null) return;

    final index = _indexDeLibro(id);
    if (index >= 0) {
      _items[index] = _items[index].copiar(
        cantidad: _items[index].cantidad + cantidad,
      );
    } else {
      _items.add(CarritoItem(libro: libro, cantidad: cantidad));
    }
    notifyListeners();
  }

  /// Incrementa en 1 la cantidad de un libro en el carrito.
  ///
  /// Devuelve `true` si se incrementó. Si el stock real es insuficiente
  /// (`stock > 0` y `cantidad >= stock`) o el libro no tiene stock, no
  /// modifica nada y devuelve `false` para que la pantalla avise al usuario.
  bool incrementar(int idLibro) {
    final index = _indexDeLibro(idLibro);
    if (index < 0) return false;

    final item = _items[index];
    final stock = item.libro.stock ?? 0;
    if (stock <= 0 || item.cantidad >= stock) return false;

    _items[index] = item.copiar(cantidad: item.cantidad + 1);
    notifyListeners();
    return true;
  }

  /// Decrementa en 1 la cantidad de un libro en el carrito.
  void decrementar(int idLibro) {
    final index = _indexDeLibro(idLibro);
    if (index < 0) return;

    final item = _items[index];
    if (item.cantidad <= 1) {
      _items.removeAt(index);
    } else {
      _items[index] = item.copiar(cantidad: item.cantidad - 1);
    }
    notifyListeners();
  }

  /// Elimina por completo un libro del carrito.
  void eliminar(int idLibro) {
    _items.removeWhere((item) => item.libro.idLibro == idLibro);
    notifyListeners();
  }

  /// Vacía el carrito por completo.
  void limpiar() {
    _items.clear();
    notifyListeners();
  }

  /// Mueve un ítem del carrito a "Guardados para más tarde".
  void guardarParaDespues(int idLibro) {
    final index = _indexDeLibro(idLibro);
    if (index < 0) return;
    _guardados.add(_items.removeAt(index));
    notifyListeners();
  }

  /// Devuelve un ítem guardado al carrito. Si el libro ya está en el carrito,
  /// suma las cantidades en lugar de duplicar la fila.
  void moverAlCarrito(int idLibro) {
    final index = _guardados.indexWhere(
      (item) => item.libro.idLibro == idLibro,
    );
    if (index < 0) return;

    final item = _guardados.removeAt(index);
    final id = item.libro.idLibro;
    if (id == null) {
      notifyListeners();
      return;
    }

    final enCarrito = _indexDeLibro(id);
    if (enCarrito >= 0) {
      _items[enCarrito] = _items[enCarrito].copiar(
        cantidad: _items[enCarrito].cantidad + item.cantidad,
      );
    } else {
      _items.add(item);
    }
    notifyListeners();
  }

  /// Quita un ítem de "Guardados para más tarde" sin agregarlo al carrito.
  void quitarDeGuardados(int idLibro) {
    _guardados.removeWhere((item) => item.libro.idLibro == idLibro);
    notifyListeners();
  }
}
