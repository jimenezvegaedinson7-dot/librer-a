import '../utils/json_utils.dart';

/// Modelo de Reserva que refleja la estructura devuelta por el backend
/// en `GET /api/reservas/mis-reservas`.
///
/// Los campos son tolerantes igual que el resto de modelos: los números pueden
/// llegar como int/double/String y los campos desconocidos se ignoran.
class Reserva {
  final int? idReserva;
  final String? titulo;
  final int? idLibro;
  final int? cantidad;
  final String? fechaReserva;
  final String? fechaVencimiento;
  final String? estado;

  const Reserva({
    this.idReserva,
    this.titulo,
    this.idLibro,
    this.cantidad,
    this.fechaReserva,
    this.fechaVencimiento,
    this.estado,
  });

  factory Reserva.fromJson(Map<String, dynamic> json) {
    return Reserva(
      idReserva: JsonUtils.asInt(json['id_reserva']),
      titulo: JsonUtils.asString(json['titulo']),
      idLibro: JsonUtils.asInt(json['id_libro']),
      cantidad: JsonUtils.asInt(json['cantidad']),
      fechaReserva: JsonUtils.asString(json['fecha_reserva']),
      fechaVencimiento: JsonUtils.asString(json['fecha_vencimiento']),
      estado: JsonUtils.asString(json['estado']),
    );
  }

  /// Etiqueta legible del estado en español.
  String get estadoLabel {
    switch (estado?.toLowerCase().trim()) {
      case 'pendiente':
        return 'Pendiente';
      case 'confirmada':
        return 'Confirmada';
      case 'cancelada':
        return 'Cancelada';
      case 'completada':
        return 'Completada';
      default:
        return estado ?? '—';
    }
  }
}
