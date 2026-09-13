import '../utils/json_utils.dart';

/// Modelo de Libro que refleja la estructura del catálogo del backend.
///
/// [fromJson] es tolerante: los números pueden llegar como int, double o
/// String, y los campos desconocidos/adicionales del backend se ignoran sin
/// romper la app. El campo `estado` se normaliza a `bool` (la API lo entrega
/// como 0/1: 0 = inactivo, 1 = activo).
class Libro {
  final int? idLibro;
  final String? titulo;
  final String? isbn;
  final String? descripcion;
  final double? precio;
  final String? portada;
  final int? idAutor;
  final String? autor;
  final int? idCategoria;
  final String? categoria;
  final bool? estado;
  final int? stock;

  const Libro({
    this.idLibro,
    this.titulo,
    this.isbn,
    this.descripcion,
    this.precio,
    this.portada,
    this.idAutor,
    this.autor,
    this.idCategoria,
    this.categoria,
    this.estado,
    this.stock,
  });

  factory Libro.fromJson(Map<String, dynamic> json) {
    return Libro(
      idLibro: JsonUtils.asInt(json['id_libro']),
      titulo: JsonUtils.asString(json['titulo']),
      isbn: JsonUtils.asString(json['isbn']),
      descripcion: JsonUtils.asString(json['descripcion']),
      precio: JsonUtils.asDouble(json['precio']),
      portada: JsonUtils.asString(json['portada']),
      idAutor: JsonUtils.asInt(json['id_autor']),
      autor: JsonUtils.asString(json['autor']),
      idCategoria: JsonUtils.asInt(json['id_categoria']),
      categoria: JsonUtils.asString(json['categoria']),
      // El backend almacena estado como 0/1 (TINYINT). Se normaliza a bool
      // tolerando también true/false o cadenas "0"/"1"/"true"/"false".
      estado: JsonUtils.asBool(json['estado']),
      stock: JsonUtils.asInt(json['stock']),
    );
  }

  /// `true` si el libro está activo (`estado == 1`).
  bool get esActivo => estado ?? false;

  /// `true` si hay stock mayor a cero.
  bool get hayStock => (stock ?? 0) > 0;

  /// Serializa el modelo a un mapa JSON (útil para reportes, cache o envíos).
  Map<String, dynamic> toJson() {
    return {
      'id_libro': idLibro,
      'titulo': titulo,
      'isbn': isbn,
      'descripcion': descripcion,
      'precio': precio,
      'portada': portada,
      'id_autor': idAutor,
      'autor': autor,
      'id_categoria': idCategoria,
      'categoria': categoria,
      'estado': estado,
      'stock': stock,
    };
  }
}
