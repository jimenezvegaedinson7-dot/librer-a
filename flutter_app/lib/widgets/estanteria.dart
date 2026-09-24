import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../services/tema_controller.dart';
import '../utils/app_colors.dart';
import '../utils/app_tokens.dart';

/// Dibuja estanterías con lomos de libros (decorativo, sin datos).
///
/// Los lomos se generan con una semilla fija, así el dibujo es estable entre
/// reconstrucciones. [progreso] (0–1) hace "crecer" los libros sobre sus
/// baldas, de izquierda a derecha y de arriba abajo.
class EstanteriaPainter extends CustomPainter {
  final Color tinta;
  final Color acento;
  final double opacidad;
  final double progreso;
  final double altoBalda;
  final int semilla;

  const EstanteriaPainter({
    required this.tinta,
    required this.acento,
    this.opacidad = 0.14,
    this.progreso = 1,
    this.altoBalda = 70,
    this.semilla = 7,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final aleatorio = math.Random(semilla);
    final filas = (size.height / altoBalda).ceil() + 1;
    final tablero = Paint()..color = tinta.withValues(alpha: opacidad * 1.3);
    final brillo = Paint()..color = acento.withValues(alpha: opacidad * 1.6);

    for (var fila = 0; fila < filas; fila++) {
      final base = size.height - fila * altoBalda - 6;
      var x = -aleatorio.nextDouble() * 12;
      var indice = 0;

      while (x < size.width + 12) {
        final ancho = 7 + aleatorio.nextDouble() * 11;
        final alto = altoBalda * (0.52 + aleatorio.nextDouble() * 0.36);
        final inclinado = aleatorio.nextDouble() < 0.07;
        final tono = aleatorio.nextDouble();
        final hueco = aleatorio.nextDouble() < 0.06;

        // Aparición escalonada: cada libro espera su turno según su posición.
        final retraso = ((1 - x / (size.width + 1)) * 0.55 + fila * 0.08).clamp(
          0.0,
          0.8,
        );
        final t = ((progreso - retraso) / 0.35).clamp(0.0, 1.0);
        final crecimiento = Curves.easeOutBack.transform(t).clamp(0.0, 1.08);

        if (!hueco && crecimiento > 0) {
          final altoActual = alto * crecimiento;
          final color = Color.lerp(
            tinta,
            acento,
            tono * 0.55,
          )!.withValues(alpha: opacidad * (0.55 + tono * 0.6));
          final lomo = RRect.fromRectAndCorners(
            Rect.fromLTWH(x, base - altoActual, ancho, altoActual),
            topLeft: const Radius.circular(1.5),
            topRight: const Radius.circular(1.5),
          );

          canvas.save();
          if (inclinado) {
            canvas.translate(x + ancho, base);
            canvas.rotate(0.16);
            canvas.translate(-(x + ancho), -base);
          }
          canvas.drawRRect(lomo, Paint()..color = color);
          // Bandas doradas del lomo.
          if (indice.isEven && altoActual > 20) {
            canvas.drawRect(
              Rect.fromLTWH(
                x + 1.5,
                base - altoActual + altoActual * 0.18,
                ancho - 3,
                1.4,
              ),
              brillo,
            );
            canvas.drawRect(
              Rect.fromLTWH(x + 1.5, base - altoActual * 0.22, ancho - 3, 1.4),
              brillo,
            );
          }
          canvas.restore();
        }

        x += ancho + (hueco ? 10 + aleatorio.nextDouble() * 14 : 1.2);
        indice++;
      }

      // Balda.
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(0, base, size.width, 5),
          const Radius.circular(1),
        ),
        tablero,
      );
    }
  }

  @override
  bool shouldRepaint(covariant EstanteriaPainter old) =>
      old.progreso != progreso ||
      old.tinta != tinta ||
      old.acento != acento ||
      old.opacidad != opacidad;
}

/// Estantería animada: los libros crecen al aparecer (una vez) y luego queda
/// quieta. Respeta "reducir animaciones".
class EstanteriaAnimada extends StatefulWidget {
  final Color tinta;
  final Color acento;
  final double opacidad;
  final double altoBalda;
  final int semilla;
  final Duration duracion;

  const EstanteriaAnimada({
    super.key,
    required this.tinta,
    required this.acento,
    this.opacidad = 0.14,
    this.altoBalda = 70,
    this.semilla = 7,
    this.duracion = const Duration(milliseconds: 1400),
  });

  @override
  State<EstanteriaAnimada> createState() => _EstanteriaAnimadaState();
}

class _EstanteriaAnimadaState extends State<EstanteriaAnimada>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: widget.duracion,
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (reducirMovimiento(context)) {
      _controller.value = 1;
    } else if (!_controller.isAnimating && _controller.value == 0) {
      _controller.forward();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) => CustomPaint(
          painter: EstanteriaPainter(
            tinta: widget.tinta,
            acento: widget.acento,
            opacidad: widget.opacidad,
            progreso: _controller.value,
            altoBalda: widget.altoBalda,
            semilla: widget.semilla,
          ),
        ),
      ),
    );
  }
}

/// Fondo de pantalla con estanterías tenues que se desvanecen hacia el
/// contenido (login y pantallas de acceso). Solo decoración.
class FondoEstanteria extends StatelessWidget {
  final Widget child;

  const FondoEstanteria({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned.fill(
          child: IgnorePointer(
            child: ShaderMask(
              blendMode: BlendMode.dstIn,
              shaderCallback: (rect) => const LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                // Abajo solo un borde tenue, para no competir con los
                // enlaces del pie del formulario.
                colors: [
                  Colors.white,
                  Colors.transparent,
                  Colors.transparent,
                  Color(0x73FFFFFF),
                ],
                stops: [0.0, 0.34, 0.9, 1.0],
              ).createShader(rect),
              child: ListenableBuilder(
                listenable: TemaController.instance,
                builder: (context, _) => EstanteriaAnimada(
                  tinta: AppColors.primaryDark,
                  acento: AppColors.dorado,
                  opacidad: 0.16,
                  altoBalda: 76,
                  semilla: 3,
                ),
              ),
            ),
          ),
        ),
        child,
      ],
    );
  }
}
