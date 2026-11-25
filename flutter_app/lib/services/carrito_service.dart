import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/carrito_item.dart';
import '../models/libro.dart';
import 'storage_service.dart';

class CarritoService extends ChangeNotifier {
  CarritoService._();

  static final CarritoService instance = CarritoService._();

  static const String _prefKey = 'carrito_v1';
  String _key(int owner) => 'carrito_v2_$owner';
  int? _propietarioMemoria;

  void _asegurarPropietario() {
    final owner = StorageService.instance.idUsuarioActual;
    if (_propietarioMemoria == owner) return;
    _items.clear();
    _guardados.clear();
    _ventasConciliadas.clear();
    _propietarioMemoria = owner;
  }

  Future<void> _escritura = Future<void>.value();

  @visibleForTesting
  void reiniciarColaParaPruebas() => _escritura = Future.value();

  final List<CarritoItem> _items = [];
  final Set<int> _ventasConciliadas = {};

  Map<String, List<String>> get instantaneaUnidades {
    _asegurarPropietario();
    return {
      for (final item in _items)
        '${item.libro.idLibro}': List.of(item.unidades),
    };
  }

  Future<void> conciliarVenta(
    int idVenta,
    Map<String, List<String>> compradas, {
    int? propietario,
  }) async {
    _asegurarPropietario();
    if (propietario != null && propietario != _propietarioMemoria) {
      throw StateError('La venta pertenece a otra cuenta.');
    }
    if (_ventasConciliadas.contains(idVenta)) {
      await persistir();
      return;
    }
    final ids = compradas.values.expand((e) => e).toSet();
    void restar(List<CarritoItem> lista) {
      for (var i = lista.length - 1; i >= 0; i--) {
        final item = lista[i];
        final restantes = item.unidades.where((u) => !ids.contains(u)).toList();
        if (restantes.isEmpty) {
          lista.removeAt(i);
        } else {
          lista[i] = item.copiar(
            cantidad: restantes.length,
            unidades: restantes,
          );
        }
      }
    }

    restar(_items);
    restar(_guardados);
    _ventasConciliadas.add(idVenta);
    _cambio();
    await persistir();
  }

  Future<void> persistir() async {
    _asegurarPropietario();
    final owner = _propietarioMemoria;
    if (owner == null) return;
    final generacion = StorageService.instance.generacion;
    final datos = _datos(owner);
    final operacion = _escritura.then((_) async {
      final prefs = await SharedPreferences.getInstance();
      if (generacion != StorageService.instance.generacion) {
        throw StateError('La sesión cambió. Vuelve a intentar con tu cuenta.');
      }
      if (!await prefs.setString(_key(owner), jsonEncode(datos))) {
        throw StateError('No se pudo guardar el carrito.');
      }
    });
    _escritura = operacion.catchError((Object _) {});
    await operacion;
  }

  Map<String, dynamic> _datos(int? owner) => {
    'usuario': owner,
    'items': [for (final item in _items) _itemJson(item)],
    'guardados': [for (final item in _guardados) _itemJson(item)],
    'ventas_conciliadas': _ventasConciliadas.toList(),
  };

  Map<String, dynamic> _itemJson(CarritoItem item) => {
    'libro': item.libro.toJson(),
    'cantidad': item.cantidad,
    'unidades': item.unidades,
  };

  final List<CarritoItem> _guardados = [];

  List<CarritoItem> get items {
    _asegurarPropietario();
    return List.unmodifiable(_items);
  }

  List<CarritoItem> get guardados {
    _asegurarPropietario();
    return List.unmodifiable(_guardados);
  }

  int get totalUnidades => items.fold(0, (acc, item) => acc + item.cantidad);

  double get total =>
      items.fold(0, (acc, item) => acc + item.subtotalCentimos) / 100;

  int cantidadDe(int? idLibro) {
    if (idLibro == null) return 0;
    final index = _indexDeLibro(idLibro);
    return index < 0 ? 0 : _items[index].cantidad;
  }

  bool get vacio => items.isEmpty;

  bool actualizarCatalogo(List<Libro> catalogo) {
    _asegurarPropietario();
    final porId = {for (final libro in catalogo) libro.idLibro: libro};
    var cambio = false;
    for (var i = 0; i < _items.length; i++) {
      final item = _items[i];
      final fresco = porId[item.libro.idLibro];
      if (fresco == null) continue;
      cambio |= item.precioCentimos != (fresco.precioCompra * 100).round();
      _items[i] = item.copiar(libro: fresco);
    }
    for (var i = 0; i < _guardados.length; i++) {
      final item = _guardados[i];
      final fresco = porId[item.libro.idLibro];
      if (fresco != null) {
        _guardados[i] = item.copiar(libro: fresco);
      }
    }
    _cambio();
    return cambio;
  }

  int _indexDeLibro(int idLibro) {
    _asegurarPropietario();
    return _items.indexWhere((item) => item.libro.idLibro == idLibro);
  }

