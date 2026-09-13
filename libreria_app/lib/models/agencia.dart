import '../utils/json_utils.dart';

/// Agencia courier para envíos (Olva, Shalom, etc.).
class Agencia {
  final int idAgencia;
  final String nombre;
  final double tarifaBase;
  final String? descripcion;

  const Agencia({
    required this.idAgencia,
    required this.nombre,
    required this.tarifaBase,
    this.descripcion,
  });

  factory Agencia.fromJson(Map<String, dynamic> json) {
    return Agencia(
      idAgencia: JsonUtils.asInt(json['id_agencia']) ?? 0,
      nombre: JsonUtils.asString(json['nombre']) ?? '',
      tarifaBase: JsonUtils.asDouble(json['tarifa_base']) ?? 0,
      descripcion: JsonUtils.asString(json['descripcion']),
    );
  }
}
