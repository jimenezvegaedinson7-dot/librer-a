import '../utils/json_utils.dart';

/// Resultado de crear una orden de pago (`POST /api/pagos/crear-orden`).
///
/// Contiene la orden creada en PayU con la URL del checkout
/// para que el usuario complete el pago.
class OrdenPago {
  final int? idVenta;
  final String? orderId;
  final String? checkoutUrl;
  final String? status;
  final double? total;
  final String? estadoVenta;
  final bool requiereRevision;

  const OrdenPago({
    this.idVenta,
    this.orderId,
    this.checkoutUrl,
    this.status,
    this.total,
    this.estadoVenta,
    this.requiereRevision = false,
  });

  factory OrdenPago.fromJson(Map<String, dynamic> json) {
    final data = json['data'];
    final dataMap = data is Map ? Map<String, dynamic>.from(data) : json;

    // En respuestas de idempotencia (`ya_existia`), la preferencia puede
    // venir aparte (a nivel raíz de `json`) con la URL del checkout.
    final preferenciaRaw = dataMap['preferencia'] ?? json['preferencia'];
    final preferenciaMap = preferenciaRaw is Map
        ? Map<String, dynamic>.from(preferenciaRaw)
        : null;
    final preferenciaCheckout = preferenciaMap == null
        ? null
        : (JsonUtils.asString(preferenciaMap['checkout_url']) ??
              JsonUtils.asString(preferenciaMap['payment_url']));

    return OrdenPago(
      idVenta: JsonUtils.asInt(dataMap['id_venta']),
      orderId:
          JsonUtils.asString(dataMap['order_id']) ??
          JsonUtils.asString(dataMap['external_reference']) ??
          JsonUtils.asString(dataMap['id']),
      checkoutUrl:
          JsonUtils.asString(dataMap['checkout_url']) ?? preferenciaCheckout,
      status:
          JsonUtils.asString(dataMap['payment_status']) ??
          JsonUtils.asString(dataMap['status']),
      total: JsonUtils.asDouble(dataMap['total']),
      estadoVenta: JsonUtils.asString(dataMap['estado_venta']) ?? JsonUtils.asString(dataMap['estado']),
      requiereRevision: JsonUtils.asBool(dataMap['requiere_revision']) ?? false,
    );
  }

  /// Devuelve una copia del modelo con los campos indicados reemplazados.
  OrdenPago copyWith({String? checkoutUrl, String? orderId}) {
    return OrdenPago(
      idVenta: idVenta,
      orderId: orderId ?? this.orderId,
      checkoutUrl: checkoutUrl ?? this.checkoutUrl,
      status: status,
      total: total,
      estadoVenta: estadoVenta,
      requiereRevision: requiereRevision,
    );
  }
}

/// Estado de una orden de pago consultada en `GET /api/pagos/:orderId`.
class EstadoOrden {
  final String? orderId;
  final String? status;
  final String? statusDetail;
  final double? totalAmount;
  final String? externalReference;
  final String? estadoVenta;
  final bool requiereRevision;

  const EstadoOrden({
    this.orderId,
    this.status,
    this.statusDetail,
    this.totalAmount,
    this.externalReference,
    this.estadoVenta,
    this.requiereRevision = false,
  });

  factory EstadoOrden.fromJson(Map<String, dynamic> json) {
    final data = json['data'];
    final dataMap = data is Map ? Map<String, dynamic>.from(data) : json;

    return EstadoOrden(
      orderId:
          JsonUtils.asString(dataMap['order_id']) ??
          JsonUtils.asString(dataMap['id']),
      status:
          JsonUtils.asString(dataMap['payment_status']) ??
          JsonUtils.asString(dataMap['status']),
      statusDetail: JsonUtils.asString(dataMap['payment_status_detail']) ?? JsonUtils.asString(dataMap['status_detail']),
      totalAmount: JsonUtils.asDouble(dataMap['total_amount']),
      externalReference: JsonUtils.asString(dataMap['external_reference']),
      estadoVenta: JsonUtils.asString(dataMap['estado_venta']),
      requiereRevision: JsonUtils.asBool(dataMap['requiere_revision']) ?? false,
    );
  }

  /// `true` cuando la orden fue aprobada (pago confirmado).
  bool get pagada => !requiereRevision &&
      (estadoVenta == null || const ['pagada', 'entregada'].contains(estadoVenta)) &&
      const ['APPROVED', 'CAPTURED'].contains((status ?? '').toUpperCase().trim());

  /// `true` cuando la orden sigue pendiente.
  bool get pendiente =>
      (status ?? '').toUpperCase().trim() == 'PENDING' ||
      (status ?? '').toUpperCase().trim() == 'PENDING_TRANSACTION_REVIEW' ||
      (status ?? '').toUpperCase().trim() == 'PENDING_TRANSACTION_CONFIRMATION';

  /// `true` cuando la orden fue cancelada o rechazada.
  bool get cancelada =>
      requiereRevision || const ['cancelada', 'reembolsada'].contains(estadoVenta) ||
      (status ?? '').toUpperCase().trim() == 'DECLINED' ||
      (status ?? '').toUpperCase().trim() == 'ERROR' ||
      (status ?? '').toUpperCase().trim() == 'EXPIRED' ||
      (status ?? '').toUpperCase().trim() == 'VOIDED' ||
      (status ?? '').toUpperCase().trim() == 'REFUNDED' ||
      (status ?? '').toUpperCase().trim() == 'CHARGED_BACK';
}
