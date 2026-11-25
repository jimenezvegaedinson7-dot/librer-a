import '../utils/json_utils.dart';

class Libro {
  final int? idLibro;
  final String? titulo;
  final String? isbn;
  final String? descripcion;
  final String? editorial;
  final String? idioma;
  final int? numeroPaginas;
  final int? anioPublicacion;
  final String? formato;
  final String? numeroVolumen;
  final String? dimensiones;
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
    this.editorial,
    this.idioma,
    this.numeroPaginas,
    this.anioPublicacion,
    this.formato,
    this.numeroVolumen,
    this.dimensiones,
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
      editorial: JsonUtils.asString(json['editorial']),
      idioma: JsonUtils.asString(json['idioma']),
      numeroPaginas: JsonUtils.asInt(json['numero_paginas']),
      anioPublicacion: JsonUtils.asInt(json['anio_publicacion']),
      formato: JsonUtils.asString(json['formato']),
      numeroVolumen: JsonUtils.asString(json['numero_volumen']),
      dimensiones: JsonUtils.asString(json['dimensiones']),
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
      portadaEsReferencia:
          JsonUtils.asBool(json['portada_es_referencia']) ?? false,
      portadaEdicionReferencia: json['portada_edicion_referencia'] is Map
          ? Map<String, dynamic>.unmodifiable(
              Map<String, dynamic>.from(json['portada_edicion_referencia']),
            )
          : null,
      idAutor: JsonUtils.asInt(json['id_autor']),
      autor: JsonUtils.asString(json['autor']),
      idCategoria: JsonUtils.asInt(json['id_categoria']),
      categoria: JsonUtils.asString(json['categoria']),

      estado: JsonUtils.asBool(json['estado']),
      stock: JsonUtils.asInt(json['stock']),
    );
  }

  bool get esActivo => estado ?? false;

  bool get hayStock => (stock ?? 0) > 0;

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

  Map<String, dynamic> toJson() {
    return {
      'id_libro': idLibro,
      'titulo': titulo,
      'isbn': isbn,
      'descripcion': descripcion,
      'editorial': editorial,
      'idioma': idioma,
      'numero_paginas': numeroPaginas,
      'anio_publicacion': anioPublicacion,
      'formato': formato,
      'numero_volumen': numeroVolumen,
      'dimensiones': dimensiones,
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
