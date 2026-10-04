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
  final double? precioFinal;
  final bool descuentoVigente;
  final int? descuentoPorcentaje;
  final String? descuentoHasta;
  final DateTime? creadoEn;
  final bool esNuevo;
  final String? portada;
  final bool portadaEsReferencia;
  final Map<String, dynamic>? portadaEdicionReferencia;
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
    this.precioFinal,
    this.descuentoVigente = false,
    this.descuentoPorcentaje,
    this.descuentoHasta,
    this.creadoEn,
    this.esNuevo = false,
    this.portada,
    this.portadaEsReferencia = false,
    this.portadaEdicionReferencia,
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
      precioFinal: JsonUtils.asDouble(json['precio_final']),
      descuentoVigente: JsonUtils.asBool(json['descuento_vigente']) ?? false,
      descuentoPorcentaje: JsonUtils.asInt(
        json['descuento_porcentaje_efectivo'],
      ),
      descuentoHasta: JsonUtils.asString(json['descuento_hasta']),
      creadoEn: DateTime.tryParse(json['creado_en']?.toString() ?? ''),
      esNuevo: JsonUtils.asBool(json['es_nuevo']) ?? false,
      portada: JsonUtils.asString(json['portada']),
      portadaEsReferencia: JsonUtils.asBool(json['portada_es_referencia']) ?? false,
      portadaEdicionReferencia: json['portada_edicion_referencia'] is Map
          ? Map<String, dynamic>.unmodifiable(Map<String, dynamic>.from(json['portada_edicion_referencia']))
          : null,
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

  /// El servidor calcula el importe. Solo se comprueba que la oferta
  /// almacenada no haya vencido mientras el carrito estuvo cerrado.
  double precioCompraEn(DateTime ahora) {
    final normal = precio ?? 0;
    final finalOferta = precioFinal;
    if (!descuentoVigente ||
        finalOferta == null ||
        !finalOferta.isFinite ||
        finalOferta < 0 ||
        finalOferta >= normal) {
      return normal;
    }
    final hasta = descuentoHasta;
    if (hasta != null && hasta.isNotEmpty) {
      final lima = ahora.toUtc().subtract(const Duration(hours: 5));
      final hoy =
          '${lima.year.toString().padLeft(4, '0')}-'
          '${lima.month.toString().padLeft(2, '0')}-'
          '${lima.day.toString().padLeft(2, '0')}';
      if (hasta
              .substring(0, hasta.length < 10 ? hasta.length : 10)
              .compareTo(hoy) <
          0) {
        return normal;
      }
    }
    return finalOferta;
  }

  double get precioCompra => precioCompraEn(DateTime.now());
  bool get enOferta => precioCompra < (precio ?? 0);
  int get porcentajeOferta =>
      enOferta ? (((precio! - precioCompra) / precio!) * 100).round() : 0;

  bool nuevoEn(DateTime ahora) {
    if (!esNuevo) return false;
    final fecha = creadoEn;
    if (fecha == null) return false;
    final edad = ahora.toUtc().difference(fecha.toUtc());
    return !edad.isNegative && edad < const Duration(days: 30);
  }

  bool get mostrarNuevo => nuevoEn(DateTime.now());

  /// Serializa el modelo a un mapa JSON (útil para reportes, cache o envíos).
  Map<String, dynamic> toJson() {
    return {
      'id_libro': idLibro,
      'titulo': titulo,
      'isbn': isbn,
      'descripcion': descripcion,
      'precio': precio,
      'precio_final': precioFinal,
      'descuento_vigente': descuentoVigente,
      'descuento_porcentaje_efectivo': descuentoPorcentaje,
      'descuento_hasta': descuentoHasta,
      'creado_en': creadoEn?.toUtc().toIso8601String(),
      'es_nuevo': esNuevo,
      'portada': portada,
      'portada_es_referencia': portadaEsReferencia,
      'portada_edicion_referencia': portadaEdicionReferencia,
      'id_autor': idAutor,
      'autor': autor,
      'id_categoria': idCategoria,
      'categoria': categoria,
      'estado': estado,
      'stock': stock,
    };
  }
}