  int agregar(Libro libro, {int cantidad = 1}) {
    final id = libro.idLibro;
    if (id == null || cantidad <= 0 || !libro.esActivo) return 0;

    final stock = libro.stock ?? 0;
    final index = _indexDeLibro(id);
    final actual = index >= 0 ? _items[index].cantidad : 0;
    final agregables = (stock - actual).clamp(0, cantidad);
    if (agregables == 0) return 0;

    if (index >= 0) {

      _items[index] = _items[index].copiar(
        libro: libro,
        cantidad: actual + agregables,
      );
    } else {
      _items.add(CarritoItem(libro: libro, cantidad: agregables));
    }
    _cambio();
    return agregables;
  }

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

  void eliminar(int idLibro) {
    _asegurarPropietario();
    _items.removeWhere((item) => item.libro.idLibro == idLibro);
    _cambio();
  }

  void limpiar() {
    _asegurarPropietario();
    _items.clear();
    _cambio();
  }

  void vaciarSesion() {
    _items.clear();
    _guardados.clear();
    _ventasConciliadas.clear();
    _propietarioMemoria = null;
    notifyListeners();
  }

  Future<void> cargar() async {
    final generacion = StorageService.instance.generacion;
    vaciarSesion();
    try {
      await _escritura;
      final prefs = await SharedPreferences.getInstance();
      final usuario = await StorageService.instance.obtenerUsuario();
      if (generacion != StorageService.instance.generacion) return;
      final owner = usuario?.idUsuario;
      if (owner == null) return;
      _propietarioMemoria = owner;
      var raw = prefs.getString(_key(owner));
      if (raw == null) {
        final legado = prefs.getString(_prefKey);
        if (legado != null) {
          final datosLegado = jsonDecode(legado) as Map<String, dynamic>;

          if (datosLegado['usuario'] == owner) {
            if (!await prefs.setString(_key(owner), legado)) {
              throw StateError('No se pudo migrar el carrito.');
            }
            await prefs.remove(_prefKey);
            raw = legado;
          }
        }
      }
      if (raw == null ||
          raw.isEmpty ||
          generacion != StorageService.instance.generacion) {
        return;
      }
      final datos = jsonDecode(raw) as Map<String, dynamic>;
      if (datos['usuario'] != owner) return;
      _items
        ..clear()
        ..addAll(_leerItems(datos['items']));
      _guardados
        ..clear()
        ..addAll(_leerItems(datos['guardados']));
      _ventasConciliadas
        ..clear()
        ..addAll((datos['ventas_conciliadas'] as List? ?? []).whereType<int>());
      notifyListeners();
    } catch (_) {

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
            unidades: (e['unidades'] as List?)?.whereType<String>().toList(),
          ),
    ].where((item) => item.libro.idLibro != null && item.cantidad > 0).toList();
  }

  void _cambio() {

    final owner = _propietarioMemoria;
    final datos = _datos(owner);
    notifyListeners();
    if (owner == null) return;
    _escritura = _escritura.then((_) async {
      try {
        final prefs = await SharedPreferences.getInstance();

        await prefs.setString(_key(owner), jsonEncode(datos));
      } catch (_) {

      }
    });
  }

  void guardarParaDespues(int idLibro) {
    final index = _indexDeLibro(idLibro);
    if (index < 0) return;
    _guardados.add(_items.removeAt(index));
    _cambio();
  }

  int moverAlCarrito(int idLibro) {
    _asegurarPropietario();
    final index = _guardados.indexWhere(
      (item) => item.libro.idLibro == idLibro,
    );
    if (index < 0) return 0;
    final item = _guardados[index];
    if (!item.libro.esActivo) return 0;
    final stock = item.libro.stock ?? 0;
    final enCarrito = _indexDeLibro(idLibro);
    final actual = enCarrito < 0 ? 0 : _items[enCarrito].cantidad;
    final movidas = (stock - actual).clamp(0, item.cantidad);
    if (movidas == 0) return 0;
    final unidades = item.unidades.take(movidas).toList();
    if (enCarrito >= 0) {
      _items[enCarrito] = _items[enCarrito].copiar(
        cantidad: actual + movidas,
        unidades: [..._items[enCarrito].unidades, ...unidades],
      );
    } else {
      _items.add(item.copiar(cantidad: movidas, unidades: unidades));
    }
    if (movidas == item.cantidad) {
      _guardados.removeAt(index);
    } else {
      _guardados[index] = item.copiar(
        cantidad: item.cantidad - movidas,
        unidades: item.unidades.skip(movidas).toList(),
      );
    }
    _cambio();
    return movidas;
  }

  void quitarDeGuardados(int idLibro) {
    _asegurarPropietario();
    _guardados.removeWhere((item) => item.libro.idLibro == idLibro);
    _cambio();
  }
}
