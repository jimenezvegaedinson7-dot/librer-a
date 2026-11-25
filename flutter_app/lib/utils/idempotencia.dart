import 'dart:math';

String generarClaveIdempotencia() {
  final r = Random();
  final parte1 = r.nextInt(0x7FFFFFFF);
  final parte2 = r.nextInt(0x7FFFFFFF);
  return '${DateTime.now().millisecondsSinceEpoch}-$parte1$parte2';
}
