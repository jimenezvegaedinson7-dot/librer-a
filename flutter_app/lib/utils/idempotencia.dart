import 'dart:math';

/// Genera el identificador de un intento de compra (máximo 64 caracteres).
///
/// Usa `nextInt(0x7FFFFFFF)` en lugar de `nextInt(1 << 32)` porque el
/// compilador Dart-to-JavaScript optimiza `1 << 32` a `0`, lo que causa
/// `RangeError: max must be in range 0 < max ≤ 2^32, was 0`.
String generarClaveIdempotencia() {
  final r = Random();
  final parte1 = r.nextInt(0x7FFFFFFF);
  final parte2 = r.nextInt(0x7FFFFFFF);
  return '${DateTime.now().millisecondsSinceEpoch}-$parte1$parte2';
}
