import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../services/sonido_service.dart';
import '../utils/app_colors.dart';

/// Confirmación de "¡listo!" tras un código correcto: el círculo verde entra
/// con rebote, el check se dibuja, una onda y unos destellos salen del centro
/// y suena el "ka-ching" de compra. Se cierra sola al terminar.
Future<void> mostrarConfirmacionOtp(
  BuildContext context, {
  required String titulo,
  required String mensaje,
}) => showDialog<void>(
  context: context,
  barrierDismissible: false,
  builder: (_) => _Confirmacion(titulo: titulo, mensaje: mensaje),
);

/// Tiempo que la confirmación queda visible.
const _duracion = Duration(milliseconds: 1300);

class _Confirmacion extends StatefulWidget {
  final String titulo, mensaje;
  const _Confirmacion({required this.titulo, required this.mensaje});
  @override
  State<_Confirmacion> createState() => _ConfirmacionState();
}

class _ConfirmacionState extends State<_Confirmacion>
    with SingleTickerProviderStateMixin {
  late final AnimationController _anim = AnimationController(
    vsync: this,
    duration: _duracion,
  );
  Timer? _timer;
  bool _iniciada = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_iniciada) return;
    _iniciada = true;
    unawaited(SonidoService.instance.confirmacion());
    if (MediaQuery.disableAnimationsOf(context)) {
      // Sin animaciones: se muestra completa y se cierra a su tiempo.
      _anim.value = 1;
      _timer = Timer(_duracion, _cerrar);
    } else {
      // La animación dura lo mismo que el aviso: al terminar, se cierra.
      _anim.forward().whenComplete(_cerrar);
    }
  }

  void _cerrar() {
    if (mounted) Navigator.of(context).pop();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _anim.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final texto = Theme.of(context).textTheme;
    return Semantics(
      liveRegion: true,
      child: Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(28, 28, 28, 30),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedBuilder(
                animation: _anim,
                builder: (_, _) => CustomPaint(
                  size: const Size.square(136),
                  painter: _Celebracion(_anim.value),
                ),
              ),
              const SizedBox(height: 8),
              FadeTransition(
                opacity: CurvedAnimation(
                  parent: _anim,
                  curve: const Interval(0.25, 0.5, curve: Curves.easeOut),
                ),
                child: Column(
                  children: [
                    Text(
                      widget.titulo,
                      textAlign: TextAlign.center,
                      style: texto.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      widget.mensaje,
                      textAlign: TextAlign.center,
                      style: texto.bodyMedium,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Dibuja toda la celebración a partir de un único avance `t` (0 → 1).
class _Celebracion extends CustomPainter {
  final double t;
  _Celebracion(this.t);

  static const _destellos = [
    AppColors.success,
    Color(0xFFF2B33D),
    Color(0xFF3B82F6),
    AppColors.success,
    Color(0xFFE76F51),
    Color(0xFFF2B33D),
    Color(0xFF3B82F6),
    Color(0xFFE76F51),
  ];

  double _tramo(double inicio, double fin, [Curve curva = Curves.linear]) =>
      curva.transform(((t - inicio) / (fin - inicio)).clamp(0.0, 1.0));

  @override
  void paint(Canvas canvas, Size size) {
    final centro = size.center(Offset.zero);

    // Onda que se expande y se desvanece.
    final onda = _tramo(0.12, 0.6, Curves.easeOutCubic);
    if (onda > 0 && onda < 1) {
      canvas.drawCircle(
        centro,
        38 + 28 * onda,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3 * (1 - onda)
          ..color = AppColors.success.withValues(alpha: 0.45 * (1 - onda)),
      );
    }

    // Destellos que salen del centro.
    final salida = _tramo(0.16, 0.72, Curves.easeOutCubic);
    if (salida > 0 && salida < 1) {
      for (var i = 0; i < _destellos.length; i++) {
        final angulo = -math.pi / 2 + i * 2 * math.pi / _destellos.length;
        final distancia = 44 + 22 * salida;
        final punto = centro + Offset.fromDirection(angulo, distancia);
        canvas.drawCircle(
          punto,
          (i.isEven ? 4.0 : 3.0) * (1 - salida * 0.6),
          Paint()..color = _destellos[i].withValues(alpha: 1 - salida),
        );
      }
    }

    // Círculo con rebote.
    final escala = _tramo(0, 0.38, Curves.elasticOut);
    canvas.drawCircle(centro, 38 * escala, Paint()..color = AppColors.success);

    // Check que se dibuja.
    final trazo = _tramo(0.22, 0.5, Curves.easeOutCubic);
    if (trazo > 0) {
      final check = Path()
        ..moveTo(centro.dx - 15, centro.dy + 1)
        ..lineTo(centro.dx - 4, centro.dy + 12)
        ..lineTo(centro.dx + 17, centro.dy - 11);
      final metrica = check.computeMetrics().first;
      canvas.drawPath(
        metrica.extractPath(0, metrica.length * trazo),
        Paint()
          ..color = Colors.white
          ..style = PaintingStyle.stroke
          ..strokeWidth = 5
          ..strokeCap = StrokeCap.round
          ..strokeJoin = StrokeJoin.round,
      );
    }
  }

  @override
  bool shouldRepaint(_Celebracion old) => old.t != t;
}
