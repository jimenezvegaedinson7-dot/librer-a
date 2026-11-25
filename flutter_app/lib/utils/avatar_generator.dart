import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

class AvatarPreset {
  final String emoji;
  final Color color;

  const AvatarPreset({required this.emoji, required this.color});
}

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

Future<Uint8List> generarAvatarPng(
  AvatarPreset preset, {
  int size = 256,
}) async {
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder);
  final radius = size / 2;

  canvas.drawCircle(
    Offset(radius, radius),
    radius,
    Paint()..color = preset.color,
  );

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
