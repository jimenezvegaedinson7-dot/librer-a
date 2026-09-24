import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../utils/app_colors.dart';
import '../utils/app_tokens.dart';

/// Carga a pantalla completa: una pequeña balda cuyos libros se alzan en
/// ola, con el mensaje debajo. Con "reducir animaciones" usa un indicador fijo.
class LoadingView extends StatelessWidget {
  final String? message;

  const LoadingView({super.key, this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Semantics(
              label: 'Cargando',
              child: reducirMovimiento(context)
                  ? SizedBox(
                      width: 30,
                      height: 30,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.4,
                        strokeCap: StrokeCap.round,
                        color: AppColors.primary,
                      ),
                    )
                  : const _BaldaCargando(),
            ),
            if (message != null) ...[
              const SizedBox(height: 18),
              Text(
                message!,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium
                    ?.copyWith(color: AppColors.textSecondary),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _BaldaCargando extends StatefulWidget {
  const _BaldaCargando();

  @override
  State<_BaldaCargando> createState() => _BaldaCargandoState();
}

class _BaldaCargandoState extends State<_BaldaCargando>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1300),
  )..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const altos = [30.0, 38.0, 26.0, 34.0, 40.0];
    const anchos = [9.0, 11.0, 8.0, 10.0, 12.0];

    return SizedBox(
      width: 76,
      height: 48,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          final colores = [
            AppColors.primary,
            AppColors.gold,
            AppColors.primaryDark,
            AppColors.primary.withValues(alpha: 0.7),
            AppColors.gold.withValues(alpha: 0.8),
          ];
          return Column(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  for (var i = 0; i < altos.length; i++) ...[
                    if (i > 0) const SizedBox(width: 2),
                    Transform.translate(
                      offset: Offset(
                        0,
                        -7 *
                            math.max(
                              0,
                              math.sin(
                                (_controller.value - i * 0.12) * math.pi * 2,
                              ),
                            ),
                      ),
                      child: Container(
                        width: anchos[i],
                        height: altos[i],
                        decoration: BoxDecoration(
                          color: colores[i],
                          borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(2),
                          ),
                        ),
                        alignment: Alignment.topCenter,
                        padding: const EdgeInsets.only(top: 6),
                        child: Container(
                          height: 1.5,
                          color: AppColors.doradoClaro.withValues(alpha: 0.8),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              Container(
                height: 4,
                width: 76,
                decoration: BoxDecoration(
                  color: AppColors.tinta.withValues(alpha: 0.75),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
