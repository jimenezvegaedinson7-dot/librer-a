import 'package:flutter/material.dart';

import '../models/version_app.dart';
import '../services/actualizacion_service.dart';
import 'dialogo_actualizacion.dart';

class ComprobadorActualizacion {
  ComprobadorActualizacion._();

  static Future<VersionApp?>? _consulta;
  static bool _mostrado = false;

  static void comprobar(BuildContext context) {
    if (_mostrado || !ActualizacionService.instance.disponible) return;
    _consulta ??= ActualizacionService.instance.buscarActualizacion();
    _consulta!.then((version) {

      if (version == null || _mostrado || !context.mounted) return;
      if (ModalRoute.of(context)?.isCurrent != true) return;
      _mostrado = true;
      mostrarDialogoActualizacion(context, version);
    });
  }
}
