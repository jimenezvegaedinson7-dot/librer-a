import '../utils/json_utils.dart';

/// Provincia de Lima (datos de envío).
class Provincia {
  final int idProvincia;
  final String nombre;

  const Provincia({required this.idProvincia, required this.nombre});

  factory Provincia.fromJson(Map<String, dynamic> json) {
    return Provincia(
      idProvincia: JsonUtils.asInt(json['id_provincia']) ?? 0,
      nombre: JsonUtils.asString(json['nombre']) ?? '',
    );
  }
}

/// Distrito asociado a una provincia de Lima.
class Distrito {
  final int idDistrito;
  final String nombre;
  final double tarifaEnvio;

  const Distrito({
    required this.idDistrito,
    required this.nombre,
    this.tarifaEnvio = 0,
  });

  factory Distrito.fromJson(Map<String, dynamic> json) {
    return Distrito(
      idDistrito: JsonUtils.asInt(json['id_distrito']) ?? 0,
      nombre: JsonUtils.asString(json['nombre']) ?? '',
      tarifaEnvio: JsonUtils.asDouble(json['tarifa_envio']) ?? 0,
    );
  }
}
