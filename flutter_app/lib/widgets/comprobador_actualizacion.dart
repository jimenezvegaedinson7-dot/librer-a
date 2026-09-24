import 'package:flutter/material.dart';

import '../models/version_app.dart';
import '../services/actualizacion_service.dart';
import 'dialogo_actualizacion.dart';

/// Comprueba una sola vez por arranque si hay una versión nueva del APK y,
/// si la hay, muestra el aviso sobre la pantalla actual (Login o Inicio).
class ComprobadorActualizacion {
  ComprobadorActualizacion._();

  static Future<VersionApp?>? _consulta;
  static bool _mostrado = false;

  static void comprobar(BuildContext context) {
    if (_mostrado || !ActualizacionService.instance.disponible) return;
    _consulta ??= ActualizacionService.instance.buscarActualizacion();
    _consulta!.then((version) {
      // Si el usuario ya cambió de pantalla, la siguiente lo mostrará.
      if (version == null || _mostrado || !context.mounted) return;
      if (ModalRoute.of(context)?.isCurrent != true) return;
      _mostrado = true;
      mostrarDialogoActualizacion(context, version);
    });
  }
}
