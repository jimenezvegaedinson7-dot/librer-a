import 'package:flutter/foundation.dart';

import '../utils/app_colors.dart';
import '../utils/perfil_temas.dart';
import '../utils/perfil_fondos.dart';
import 'storage_service.dart';

class TemaController extends ChangeNotifier {
  TemaController._();

  static final TemaController instance = TemaController._();

  PerfilTema _tema = perfilTemaPorId(perfilTemaDefaultId);
  FondoApp _fondo = fondoPorId(fondoDefaultId);
  TarjetaApp _tarjeta = tarjetaPorId(tarjetaDefaultId);

  FondoApp get fondo => _fondo;

  TarjetaApp get tarjeta => _tarjeta;

  PerfilTema get tema => _tema;

  String get id => _tema.id;

  void _pintar() {
    AppColors.aplicarFondo(_fondo.fondo, _tarjeta.color);
    AppColors.aplicarAcento(_tema);
    notifyListeners();
  }

  Future<void> cargar() async {
    try {
      final fondoId = await StorageService.instance.obtenerFondo();
      _fondo = fondoPorId(fondoId ?? fondoDefaultId);
    } catch (_) {

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

    }
    try {
      final id = await StorageService.instance.obtenerTemaPerfil();
      _tema = perfilTemaPorId(id ?? perfilTemaDefaultId);
    } catch (_) {

    }
    _pintar();
  }

  Future<void> aplicarBotones(String temaId) async {
    final tema = perfilTemaPorId(temaId);
    await StorageService.instance.guardarTemaPerfil(tema.id);
    _tema = tema;
    _pintar();
  }

  Future<void> aplicarTarjeta(String tarjetaId) async {
    final tarjeta = tarjetaPorId(tarjetaId);
    await StorageService.instance.guardarTarjeta(tarjeta.id);
    _tarjeta = tarjeta;
    _pintar();
  }

  Future<void> aplicarFondo(String id) async {
    final fondo = fondoPorId(id);
    await StorageService.instance.guardarFondo(fondo.id);
    _fondo = fondo;
    _pintar();
  }

  Future<void> aplicar(String id) => aplicarBotones(id);

  Future<void> restaurarBotones() => aplicarBotones(perfilTemaDefaultId);

  Future<void> restaurarTarjeta() => aplicarTarjeta(tarjetaDefaultId);

  Future<void> restaurarFondo() => aplicarFondo(fondoDefaultId);
}
