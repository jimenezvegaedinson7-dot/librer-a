import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Diario local por cliente. No contiene JWT ni credenciales; el cuerpo se
/// guarda antes de enviar para poder repetir exactamente el mismo POST.
class IntentoCheckout {
  final int propietario;
  final String fingerprint;
  final Map<String, dynamic> cuerpo;
  final Map<String, List<String>> unidades;
  final int totalMostradoCentimos;
  final int? idVenta;
  final String? referencia;
  final String? checkoutUrl;
  final String? estado;
  final double? total;

  const IntentoCheckout({
    required this.propietario,
    required this.fingerprint,
    required this.cuerpo,
    required this.unidades,
    required this.totalMostradoCentimos,
    this.idVenta,
    this.referencia,
    this.checkoutUrl,
    this.estado,
    this.total,
  });

  String get clave => cuerpo['idempotencia_clave'] as String;
  bool get terminado => const {
    'APPROVED',
    'DECLINED',
    'ERROR',
    'EXPIRED',
    'VOIDED',
    'REFUNDED',
    'REJECTED_REQUEST',
  }.contains(estado?.toUpperCase());

  IntentoCheckout actualizar({
    int? idVenta,
    String? referencia,
    String? checkoutUrl,
    String? estado,
    double? total,
  }) => IntentoCheckout(
    propietario: propietario,
    fingerprint: fingerprint,
    cuerpo: cuerpo,
    unidades: unidades,
    totalMostradoCentimos: totalMostradoCentimos,
    idVenta: idVenta ?? this.idVenta,
    referencia: referencia ?? this.referencia,
    checkoutUrl: checkoutUrl ?? this.checkoutUrl,
    estado: estado ?? this.estado,
    total: total ?? this.total,
  );

  Map<String, dynamic> toJson() => {
    'propietario': propietario,
    'fingerprint': fingerprint,
    'cuerpo': cuerpo,
    'unidades': unidades,
    'total_mostrado': totalMostradoCentimos,
    'id_venta': idVenta,
    'referencia': referencia,
    'checkout_url': checkoutUrl,
    'estado': estado,
    'total': total,
  };

  factory IntentoCheckout.fromJson(Map<String, dynamic> json) =>
      IntentoCheckout(
        propietario: (json['propietario'] as num).toInt(),
        fingerprint: json['fingerprint'] as String,
        cuerpo: Map<String, dynamic>.from(json['cuerpo'] as Map),
        unidades: {
          for (final e in (json['unidades'] as Map).entries)
            e.key.toString(): List<String>.from(e.value as List),
        },
        totalMostradoCentimos: (json['total_mostrado'] as num).toInt(),
        idVenta: (json['id_venta'] as num?)?.toInt(),
        referencia: json['referencia'] as String?,
        checkoutUrl: json['checkout_url'] as String?,
        estado: json['estado'] as String?,
        total: (json['total'] as num?)?.toDouble(),
      );
}

class CheckoutStore {
  CheckoutStore._();
  static final instance = CheckoutStore._();
  Future<void> _cola = Future.value();
  String _key(int propietario) => 'checkout_intentos_v1_$propietario';

  Future<List<IntentoCheckout>> leer(int propietario) async {
    await _cola;
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key(propietario));
    if (raw == null) return [];
    // Un diario ilegible no se sustituye por un intento nuevo silenciosamente.
    return (jsonDecode(raw) as List)
        .map(
          (e) => IntentoCheckout.fromJson(Map<String, dynamic>.from(e as Map)),
        )
        .where((e) => e.propietario == propietario)
        .toList();
  }

  Future<IntentoCheckout?> activo(int propietario) async =>
      (await leer(propietario)).where((e) => !e.terminado).lastOrNull;

  Future<void> guardar(IntentoCheckout intento) {
    final operacion = _cola.then((_) async {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_key(intento.propietario));
      final lista = raw == null ? <dynamic>[] : jsonDecode(raw) as List;
      lista.removeWhere(
        (e) => (e['cuerpo'] as Map)['idempotencia_clave'] == intento.clave,
      );
      lista.add(intento.toJson());
      if (!await prefs.setString(
        _key(intento.propietario),
        jsonEncode(lista),
      )) {
        throw StateError('No se pudo conservar el intento de compra.');
      }
    });
    _cola = operacion.catchError((Object _) {});
    return operacion;
  }
}
