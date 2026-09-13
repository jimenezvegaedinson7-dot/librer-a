import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

/// Avatar predefinido del perfil: un emoji sobre un color de la paleta.
class AvatarPreset {
  final String emoji;
  final Color color;

  const AvatarPreset({required this.emoji, required this.color});
}

/// Galería de avatares presets disponibles en "Elegir avatar".
const List<AvatarPreset> avatarPresets = [
  AvatarPreset(emoji: '🦁', color: Color(0xFFFFB74D)),
  AvatarPreset(emoji: '🐼', color: Color(0xFF90A4AE)),
  AvatarPreset(emoji: '🦊', color: Color(0xFFFF8A65)),
  AvatarPreset(emoji: '🐸', color: Color(0xFF81C784)),
  AvatarPreset(emoji: '🐙', color: Color(0xFF7986CB)),
  AvatarPreset(emoji: '🦉', color: Color(0xFFA1887F)),
  AvatarPreset(emoji: '🐯', color: Color(0xFFFFA726)),
  AvatarPreset(emoji: '🦄', color: Color(0xFFF06292)),
  AvatarPreset(emoji: '🐧', color: Color(0xFF64B5F6)),
  AvatarPreset(emoji: '🐨', color: Color(0xFF9575CD)),
];

/// Genera el PNG del avatar en runtime (sin dependencias nuevas) dibujando el
/// [AvatarPreset.emoji] centrado sobre un círculo de [AvatarPreset.color].
///
/// Devuelve los bytes codificados en PNG listos para subir al backend.
Future<Uint8List> generarAvatarPng(
  AvatarPreset preset, {
  int size = 256,
}) async {
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder);
  final radius = size / 2;

  // Fondo circular del color del preset.
  canvas.drawCircle(
    Offset(radius, radius),
    radius,
    Paint()..color = preset.color,
  );

  // Emoji centrado.
  final textPainter = TextPainter(
    text: TextSpan(
      text: preset.emoji,
      style: TextStyle(fontSize: size * 0.52, height: 1.0),
    ),
    textAlign: TextAlign.center,
    textDirection: TextDirection.ltr,
  )..layout();

  textPainter.paint(
    canvas,
    Offset(radius - textPainter.width / 2, radius - textPainter.height / 2),
  );

  final image = await recorder.endRecording().toImage(size, size);
  final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
  if (byteData == null) {
    throw StateError('No se pudo codificar el avatar en PNG.');
  }
  return byteData.buffer.asUint8List(
    byteData.offsetInBytes,
    byteData.lengthInBytes,
  );
}
