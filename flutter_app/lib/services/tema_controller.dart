import 'package:flutter/foundation.dart';

import '../utils/app_colors.dart';
import '../utils/perfil_temas.dart';
import '../utils/perfil_fondos.dart';
import 'storage_service.dart';

/// Controlador global del tema de colores de la aplicación.
///
/// Es la única fuente de verdad del tema elegido por el usuario en su perfil.
/// Cuando cambia, pinta los acentos de [AppColors] y notifica para que la app
/// completa (botones, tarjetas, iconos, chips y badges) se reconstruya con los
/// nuevos colores en tiempo real.
class TemaController extends ChangeNotifier {
  TemaController._();

  static final TemaController instance = TemaController._();

  PerfilTema _tema = perfilTemaPorId(perfilTemaDefaultId);
  FondoApp _fondo = fondoPorId(fondoDefaultId);

  /// Fondo de pantallas y tarjetas actual.
  FondoApp get fondo => _fondo;

  /// Tema de colores actual de la app.
  PerfilTema get tema => _tema;

  /// Id del tema actual.
  String get id => _tema.id;

  /// Restaura el tema guardado (se llama una vez al arrancar la app).
  Future<void> cargar() async {
    try {
      final fondoId = await StorageService.instance.obtenerFondo();
      if (fondoId != null) {
        _fondo = fondoPorId(fondoId);
        AppColors.aplicarFondo(_fondo.fondo, _fondo.tarjeta);
        notifyListeners();
      }
    } catch (_) {
      // Sin fondo guardado: se mantiene el marfil.
    }
    try {
      final id = await StorageService.instance.obtenerTemaPerfil();
      if (id != null) {
        _tema = perfilTemaPorId(id);
        AppColors.aplicarAcento(_tema);
        notifyListeners();
      }
    } catch (_) {
      // Sin tema guardado: se mantiene el por defecto.
    }
  }

  /// Aplica un fondo de pantallas y tarjetas, lo pinta en toda la app y lo
  /// persiste.
  Future<void> aplicarFondo(String id) async {
    _fondo = fondoPorId(id);
    AppColors.aplicarFondo(_fondo.fondo, _fondo.tarjeta);
    notifyListeners();
    try {
      await StorageService.instance.guardarFondo(id);
    } catch (_) {
      // El fondo queda aplicado aunque el guardado local falle.
    }
  }

  /// Aplica un tema por su id, lo pinta en toda la app y lo persiste.
  Future<void> aplicar(String id) async {
    _tema = perfilTemaPorId(id);
    AppColors.aplicarAcento(_tema);
    notifyListeners();
    try {
      await StorageService.instance.guardarTemaPerfil(id);
    } catch (_) {
      // El tema queda aplicado aunque el guardado local falle.
    }
  }
}
