import 'dart:io' show Platform;

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Sonidos cortos de la app. Hoy solo el "¡listo!" de una confirmación
/// (código verificado, pago aprobado): dos campanas ascendentes como las
/// de una compra exitosa, con una vibración leve.
///
/// Se mezcla con la música del usuario en vez de pausarla y nunca bloquea
/// el flujo: si el audio falla, la confirmación visual sigue igual.
class SonidoService {
  SonidoService._();

  static final SonidoService instance = SonidoService._();

  // En `flutter test` no hay motor de audio: se omite el sonido.
  static final bool _enPruebas =
      !kIsWeb && Platform.environment.containsKey('FLUTTER_TEST');

  AudioPlayer? _reproductor;

  Future<void> confirmacion() async {
    try {
      await HapticFeedback.mediumImpact();
    } catch (_) {}
    if (_enPruebas) return;
    try {
      final reproductor = _reproductor ??= await _crear();
      await reproductor.stop();
      await reproductor.play(
        AssetSource('sonidos/confirmacion.wav'),
        volume: 0.8,
        mode: PlayerMode.lowLatency,
      );
    } catch (error) {
      debugPrint('No se pudo reproducir la confirmación: $error');
    }
  }

  Future<AudioPlayer> _crear() async {
    final reproductor = AudioPlayer(playerId: 'confirmacion');
    await reproductor.setReleaseMode(ReleaseMode.stop);
    await reproductor.setAudioContext(
      AudioContextConfig(focus: AudioContextConfigFocus.mixWithOthers).build(),
    );
    return reproductor;
  }
}
