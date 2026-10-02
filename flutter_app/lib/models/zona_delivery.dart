import '../utils/json_utils.dart';

/// Zona de delivery local de Pallasca configurada por el administrador.
class ZonaDelivery {
  final int idZona;
  final String nombre;
  final double tarifa;
  final bool activa;

  const ZonaDelivery({
    required this.idZona,
    required this.nombre,
    required this.tarifa,
    required this.activa,
  });

  factory ZonaDelivery.fromJson(Map<String, dynamic> json) => ZonaDelivery(
    idZona: JsonUtils.asInt(json['id_zona']) ?? 0,
    nombre: JsonUtils.asString(json['nombre']) ?? '',
    tarifa: JsonUtils.asDouble(json['tarifa']) ?? 0,
    activa: JsonUtils.asInt(json['estado']) == 1,
  );
}
