import '../utils/json_utils.dart';

/// Ítem del detalle de una venta devuelto por el backend en
/// `GET /api/ventas/mis-ventas` dentro del arreglo `detalle`.
class VentaItem {
  final int? idLibro;
  final String? titulo;
  final int? cantidad;
  final double? precioUnitario;
  final double? subtotal;

  const VentaItem({
    this.idLibro,
    this.titulo,
    this.cantidad,
    this.precioUnitario,
    this.subtotal,
  });

  factory VentaItem.fromJson(Map<String, dynamic> json) {
    return VentaItem(
      idLibro: JsonUtils.asInt(json['id_libro']),
      titulo: JsonUtils.asString(json['titulo']),
      cantidad: JsonUtils.asInt(json['cantidad']),
      precioUnitario: JsonUtils.asDouble(json['precio_unitario']),
      subtotal: JsonUtils.asDouble(json['subtotal']),
    );
  }
}

/// Modelo de Venta que refleja la estructura devuelta por el backend en
/// `GET /api/ventas/mis-ventas`.
///
/// Los campos son tolerantes igual que el resto de modelos: los números pueden
/// llegar como int/double/String y los campos desconocidos se ignoran. El
/// detalle (`detalle`) y los campos de envío (`costo_envio`, `distrito`,
/// `provincia`, `agencia`, `correo_compra`) son opcionales: si el servidor no
/// los envía se mantienen como valor por defecto y `fromJson` no se rompe.
class Venta {
  final int? idVenta;
  final int? idUsuario;
  final String? fechaVenta;
  final double? total;
  final String? estado;
  final String? estadoEntrega;
  final String? pagoRevisionMotivo;
  final String? tipoEntrega;
  final String? coberturaEntrega;
  final String? zonaDeliveryNombre;
  final String? referencia;
  final String? direccion;
  final double? costoEnvio;
  final String? distrito;
  final String? provincia;
  final String? agencia;
  final String? correoCompra;
  final String? orderId;
  final String? clienteDocumento;
  final String? clienteTipoDocumento;
  final List<VentaItem> detalle;

  const Venta({
    this.idVenta,
    this.idUsuario,
    this.fechaVenta,
    this.total,
    this.estado,
    this.estadoEntrega,
    this.pagoRevisionMotivo,
    this.tipoEntrega,
    this.coberturaEntrega,
    this.zonaDeliveryNombre,
    this.referencia,
    this.direccion,
    this.costoEnvio,
    this.distrito,
    this.provincia,
    this.agencia,
    this.correoCompra,
    this.orderId,
    this.clienteDocumento,
    this.clienteTipoDocumento,
    this.detalle = const [],
  });

  factory Venta.fromJson(Map<String, dynamic> json) {
    final rawDetalle = json['detalle'];
    return Venta(
      idVenta: JsonUtils.asInt(json['id_venta']),
      idUsuario: JsonUtils.asInt(json['id_usuario']),
      fechaVenta: JsonUtils.asString(json['fecha_venta']),
      total: JsonUtils.asDouble(json['total']),
      estado: JsonUtils.asString(json['estado']),
      estadoEntrega: JsonUtils.asString(json['estado_entrega']),
      pagoRevisionMotivo: JsonUtils.asString(json['pago_revision_motivo']),
      tipoEntrega: JsonUtils.asString(json['tipo_entrega']),
      coberturaEntrega: JsonUtils.asString(json['cobertura_entrega']),
      zonaDeliveryNombre: JsonUtils.asString(json['zona_delivery_nombre']),
      referencia: JsonUtils.asString(json['referencia']),
      direccion: JsonUtils.asString(json['direccion']),
      costoEnvio: JsonUtils.asDouble(json['costo_envio']),
      distrito: JsonUtils.asString(json['distrito']),
      provincia: JsonUtils.asString(json['provincia']),
      agencia: JsonUtils.asString(json['agencia']),
      correoCompra: JsonUtils.asString(json['correo_compra']),
      orderId:
          JsonUtils.asString(json['external_reference']) ??
          JsonUtils.asString(json['payu_order_id']) ??
          JsonUtils.asString(json['order_id']),
      clienteDocumento: JsonUtils.asString(json['cliente_documento']),
      clienteTipoDocumento: JsonUtils.asString(json['cliente_tipo_documento']),
      detalle: rawDetalle is List
          ? rawDetalle
                .whereType<Map>()
                .map((e) => VentaItem.fromJson(Map<String, dynamic>.from(e)))
                .toList()
          : const [],
    );
  }

  /// Solo las compras marcadas explícitamente pertenecen a Pallasca.
  bool get esPallasca => coberturaEntrega == 'pallasca';

  String? get entregaLabel {
    switch (tipoEntrega?.toLowerCase().trim()) {
      case 'domicilio':
        return esPallasca ? 'Delivery dentro de Pallasca' : 'A domicilio';
      case 'tienda':
        return esPallasca ? 'Recojo en Pallasca' : 'Recoger en tienda';
      case 'agencia':
        return 'Agencia';
      default:
        return null;
    }
  }

  /// Las ubicaciones históricas se leen como fueron guardadas.
  String get ubicacionEntrega => esPallasca
      ? zonaDeliveryNombre ?? ''
      : [
          distrito,
          provincia,
        ].whereType<String>().where((s) => s.isNotEmpty).join(', ');

  /// `true` si la venta ya fue pagada.
  bool get pagada => (estado ?? '').toLowerCase().trim() == 'pagada';
  bool get requiereRevision => (pagoRevisionMotivo ?? '').isNotEmpty;

  /// `true` si la venta sigue pendiente de pago.
  bool get pendiente => (estado ?? '').toLowerCase().trim() == 'pendiente';

  /// `true` si la venta ya fue entregada.
  bool get entregada => (estado ?? '').toLowerCase().trim() == 'entregada';

  String get entregaEstadoLabel =>
      switch (estadoEntrega?.toLowerCase().trim()) {
        'pendiente' =>
          pendiente ? 'Se prepara al confirmar el pago' : 'Preparando pedido',
        'preparando' => 'Preparando pedido',
        'listo_recojo' => 'Listo para recoger',
        'en_camino' => 'En camino',
        'entregado' => 'Entregado',
        'cancelado' => 'Entrega cancelada',
        _ => '',
      };

  /// Etiqueta legible del estado en español.
  String get estadoLabel {
    switch (estado?.toLowerCase().trim()) {
      case 'pendiente':
        return 'Pendiente';
      case 'pagada':
        return 'Pagada';
      case 'entregada':
        return 'Entregada';
      case 'cancelada':
        return 'Cancelada';
      case 'reembolsada':
        return 'Reembolsada';
      default:
        return estado ?? '—';
    }
  }
}
