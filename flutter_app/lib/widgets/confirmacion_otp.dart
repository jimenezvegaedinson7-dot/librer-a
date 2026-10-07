import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../utils/app_colors.dart';

Future<void> mostrarConfirmacionOtp(
  BuildContext context, {
  required String titulo,
  required String mensaje,
}) => showDialog<void>(
  context: context,
  barrierDismissible: false,
  builder: (_) => _Confirmacion(titulo: titulo, mensaje: mensaje),
);

class _Confirmacion extends StatefulWidget {
  final String titulo, mensaje;
  const _Confirmacion({required this.titulo, required this.mensaje});
  @override
  State<_Confirmacion> createState() => _ConfirmacionState();
}

class _ConfirmacionState extends State<_Confirmacion> {
  Timer? _timer;
  @override
  void initState() {
    super.initState();
    _timer = Timer(const Duration(milliseconds: 1100), () {
      if (mounted) Navigator.of(context).pop();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    child: AlertDialog(
      title: Text(widget.titulo, textAlign: TextAlign.center),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: 1),
            duration: MediaQuery.disableAnimationsOf(context)
                ? Duration.zero
                : const Duration(milliseconds: 650),
            curve: Curves.easeOutCubic,
            builder: (_, valor, _) => CustomPaint(
              size: const Size.square(80),
              painter: _Marca(valor),
            ),
          ),
          const SizedBox(height: 16),
          Text(widget.mensaje, textAlign: TextAlign.center),
        ],
      ),
    ),
  );
}

class _Marca extends CustomPainter {
  final double avance;
  _Marca(this.avance);
  @override
  void paint(Canvas canvas, Size size) {
    final centro = Offset(size.width / 2, size.height / 2);
    canvas.drawCircle(centro, 36, Paint()..color = AppColors.successContainer);
    final trazo = Paint()
      ..color = AppColors.success
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(
      Rect.fromCircle(center: centro, radius: 34),
      -math.pi / 2,
      2 * math.pi * avance,
      false,
      trazo,
    );
    final check = Path()
      ..moveTo(24, 40)
      ..lineTo(35, 51)
      ..lineTo(57, 29);
    final metrica = check.computeMetrics().first;
    canvas.drawPath(metrica.extractPath(0, metrica.length * avance), trazo);
  }

  @override
  bool shouldRepaint(_Marca oldDelegate) => oldDelegate.avance != avance;
}
