import '../utils/json_utils.dart';

class Usuario {
  final int? idUsuario;
  final String? nombre;
  final String? apellido;
  final String? email;
  final String? telefono;
  final String? fotoPerfil;
  final String? rol;
  final String? estado;
  final String? fechaRegistro;

  final bool? twoFactorEnabled;

  const Usuario({
    this.idUsuario,
    this.nombre,
    this.apellido,
    this.email,
    this.telefono,
    this.fotoPerfil,
    this.rol,
    this.estado,
    this.fechaRegistro,
    this.twoFactorEnabled,
  });

  String get nombreCompleto {
    final parts = [
      nombre?.trim(),
      apellido?.trim(),
    ].where((p) => p != null && p.isNotEmpty).toList();
    return parts.isEmpty ? 'Cliente' : parts.join(' ');
  }

  bool get esAdministrador => rol?.toLowerCase().trim() == 'administrador';

  bool get esCliente => rol?.toLowerCase().trim() == 'cliente';

  factory Usuario.fromJson(Map<String, dynamic> json) {
    return Usuario(
      idUsuario: JsonUtils.asInt(json['id_usuario']),
      nombre: JsonUtils.asString(json['nombre']),
      apellido: JsonUtils.asString(json['apellido']),
      email: JsonUtils.asString(json['email']),
      telefono: JsonUtils.asString(json['telefono']),
      fotoPerfil: JsonUtils.asString(json['foto_perfil']),
      rol: JsonUtils.asString(json['rol']),
      estado: JsonUtils.asString(json['estado']),
      fechaRegistro: JsonUtils.asString(json['fecha_registro']),
      twoFactorEnabled: JsonUtils.asBool(json['two_factor_enabled']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id_usuario': idUsuario,
      'nombre': nombre,
      'apellido': apellido,
      'email': email,
      'telefono': telefono,
      'foto_perfil': fotoPerfil,
      'rol': rol,
      'estado': estado,
      'fecha_registro': fechaRegistro,
      'two_factor_enabled': twoFactorEnabled == true ? 1 : 0,
    };
  }

  Usuario copyWith({
    int? idUsuario,
    String? nombre,
    String? apellido,
    String? email,
    String? telefono,
    String? fotoPerfil,
    String? rol,
    String? estado,
    String? fechaRegistro,
    bool? twoFactorEnabled,
  }) {
    return Usuario(
      idUsuario: idUsuario ?? this.idUsuario,
      nombre: nombre ?? this.nombre,
      apellido: apellido ?? this.apellido,
      email: email ?? this.email,
      telefono: telefono ?? this.telefono,
      fotoPerfil: fotoPerfil ?? this.fotoPerfil,
      rol: rol ?? this.rol,
      estado: estado ?? this.estado,
      fechaRegistro: fechaRegistro ?? this.fechaRegistro,
      twoFactorEnabled: twoFactorEnabled ?? this.twoFactorEnabled,
    );
  }
}
