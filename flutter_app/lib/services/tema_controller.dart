import 'package:flutter/foundation.dart';

import '../utils/app_colors.dart';
import '../utils/perfil_temas.dart';
import '../utils/perfil_fondos.dart';
import 'storage_service.dart';

/// Controlador global de la apariencia de la aplicación.
///
/// Guarda tres preferencias independientes entre sí:
/// - [tema]: colores de botones, iconos y acentos (también la cabecera).
/// - [tarjeta]: color de las tarjetas.
/// - [fondo]: color de fondo de las pantallas.
///
/// Cada una se persiste con su propia clave, de modo que cambiar una nunca
/// altera las otras. Cuando cambia cualquiera, se repinta [AppColors] y se
/// notifica para que toda la app se reconstruya en tiempo real.
class TemaController extends ChangeNotifier {
  TemaController._();

  static final TemaController instance = TemaController._();

  PerfilTema _tema = perfilTemaPorId(perfilTemaDefaultId);
  FondoApp _fondo = fondoPorId(fondoDefaultId);
  TarjetaApp _tarjeta = tarjetaPorId(tarjetaDefaultId);

  /// Fondo de pantallas actual.
  FondoApp get fondo => _fondo;

  /// Color de tarjetas actual.
  TarjetaApp get tarjeta => _tarjeta;

  /// Tema de colores actual de la app.
  PerfilTema get tema => _tema;

  /// Id del tema actual.
  String get id => _tema.id;

  /// Aplica en memoria los tres valores y reconstruye la app.
  void _pintar() {
    AppColors.aplicarFondo(_fondo.fondo, _tarjeta.color);
    AppColors.aplicarAcento(_tema);
    notifyListeners();
  }

  /// Restaura las preferencias guardadas (se llama una vez al arrancar).
  Future<void> cargar() async {
    try {
      final fondoId = await StorageService.instance.obtenerFondo();
      _fondo = fondoPorId(fondoId ?? fondoDefaultId);
    } catch (_) {
      // Sin fondo guardado: se mantiene el marfil.
    }
    try {
      final tarjetaId = await StorageService.instance.obtenerTarjeta();
      _tarjeta = tarjetaPorId(
        tarjetaId ??
            (_fondo.id == fondoDefaultId
                ? tarjetaDefaultId
                : 'legado_${_fondo.id}'),
      );
      if (tarjetaId == null) {
        await StorageService.instance.guardarTarjeta(_tarjeta.id);
      }
    } catch (_) {
      // Sin tarjeta guardada: se mantiene la blanca.
    }
    try {
      final id = await StorageService.instance.obtenerTemaPerfil();
      _tema = perfilTemaPorId(id ?? perfilTemaDefaultId);
    } catch (_) {
      // Sin tema guardado: se mantiene el por defecto.
    }
    _pintar();
  }

  /// Aplica los colores de botones, iconos y acentos, y los persiste.
  Future<void> aplicarBotones(String temaId) async {
    final tema = perfilTemaPorId(temaId);
    await StorageService.instance.guardarTemaPerfil(tema.id);
    _tema = tema;
    _pintar();
  }

  /// Aplica el color de las tarjetas y lo persiste.
  Future<void> aplicarTarjeta(String tarjetaId) async {
    final tarjeta = tarjetaPorId(tarjetaId);
    await StorageService.instance.guardarTarjeta(tarjeta.id);
    _tarjeta = tarjeta;
    _pintar();
  }

  /// Aplica el fondo de las pantallas y lo persiste.
  Future<void> aplicarFondo(String id) async {
    final fondo = fondoPorId(id);
    await StorageService.instance.guardarFondo(fondo.id);
    _fondo = fondo;
    _pintar();
  }

  /// Alias histórico de [aplicarBotones].
  Future<void> aplicar(String id) => aplicarBotones(id);

  /// Restaura los colores de botones e iconos de la librería.
  Future<void> restaurarBotones() => aplicarBotones(perfilTemaDefaultId);

  /// Restaura las tarjetas blancas originales.
  Future<void> restaurarTarjeta() => aplicarTarjeta(tarjetaDefaultId);

  /// Restaura el fondo marfil original.
  Future<void> restaurarFondo() => aplicarFondo(fondoDefaultId);
}
