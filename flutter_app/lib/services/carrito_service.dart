import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/carrito_item.dart';
import '../models/libro.dart';
import 'storage_service.dart';

/// Estado global del carrito de compras.
///
/// Usa [ChangeNotifier] para que la interfaz se actualice automáticamente
/// cuando se agregan, quitan o modifican ítems, y para exponer un contador
/// visible en la interfaz.
///
/// El carrito y los guardados se conservan en el dispositivo
/// ([SharedPreferences]) junto con el id del usuario dueño: sobreviven a
/// cerrar la app o recargar la página, y nunca se muestran a otra cuenta.
class CarritoService extends ChangeNotifier {
  CarritoService._();

  static final CarritoService instance = CarritoService._();

  static const String _prefKey = 'carrito_v1';

  /// Cola de escrituras: cada cambio se guarda en orden, sin solaparse.
  Future<void> _escritura = Future<void>.value();

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
    _cambio();
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
    _cambio();
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
    _cambio();
  }

  /// Elimina por completo un libro del carrito.
  void eliminar(int idLibro) {
    _items.removeWhere((item) => item.libro.idLibro == idLibro);
    _cambio();
  }

  /// Vacía el carrito por completo (p. ej. tras un pago confirmado).
  /// Los "Guardados para más tarde" se conservan.
  void limpiar() {
    _items.clear();
    _cambio();
  }

  /// Vacía carrito y guardados al iniciar o cerrar sesión, para no mezclar
  /// datos entre cuentas en el mismo dispositivo.
  void vaciarSesion() {
    _items.clear();
    _guardados.clear();
    _cambio();
  }

  /// Restaura el carrito guardado si pertenece al usuario de la sesión
  /// actual. Se llama una vez al arrancar la app.
  Future<void> cargar() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_prefKey);
      if (raw == null || raw.isEmpty) return;

      final datos = jsonDecode(raw) as Map<String, dynamic>;
      final usuario = await StorageService.instance.obtenerUsuario();
      final dueno = datos['usuario'];
      if (usuario?.idUsuario == null || dueno != usuario!.idUsuario) {
        // Carrito de otra cuenta (o sin sesión): no se restaura.
        await prefs.remove(_prefKey);
        return;
      }

      _items
        ..clear()
        ..addAll(_leerItems(datos['items']));
      _guardados
        ..clear()
        ..addAll(_leerItems(datos['guardados']));
      notifyListeners();
    } catch (_) {
      // Datos dañados o de otra versión: se empieza con el carrito vacío.
    }
  }

  List<CarritoItem> _leerItems(Object? lista) {
    if (lista is! List) return const [];
    return [
      for (final e in lista)
        if (e is Map<String, dynamic> && e['libro'] is Map<String, dynamic>)
          CarritoItem(
            libro: Libro.fromJson(e['libro'] as Map<String, dynamic>),
            cantidad: (e['cantidad'] as num?)?.toInt() ?? 1,
          ),
    ].where((item) => item.libro.idLibro != null && item.cantidad > 0).toList();
  }

  /// Notifica a la interfaz y guarda el estado en el dispositivo.
  void _cambio() {
    notifyListeners();
    // Instantánea tomada ahora; la escritura va en cola.
    List<Map<String, dynamic>> aJson(List<CarritoItem> l) => [
      for (final item in l)
        {'libro': item.libro.toJson(), 'cantidad': item.cantidad},
    ];
    final items = aJson(_items);
    final guardados = aJson(_guardados);
    _escritura = _escritura.then((_) async {
      try {
        final prefs = await SharedPreferences.getInstance();
        if (items.isEmpty && guardados.isEmpty) {
          await prefs.remove(_prefKey);
          return;
        }
        final usuario = await StorageService.instance.obtenerUsuario();
        await prefs.setString(
          _prefKey,
          jsonEncode({
            'usuario': usuario?.idUsuario,
            'items': items,
            'guardados': guardados,
          }),
        );
      } catch (_) {
        // Si el guardado local falla, el carrito sigue funcionando en memoria.
      }
    });
  }

  /// Mueve un ítem del carrito a "Guardados para más tarde".
  void guardarParaDespues(int idLibro) {
    final index = _indexDeLibro(idLibro);
    if (index < 0) return;
    _guardados.add(_items.removeAt(index));
    _cambio();
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
      _cambio();
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
    _cambio();
  }

  /// Quita un ítem de "Guardados para más tarde" sin agregarlo al carrito.
  void quitarDeGuardados(int idLibro) {
    _guardados.removeWhere((item) => item.libro.idLibro == idLibro);
    _cambio();
  }
}
